import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { ScrollVideoHandle } from "@/components/ScrollVideo";
import { createStyleWriter } from "@/lib/dom/styleWriter";
import { follow } from "@/lib/motion/follow";
import { HERO_VIDEO } from "@/lib/site";
import {
  focusAt,
  frameCamera,
  headlampCamera,
  mixRect,
  visibleRect,
  type CameraOptions,
} from "./camera";
import { clamp, easeInOut, easeOut, interpolate, lerp, range } from "./math";
import { flashKeyframes } from "./flash";
import { HEADLAMP_LINE, SHIFT_CLOCK, STORY, STORY_FRAMES } from "./story";

type Phase = "intro" | "cinema" | "cta";

interface Layout {
  vw: number;
  vh: number;
  /** Share of the scroll track spent on the video; the rest holds the final frame. */
  split: number;
  camera: CameraOptions;
  slitCenter: number;
  slitHeight: number;
  scopeHeight: number;
  brand: { x: number; y: number; skyX: number; skyY: number; skyScale: number };
  /** One screen of scrolling in progress units: the gap at which smoothing speeds up. */
  screenProgress: number;
  /** Half a pixel of scrolling in progress units: close enough to land. */
  pixelProgress: number;
}

/** Scroll smoothing, in seconds to halve the gap: a wheel notch glides, a long jump catches up. */
const SMOOTHING = { halfLife: 0.085, fastHalfLife: 0.04 };
/** Longest frame step fed to the smoothing, so a waking ticker never skips the glide. */
const MAX_STEP_MS = 34;
/** Seconds into the opening when the headlamps flash. */
const GREETING_DELAY = 1.3;
/** The greeting belongs to the opening shot (video progress). */
const OPENING_END = 0.12;

const px = (n: number) => `${n.toFixed(1)}px`;
const num = (n: number) => n.toFixed(3);

/**
 * Wires the hero to the scroll position. ScrollTrigger reports where the page is;
 * the rendered progress follows it with frame-rate independent smoothing, and every
 * layer (video frame, camera, aperture, type, HUD, closing CTA) is derived from that
 * one value in a single render pass, so nothing can drift. All high-frequency work
 * is direct style writes of transform, opacity and clip-path, with no layout reads,
 * and React never re-renders.
 *
 * Returns a teardown function. Reduced-motion changes switch layouts live.
 */
export function createHeroEngine(root: HTMLElement, player: ScrollVideoHandle) {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const html = document.documentElement;
  html.dataset.heroReady = "true";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let teardown: (() => void) | null = null;

  const apply = () => {
    teardown?.();
    teardown = null;
    if (reducedMotion.matches || html.dataset.motionForced) {
      html.dataset.motion = "off";
      return;
    }
    html.dataset.motion = "on";
    teardown = runCinematic(root, player);
  };

  apply();
  reducedMotion.addEventListener("change", apply);

  return () => {
    reducedMotion.removeEventListener("change", apply);
    teardown?.();
    teardown = null;
  };
}

