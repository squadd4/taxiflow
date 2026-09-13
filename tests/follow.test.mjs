import assert from "node:assert/strict";
import { test } from "node:test";

const { follow } = await import("../lib/motion/follow.ts");

const OPTIONS = { halfLife: 0.09, fastHalfLife: 0.045, far: 900, epsilon: 0.25 };

function run(from, to, seconds, hz) {
  let value = from;
  const dt = 1 / hz;
  for (let t = 0; t < seconds - 1e-9; t += dt) value = follow(value, to, dt, OPTIONS);
  return value;
}

test("glides towards the target without overshooting, then lands exactly on it", () => {
  let value = 0;
  let previous = 0;
  let frames = 0;
  while (value !== 120 && frames < 600) {
    value = follow(value, 120, 1 / 60, OPTIONS);
    assert.ok(value >= previous && value <= 120, `moved backwards or overshot: ${value}`);
    previous = value;
    frames++;
  }
  assert.equal(value, 120);
  assert.ok(frames > 20 && frames < 120, `settled in ${frames} frames`);
});

test("the same time gives the same motion at 60 Hz and 120 Hz", () => {
  for (const gap of [40, 120, 900, 2400]) {
    const at60 = run(0, gap, 0.25, 60);
    const at120 = run(0, gap, 0.25, 120);
    assert.ok(Math.abs(at60 - at120) < gap * 0.02, `gap ${gap}: ${at60} vs ${at120}`);
  }
});

test("a long jump catches up proportionally faster than a wheel notch", () => {
  const notch = run(0, 100, 0.05, 120) / 100;
  const jump = run(0, 1800, 0.05, 120) / 1800;
  assert.ok(jump > notch, `jump covered ${jump}, notch ${notch}`);
});

test("no time passing means no movement, and tiny gaps snap", () => {
  assert.equal(follow(10, 500, 0, OPTIONS), 10);
  assert.equal(follow(99.9, 100, 1 / 60, OPTIONS), 100);
  assert.equal(follow(-50, -50, 1 / 60, OPTIONS), -50);
});
