"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  createHorizontalGalleryController,
  type GalleryController,
} from "@/lib/reveal/horizontalGallery";
import { SCREENS, type Screen } from "@/lib/screens";
import ScreenViewer from "./ScreenViewer";
import styles from "./AppReveal.module.css";

function GallerySlide({
  screen,
  index,
  isActive,
  onOpen,
  onFocusSlide,
}: {
  screen: Screen;
  index: number;
  isActive: boolean;
  onOpen: (index: number) => void;
  onFocusSlide: (index: number) => void;
}) {
  const { small, base, large } = screen;
  const captionId = `ecra-${screen.id}`;

  return (
    <div
      className={styles.slide}
      data-gallery-slide="true"
      data-active={isActive ? "true" : "false"}
      style={{ "--ratio": base.width / base.height } as CSSProperties}
    >
      <div
        className={styles.card}
        onClick={() => {
          if (isActive) {
            onOpen(index);
          } else {
            onFocusSlide(index);
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (isActive) {
              onOpen(index);
            } else {
              onFocusSlide(index);
            }
          }
        }}
        aria-label={`${screen.title} (Ecrã ${index + 1} de ${SCREENS.length})`}
        aria-describedby={captionId}
      >
        <div className={styles.media}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.shot}
            src={base.src}
            srcSet={`${small.src} ${small.width}w, ${base.src} ${base.width}w, ${large.src} ${large.width}w`}
            sizes="(min-width: 1200px) 720px, (min-width: 768px) 60vw, 82vw"
            width={base.width}
            height={base.height}
            alt={screen.alt}
            loading={index <= 2 ? "eager" : "lazy"}
            decoding="async"
          />

          {/* Glowing frame overlay */}
          <div className={styles.frame} aria-hidden="true" />

          {/* Bottom badge inspired by image_05c158.png with zoom/view icon */}
          <div className={styles.badge} aria-hidden="true">
            <span className={styles.badgeIcon}>
              <svg viewBox="0 0 20 20" focusable="false">
                <path d="M8.5 3.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0-1.5a6.5 6.5 0 0 1 5.2 10.4l3.3 3.3-1.1 1.1-3.3-3.3A6.5 6.5 0 1 1 8.5 2Zm-.75 3.5h1.5v2.25h2.25v1.5H9.25V11.5h-1.5V9.25H5.5v-1.5h2.25z" />
              </svg>
            </span>
            <span className={styles.badgeText}>Ampliar</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppReveal() {
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<GalleryController | null>(null);

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (!rootRef.current || !trackRef.current || !sliderRef.current) return;

    const slideElements = Array.from(
      sliderRef.current.querySelectorAll<HTMLElement>('[data-gallery-slide="true"]'),
    );

    const controller = createHorizontalGalleryController({
      root: rootRef.current,
      track: trackRef.current,
      slider: sliderRef.current,
      slides: slideElements,
      progressBar: progressBarRef.current,
      onActiveIndexChange: (idx) => {
        setActiveIndex(idx);
      },
    });

    controllerRef.current = controller;

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, []);

  const currentScreen = SCREENS[activeIndex] ?? SCREENS[0];

  const handlePrev = () => {
    if (activeIndex > 0 && controllerRef.current) {
      controllerRef.current.scrollToIndex(activeIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeIndex < SCREENS.length - 1 && controllerRef.current) {
      controllerRef.current.scrollToIndex(activeIndex + 1);
    }
  };

  const handleFocusSlide = (idx: number) => {
    if (controllerRef.current) {
      controllerRef.current.scrollToIndex(idx);
    }
  };

  return (
    <section
      ref={rootRef}
      id="plataforma"
      className={styles.section}
      aria-labelledby="plataforma-title"
    >
      {/* Scroll track providing vertical scroll distance for pinning */}
      <div
        ref={trackRef}
        className={styles.scrollTrack}
        style={{ height: `calc(100vh + ${(SCREENS.length - 1) * 65}vh)` }}
      >
        {/* Sticky stage staying locked to viewport while user scrolls through */}
        <div className={styles.stickyStage}>
          {/* Subtle atmospheric ambient glow */}
          <div className={styles.ambientGlow} aria-hidden="true" />

          {/* Section Header */}
          <div className={styles.header}>
            <div className={styles.headerMain}>
              <span className={styles.tag}>Ecrãs do Produto</span>
              <h2 id="plataforma-title" className={styles.heading}>
                Uma aplicação feita à sua medida
              </h2>
              <p className={styles.lead}>
                Estes são ecrãs reais do Taxi Flow. A sua versão pode ter outros campos, outras
                contas e outro aspeto: decide você. Carregue em qualquer ecrã para o ver em grande,
                com todo o detalhe.
              </p>
            </div>

            {/* Navigation Controls: Counter and Chevrons */}
            <div className={styles.controls}>
              <div
                className={styles.counter}
                aria-live="polite"
                aria-label={`Ecrã ${activeIndex + 1} de ${SCREENS.length}`}
              >
                <span className={styles.counterCurrent}>
                  {String(activeIndex + 1).padStart(2, "0")}
                </span>
                <span className={styles.counterSep}>/</span>
                <span className={styles.counterTotal}>
                  {String(SCREENS.length).padStart(2, "0")}
                </span>
              </div>

              <div className={styles.navButtons}>
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={handlePrev}
                  disabled={activeIndex === 0}
                  aria-label="Ecrã anterior"
                >
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path
                      d="M15 19l-7-7 7-7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={handleNext}
                  disabled={activeIndex === SCREENS.length - 1}
                  aria-label="Próximo ecrã"
                >
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path
                      d="M9 5l7 7-7 7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Thin glowing progress line */}
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuenow={activeIndex + 1}
            aria-valuemin={1}
            aria-valuemax={SCREENS.length}
          >
            <div ref={progressBarRef} className={styles.progressBar} />
          </div>

          {/* Carousel Viewport and Sliding Stage */}
          <div className={styles.viewport}>
            <div ref={sliderRef} className={styles.slider}>
              {SCREENS.map((screen, index) => (
                <GallerySlide
                  key={screen.id}
                  screen={screen}
                  index={index}
                  isActive={index === activeIndex}
                  onOpen={setOpen}
                  onFocusSlide={handleFocusSlide}
                />
              ))}
            </div>
          </div>

          {/* Active Screen Info / Legend below the carousel */}
          <div className={styles.captionContainer}>
            <div className={styles.captionContent} key={currentScreen.id}>
              <div className={styles.captionBadge}>
                <span className={styles.captionIndex}>
                  {String(activeIndex + 1).padStart(2, "0")}
                </span>
                <span className={styles.captionTitle}>{currentScreen.title}</span>
              </div>
              <p className={styles.captionText}>{currentScreen.text}</p>
            </div>
            <button
              type="button"
              className={styles.zoomAction}
              onClick={() => setOpen(activeIndex)}
              aria-label={`Ver ${currentScreen.title} em ecrã inteiro`}
            >
              <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
                <path d="M8.5 3.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0-1.5a6.5 6.5 0 0 1 5.2 10.4l3.3 3.3-1.1 1.1-3.3-3.3A6.5 6.5 0 1 1 8.5 2Zm-.75 3.5h1.5v2.25h2.25v1.5H9.25V11.5h-1.5V9.25H5.5v-1.5h2.25z" />
              </svg>
              <span>Ver em grande detalhe</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Viewer */}
      <ScreenViewer screens={SCREENS} index={open} onIndexChange={setOpen} />
    </section>
  );
}
