export interface VideoScrubberOptions {
  fps: number;
  frameCount: number;
  /** Median seek latency (ms) above which scrubbing is considered too slow. */
  slowSeekMs?: number;
  onFirstFrame?: () => void;
  onSlow?: () => void;
  onError?: () => void;
}

const SAMPLE_SIZE = 10;
const STALL_MS = 1200;

/**
 * Drives a paused <video> element frame by frame.
 *
 * - The file is downloaded once into a Blob so seeks never wait on range
 *   requests.
 * - Seeks are coalesced: while one is in flight only the latest requested
 *   frame is remembered, so fast scrolling never builds a queue.
 * - Seek latency is sampled; persistent slowness is reported through
 *   `onSlow` so the caller can switch to the frame-sequence fallback.
 */
export class VideoScrubber {
  private readonly video: HTMLVideoElement;
  private readonly options: Required<Omit<VideoScrubberOptions, "onFirstFrame" | "onSlow" | "onError">> &
    VideoScrubberOptions;
  private readonly abort = new AbortController();
  private objectUrl: string | null = null;
  private ready = false;
  private destroyed = false;
  private priming = false;
  private firstFramePresented = false;
  private reportedSlow = false;

  private targetFrame = 0;
  private requestedFrame = -1;
  private seekStartedAt = 0;
  private stallTimer = 0;
  private latencies: number[] = [];

  constructor(video: HTMLVideoElement, options: VideoScrubberOptions) {
    this.video = video;
    this.options = { slowSeekMs: 120, ...options };
    video.muted = true;
    video.playsInline = true;
    video.pause();

    video.addEventListener("loadeddata", this.handleLoadedData);
    video.addEventListener("loadedmetadata", this.handleLoadedMetadata);
    video.addEventListener("seeked", this.handleSeeked);
    video.addEventListener("play", this.handlePlay);
    video.addEventListener("error", this.handleError);
  }

  async load(url: string) {
    try {
      const response = await fetch(url, { signal: this.abort.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (this.destroyed) return;
      this.objectUrl = URL.createObjectURL(
        blob.type ? blob : new Blob([blob], { type: "video/mp4" }),
      );
      this.video.src = this.objectUrl;
    } catch (error) {
      if (this.destroyed || (error as Error).name === "AbortError") return;
      // Streaming is slower to seek, but still better than nothing.
      this.video.src = url;
    }
    this.video.load();
  }

  /** Request a frame. Cheap to call every animation frame. */
  setFrame(frame: number) {
    this.targetFrame = Math.max(0, Math.min(this.options.frameCount - 1, frame));
    this.pump();
  }

  get currentTime() {
    return this.video.currentTime;
  }

  destroy() {
    this.destroyed = true;
    this.abort.abort();
    window.clearTimeout(this.stallTimer);
    const v = this.video;
    v.removeEventListener("loadeddata", this.handleLoadedData);
    v.removeEventListener("loadedmetadata", this.handleLoadedMetadata);
    v.removeEventListener("seeked", this.handleSeeked);
    v.removeEventListener("play", this.handlePlay);
    v.removeEventListener("error", this.handleError);
    v.pause();
    v.removeAttribute("src");
    v.load();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }

  private timeForFrame(frame: number) {
    // Frame 0 is exactly t = 0. Other frames aim just past the frame
    // boundary so rounding never lands on the previous frame.
    return frame === 0 ? 0 : (frame + 0.001) / this.options.fps;
  }

  private pump() {
    if (!this.ready || this.destroyed || this.priming) return;
    if (this.video.seeking) return; // handleSeeked pumps again
    const frame = this.targetFrame;
    if (frame === this.requestedFrame) return;

    this.requestedFrame = frame;
    this.seekStartedAt = performance.now();
    this.video.currentTime = this.timeForFrame(frame);

    window.clearTimeout(this.stallTimer);
    this.stallTimer = window.setTimeout(() => {
      if (this.video.seeking) this.sample(STALL_MS);
    }, STALL_MS);
  }

  private sample(latency: number) {
    this.latencies.push(latency);
    if (this.latencies.length > SAMPLE_SIZE) this.latencies.shift();
    if (this.reportedSlow || this.latencies.length < SAMPLE_SIZE) return;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median > this.options.slowSeekMs) {
      this.reportedSlow = true;
      this.options.onSlow?.();
    }
  }

  private handleLoadedMetadata = () => {
    // WebKit on iOS may not decode a frame until playback has started once.
    // Prime it with an immediate play/pause while the poster still covers it.
    window.setTimeout(() => {
      if (this.destroyed || this.ready || this.video.readyState >= 2) return;
      this.priming = true;
      this.video
        .play()
        .then(() => this.video.pause())
        .catch(() => undefined)
        .finally(() => {
          this.priming = false;
          if (this.video.readyState >= 2) this.handleLoadedData();
        });
    }, 400);
  };

  private handleLoadedData = () => {
    if (this.ready || this.destroyed) return;
    this.ready = true;
    this.video.pause();
    this.requestedFrame = this.video.currentTime === 0 ? 0 : -1;
    if (this.targetFrame === 0 && this.requestedFrame === 0) this.presentFirstFrame();
    this.pump();
  };

  private handleSeeked = () => {
    window.clearTimeout(this.stallTimer);
    if (this.seekStartedAt) this.sample(performance.now() - this.seekStartedAt);
    this.presentFirstFrame();
    this.pump();
  };

  private handlePlay = () => {
    // Playback is always scroll-controlled; never let the element run on its own.
    if (!this.priming) this.video.pause();
  };

  private handleError = () => {
    if (!this.destroyed) this.options.onError?.();
  };

  private presentFirstFrame() {
    if (this.firstFramePresented) return;
    this.firstFramePresented = true;
    this.options.onFirstFrame?.();
  }
}
