import styles from "./sections.module.css";

const STEPS = [
  {
    title: "Conversamos",
    text: "Contas-nos como é o teu turno, como recebes e que contas tens de entregar.",
  },
  {
    title: "Preparamos a primeira versão",
    text: "Montamos a app com as tuas regras e revemos contigo o que ainda falta mudar.",
  },
  {
    title: "Começas a usar",
    text: "Instalas no telemóvel ou abres no computador. Continua a funcionar sem rede.",
  },
  {
    title: "Ajustamos pelo caminho",
    text: "Quando o teu trabalho muda, a app muda também.",
  },
];

export default function HowItWorks() {
  return (
    <section id="como-funciona" className={styles.section} aria-labelledby="como-funciona-title">
      <h2 id="como-funciona-title" className={styles.heading}>
        Como fazemos a tua app
      </h2>
      <ol className={styles.list}>
        {STEPS.map((step, i) => (
          <li key={step.title} className={`${styles.row} ${styles.step}`}>
            <span className={styles.stepNumber} aria-hidden="true">
              {i + 1}
            </span>
            <h3 className={styles.term}>{step.title}</h3>
            <p className={styles.detail}>{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
