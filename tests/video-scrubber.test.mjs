import assert from "node:assert/strict";
import { test } from "node:test";

globalThis.window ??= globalThis;
const { VideoScrubber } = await import("../lib/scroll-video/VideoScrubber.ts");

const FPS = 24;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Minimal HTMLVideoElement stand-in with asynchronous, configurable seeks. */
class FakeVideo extends EventTarget {
  muted = false;
  playsInline = false;
  paused = true;
  readyState = 0;
  seeking = false;
  latency = 5;
  seeks = [];
  #time = 0;

  get currentTime() {
    return this.#time;
  }

  set currentTime(time) {
    this.seeks.push(time);
    this.seeking = true;
    setTimeout(() => {
      this.#time = time;
      this.seeking = false;
      this.dispatchEvent(new Event("seeked"));
    }, this.latency);
  }

  pause() {
    this.paused = true;
  }

  play() {
    this.paused = false;
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  }

  load() {}
  removeAttribute() {}
}

function readyScrubber({ latency = 5, ...options } = {}) {
  const video = new FakeVideo();
  video.latency = latency;
  const scrubber = new VideoScrubber(video, { fps: FPS, frameCount: 240, ...options });
  video.readyState = 4;
  video.dispatchEvent(new Event("loadeddata"));
  return { video, scrubber };
}

async function settle(video) {
  for (let i = 0; i < 500; i++) {
    await sleep(video.latency + 4);
    if (!video.seeking) return;
  }
  throw new Error("video never settled");
}

const shownFrame = (video) => Math.round(video.currentTime * FPS - 0.001);

test("first frame is exactly t=0 and the last frame is reachable", async () => {
  const { video, scrubber } = readyScrubber();
  scrubber.setFrame(239);
  await settle(video);
  assert.equal(shownFrame(video), 239);
  assert.ok(video.currentTime < 10, "stays inside the 10 s duration");

  scrubber.setFrame(0);
  await settle(video);
  assert.equal(video.currentTime, 0);
  scrubber.destroy();
});

test("fast scrubbing coalesces seeks and lands on the latest frame", async () => {
  const { video, scrubber } = readyScrubber({ latency: 20 });
  const requests = [];
  for (let f = 0; f < 240; f++) {
    scrubber.setFrame(f);
    requests.push(f);
  }
  for (let f = 239; f >= 37; f--) {
    scrubber.setFrame(f);
    requests.push(f);
    if (f % 25 === 0) await sleep(8);
  }
  await settle(video);

  assert.equal(shownFrame(video), 37);
  assert.ok(
    video.seeks.length < 20,
    `${requests.length} requests should collapse into a few seeks, got ${video.seeks.length}`,
  );
  scrubber.destroy();
});

test("slow frame-by-frame scrolling shows every requested frame", async () => {
  const { video, scrubber } = readyScrubber({ latency: 3 });
  for (let f = 120; f <= 126; f++) {
    scrubber.setFrame(f);
    await settle(video);
    assert.equal(shownFrame(video), f);
  }
  for (let f = 125; f >= 118; f--) {
    scrubber.setFrame(f);
    await settle(video);
    assert.equal(shownFrame(video), f);
  }
  scrubber.destroy();
});

test("the element never plays on its own", () => {
  const { video, scrubber } = readyScrubber();
  video.play();
  assert.equal(video.paused, true);
  scrubber.destroy();
});

test("persistently slow seeking asks for the fallback exactly once", async () => {
  let slow = 0;
  const { video, scrubber } = readyScrubber({ latency: 160, onSlow: () => slow++ });
  for (let i = 1; i <= 14; i++) {
    scrubber.setFrame(i * 12);
    await settle(video);
  }
  assert.equal(slow, 1);
  scrubber.destroy();
});

test("fast seeking never triggers the fallback", async () => {
  let slow = 0;
  const { video, scrubber } = readyScrubber({ latency: 4, onSlow: () => slow++ });
  for (let i = 1; i <= 14; i++) {
    scrubber.setFrame(i * 12);
    await settle(video);
  }
  assert.equal(slow, 0);
  scrubber.destroy();
});
