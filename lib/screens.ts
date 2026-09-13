import manifest from "./screens.manifest.json";

export interface ScreenImage {
  src: string;
  width: number;
  height: number;
}

export interface Screen {
  id: string;
  title: string;
  text: string;
  alt: string;
  /** Feature screens take a wide column with the caption beside them. */
  feature: boolean;
  small: ScreenImage;
  base: ScreenImage;
  large: ScreenImage;
}

type Copy = Pick<Screen, "title" | "text" | "alt" | "feature">;

/**
 * Captions for every screen the page can show. Only screens exported by
 * scripts/prepare_screens.py (listed in screens.manifest.json) appear.
 */
const COPY: Record<string, Copy> = {
  painel: {
    feature: true,
    title: "Painel do dia",
    text: "Faturação bruta em direto, meta diária e as corridas do turno, com origem, destino e forma de pagamento.",
    alt: "Painel do Taxi Flow em modo escuro: faturação bruta de hoje de 164 euros, meta diária a 91 por cento e a lista das corridas do dia em Lisboa.",
  },
  mapa: {
    feature: false,
    title: "Mapa de faturação",
    text: "As zonas onde trabalhas, ordenadas pelo que rendem, da Baixa-Chiado ao aeroporto.",
    alt: "Mapa operacional da Grande Lisboa com os locais das corridas e a lista das zonas que mais faturam.",
  },
  historico: {
    feature: false,
    title: "Histórico por semana",
    text: "Dias trabalhados, corridas, quilómetros e euros por quilómetro, com o bruto e o valor da empresa lado a lado.",
    alt: "Histórico operacional com semanas de agosto e setembro, quilómetros, euros por quilómetro, valor bruto e valor para a empresa.",
  },
  estatisticas: {
    feature: true,
    title: "Estatísticas",
    text: "A evolução da faturação diária, as formas de pagamento e os dias da semana que mais rendem.",
    alt: "Estatísticas com média e recorde diários, gráfico da faturação diária, formas de pagamento e receita por dia da semana.",
  },
  saldos: {
    feature: false,
    title: "Fecho de contas",
    text: "O saldo com a empresa mês a mês, com o acumulado e os ajustes feitos à mão.",
    alt: "Saldos mensais com o último saldo acumulado de 182,45 euros e a evolução de julho a setembro.",
  },
  relatorios: {
    feature: false,
    title: "Relatórios para a contabilidade",
    text: "PDF completo, resumo para a empresa e folha Excel, com a percentagem do motorista, o gasóleo e as despesas.",
    alt: "Exportação de relatórios de setembro com corridas, faturação bruta, percentagem do motorista, gasóleo, despesas e quilómetros.",
  },
  frota: {
    feature: true,
    title: "Gestão de frota",
    text: "Para empresas: motoristas, viaturas, comissões e metas de cada perfil, cada um com o seu acesso.",
    alt: "Gestão de frota com três motoristas ativos, três viaturas, e a comissão e a meta diária de cada perfil.",
  },
  objetivos: {
    feature: false,
    title: "Objetivos e alertas",
    text: "Metas diárias e semanais, conquistas e lembretes das obrigações da viatura.",
    alt: "Objetivos com a meta diária a 91 por cento, a meta semanal cumprida, a definição de metas e as conquistas.",
  },
  "modo-claro": {
    feature: false,
    title: "Modo claro",
    text: "O mesmo painel com fundo claro, mais fácil de ler ao sol.",
    alt: "Painel do Taxi Flow em modo claro, com a faturação do dia e a lista de corridas.",
  },
  taxibot: {
    feature: true,
    title: "Bot de apoio",
    text: "Um assistente dentro da aplicação para tirar dúvidas sem sair do ecrã.",
    alt: "Assistente de apoio do Taxi Flow aberto dentro da aplicação.",
  },
};

export const SCREENS: Screen[] = manifest.flatMap((entry) => {
  const copy = COPY[entry.id];
  return copy ? [{ id: entry.id, ...copy, small: entry.small, base: entry.base, large: entry.large }] : [];
});
