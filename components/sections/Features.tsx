import styles from "./sections.module.css";

const ADJUSTMENTS = [
  {
    title: "Registo de corridas",
    text: "Só os campos de que precisas: valor, forma de pagamento, local ou quilómetros.",
  },
  {
    title: "Comissões e contas",
    text: "As percentagens e as regras da tua empresa, com dias úteis, fins de semana e feriados.",
  },
  {
    title: "Pagamentos",
    text: "Numerário, Multibanco, cartão ou MB WAY, separados como a contabilidade pede.",
  },
  {
    title: "Relatórios",
    text: "PDF e Excel no formato que a tua empresa ou o teu contabilista já usa.",
  },
  {
    title: "Mapa e zonas",
    text: "As zonas e as rotas que te interessam, a partir das corridas que registas.",
  },
  {
    title: "Aspeto",
    text: "Modo claro ou escuro, com as tuas cores e o teu logótipo.",
  },
];

export default function Features() {
  return (
    <section
      id="funcionalidades"
      className={styles.section}
      aria-labelledby="funcionalidades-title"
    >
      <div className={styles.split}>
        <h2 id="funcionalidades-title" className={styles.heading}>
          O que ajustamos contigo
        </h2>
        <p className={styles.lead}>
          Partimos do que a app já faz e mudamos o que for preciso para encaixar no teu dia.
        </p>
      </div>
      <dl className={styles.list}>
        {ADJUSTMENTS.map((item) => (
          <div key={item.title} className={styles.row}>
            <dt className={styles.term}>{item.title}</dt>
            <dd className={styles.detail}>{item.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
