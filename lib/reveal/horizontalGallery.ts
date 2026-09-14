export interface SlideTransform {
  scale: number;
  opacity: number;
  zIndex: number;
  brightness: number;
}

/**
 * Computes normalized scroll progress [0, 1] through a sticky pinned section.
 * - 0 when the top of the section enters the top of the viewport.
 * - 1 when the bottom of the section reaches the bottom of the viewport.
 */
export function computeGalleryProgress(
  rectTop: number,
  sectionHeight: number,
  viewportHeight: number,
): number {
  const scrollableDistance = sectionHeight - viewportHeight;
  if (scrollableDistance <= 0) return 0;
  const progress = -rectTop / scrollableDistance;
  return Math.max(0, Math.min(1, progress));
}

/**
 * Maps the fractional index progress to individual slide transformation properties.
 * Delta is (slideIndex - currentFractionalIndex).
 * Delta = 0 means perfectly centered (active).
 * Delta = ±1 means immediately adjacent.
 */
export function computeSlideTransform(delta: number): SlideTransform {
  const absDelta = Math.abs(delta);

  // Smooth easing for scale between 1.04 (center) and 0.74 (far)
  let scale: number;
  let opacity: number;
  let brightness: number;
  let zIndex: number;

  if (absDelta <= 1) {
    // Transition between center (0) and adjacent (1)
    const t = absDelta; // 0 to 1
    scale = 1.04 - t * 0.18; // 1.04 down to 0.86
    opacity = 1 - t * 0.38; // 1.0 down to 0.62
    brightness = 1 - t * 0.3; // 1.0 down to 0.70
    zIndex = Math.round(10 - t * 5); // 10 down to 5
  } else if (absDelta <= 2) {
    // Transition between adjacent (1) and far (2)
    const t = absDelta - 1; // 0 to 1
    scale = 0.86 - t * 0.12; // 0.86 down to 0.74
    opacity = 0.62 - t * 0.28; // 0.62 down to 0.34
    brightness = 0.7 - t * 0.25; // 0.70 down to 0.45
    zIndex = Math.max(1, Math.round(5 - t * 4)); // 5 down to 1
  } else {
    scale = 0.74;
    opacity = 0.25;
    brightness = 0.4;
    zIndex = 1;
  }

  return {
    scale: Number(scale.toFixed(4)),
    opacity: Number(opacity.toFixed(3)),
    zIndex,
    brightness: Number(brightness.toFixed(3)),
  };
}

/**
 * Calculates the target window scrollY to position a specific slide index at the center.
 */
export function calculateScrollYForIndex(
  index: number,
  totalSlides: number,
  sectionTopInDocument: number,
  sectionHeight: number,
  viewportHeight: number,
): number {
  if (totalSlides <= 1) return sectionTopInDocument;
  const targetFraction = Math.max(0, Math.min(1, index / (totalSlides - 1)));
  const scrollableDistance = sectionHeight - viewportHeight;
  return sectionTopInDocument + targetFraction * scrollableDistance;
}

export interface GalleryControllerOptions {
  root: HTMLElement;
  track: HTMLElement;
  slider: HTMLElement;
  slides: HTMLElement[];
  progressBar?: HTMLElement | null;
  onActiveIndexChange?: (index: number) => void;
}

export interface GalleryController {
  scrollToIndex: (index: number) => void;
  destroy: () => void;
}

/**
 * Initializes the horizontal scroll gallery controller.
 */
