/**
 * Scroll reveal for the app screens: each screen opens upwards from its bottom
 * edge as it rises into view. Pure functions, unit-tested in Node.
 */

export interface RevealTiming {
  /** Viewport height fraction where a screen's top edge starts the reveal. */
  start: number;
  /** Viewport height fraction where the screen is fully open. */
  end: number;
  /** Extra rise needed per column to the right (viewport fractions). */
  stagger: number;
  /** Zoom the capture settles from while it opens. */
  zoom: number;
}

export const REVEAL: RevealTiming = { start: 0.98, end: 0.6, stagger: 0.07, zoom: 1.12 };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** 0 while a screen's top is below `start` of the viewport, 1 once it has risen to `end`. */
export function revealProgress(
  top: number,
  viewportHeight: number,
  delay = 0,
  timing: RevealTiming = REVEAL,
) {
  const from = viewportHeight * (timing.start - delay);
  const to = viewportHeight * (timing.end - delay);
  return clamp01((from - top) / (from - to));
}

const CAPTION_START = 0.55;

/** Captions follow once their screen is mostly open. */
export function captionProgress(reveal: number) {
  if (reveal >= 1) return 1;
  return clamp01((reveal - CAPTION_START) / (1 - CAPTION_START));
}

/** Screens sharing a row (same top edge) open left to right, `stagger` apart. */
export function columnDelays(
  boxes: readonly { top: number; left: number }[],
  stagger = REVEAL.stagger,
  tolerance = 4,
) {
  return boxes.map(
    (box) =>
      boxes.filter((other) => Math.abs(other.top - box.top) <= tolerance && other.left < box.left)
        .length * stagger,
  );
}
