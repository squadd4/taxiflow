import { FOCUS, type FocusBox } from "./story";
import { clamp, easeInOut, lerp } from "./math";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraOptions {
  /** Share of the viewport width the focus box may occupy. */
  fill: number;
  /** Smallest zoom relative to "fit width" before the car is allowed to crop. */
  minScale: number;
  /** Vertical centre of the frame, as a share of viewport height, while letterboxed. */
  bandCenter: number;
}

export function focusAt(frame: number): FocusBox {
  if (frame <= FOCUS[0].frame) return FOCUS[0];
  for (let i = 1; i < FOCUS.length; i++) {
    const b = FOCUS[i];
    if (frame <= b.frame) {
      const a = FOCUS[i - 1];
      const t = easeInOut((frame - a.frame) / (b.frame - a.frame));
      return {
        frame,
        x0: lerp(a.x0, b.x0, t),
        x1: lerp(a.x1, b.x1, t),
        y0: lerp(a.y0, b.y0, t),
        y1: lerp(a.y1, b.y1, t),
      };
    }
  }
  return FOCUS[FOCUS.length - 1];
}

/**
 * Frames the 16:9 video inside the viewport so the focus box stays visible.
 * Landscape screens resolve to a plain cover crop that follows the car;
 * portrait screens get a letterboxed band that tightens into a full-bleed
 * crop as the car moves away and becomes smaller.
 */
export function frameCamera(
  vw: number,
  vh: number,
  aspect: number,
  focus: FocusBox,
  options: CameraOptions,
): Rect {
  const fitHeight = vw / aspect;
  const cover = Math.max(1, vh / fitHeight);
  const fit = options.fill / (focus.x1 - focus.x0);
  const scale = clamp(fit, Math.min(options.minScale, cover), cover);

  const width = vw * scale;
  const height = fitHeight * scale;
  const cx = (focus.x0 + focus.x1) / 2;
  const cy = (focus.y0 + focus.y1) / 2;

  const x = clamp(vw / 2 - cx * width, vw - width, 0);
  const y =
    height <= vh
      ? clamp(vh * options.bandCenter - height / 2, 0, vh - height)
      : clamp(vh / 2 - cy * height, vh - height, 0);

  return { x, y, width, height };
}

/** Opening framing: pushed in slightly and tilted down onto the headlamps. */
export function headlampCamera(
  base: Rect,
  vw: number,
  slitCenter: number,
  headlampLine: number,
  push = 1.06,
): Rect {
  const height = base.height * push;
  return {
    width: base.width * push,
    height,
    // Push in around the horizontal centre of the screen.
    x: vw / 2 - (vw / 2 - base.x) * push,
    y: slitCenter - headlampLine * height,
  };
}

export const mixRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  width: lerp(a.width, b.width, t),
  height: lerp(a.height, b.height, t),
});

/** Intersection of a rect with the viewport. */
export const visibleRect = (r: Rect, vw: number, vh: number): Rect => {
  const x = Math.max(0, r.x);
  const y = Math.max(0, r.y);
  return {
    x,
    y,
    width: Math.min(vw, r.x + r.width) - x,
    height: Math.min(vh, r.y + r.height) - y,
  };
};
