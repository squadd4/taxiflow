import styles from "./HeroHud.module.css";

/** Shift clock and progress rail. Decorative: the story is carried by the headings. */
export default function HeroHud() {
  return (
    <div className={styles.hud} data-hero="hud" aria-hidden="true">
      <p className={styles.clock}>
        <span data-hero="clock">07:12</span>
        <span className={styles.city}>Lisboa</span>
      </p>
      <span className={styles.rail}>
        <span className={styles.fill} data-hero="rail" />
      </span>
      <p className={styles.hint} data-hero="hint">
        Desliza para conduzir
      </p>
    </div>
  );
}
