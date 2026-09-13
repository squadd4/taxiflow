import { createStyleWriter } from "@/lib/dom/styleWriter";
import { follow, type FollowOptions } from "@/lib/motion/follow";
import { captionProgress, columnDelays, easeOut, REVEAL, revealProgress } from "./reveal";

const SMOOTHING: Omit<FollowOptions, "far"> = { halfLife: 0.075, fastHalfLife: 0.035, epsilon: 0.3 };

/**
 * Reveals each app screen as it rises into view: a curtain slides down to uncover
 * the screen from its bottom edge while the capture settles from a slight zoom,
 * then the caption follows.
 *
 * Built for steady frame rates:
 * - only `transform` and `opacity` change, so the browser composites instead of
 *   repainting;
 * - layout is read on resize, never while scrolling;
 * - the scroll position is smoothed with a frame-rate independent follow, so
 *   wheel notches glide and 120 Hz screens move exactly like 60 Hz ones;
 * - the loop stops as soon as everything has settled.
 *
 * Scrolling back closes the screens again. With reduced motion nothing animates.
 */
export function createScreenReveal(root: HTMLElement) {
  const html = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const part = (screen: Element, name: string) =>
    screen.querySelector<HTMLElement>(`[data-reveal="${name}"]`)!;
  const items = Array.from(root.querySelectorAll('[data-reveal="screen"]')).map((screen) => ({
    media: part(screen, "media"),
    curtain: part(screen, "curtain"),
    shot: part(screen, "shot"),
    caption: part(screen, "caption"),
    /** Top of the screen in document coordinates. */
    top: 0,
  }));

  const style = createStyleWriter();
  let delays = items.map(() => 0);
  let viewportHeight = window.innerHeight;
  let targetY = window.scrollY;
  let smoothY = targetY;
  let visible = false;
  let frame = 0;
  let lastTime = 0;

  const enabled = () => !reducedMotion.matches && html.dataset.motion === "on";

  const measure = () => {
    const scrollY = window.scrollY;
    viewportHeight = window.innerHeight;
    delays = columnDelays(
      items.map((item) => {
        const rect = item.media.getBoundingClientRect();
        item.top = rect.top + scrollY;
        return { top: rect.top, left: rect.left };
      }),
    );
  };

  const render = (y: number) => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const reveal = revealProgress(item.top - y, viewportHeight, delays[i]);
      const hidden = 1 - easeOut(reveal);
      const zoom = 1 + (REVEAL.zoom - 1) * hidden;
      style.set(item.curtain, "transform", `translate3d(0,${(hidden * 100).toFixed(3)}%,0)`);
      style.set(
        item.shot,
        "transform",
        `translate3d(0,${(-hidden * 100).toFixed(3)}%,0) scale(${zoom.toFixed(4)})`,
      );
      const caption = captionProgress(reveal);
      style.set(item.caption, "opacity", caption.toFixed(3));
      style.set(item.caption, "transform", `translate3d(0,${((1 - caption) * 12).toFixed(2)}px,0)`);
    }
  };

  const tick = (time: number) => {
    frame = 0;
    if (!enabled()) {
      style.clear();
      lastTime = 0;
      return;
    }
    const dt = lastTime ? Math.min(0.1, (time - lastTime) / 1000) : 1 / 60;
    smoothY = follow(smoothY, targetY, dt, { ...SMOOTHING, far: viewportHeight });
    render(smoothY);
    if (smoothY !== targetY && visible) {
      lastTime = time;
      frame = requestAnimationFrame(tick);
    } else {
      lastTime = 0;
    }
  };

  const schedule = () => {
    if (visible && !frame) frame = requestAnimationFrame(tick);
  };

  // Scroll events arrive before animation frames, when layout is already clean.
  const onScroll = () => {
    targetY = window.scrollY;
    if (!visible) smoothY = targetY;
    schedule();
  };

  const onResize = () => {
    measure();
    targetY = smoothY = window.scrollY;
    if (visible && enabled()) render(smoothY);
  };

  // The section moves when anything above it changes height, so watch the document too.
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(root);
  resizeObserver.observe(html);

  const visibility = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      root.dataset.revealing = String(visible);
      if (visible) {
        targetY = window.scrollY;
        schedule();
      }
    },
    { rootMargin: "25% 0px" },
  );
  visibility.observe(root);

  window.addEventListener("scroll", onScroll, { passive: true });
  reducedMotion.addEventListener("change", onResize);
  measure();
  if (enabled()) render(smoothY);

  return () => {
    resizeObserver.disconnect();
    visibility.disconnect();
    window.removeEventListener("scroll", onScroll);
    reducedMotion.removeEventListener("change", onResize);
    cancelAnimationFrame(frame);
    style.clear();
    delete root.dataset.revealing;
  };
}
