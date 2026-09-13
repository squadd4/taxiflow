import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

let requests = [];
let gates = new Map();
let autoResolve = true;

/** Image stand-in: decodes immediately, or waits until a test releases it. */
globalThis.Image = class FakeImage {
  decoding = "auto";
  src = "";

  decode() {
    requests.push(this.src);
    return new Promise((resolve, reject) => {
      if (autoResolve) setImmediate(resolve);
      else gates.set(this.src, { resolve, reject });
    });
  }
};

const { FrameSequence } = await import("../lib/scroll-video/FrameSequence.ts");

const flush = () => new Promise((resolve) => setImmediate(resolve));
const url = (i) => `frame-${i}`;

function fakeCanvas() {
  const draws = [];
  return {
    width: 1280,
    height: 720,
    draws,
    getContext: () => ({ drawImage: (img) => draws.push(img.src) }),
  };
}

beforeEach(() => {
  requests = [];
  gates = new Map();
  autoResolve = true;
});

test("every frame is requested once, coarse-to-fine from the current frame", async () => {
  const sequence = new FrameSequence(fakeCanvas(), { count: 240, url, concurrency: 6 });
  sequence.start(100);
  for (let i = 0; i < 1000 && requests.length < 240; i++) await flush();

  assert.equal(requests.length, 240);
  assert.equal(new Set(requests).size, 240);
  assert.equal(requests[0], "frame-100");
  const coarse = requests
    .slice(1, 10)
    .map((src) => Number(src.split("-")[1]))
    .sort((a, b) => a - b);
  assert.deepEqual(coarse, [0, 32, 64, 96, 128, 160, 192, 224, 239]);
  sequence.destroy();
});

test("shows the nearest loaded frame until the exact one arrives", async () => {
  autoResolve = false;
  let firstFrames = 0;
  const canvas = fakeCanvas();
  const sequence = new FrameSequence(canvas, {
    count: 240,
    url,
    concurrency: 240,
    onFirstFrame: () => firstFrames++,
  });
  sequence.start(0);
  assert.equal(canvas.draws.length, 0, "nothing is drawn before a frame decodes");

  gates.get("frame-0").resolve();
  await flush();
  assert.deepEqual(canvas.draws, ["frame-0"]);

  sequence.setFrame(50);
  assert.deepEqual(canvas.draws, ["frame-0"], "keeps the last good frame instead of blanking");

  gates.get("frame-48").resolve();
  await flush();
  assert.equal(canvas.draws.at(-1), "frame-48");

  gates.get("frame-50").resolve();
  await flush();
  assert.equal(canvas.draws.at(-1), "frame-50");

  sequence.setFrame(10);
  assert.equal(canvas.draws.at(-1), "frame-0", "scrolling back uses the closest loaded frame");
  assert.equal(firstFrames, 1);

  sequence.destroy();
  gates.get("frame-12").resolve();
  await flush();
  assert.equal(canvas.draws.at(-1), "frame-0", "nothing is drawn after destroy");
});
