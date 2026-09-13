"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { FrameSequence } from "@/lib/scroll-video/FrameSequence";
import { VideoScrubber } from "@/lib/scroll-video/VideoScrubber";
import { HERO_VIDEO } from "@/lib/site";
import styles from "./ScrollVideo.module.css";

export type ScrubSource = "poster" | "video" | "frames";

export interface ScrollVideoHandle {
  readonly aperture: HTMLDivElement;
  readonly frame: HTMLDivElement;
  readonly dim: HTMLDivElement;
  readonly glow: HTMLDivElement;
  /** Headlamp overlay of the opening shot. */
  readonly lamps: HTMLDivElement;
  readonly source: ScrubSource;
  readonly currentTime: number;
  /** Load media for scroll control. */
  start(): void;
  /** Release media and fall back to the static poster. */
  stop(): void;
  /** Show the frame at this point of the video, 0 to 1. Safe to call on every animation frame. */
  setProgress(progress: number): void;
}

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

function mediaPreferences() {
  const scrub = new URLSearchParams(window.location.search).get("scrub");
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  const constrained =
    connection?.saveData === true || /(^|-)2g$/.test(connection?.effectiveType ?? "");
  return {
    forceFrames: scrub === "frames",
    small: constrained || window.matchMedia("(max-width: 767px)").matches,
  };
}

export default function ScrollVideo({ ref }: { ref?: Ref<ScrollVideoHandle> }) {
  const apertureRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const lampsRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const media = useRef<{
    scrubber: VideoScrubber | null;
    frames: FrameSequence | null;
    source: ScrubSource;
    progress: number;
  }>({ scrubber: null, frames: null, source: "poster", progress: 0 });

  useImperativeHandle(ref, () => {
    const m = media.current;
    // Capture nodes now: React detaches refs before parent effect cleanups run.
    const aperture = apertureRef.current!;
    const frame = frameRef.current!;
    const dim = dimRef.current!;
    const glow = glowRef.current!;
    const lamps = lampsRef.current!;
    const video = videoRef.current!;
    const canvas = canvasRef.current!;

    const setSource = (source: ScrubSource) => {
      m.source = source;
      frame.dataset.source = source;
    };

    const videoFrame = () => Math.round(m.progress * (HERO_VIDEO.frameCount - 1));
    const fallbackFrame = () => Math.round(m.progress * (HERO_VIDEO.fallbackFrameCount - 1));

    const switchToFrames = () => {
      if (m.frames) return;
      m.frames = new FrameSequence(canvas, {
        count: HERO_VIDEO.fallbackFrameCount,
        url: HERO_VIDEO.frameUrl,
        onFirstFrame: () => {
          setSource("frames");
          m.scrubber?.destroy();
          m.scrubber = null;
        },
      });
      m.frames.start(fallbackFrame());
      m.frames.setFrame(fallbackFrame());
    };

    return {
      aperture,
      frame,
      dim,
      glow,
      lamps,
      get source() {
        return m.source;
      },
      get currentTime() {
        return m.scrubber && m.source === "video"
          ? m.scrubber.currentTime
          : (m.progress * HERO_VIDEO.frameCount) / HERO_VIDEO.fps;
      },
      start() {
        if (m.scrubber || m.frames) return;
        const { forceFrames, small } = mediaPreferences();
        if (forceFrames) {
          switchToFrames();
          return;
        }
        m.scrubber = new VideoScrubber(video, {
          fps: HERO_VIDEO.fps,
          frameCount: HERO_VIDEO.frameCount,
          onFirstFrame: () => {
            if (!m.frames) setSource("video");
          },
          onSlow: switchToFrames,
          onError: switchToFrames,
        });
        void m.scrubber.load(small ? HERO_VIDEO.srcSmall : HERO_VIDEO.src);
        m.scrubber.setFrame(videoFrame());
      },
      stop() {
        m.scrubber?.destroy();
        m.frames?.destroy();
        m.scrubber = null;
        m.frames = null;
        m.progress = 0;
        setSource("poster");
      },
      setProgress(progress: number) {
        m.progress = progress;
        m.frames?.setFrame(fallbackFrame());
        m.scrubber?.setFrame(videoFrame());
      },
    };
  }, []);

  useEffect(() => {
    const m = media.current;
    return () => {
      m.scrubber?.destroy();
      m.frames?.destroy();
    };
  }, []);

  return (
    <div ref={apertureRef} className={styles.aperture} aria-hidden="true">
      <div ref={frameRef} className={styles.frame} data-source="poster">
        {/* eslint-disable-next-line @next/next/no-img-element -- must align pixel-for-pixel with the video frames */}
        <img
          className={styles.poster}
          src={HERO_VIDEO.posterStart}
          srcSet={`${HERO_VIDEO.posterStartSmall} 960w, ${HERO_VIDEO.posterStart} 1920w`}
          sizes="100vw"
          width={1920}
          height={1080}
          alt=""
          fetchPriority="high"
          decoding="async"
        />
        <video
          ref={videoRef}
          className={styles.media}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          tabIndex={-1}
        />
        <canvas ref={canvasRef} className={styles.media} width={1280} height={720} />
        <div ref={glowRef} className={styles.glow} />
        <div ref={lampsRef} className={styles.lamps}>
          <span className={styles.lampGlow} />
          <span className={styles.lampFlash} data-lamp="flash" />
        </div>
      </div>
      <div ref={dimRef} className={styles.dim} />
    </div>
  );
}
