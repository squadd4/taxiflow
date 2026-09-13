/** Pure helpers for the screen viewer. No DOM, testable in Node. */

/** Index `step` screens away, wrapping around both ends. */
export function wrapIndex(index: number, step: number, count: number) {
  if (count <= 0) return 0;
  return (((index + step) % count) + count) % count;
}

export interface ZoomAnchor {
  /** Point that was clicked, as a fraction of the fitted image (0–1). */
  fx: number;
  fy: number;
  /** Where that point was inside the scroll viewport, in pixels. */
  pointerX: number;
  pointerY: number;
  /** Size of the zoomed image, including the padding around it. */
  contentWidth: number;
  contentHeight: number;
  /** Offset of the zoomed image inside that content. */
  offsetX: number;
  offsetY: number;
  viewportWidth: number;
  viewportHeight: number;
}

/** Scroll position that keeps the clicked detail under the pointer after zooming in. */
export function anchorScroll(a: ZoomAnchor) {
  const imageWidth = a.contentWidth - 2 * a.offsetX;
  const imageHeight = a.contentHeight - 2 * a.offsetY;
  const left = a.offsetX + a.fx * imageWidth - a.pointerX;
  const top = a.offsetY + a.fy * imageHeight - a.pointerY;
  return {
    left: Math.round(Math.min(Math.max(0, left), Math.max(0, a.contentWidth - a.viewportWidth))),
    top: Math.round(Math.min(Math.max(0, top), Math.max(0, a.contentHeight - a.viewportHeight))),
  };
}

/** -1 for a swipe to the next screen, 1 to the previous one, 0 for anything else. */
export function swipeStep(dx: number, dy: number, threshold = 48) {
  if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}
