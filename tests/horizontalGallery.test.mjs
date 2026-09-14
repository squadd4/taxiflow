import assert from "node:assert/strict";
import { test } from "node:test";

const { computeGalleryProgress, computeSlideTransform, calculateScrollYForIndex } =
  await import("../lib/reveal/horizontalGallery.ts");

test("progress is 0 before section enters and 1 when fully scrolled through", () => {
  const vh = 800;
  const sectionHeight = 4000;
  // Entering: rectTop = 0 -> progress = 0
  assert.equal(computeGalleryProgress(0, sectionHeight, vh), 0);
  // Halfway: rectTop = -(sectionHeight - vh) / 2 = -1600
  assert.equal(computeGalleryProgress(-1600, sectionHeight, vh), 0.5);
  // Finished: rectTop = -(sectionHeight - vh) = -3200
  assert.equal(computeGalleryProgress(-3200, sectionHeight, vh), 1);
  // Beyond finished: clamped to 1
  assert.equal(computeGalleryProgress(-4000, sectionHeight, vh), 1);
});

test("center slide has maximum scale, full opacity and highest zIndex", () => {
  const center = computeSlideTransform(0);
  assert.ok(center.scale >= 1.0);
  assert.equal(center.opacity, 1);
  assert.equal(center.zIndex, 10);
});

test("adjacent slides scale down, have reduced opacity and lower zIndex", () => {
  const adjacent = computeSlideTransform(1);
  const center = computeSlideTransform(0);
  assert.ok(adjacent.scale < center.scale);
  assert.ok(adjacent.opacity < center.opacity);
  assert.ok(adjacent.zIndex < center.zIndex);

  const negativeAdjacent = computeSlideTransform(-1);
  assert.equal(negativeAdjacent.scale, adjacent.scale);
  assert.equal(negativeAdjacent.opacity, adjacent.opacity);
});

test("calculateScrollYForIndex maps slides evenly across scroll distance", () => {
  const sectionTop = 1000;
  const sectionHeight = 5000;
  const vh = 1000;
  const total = 5; // indices 0, 1, 2, 3, 4
  const scrollDistance = sectionHeight - vh; // 4000

  assert.equal(calculateScrollYForIndex(0, total, sectionTop, sectionHeight, vh), 1000);
  assert.equal(calculateScrollYForIndex(2, total, sectionTop, sectionHeight, vh), 1000 + 0.5 * 4000);
  assert.equal(calculateScrollYForIndex(4, total, sectionTop, sectionHeight, vh), 5000);
});
