"use client";

import { useEffect, useRef } from "react";
import { createHeroEngine } from "@/lib/hero/engine";
import CTA from "./CTA";
import HeroHud from "./HeroHud";
import HeroText from "./HeroText";
import ScrollVideo, { type ScrollVideoHandle } from "./ScrollVideo";
import styles from "./Hero.module.css";

export default function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const playerRef = useRef<ScrollVideoHandle>(null);

  useEffect(() => createHeroEngine(rootRef.current!, playerRef.current!), []);

  return (
    <section ref={rootRef} id="topo" className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.track} data-hero="track">
        <div className={styles.stage} data-hero="stage">
          <ScrollVideo ref={playerRef} />
          <div className={styles.scrim} data-hero="scrim" aria-hidden="true" />
          <HeroText />
          <p className="sr-only">
            Um Mercedes-Benz E250 táxi atravessa Lisboa, do amanhecer até à noite.
          </p>
          <HeroHud />
          <CTA />
        </div>
        <div className={styles.spacerVideo} data-hero="spacer-video" aria-hidden="true" />
        <div className={styles.spacerCta} data-hero="spacer-cta" aria-hidden="true" />
      </div>
    </section>
  );
}
