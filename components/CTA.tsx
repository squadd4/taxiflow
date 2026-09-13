import { HERO_VIDEO } from "@/lib/site";
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
          Diz-nos como trabalhas. Nós fazemos a aplicação.
        </h2>
        <p className={styles.lead} data-hero="cta-item">
          Registo de corridas, fecho de contas e relatórios para a contabilidade, feitos à
          medida de motoristas e empresas de táxi.
        </p>
        <div className={styles.actions} data-hero="cta-item">
          <ButtonLink href="#contacto">Pedir orçamento</ButtonLink>
          <ButtonLink href="#plataforma" variant="secondary">
            Ver a aplicação
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
