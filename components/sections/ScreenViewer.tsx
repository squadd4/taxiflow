"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { anchorScroll, swipeStep, wrapIndex } from "@/lib/lightbox/viewer";
import type { Screen } from "@/lib/screens";
import styles from "./ScreenViewer.module.css";

interface ScreenViewerProps {
  screens: Screen[];
  /** Screen on show, or null when the viewer is closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
}

/** Zoomed width relative to the fitted image, capped a little past the large file's pixels. */
const ZOOM = 2;

interface Anchor {
  fx: number;
  fy: number;
  pointerX: number;
  pointerY: number;
}

interface Drag {
  x: number;
  y: number;
  left: number;
  top: number;
  moved: boolean;
  mouse: boolean;
}

/**
 * Full-screen viewer for the app screens, built on the native modal <dialog>:
 * focus stays inside, Escape closes, and focus returns to the screen that opened it.
 * Click or Enter zooms into the high-resolution capture around the clicked point;
 * drag or scroll to look around. Arrows and swipes move between screens.
 */
export default function ScreenViewer({ screens, index, onIndexChange }: ScreenViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const anchor = useRef<Anchor | null>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [zoomWidth, setZoomWidth] = useState<number | null>(null);

  const screen = index === null ? null : screens[index];
  const zoomed = zoomWidth !== null;
  const count = screens.length;

  useEffect(() => {
    const dialog = dialogRef.current!;
    if (index !== null && !dialog.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      document.documentElement.dataset.viewerOpen = "true";
      dialog.showModal();
    } else if (index === null && dialog.open) {
      dialog.close();
    }
  }, [index]);

  // Neighbouring screens load in the background so moving between them is instant.
  useEffect(() => {
    if (index === null || count < 2) return;
    for (const step of [1, -1]) new Image().src = screens[wrapIndex(index, step, count)].large.src;
  }, [index, count, screens]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const image = imageRef.current;
    const point = anchor.current;
    if (!zoomed || !viewport || !image || !point) return;
    anchor.current = null;
    const { left, top } = anchorScroll({
      ...point,
      contentWidth: viewport.scrollWidth,
      contentHeight: viewport.scrollHeight,
      offsetX: image.offsetLeft,
      offsetY: image.offsetTop,
      viewportWidth: viewport.clientWidth,
      viewportHeight: viewport.clientHeight,
    });
    viewport.scrollTo(left, top);
  }, [zoomed]);

  const go = (step: number) => {
    if (index === null) return;
    setZoomWidth(null);
    onIndexChange(wrapIndex(index, step, count));
  };

  const close = () => dialogRef.current?.close();

  const onClose = () => {
    delete document.documentElement.dataset.viewerOpen;
    setZoomWidth(null);
    onIndexChange(null);
    returnFocus.current?.focus({ preventScroll: true });
    returnFocus.current = null;
  };

  const zoomAt = (clientX: number, clientY: number) => {
    const viewport = viewportRef.current;
    const image = imageRef.current;
    if (!viewport || !image || !screen) return;
    const rect = image.getBoundingClientRect();
    const box = viewport.getBoundingClientRect();
    anchor.current = {
      fx: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      fy: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
      pointerX: clientX - box.left,
      pointerY: clientY - box.top,
    };
    const width = Math.max(rect.width * 1.5, Math.min(rect.width * ZOOM, screen.large.width * 1.25));
    setZoomWidth(Math.round(width));
  };

  const zoomCentre = () => {
    const image = imageRef.current;
    if (!image) return;
    const rect = image.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const onImageClick = (event: MouseEvent<HTMLImageElement>) => {
    event.stopPropagation();
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (zoomed) setZoomWidth(null);
    else zoomAt(event.clientX, event.clientY);
  };

  // A click on the empty space around the screen steps back: zoom out, then close.
  const onViewportClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (zoomed) setZoomWidth(null);
    else close();
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const viewport = event.currentTarget;
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      left: viewport.scrollLeft,
      top: viewport.scrollTop,
      moved: false,
      mouse: event.pointerType === "mouse",
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.moved && Math.hypot(dx, dy) > 6) {
      current.moved = true;
      if (zoomed && current.mouse) event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (current.moved && zoomed && current.mouse) {
      event.currentTarget.scrollLeft = current.left - dx;
      event.currentTarget.scrollTop = current.top - dy;
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    drag.current = null;
    if (!current?.moved) return;
    suppressClick.current = true;
    if (!zoomed) {
      const step = swipeStep(event.clientX - current.x, event.clientY - current.y);
      if (step) go(step);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (!zoomed && event.key === "ArrowRight") go(1);
    else if (!zoomed && event.key === "ArrowLeft") go(-1);
    else if (event.key === "+" || event.key === "=") {
      if (!zoomed) zoomCentre();
    } else if (event.key === "-" || event.key === "0") setZoomWidth(null);
    else return;
    event.preventDefault();
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.viewer}
      aria-labelledby="visualizador-titulo"
      aria-describedby="visualizador-legenda"
      onClose={onClose}
      onKeyDown={onKeyDown}
    >
      {screen && index !== null && (
        <>
          <header className={styles.bar}>
            <p id="visualizador-titulo" className={styles.heading}>
              <span className={styles.count}>
                {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
              </span>
              <span className={styles.title}>{screen.title}</span>
            </p>
            <div className={styles.tools}>
              <button
                type="button"
                className={styles.tool}
                onClick={() => (zoomed ? setZoomWidth(null) : zoomCentre())}
              >
                {zoomed ? "Ajustar ao ecrã" : "Ampliar"}
              </button>
              <button type="button" className={styles.close} onClick={close} aria-label="Fechar">
                <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                  <path d="m5 5 10 10M15 5 5 15" />
                </svg>
              </button>
            </div>
          </header>

          <div
            ref={viewportRef}
            className={styles.viewport}
            data-zoomed={zoomed}
            onClick={onViewportClick}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (drag.current = null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- high-resolution capture exported by scripts/prepare_screens.py */}
            <img
              ref={imageRef}
              key={screen.id}
              className={styles.image}
              src={screen.large.src}
              width={screen.large.width}
              height={screen.large.height}
              alt={screen.alt}
              draggable={false}
              decoding="async"
              onClick={onImageClick}
              style={{
                backgroundImage: `url(${screen.base.src})`,
                ...(zoomed ? { width: zoomWidth } : null),
              }}
            />
          </div>

          <p id="visualizador-legenda" className={styles.caption}>
            {screen.text}
            <span className={styles.help}>
              {zoomed ? " Arrasta para ver o resto do ecrã." : " Carrega na imagem para ampliar."}
            </span>
          </p>

          {count > 1 && (
            <>
              <button
                type="button"
                className={`${styles.nav} ${styles.prev}`}
                onClick={() => go(-1)}
                aria-label="Ecrã anterior"
              >
                <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                  <path d="m12.5 4-6 6 6 6" />
                </svg>
              </button>
              <button
                type="button"
                className={`${styles.nav} ${styles.next}`}
                onClick={() => go(1)}
                aria-label="Ecrã seguinte"
              >
                <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                  <path d="m7.5 4 6 6-6 6" />
                </svg>
              </button>
            </>
          )}
        </>
      )}
    </dialog>
  );
}
