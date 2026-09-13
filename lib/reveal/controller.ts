import { createStyleWriter } from "@/lib/dom/styleWriter";
import { captionProgress, columnDelays, easeOut, REVEAL, revealProgress } from "./reveal";

/**
 * Reveals each app screen as it rises into view: the screen opens upwards from its
 * bottom edge while the capture settles from a slight zoom, then the caption
 * follows. Tied to the scroll position, so scrolling back closes the screens.
 * With reduced motion nothing is animated and every screen is simply visible.
 */
export function createScreenReveal(root: HTMLElement) {
  const html = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal="screen"]')).map(
    (screen) => ({
      media: screen.querySelector<HTMLElement>('[data-reveal="media"]')!,
      shot: screen.querySelector<HTMLElement>('[data-reveal="shot"]')!,
      caption: screen.querySelector<HTMLElement>('[data-reveal="caption"]')!,
    }),
  );

  const style = createStyleWriter();
  let delays = items.map(() => 0);
  let visible = false;
  let frame = 0;

  const enabled = () => !reducedMotion.matches && html.dataset.motion === "on";

  const measure = () => {
    delays = columnDelays(
      items.map(({ media }) => {
        const rect = media.getBoundingClientRect();
        return { top: rect.top, left: rect.left };
      }),
    );
  };

  const draw = () => {
    frame = 0;
    if (!enabled()) {
      style.clear();
      return;
    }
    const viewportHeight = window.innerHeight;
    const tops = items.map(({ media }) => media.getBoundingClientRect().top);
    items.forEach((item, i) => {
      const reveal = revealProgress(tops[i], viewportHeight, delays[i]);
      const open = easeOut(reveal);
      style.set(item.media, "clip-path", `inset(${((1 - open) * 100).toFixed(2)}% 0 0 0 round 6px)`);
      style.set(item.shot, "transform", `scale(${(REVEAL.zoom - (REVEAL.zoom - 1) * open).toFixed(4)})`);
      const caption = captionProgress(reveal);
      style.set(item.caption, "opacity", caption.toFixed(3));
      style.set(item.caption, "transform", `translate3d(0,${((1 - caption) * 10).toFixed(1)}px,0)`);
    });
  };

  const schedule = () => {
    if (visible && !frame) frame = requestAnimationFrame(draw);
  };

  const onResize = () => {
    measure();
    schedule();
  };

  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(root);

  const visibility = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    },
    { rootMargin: "20% 0px" },
  );
  visibility.observe(root);

  window.addEventListener("scroll", schedule, { passive: true });
  reducedMotion.addEventListener("change", draw);
  measure();
  draw();

  return () => {
    resizeObserver.disconnect();
    visibility.disconnect();
    window.removeEventListener("scroll", schedule);
    reducedMotion.removeEventListener("change", draw);
    cancelAnimationFrame(frame);
    style.clear();
  };
}
