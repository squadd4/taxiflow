/**
 * Double headlamp flash for the hero opening, as Element.animate() keyframes:
 * bright on each flash, a short hold, dark in between. Two flashes in about half a
 * second stays under the three-flashes-per-second safety limit. No DOM, tested in Node.
 */

export interface Flash {
  start: number;
  duration: number;
}

export const FLASHES: readonly Flash[] = [
  { start: 0, duration: 0.13 },
  { start: 0.21, duration: 0.19 },
];

const RISE = 0.024;
const FALL = 0.07;

export function flashKeyframes(tail = 0.2) {
  const last = FLASHES[FLASHES.length - 1];
  const total = last.start + last.duration + FALL + tail;
  const keyframes: { offset: number; opacity: number }[] = [];
  for (const flash of FLASHES) {
    const end = flash.start + flash.duration;
    keyframes.push(
      { offset: flash.start / total, opacity: 0 },
      { offset: (flash.start + RISE) / total, opacity: 1 },
      { offset: end / total, opacity: 0.85 },
      { offset: (end + FALL) / total, opacity: 0.05 },
    );
  }
  keyframes.push({ offset: 1, opacity: 0 });
  return { keyframes, duration: total * 1000 };
}