function runCinematic(root: HTMLElement, player: ScrollVideoHandle) {
  const html = document.documentElement;
  const one = (name: string) => root.querySelector<HTMLElement>(`[data-hero="${name}"]`)!;
  const all = (name: string) =>
    Array.from(root.querySelectorAll<HTMLElement>(`[data-hero="${name}"]`));

  // Resolve every node up front; refs can be detached before teardown runs.
  const el = {
    track: one("track"),
    stage: one("stage"),
    spacerVideo: one("spacer-video"),
    spacerCta: one("spacer-cta"),
    aperture: player.aperture,
    frame: player.frame,
    dim: player.dim,
    glow: player.glow,
    lamps: player.lamps,
    h1: all("h1-line"),
    h2: all("h2-line"),
    hud: one("hud"),
    clock: one("clock"),
    rail: one("rail"),
    hint: one("hint"),
    scrim: one("scrim"),
    cta: one("cta"),
    brand: one("brand"),
    ctaItems: all("cta-item"),
  };

  const style = createStyleWriter();
  const state = { progress: 0, intro: 0 };
  let disposed = false;
  let phase: Phase | null = null;
  let clockText = "";
  let interactive = false;
  let layout = measure();

  function measure(): Layout {
    const vw = el.stage.clientWidth;
    const vh = el.stage.clientHeight;
    const portrait = vw / vh < 1;
    const videoLength = el.spacerVideo.offsetHeight;
    const closingLength = el.spacerCta.offsetHeight;
    const scrollLength = Math.max(1, el.track.offsetHeight - vh);

    // Resting place of the brand mark, measured without its transform.
    const previous = el.brand.style.transform;
    el.brand.style.transform = "none";
    const stageBox = el.stage.getBoundingClientRect();
    const brandBox = el.brand.getBoundingClientRect();
    el.brand.style.transform = previous;

    return {
      vw,
      vh,
      split: videoLength / Math.max(1, videoLength + closingLength),
      camera: portrait
        ? { fill: 0.96, minScale: 1.55, bandCenter: 0.44 }
        : { fill: 0.9, minScale: 1, bandCenter: 0.5 },
      slitCenter: vh * (portrait ? 0.34 : 0.4),
      slitHeight: vh * (portrait ? 0.13 : 0.17),
      scopeHeight: vh * (portrait ? 0.3 : 0.46),
      brand: {
        x: brandBox.left - stageBox.left + brandBox.width / 2,
        y: brandBox.top - stageBox.top + brandBox.height / 2,
        skyX: vw / 2,
        skyY: vh * (portrait ? 0.17 : 0.2),
        skyScale: portrait ? 1.7 : 2.4,
      },
      screenProgress: vh / scrollLength,
      pixelProgress: 0.5 / scrollLength,
    };
  }

  function render() {
    if (disposed) return;
    const { vw, vh, split } = layout;
    const v = clamp(state.progress / split);
    const c = clamp((state.progress - split) / (1 - split));
    const intro = state.intro;

    // Video: scroll position is the playhead.
    player.setProgress(v);
    const storyFrame = v * (STORY_FRAMES - 1);

    // Camera: tilt from the headlamps to the whole car while the aperture opens.
    const scope = easeInOut(range(v, ...STORY.apertureScope));
    const open = easeInOut(range(v, ...STORY.apertureFull));
    const camera = frameCamera(vw, vh, HERO_VIDEO.aspect, focusAt(storyFrame), layout.camera);
    const lamp = headlampCamera(camera, vw, layout.slitCenter, HEADLAMP_LINE);
    const rect = mixRect(lamp, camera, easeInOut(clamp(scope * 0.3 + open * 0.7)));
    style.set(
      el.frame,
      "transform",
      `translate3d(${px(rect.x)},${px(rect.y)},0) scale(${(rect.width / vw).toFixed(4)})`,
    );

    const band = lerp(layout.slitHeight * easeOut(intro), layout.scopeHeight, scope);
    const shown = visibleRect(rect, vw, vh);
    const top = lerp(layout.slitCenter - band / 2, shown.y, open);
    const bottom = lerp(layout.slitCenter + band / 2, shown.y + shown.height, open);
    const left = lerp(0, shown.x, open);
    const right = lerp(vw, shown.x + shown.width, open);
    style.set(
      el.aperture,
      "clip-path",
      `inset(${px(top)} ${px(vw - right)} ${px(vh - bottom)} ${px(left)})`,
    );
    style.set(el.dim, "opacity", num(0.5 * (1 - range(v, ...STORY.dimLift))));

    // Headlamps of the opening shot: lit as the slit opens, gone once the car moves.
    const lamps = easeOut(range(intro, 0.2, 0.55)) * (1 - range(v, 0, 0.015));
    style.set(el.lamps, "opacity", num(lamps));
    style.set(el.lamps, "visibility", lamps > 0 ? "visible" : "hidden");

    // Typography.
    el.h1.forEach((line, i) => {
      const enter = easeOut(range(intro, 0.18 + i * 0.1, 0.78 + i * 0.1));
      const exit = easeInOut(range(v, STORY.h1Exit[0] + i * 0.012, STORY.h1Exit[1] + i * 0.012));
      style.set(line, "opacity", num(enter * (1 - exit)));
      style.set(line, "transform", `translate3d(0,${px((1 - enter) * 26 - exit * 30)},0)`);
    });
    el.h2.forEach((line, i) => {
      const enter = easeOut(range(v, STORY.h2Enter[0] + i * 0.015, STORY.h2Enter[1] + i * 0.015));
      const exit = easeInOut(range(v, STORY.h2Exit[0] + i * 0.01, STORY.h2Exit[1] + i * 0.01));
      style.set(line, "opacity", num(enter * (1 - exit)));
      style.set(
        line,
        "transform",
        `translate3d(0,${px((1 - enter) * 26 - exit * 22)},0) scale(${(0.985 + 0.015 * enter).toFixed(4)})`,
      );
    });

    // HUD: shift clock and progress rail.
    style.set(el.hud, "opacity", num(easeOut(range(intro, 0.5, 1)) * (1 - range(c, 0, 0.25))));
    style.set(el.rail, "transform", `scaleX(${v.toFixed(4)})`);
    style.set(el.hint, "opacity", num(1 - range(v, ...STORY.hintExit)));
    const minutes = Math.floor(interpolate(SHIFT_CLOCK, v));
    const text = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    if (text !== clockText) {
      clockText = text;
      el.clock.textContent = text;
    }

    // Night: roof-green light, then the Taxi Flow mark.
    style.set(el.glow, "opacity", num(easeInOut(range(v, ...STORY.glow)) * (1 - 0.6 * range(c, 0, 0.6))));
    const appear = easeOut(range(v, ...STORY.brandEnter));
    const settle = easeInOut(range(c, ...STORY.brandSettle));
    const { brand } = layout;
    style.set(el.brand, "opacity", num(appear));
    style.set(
      el.brand,
      "transform",
      `translate3d(${px((brand.skyX - brand.x) * (1 - settle))},${px(
        (brand.skyY - brand.y) * (1 - settle) + (1 - appear) * 18,
      )},0) scale(${lerp(brand.skyScale, 1, settle).toFixed(4)})`,
    );

    // Closing: the held final frame resolves into the CTA.
    style.set(el.scrim, "opacity", num(easeInOut(range(c, ...STORY.scrim))));
    el.ctaItems.forEach((item, i) => {
      const start = STORY.ctaContent[0] + i * 0.08;
      const t = easeOut(range(c, start, start + 0.32));
      style.set(item, "opacity", num(t));
      style.set(item, "transform", `translate3d(0,${px((1 - t) * 24)},0)`);
    });

    const nowInteractive = c > 0.3;
    if (nowInteractive !== interactive) {
      interactive = nowInteractive;
      el.cta.dataset.interactive = String(nowInteractive);
    }
    const nextPhase: Phase = c > 0.3 ? "cta" : v > 0.3 ? "cinema" : "intro";
    if (nextPhase !== phase) {
      phase = nextPhase;
      html.dataset.heroPhase = nextPhase;
    }
  }

  player.start();

  const flashLayer = el.lamps.querySelector<HTMLElement>('[data-lamp="flash"]');
  let flash: Animation | null = null;

  // The scroll position sets a target; the rendered progress follows it smoothly.
  let target = 0;
  let following = false;
  let jump = false;
  const followStep = (_time: number, deltaTime: number) => {
    if (disposed) return;
    state.progress = follow(state.progress, target, Math.min(deltaTime, MAX_STEP_MS) / 1000, {
      ...SMOOTHING,
      far: layout.screenProgress,
      epsilon: layout.pixelProgress,
    });
    render();
    if (state.progress === target) stopFollowing();
  };

  function startFollowing() {
    if (following) return;
    following = true;
    gsap.ticker.add(followStep);
  }

  function stopFollowing() {
    if (!following) return;
    following = false;
    gsap.ticker.remove(followStep);
  }

  const trigger = ScrollTrigger.create({
    trigger: el.track,
    start: "top top",
    end: "bottom bottom",
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      target = self.progress;
      if (jump) {
        jump = false;
        stopFollowing();
        state.progress = target;
        render();
        return;
      }
      startFollowing();
    },
    onRefresh: (self) => {
      if (disposed) return;
      layout = measure();
      stopFollowing();
      target = state.progress = self.progress;
      render();
    },
  });

  // One orchestrated load moment: the slit opens, the headline rises, the headlamps flash.
  const intro = gsap.to(state, {
    intro: 1,
    duration: 2.4,
    ease: "none",
    paused: true,
    onUpdate: render,
  });
  let greeting: ReturnType<typeof gsap.delayedCall> | null = null;
  const startIntro = () => {
    if (disposed || greeting) return;
    intro.play();
    greeting = gsap.delayedCall(GREETING_DELAY, () => {
      if (disposed || clamp(state.progress / layout.split) >= OPENING_END) return;
      const { keyframes, duration } = flashKeyframes();
      flash = flashLayer?.animate(keyframes, { duration, easing: "linear" }) ?? null;
    });
  };
  let introTimer = window.setTimeout(startIntro, 1500);
  const poster = el.frame.querySelector("img");
  (poster?.decode() ?? Promise.resolve())
    .catch(() => undefined)
    .then(() => {
      window.clearTimeout(introTimer);
      introTimer = window.setTimeout(startIntro, 150);
    });

  // Keyboard users tabbing into the CTA are brought straight to the point where it is visible.
  let jumpTimer = 0;
  const onFocusIn = (event: FocusEvent) => {
    if (interactive || !el.cta.contains(event.target as Node)) return;
    const at = layout.split + (1 - layout.split) * 0.8;
    jump = true;
    window.clearTimeout(jumpTimer);
    jumpTimer = window.setTimeout(() => (jump = false), 200);
    window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * at, behavior: "instant" });
  };
  root.addEventListener("focusin", onFocusIn);

  const debug =
    process.env.NODE_ENV !== "production" || window.location.search.includes("debug");
  if (debug) {
    Object.assign(window, {
      __taxiflowHero: {
        get progress() {
          return state.progress;
        },
        get target() {
          return target;
        },
        get video() {
          return clamp(state.progress / layout.split);
        },
        get closing() {
          return clamp((state.progress - layout.split) / (1 - layout.split));
        },
        get source() {
          return player.source;
        },
        get currentTime() {
          return player.currentTime;
        },
        get scroll() {
          return { start: trigger.start, end: trigger.end, split: layout.split };
        },
      },
    });
  }

  render();

  return () => {
    disposed = true;
    window.clearTimeout(introTimer);
    window.clearTimeout(jumpTimer);
    root.removeEventListener("focusin", onFocusIn);
    stopFollowing();
    greeting?.kill();
    // kill() without revert: nothing renders during teardown.
    intro.kill();
    trigger.kill();
    flash?.cancel();
    player.stop();
    style.clear();
    delete el.cta.dataset.interactive;
    delete html.dataset.heroPhase;
    if (debug) Reflect.deleteProperty(window, "__taxiflowHero");
  };
}
