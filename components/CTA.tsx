import { APP_URL, HERO_VIDEO } from "@/lib/site";
import ButtonLink from "./ButtonLink";
import Logo from "./Logo";
import styles from "./CTA.module.css";

export default function CTA() {
  return (
    <section className={styles.cta} data-hero="cta" aria-labelledby="cta-title">
      {/* eslint-disable-next-line @next/next/no-img-element -- static-layout backdrop, hidden in the cinematic layout */}
      <img
        className={styles.backdrop}
        src={HERO_VIDEO.posterEnd}
        srcSet={`${HERO_VIDEO.posterEndSmall} 960w, ${HERO_VIDEO.posterEnd} 1920w`}
        sizes="100vw"
        width={1920}
        height={1080}
        alt=""
        loading="lazy"
        decoding="async"
      />
      <div className={styles.inner}>
        <p className={styles.eyebrow} data-hero="brand">
          <Logo />
        </p>
        <h2 id="cta-title" className={styles.title} data-hero="cta-item">
          O teu próximo nível começa aqui.
        </h2>
        <p className={styles.lead} data-hero="cta-item">
          Gestão de corridas, contas e operação do teu táxi — simples, inteligente e
          sempre contigo.
        </p>
        <div className={styles.actions} data-hero="cta-item">
          <ButtonLink href={APP_URL}>Entrar no Taxi Flow</ButtonLink>
          <ButtonLink href="#plataforma" variant="secondary">
            Conhecer a plataforma
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
