import styles from "./sections.module.css";

const ADJUSTMENTS = [
  {
    title: "Registo de corridas",
    text: "Só os campos que usa: valor, forma de pagamento, origem e destino, quilómetros.",
  },
  {
    title: "Fecho de contas",
    text: "A sua percentagem e a da empresa, o gasóleo e as despesas, com as regras de dias úteis, fins de semana e feriados.",
  },
  {
    title: "Turnos e folgas",
    text: "Turnos de dia ou de noite, folgas e férias, para as médias e os objetivos contarem só os dias trabalhados.",
  },
  {
    title: "Pagamentos e recibos",
    text: "Numerário, Multibanco, MB WAY e crédito separados, como pedem a contabilidade e os recibos.",
  },
  {
    title: "Relatórios",
    text: "PDF e Excel no formato que a empresa ou o contabilista já usam.",
  },
  {
    title: "Viaturas e alvarás",
    text: "Várias viaturas e motoristas, com lembretes de inspeções, seguros e alvarás.",
  },
  {
    title: "Mapa e praças",
    text: "As zonas e as praças onde trabalha, a partir das corridas que regista.",
  },
  {
    title: "Aspeto",
    text: "Modo claro ou escuro, com as cores e o logótipo da sua empresa.",
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
          O que ajustamos para si
        </h2>
        <p className={styles.lead}>
          Partimos do que a aplicação já faz e mudamos o que for preciso para encaixar no seu dia
          na praça.
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
