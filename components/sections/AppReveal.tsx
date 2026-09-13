"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { createScreenReveal } from "@/lib/reveal/controller";
import styles from "./AppReveal.module.css";

interface Screen {
  id: string;
  src: string;
  small?: string;
  width: number;
  height: number;
  title: string;
  text: string;
  alt: string;
}

/** Captures exported by scripts/prepare_screens.py. */
const SCREENS = {
  hoje: {
    id: "hoje",
    src: "/images/app/hoje.webp",
    small: "/images/app/hoje-960.webp",
    width: 1600,
    height: 757,
    title: "Hoje",
    text: "Faturação, meta do dia e corridas em direto.",
    alt: "Ecrã Hoje da app Taxi Flow, com a faturação do dia, a meta diária e a lista de corridas.",
  },
  mapa: {
    id: "mapa",
    src: "/images/app/mapa.webp",
    small: "/images/app/mapa-960.webp",
    width: 1440,
    height: 754,
    title: "Mapa",
    text: "As zonas onde trabalhas e quanto rende cada uma.",
    alt: "Mapa com as localizações das corridas entre Leiria e Torres Vedras e a lista das zonas que mais faturam.",
  },
  historico: {
    id: "historico",
    src: "/images/app/historico.webp",
    small: "/images/app/historico-960.webp",
    width: 1600,
    height: 764,
    title: "Histórico",
    text: "Semanas, meses e anos, com quilómetros e férias.",
    alt: "Ecrã Histórico com as corridas agrupadas por semana, valores brutos e valores para a empresa.",
  },
  estatisticas: {
    id: "estatisticas",
    src: "/images/app/estatisticas.webp",
    width: 557,
    height: 762,
    title: "Estatísticas",
    text: "Aqui em modo claro.",
    alt: "Estatísticas do ano em modo claro: faturação, quilómetros, gráfico diário e formas de pagamento.",
  },
  relatorios: {
    id: "relatorios",
    src: "/images/app/relatorios.webp",
    small: "/images/app/relatorios-960.webp",
    width: 995,
    height: 825,
    title: "Relatórios",
    text: "PDF e Excel prontos a enviar.",
    alt: "Ecrã de exportação com a pré-visualização do mês e botões para descarregar PDF e Excel.",
  },
} satisfies Record<string, Screen>;

function Shot({ screen }: { screen: Screen }) {
  return (
    <figure
      className={styles.screen}
      data-reveal="screen"
      data-screen={screen.id}
      style={{ "--ratio": screen.width / screen.height } as CSSProperties}
    >
      <div className={styles.media} data-reveal="media">
        {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP exported by scripts/prepare_screens.py */}
        <img
          className={styles.shot}
          data-reveal="shot"
          src={screen.src}
          srcSet={screen.small ? `${screen.small} 960w, ${screen.src} ${screen.width}w` : undefined}
          sizes="(min-width: 768px) 50vw, 100vw"
          width={screen.width}
          height={screen.height}
          alt={screen.alt}
          loading="lazy"
          decoding="async"
        />
      </div>
      <figcaption className={styles.caption} data-reveal="caption">
        <span className={styles.captionTitle}>{screen.title}</span> {screen.text}
      </figcaption>
    </figure>
  );
}

export default function AppReveal() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => createScreenReveal(rootRef.current!), []);

  return (
    <section ref={rootRef} id="plataforma" className={styles.section} aria-labelledby="plataforma-title">
      <div className={styles.intro}>
        <h2 id="plataforma-title" className={styles.heading}>
          Fazemos a app como tu a quiseres
        </h2>
        <p className={styles.lead}>
          Isto é o Taxi Flow a funcionar todos os dias. A tua versão pode ser diferente:
          escolhes o que registas, como se fazem as contas e o que aparece no ecrã.
        </p>
      </div>
      <div className={styles.wall}>
        <div className={styles.row}>
          <Shot screen={SCREENS.hoje} />
          <Shot screen={SCREENS.mapa} />
        </div>
        <div className={styles.row}>
          <Shot screen={SCREENS.historico} />
          <Shot screen={SCREENS.estatisticas} />
          <Shot screen={SCREENS.relatorios} />
        </div>
      </div>
    </section>
  );
}
