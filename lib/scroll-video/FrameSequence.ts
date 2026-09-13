export interface FrameSequenceOptions {
  count: number;
  url: (index: number) => string;
  concurrency?: number;
  onFirstFrame?: () => void;
}

/** Load order that fills the timeline coarse-to-fine, so scrubbing works early. */
function progressiveOrder(count: number) {
  const order: number[] = [];
  const seen = new Uint8Array(count);
  const add = (i: number) => {
    if (seen[i]) return;
    seen[i] = 1;
    order.push(i);
  };
  add(0);
  // The held final frame carries the CTA, so it matters as much as the first.
  add(count - 1);
  for (let stride = 32; stride >= 1; stride /= 2) {
    for (let i = 0; i < count; i += stride) add(i);
  }
  return order;
}

/**
 * Image-sequence fallback for browsers that cannot seek video smoothly.
 * Frames are drawn to a canvas; until a frame arrives the nearest loaded
 * neighbour is shown, so scrubbing never shows a blank frame.
 */
export class FrameSequence {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly options: FrameSequenceOptions;
  private readonly images: (HTMLImageElement | null)[];
  private queue: number[] = [];
  private active = 0;
  private target = 0;
  private drawn = -1;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, options: FrameSequenceOptions) {
    this.canvas = canvas;
    this.options = options;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.images = new Array(options.count).fill(null);
  }

  start(fromFrame = 0) {
    const order = progressiveOrder(this.options.count).filter((i) => i !== fromFrame);
    this.queue = [fromFrame, ...order];
    this.pump();
  }

  setFrame(frame: number) {
    this.target = Math.max(0, Math.min(this.options.count - 1, frame));
    this.draw();
  }

  destroy() {
    this.destroyed = true;
    this.queue = [];
    this.images.fill(null);
  }

  private pump() {
    const concurrency = this.options.concurrency ?? 6;
    while (!this.destroyed && this.active < concurrency && this.queue.length) {
      const index = this.queue.shift()!;
      const img = new Image();
      img.decoding = "async";
      img.src = this.options.url(index);
      this.active++;
      img
        .decode()
        .then(() => {
          if (this.destroyed) return;
          this.images[index] = img;
          this.draw();
        })
        .catch(() => undefined)
        .finally(() => {
          this.active--;
          this.pump();
        });
    }
  }

  private nearestLoaded(frame: number) {
    const { count } = this.options;
    for (let d = 0; d < count; d++) {
      if (frame - d >= 0 && this.images[frame - d]) return frame - d;
      if (frame + d < count && this.images[frame + d]) return frame + d;
    }
    return -1;
  }

  private draw() {
    if (!this.ctx) return;
    const index = this.nearestLoaded(this.target);
    if (index < 0 || index === this.drawn) return;
    const firstDraw = this.drawn < 0;
    this.ctx.drawImage(this.images[index]!, 0, 0, this.canvas.width, this.canvas.height);
    this.drawn = index;
    if (firstDraw) this.options.onFirstFrame?.();
  }
}
