import assert from "node:assert/strict";
import { test } from "node:test";

const { REVEAL, captionProgress, columnDelays, easeOut, revealProgress } = await import(
  "../lib/reveal/reveal.ts"
);

const VH = 900;

test("a screen stays closed below the fold and is fully open once it has risen", () => {
  assert.equal(revealProgress(VH * 1.1, VH), 0);
  assert.equal(revealProgress(VH * REVEAL.start, VH), 0);
  assert.equal(revealProgress(VH * REVEAL.end, VH), 1);
  assert.equal(revealProgress(VH * 0.2, VH), 1);
});

test("opening follows the scroll smoothly, so scrolling back retraces it", () => {
  let last = 0;
  for (let top = VH * 1.2; top >= 0; top -= 5) {
    const t = revealProgress(top, VH);
    assert.ok(t >= last, `closed again while rising at top=${top}`);
    assert.ok(t - last < 0.05, `jumped at top=${top}`);
    last = t;
  }
  assert.equal(last, 1);
});

test("screens further right in the same row open a little later", () => {
  const top = VH * 0.8;
  assert.ok(revealProgress(top, VH, 0) > revealProgress(top, VH, REVEAL.stagger));
  assert.ok(revealProgress(top, VH, REVEAL.stagger) > revealProgress(top, VH, 2 * REVEAL.stagger));
});

test("columns are staggered per row, whatever the layout", () => {
  const desktop = [
    { top: 0, left: 0 },
    { top: 0, left: 700 },
    { top: 400, left: 0 },
    { top: 401, left: 660 },
    { top: 399, left: 900 },
  ];
  assert.deepEqual(columnDelays(desktop, 0.1), [0, 0.1, 0, 0.1, 0.2]);

  const phone = [
    { top: 0, left: 20 },
    { top: 200, left: 20 },
    { top: 400, left: 20 },
    { top: 600, left: 20 },
    { top: 600, left: 150 },
  ];
  assert.deepEqual(columnDelays(phone, 0.1), [0, 0, 0, 0, 0.1]);
});

test("captions wait until their screen is mostly open", () => {
  assert.equal(captionProgress(0), 0);
  assert.equal(captionProgress(0.55), 0);
  const halfway = captionProgress(0.8);
  assert.ok(halfway > 0 && halfway < 1);
  assert.equal(captionProgress(1), 1);
});

test("easing starts closed and ends open", () => {
  assert.equal(easeOut(0), 0);
  assert.equal(easeOut(1), 1);
  assert.ok(easeOut(0.5) > 0.5, "opens quickly, then settles");
});
