export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, t: number) =>
  from + (to - from) * t;

/** Normalised position of `value` inside [start, end], clamped to 0–1. */
export const range = (value: number, start: number, end: number) =>
  clamp((value - start) / (end - start));

export const easeInOut = (t: number) => t * t * (3 - 2 * t);

export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Fades in across `enter` and out across `exit` (both ranges in the same unit as `value`). */
export const window2 = (
  value: number,
  enter: readonly [number, number],
  exit: readonly [number, number],
) => Math.min(range(value, enter[0], enter[1]), 1 - range(value, exit[0], exit[1]));

/** Piecewise-linear interpolation over stops sorted by x. */
export function interpolate(
  stops: readonly (readonly [number, number])[],
  x: number,
): number {
  if (x <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [x1, y1] = stops[i];
    if (x <= x1) {
      const [x0, y0] = stops[i - 1];
      return lerp(y0, y1, (x - x0) / (x1 - x0));
    }
  }
  return stops[stops.length - 1][1];
}
