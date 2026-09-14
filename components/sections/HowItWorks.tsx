import styles from "./sections.module.css";

const STEPS = [
  {
    title: "Falamos consigo",
    text: "Explica-nos como são os seus turnos, como recebe e que contas tem de entregar à empresa.",
  },
  {
    title: "Montamos a primeira versão",
    text: "Com as suas regras de comissões e despesas. Revemos tudo consigo antes de a colocar a trabalhar.",
  },
  {
    title: "Começa a usar",
    text: "No telemóvel ou no computador. Continua a funcionar sem rede e sincroniza quando a ligação volta.",
  },
  {
    title: "Ajustamos pelo caminho",
    text: "Mudou a comissão, entrou um motorista ou chegou uma viatura nova? A aplicação acompanha.",
  },
];

export default function HowItWorks() {
  return (
    <section id="como-funciona" className={styles.section} aria-labelledby="como-funciona-title">
      <h2 id="como-funciona-title" className={styles.heading}>
        Como trabalhamos
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
