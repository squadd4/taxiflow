import assert from "node:assert/strict";
import { test } from "node:test";

const { anchorScroll, swipeStep, wrapIndex } = await import("../lib/lightbox/viewer.ts");

test("navigation wraps around both ends", () => {
  assert.equal(wrapIndex(0, -1, 9), 8);
  assert.equal(wrapIndex(8, 1, 9), 0);
  assert.equal(wrapIndex(3, 2, 9), 5);
  assert.equal(wrapIndex(0, -10, 9), 8);
  assert.equal(wrapIndex(2, 1, 0), 0);
});

test("zooming keeps the clicked detail under the pointer", () => {
  const base = {
    contentWidth: 2048,
    contentHeight: 1248,
    offsetX: 24,
    offsetY: 24,
    viewportWidth: 1000,
    viewportHeight: 600,
  };
  assert.deepEqual(anchorScroll({ ...base, fx: 0.5, fy: 0.5, pointerX: 500, pointerY: 300 }), {
    left: 524,
    top: 324,
  });
  assert.deepEqual(anchorScroll({ ...base, fx: 0.25, fy: 0.75, pointerX: 200, pointerY: 450 }), {
    left: 324,
    top: 474,
  });
});

test("the scroll position never leaves the zoomed image", () => {
  const base = {
    contentWidth: 2048,
    contentHeight: 1248,
    offsetX: 24,
    offsetY: 24,
    viewportWidth: 1000,
    viewportHeight: 600,
  };
  assert.deepEqual(anchorScroll({ ...base, fx: 0, fy: 0, pointerX: 500, pointerY: 300 }), { left: 0, top: 0 });
  assert.deepEqual(anchorScroll({ ...base, fx: 1, fy: 1, pointerX: 10, pointerY: 10 }), {
    left: 1048,
    top: 648,
  });
});

test("only a clear horizontal swipe changes screen", () => {
  assert.equal(swipeStep(-80, 10), 1);
  assert.equal(swipeStep(90, -5), -1);
  assert.equal(swipeStep(30, 0), 0);
  assert.equal(swipeStep(-80, 70), 0);
});
