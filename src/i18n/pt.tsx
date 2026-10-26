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
    paper: "Dinheiro fictício. Não é recomendação de investimento.",
  },

  nav: {
    home: "Início do GenWallet",
    pages: "Páginas",
    builder: "Montar carteira",
  },

  hero: {
    eyebrow: "EEL874 · Inteligência Artificial · UFRJ 2026/2",
    brief: (companies, sessions) =>
      `Um algoritmo genético escolhe ${companies} empresas do Ibovespa e opera a carteira ao vivo durante ${sessions} pregões da B3. Cada ordem é publicada antes da abertura em que ela é executada.`,
    build: "Montar uma carteira",
    discover: "Como funciona",
    background:
      "Atrás desta tela, um algoritmo genético de verdade escala um terreno de demonstração: cada ponto é um indivíduo, a altitude é o fitness, o verde são os picos e o vermelho os vales. O terreno muda a cada pregão. Clique para soltar imigrantes.",
    counter: (session, generation) => `pregão ${session} · geração ${generation}`,
  },

  what: {
    title: "Uma carteira é um cromossomo",
    lead: "Cada indivíduo da população é uma carteira: dez genes, cada um uma empresa e o seu peso. A população inteira evolui, e a melhor carteira de cada noite vira a ordem do pregão seguinte.",
    facts: {
      companies: "empresas por carteira, um papel de cada",
      sessions: (first, last) => `pregões ao vivo, de ${first} a ${last}`,
      population: "carteiras por geração",
      generations: (daily) => `gerações na primeira noite, ${daily} em cada uma das seguintes`,
    },
    figure: (min, max, cap) =>
      `Ilustração: um cromossomo. Pesos entre ${min}% e ${max}%, no máximo ${cap} empresas por setor; a cada poucos segundos um gene sofre mutação.`,
  },

  operators: {
    title: "Seleção, cruzamento, mutação",
    lead: "A cada geração, as carteiras disputam torneios, as vencedoras se cruzam e os filhos sofrem mutações. Um filho que quebra uma regra é consertado, nunca punido.",
    selection: {
      title: "Seleção por torneio",
      body: (size) =>
        `${size} carteiras são sorteadas e a de maior fitness vira mãe. O fitness é o índice de Sharpe descontado o custo de sair da carteira atual.`,
    },
    crossover: {
      title: "Cruzamento",
      body: "As empresas que os dois pais têm em comum ficam; as vagas livres vêm de um pai ou do outro, e os pesos se misturam.",
    },
    mutation: {
      title: "Mutação",
      body: (factor) =>
        `Uma empresa é trocada por outra de fora, ou um peso cresce às custas de outro. Quando a população fica parecida demais, a mutação fica ${factor} vezes mais forte.`,
    },
    labels: { parentA: "pai A", parentB: "pai B", child: "filho", shared: "em comum", winner: "vencedora" },
  },

  session: {
    title: "Um pregão, do fechamento à abertura",
    lead: "A população não morre de um dia para o outro: ela recebe imigrantes, reavalia todo mundo no terreno novo e volta a evoluir.",
    steps: {
      close: { title: "Fechamento", body: (lookback) => `Os preços do dia entram numa janela dos últimos ${lookback} pregões.` },
      evolve: {
        title: "Evolução",
        body: (generations, immigrants) =>
          `${generations} gerações a partir da população da véspera, mais ${immigrants}% de imigrantes e a carteira atual como candidata.`,
      },
      commit: { title: "Commit", body: "A decisão vai para a branch live do repositório. O horário do commit prova que ela veio antes da abertura." },
      open: { title: "Abertura", body: "A ordem é executada no preço de abertura, com taxas e deslizamento, em ações inteiras." },
      mark: { title: "Marcação", body: "A carteira é avaliada no fechamento, ao lado do BOVA11 e do CDI." },
    },
  },

  honesty: {
    title: "Feito para ser conferido",
    items: [
      { title: "Sem olhar para o futuro", body: "Decide com o fechamento e opera na abertura seguinte. Uma decisão atrasada vira um pregão perdido no registro." },
      { title: "Reprodutível", body: "Cada noite arquiva os dados e a semente. Qualquer pessoa pode rodar de novo e chegar à mesma carteira." },
      { title: "Comparado ao acaso", body: "Dez pregões é pouco. O resultado aparece ao lado de 10.000 carteiras aleatórias e do índice." },
      { title: "Custos de verdade", body: "Emolumentos, deslizamento e ações inteiras: nenhuma ordem sai de graça." },
    ],
    cta: {
      title: "Monte a sua",
      body: "Escolha os parâmetros iniciais e uma data no passado, e veja o algoritmo operar dez pregões no seu navegador.",
    },
  },

  footer: {
    project: "Projeto",
    stack: "Stack",
    licence: "Licença MIT",
    author: "Autor",
    authorName: "Lucas Pacheco",
    github: "GitHub",
    linkedin: "LinkedIn",
    course: "Disciplina",
    courseName: "EEL874 · Inteligência Artificial",
    term: "UFRJ · 2026/2",
    copyright: "© 2026",
  },
};
