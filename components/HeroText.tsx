import styles from "./HeroText.module.css";

const TITLE = ["O teu táxi.", "Mais inteligente."];
const SUBTITLE = ["A tecnologia que acompanha", "cada viagem."];

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
