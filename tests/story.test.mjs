import assert from "node:assert/strict";
import { test } from "node:test";

const { clamp, interpolate, range } = await import("../lib/hero/math.ts");
const { FOCUS, SHIFT_CLOCK, STORY } = await import("../lib/hero/story.ts");

test("range is normalised and clamped", () => {
  assert.equal(range(-1, 0, 1), 0);
  assert.equal(range(0.25, 0, 0.5), 0.5);
  assert.equal(range(9, 0, 1), 1);
  assert.equal(clamp(1.2), 1);
});

test("interpolate hits its stops and blends between them", () => {
  const stops = [
    [0, 10],
    [0.5, 20],
    [1, 40],
  ];
  assert.equal(interpolate(stops, 0), 10);
  assert.equal(interpolate(stops, 0.25), 15);
  assert.equal(interpolate(stops, 1), 40);
  assert.equal(interpolate(stops, 2), 40);
});

test("every storyboard range is ordered and inside 0–1", () => {
  for (const [name, [start, end]] of Object.entries(STORY)) {
    assert.ok(start < end, `${name} starts before it ends`);
    assert.ok(start >= 0 && end <= 1, `${name} stays on the timeline`);
  }
});

test("headlines hand over in sequence and clear before the car takes over", () => {
  assert.ok(STORY.h1Exit[0] >= 0.1, "H1 holds while the taxi is still stationary");
  assert.ok(STORY.h2Enter[0] >= STORY.h1Exit[0], "H2 follows H1");
  assert.ok(STORY.h2Exit[1] <= STORY.apertureFull[1], "text is gone once the frame is fully open");
  assert.ok(STORY.brandEnter[0] >= 0.8, "branding only surfaces at night");
});

test("the shift clock runs forward from morning into the night", () => {
  for (let i = 1; i < SHIFT_CLOCK.length; i++) {
    assert.ok(SHIFT_CLOCK[i][0] > SHIFT_CLOCK[i - 1][0]);
    assert.ok(SHIFT_CLOCK[i][1] > SHIFT_CLOCK[i - 1][1]);
  }
  assert.equal(SHIFT_CLOCK[0][0], 0);
  assert.equal(SHIFT_CLOCK.at(-1)[0], 1);
  assert.ok(SHIFT_CLOCK.at(-1)[1] >= 21 * 60, "ends after dark");
});

test("focus boxes cover the whole video and stay inside the frame", () => {
  assert.equal(FOCUS[0].frame, 0);
  assert.equal(FOCUS.at(-1).frame, 239);
  for (const box of FOCUS) {
    assert.ok(box.x0 >= 0 && box.x1 <= 1 && box.x0 < box.x1);
    assert.ok(box.y0 >= 0 && box.y1 <= 1 && box.y0 < box.y1);
  }
});
