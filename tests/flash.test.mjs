import assert from "node:assert/strict";
import { test } from "node:test";

const { FLASHES, flashKeyframes } = await import("../lib/hero/flash.ts");

test("keyframe offsets only move forwards and stay within the animation", () => {
  const { keyframes } = flashKeyframes();
  let last = 0;
  for (const frame of keyframes) {
    assert.ok(frame.offset >= last && frame.offset <= 1, `offset out of order: ${frame.offset}`);
    last = frame.offset;
  }
  assert.equal(keyframes[0].opacity, 0);
  assert.equal(keyframes.at(-1).opacity, 0);
});

test("the headlamps peak once per flash, right at its start", () => {
  const { keyframes, duration } = flashKeyframes();
  const peaks = keyframes.filter((frame) => frame.opacity === 1);
  assert.equal(peaks.length, FLASHES.length);
  peaks.forEach((peak, i) => {
    const seconds = (peak.offset * duration) / 1000;
    assert.ok(seconds - FLASHES[i].start >= 0 && seconds - FLASHES[i].start < 0.05);
  });
});

test("stays within the three-flashes-per-second safety limit", () => {
  const { duration } = flashKeyframes();
  assert.ok(FLASHES.length <= 3);
  assert.ok(duration < 1000, `whole animation lasts ${duration} ms`);
});
