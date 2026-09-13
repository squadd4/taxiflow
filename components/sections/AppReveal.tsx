"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createScreenReveal } from "@/lib/reveal/controller";
import { SCREENS, type Screen } from "@/lib/screens";
import ScreenViewer from "./ScreenViewer";
import styles from "./AppReveal.module.css";

function Shot({
  screen,
  index,
  side,
  onOpen,
}: {
  screen: Screen;
  index: number;
  side: "left" | "right";
  onOpen: (index: number) => void;
}) {
  const captionId = `ecra-${screen.id}`;
  const { small, base, large } = screen;
  return (
    <figure
      className={styles.screen}
      data-reveal="screen"
      data-feature={screen.feature}
      data-side={side}
      style={{ "--ratio": base.width / base.height } as CSSProperties}
    >
      <button
        type="button"
        className={styles.trigger}
        onClick={() => onOpen(index)}
        aria-haspopup="dialog"
        aria-label={`Ver em grande: ${screen.title}`}
        aria-describedby={captionId}
      >
        <span className={styles.media} data-reveal="media">
          <span className={styles.curtain} data-reveal="curtain">
            {/* eslint-disable-next-line @next/next/no-img-element -- sizes exported by scripts/prepare_screens.py */}
            <img
              className={styles.shot}
              data-reveal="shot"
              src={base.src}
              srcSet={`${small.src} ${small.width}w, ${base.src} ${base.width}w, ${large.src} ${large.width}w`}
              sizes={
                screen.feature
                  ? "(min-width: 1100px) 60vw, (min-width: 768px) 90vw, 100vw"
                  : "(min-width: 768px) 46vw, 100vw"
              }
              width={base.width}
              height={base.height}
              alt={screen.alt}
              loading="lazy"
              decoding="async"
            />
          </span>
          <span className={styles.zoom} aria-hidden="true">
            <svg viewBox="0 0 20 20" focusable="false">
              <path d="M8.5 3.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0-1.5a6.5 6.5 0 0 1 5.2 10.4l3.3 3.3-1.1 1.1-3.3-3.3A6.5 6.5 0 1 1 8.5 2Zm-.75 3.5h1.5v2.25h2.25v1.5H9.25V11.5h-1.5V9.25H5.5v-1.5h2.25z" />
            </svg>
            Ampliar
          </span>
        </span>
      </button>
      <figcaption id={captionId} className={styles.caption} data-reveal="caption">
        <span className={styles.number} aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className={styles.title}>{screen.title}</span>
        <span className={styles.text}>{screen.text}</span>
      </figcaption>
    </figure>
  );
}

export default function AppReveal() {
  const rootRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => createScreenReveal(rootRef.current!), []);

  let features = 0;
  return (
    <section ref={rootRef} id="plataforma" className={styles.section} aria-labelledby="plataforma-title">
      <div className={styles.intro}>
        <h2 id="plataforma-title" className={styles.heading}>
          Uma aplicação feita à medida da tua praça
        </h2>
        <p className={styles.lead}>
          Estes são ecrãs reais do Taxi Flow. A tua versão pode ter outros campos, outras contas e
          outro aspeto: decides tu. Carrega em qualquer ecrã para o ver em grande, com todo o
          detalhe.
        </p>
      </div>
      <div className={styles.wall}>
        {SCREENS.map((screen, index) => {
          const side = screen.feature && features++ % 2 === 1 ? "right" : "left";
          return <Shot key={screen.id} screen={screen} index={index} side={side} onOpen={setOpen} />;
        })}
      </div>
      <ScreenViewer screens={SCREENS} index={open} onIndexChange={setOpen} />
    </section>
  );
}
