import styles from "./Logo.module.css";

/** The Taxi Flow navigation arrow: roof-green upper blade, light lower blade. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M29 3 3 13.6l11.4 3.9z" fill="var(--green)" />
      <path d="M29 3 14.4 17.5 18.4 29z" fill="currentColor" />
    </svg>
  );
}

export default function Logo({ className }: { className?: string }) {
  return (
    <span className={`${styles.logo} ${className ?? ""}`}>
      <LogoMark className={styles.mark} />
      <span className={styles.word}>
        <span className={styles.taxi}>Taxi</span>
        <span className={styles.flow}>Flow</span>
      </span>
    </span>
  );
}
