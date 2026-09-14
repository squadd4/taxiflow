import styles from "./HeroText.module.css";

const TITLE = ["Feito para a estrada.", "E para quem a conhece."];
const SUBTITLE = ["Corridas, turnos e contas", "numa aplicação à sua medida."];

export default function HeroText() {
  return (
    <hgroup className={styles.text}>
      <h1 id="hero-title" className={styles.title}>
        {TITLE.map((line) => (
          <span key={line} className={styles.line} data-hero="h1-line">
            {line}{" "}
          </span>
        ))}
      </h1>
      <p className={styles.subtitle}>
        {SUBTITLE.map((line) => (
          <span key={line} className={styles.line} data-hero="h2-line">
            {line}{" "}
          </span>
        ))}
      </p>
    </hgroup>
  );
}
