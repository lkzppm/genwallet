// Portuguese interface strings: every key of `en.tsx`, in the course's
// language. No em dash in anything the visitor reads.
import type { Dictionary } from "./index";

export const pt: Dictionary = {
  lang: "pt-BR",
  name: "Português",
  short: "PT",

  common: {
    language: "Idioma",
    themeLight: "Mudar para o tema claro",
    themeDark: "Mudar para o tema escuro",
    source: "Código no GitHub",
    record: "Registro ao vivo",
  },

  home: {
    eyebrow: "UFRJ · Inteligência Artificial",
    tagline: (companies, sessions) =>
      `Um algoritmo genético monta uma carteira com ${companies} empresas do Ibovespa e a opera ao vivo durante ${sessions} pregões da B3. Cada ordem é publicada antes da abertura do pregão em que ela é executada.`,
    facts: {
      companies: "empresas do Ibovespa, no máximo um papel de cada",
      sessions: (first, last) => `pregões, de ${first} a ${last}`,
      population: "carteiras por geração; a população sobrevive de um pregão para o outro",
    },
    background:
      "Ao fundo roda um algoritmo genético de verdade num terreno de demonstração: cada ponto é um indivíduo, a altitude é o fitness, o verde são os picos e o vermelho os vales. O terreno muda a cada pregão. Clique para soltar imigrantes.",
    counter: (session, generation) => `pregão ${session} · geração ${generation}`,
    paper: "Dinheiro fictício. Não é recomendação de investimento.",
  },
};