export function createHorizontalGalleryController({
  root,
  track,
  slider,
  slides,
  progressBar,
  onActiveIndexChange,
}: GalleryControllerOptions): GalleryController {
  const totalSlides = slides.length;
  if (totalSlides === 0) {
    return { scrollToIndex: () => {}, destroy: () => {} };
  }

  let stepX = 0;
  let firstSlideCenterOffset = 0;
  let sectionTopInDoc = 0;
  let sectionHeight = 0;
  let viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  let targetFractional = 0;
  let smoothFractional = 0;
  let lastReportedIndex = 0;
  let animFrame = 0;
  let isIntersecting = false;

  const reducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  function measure() {
    if (typeof window === "undefined") return;
    viewportHeight = window.innerHeight;
    const rect = track.getBoundingClientRect();
    const scrollY = window.scrollY;
    sectionTopInDoc = rect.top + scrollY;
    sectionHeight = rect.height;

    if (slides.length > 1) {
      stepX = slides[1].offsetLeft - slides[0].offsetLeft;
    } else {
      stepX = slides[0].offsetWidth;
    }
    firstSlideCenterOffset = slides[0].offsetLeft + slides[0].offsetWidth / 2;
  }

  function applySlideTransforms(fractionalIndex: number) {
    const centerX = window.innerWidth / 2;
    const currentCenter = firstSlideCenterOffset + fractionalIndex * stepX;
    const translateX = centerX - currentCenter;

    slider.style.transform = `translate3d(${translateX.toFixed(2)}px, 0, 0)`;

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const delta = i - fractionalIndex;
      const t = computeSlideTransform(delta);

      if (reducedMotion) {
        slide.style.transform = "none";
        slide.style.opacity = Math.abs(delta) < 0.5 ? "1" : "0.5";
        slide.style.zIndex = Math.abs(delta) < 0.5 ? "10" : "1";
        slide.style.filter = "none";
      } else {
        slide.style.transform = `scale(${t.scale})`;
        slide.style.opacity = `${t.opacity}`;
        slide.style.zIndex = `${t.zIndex}`;
        slide.style.filter = `brightness(${t.brightness})`;
      }

      if (Math.abs(delta) < 0.45) {
        slide.setAttribute("data-active", "true");
        slide.setAttribute("aria-hidden", "false");
      } else {
        slide.removeAttribute("data-active");
        slide.setAttribute("aria-hidden", "true");
      }
    }

    if (progressBar) {
      const progressPercent =
        totalSlides > 1 ? (fractionalIndex / (totalSlides - 1)) * 100 : 100;
      progressBar.style.width = `${Math.min(100, Math.max(0, progressPercent)).toFixed(1)}%`;
    }

    const roundedIndex = Math.max(0, Math.min(totalSlides - 1, Math.round(fractionalIndex)));
    if (roundedIndex !== lastReportedIndex) {
      lastReportedIndex = roundedIndex;
      if (onActiveIndexChange) {
        onActiveIndexChange(roundedIndex);
      }
    }
  }

  function update() {
    animFrame = 0;
    if (!isIntersecting) return;

    const rect = track.getBoundingClientRect();
    const progress = computeGalleryProgress(rect.top, sectionHeight, viewportHeight);
    targetFractional = progress * (totalSlides - 1);

    // Frame-rate independent lerp
    const diff = targetFractional - smoothFractional;
    if (Math.abs(diff) > 0.001) {
      smoothFractional += diff * 0.14;
      applySlideTransforms(smoothFractional);
      animFrame = requestAnimationFrame(update);
    } else {
      smoothFractional = targetFractional;
      applySlideTransforms(smoothFractional);
    }
  }

  function onScroll() {
    if (!animFrame) {
      animFrame = requestAnimationFrame(update);
    }
  }

  function onResize() {
    measure();
    const rect = track.getBoundingClientRect();
    const progress = computeGalleryProgress(rect.top, sectionHeight, viewportHeight);
    smoothFractional = targetFractional = progress * (totalSlides - 1);
    applySlideTransforms(smoothFractional);
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      isIntersecting = entry.isIntersecting;
      if (isIntersecting) {
        measure();
        onScroll();
      }
    },
    { rootMargin: "50px 0px" },
  );

  observer.observe(root);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });

  measure();
  applySlideTransforms(0);

  return {
    scrollToIndex(index: number) {
      measure();
      const targetY = calculateScrollYForIndex(
        index,
        totalSlides,
        sectionTopInDoc,
        sectionHeight,
        viewportHeight,
      );
      window.scrollTo({
        top: targetY,
        behavior: "smooth",
      });
    },
    destroy() {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (animFrame) cancelAnimationFrame(animFrame);
    },
  };
}

