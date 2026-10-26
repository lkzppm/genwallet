// English interface strings. This object is the schema every other language
// must match (see `index.ts`). Functions take the values a sentence needs
// so word order stays each language's business. No em dash in anything the
// visitor reads: a comma, a colon or a full stop takes its place.

export const en = {
  lang: "en",
  name: "English",
  short: "EN",

  common: {
    language: "Language",
    themeLight: "Switch to the light theme",
    themeDark: "Switch to the dark theme",
    source: "Source on GitHub",
    record: "Live record",
    paper: "Paper money. Not investment advice.",
  },

  nav: {
    home: "GenWallet home",
    pages: "Pages",
    builder: "Build a portfolio",
  },

  hero: {
    eyebrow: "EEL874 · Artificial Intelligence · UFRJ 2026/2",
    brief: (companies: number, sessions: number) =>
      `A genetic algorithm picks ${companies} Ibovespa companies and trades the portfolio live over ${sessions} B3 sessions. Every order is published before the open it trades on.`,
    build: "Build a portfolio",
    discover: "How it works",
    background:
      "Behind this screen a real genetic algorithm climbs a demo landscape: each dot is an individual, height is fitness, green are the peaks and red the pits. The landscape moves every session. Click to drop immigrants.",
    counter: (session: number, generation: number) => `session ${session} · generation ${generation}`,
  },

  what: {
    title: "A portfolio is a chromosome",
    lead: "Every individual in the population is a portfolio: ten genes, each a company and its weight. The whole population evolves, and each evening's best portfolio becomes the next session's order.",
    facts: {
      companies: "companies per portfolio, one ticker each",
      sessions: (first: string, last: string) => `live sessions, ${first} to ${last}`,
      population: "portfolios per generation",
      generations: (daily: number) => `generations on the first evening, ${daily} on each one after`,
    },
    figure: (min: number, max: number, cap: number) =>
      `Illustration: one chromosome. Weights between ${min}% and ${max}%, at most ${cap} companies per sector; every few seconds one gene mutates.`,
  },

  operators: {
    title: "Selection, crossover, mutation",
    lead: "Every generation, portfolios meet in tournaments, the winners breed and the children mutate. A child that breaks a rule is repaired, never punished.",
    selection: {
      title: "Tournament selection",
      body: (size: number) =>
        `${size} portfolios are drawn and the fittest becomes a parent. Fitness is the Sharpe ratio net of the cost of leaving the current portfolio.`,
    },
    crossover: {
      title: "Crossover",
      body: "The companies both parents hold are kept; the free slots come from one parent or the other, and the weights are blended.",
    },
    mutation: {
      title: "Mutation",
      body: (factor: number) =>
        `A company is swapped for an outsider, or one weight grows at another's expense. When the population grows too alike, mutation runs ${factor} times faster.`,
    },
    labels: { parentA: "parent A", parentB: "parent B", child: "child", shared: "shared", winner: "winner" },
  },

  session: {
    title: "One session, from the close to the open",
    lead: "The population does not die overnight: it takes in immigrants, re-scores everyone on the new landscape and evolves again.",
    steps: {
      close: { title: "Close", body: (lookback: number) => `The day's prices join a window of the last ${lookback} sessions.` },
      evolve: {
        title: "Evolution",
        body: (generations: number, immigrants: number) =>
          `${generations} generations from the previous evening's population, plus ${immigrants}% immigrants and the current portfolio as a candidate.`,
      },
      commit: { title: "Commit", body: "The decision lands on the repository's live branch. The commit's time proves it came before the open." },
      open: { title: "Open", body: "The order fills at the opening price, with fees and slippage, in whole shares." },
      mark: { title: "Mark", body: "The portfolio is valued at the close, next to BOVA11 and the CDI." },
    },
  },

  honesty: {
    title: "Built to be checked",
    items: [
      { title: "No look-ahead", body: "It decides on the close and trades at the next open. A late decision becomes a missed session in the record." },
      { title: "Reproducible", body: "Every evening archives its data and its seed. Anyone can run it again and reach the same portfolio." },
      { title: "Against chance", body: "Ten sessions are few. The result sits next to 10,000 random portfolios and the index." },
      { title: "Real costs", body: "Fees, slippage and whole shares: no order is free." },
    ],
    cta: {
      title: "Build your own",
      body: "Pick the starting parameters and a date in the past, and watch the algorithm trade ten sessions in your browser.",
    },
  },

  footer: {
    project: "Project",
    stack: "Stack",
    licence: "MIT licence",
    author: "Author",
    authorName: "Lucas Pacheco",
    github: "GitHub",
    linkedin: "LinkedIn",
    course: "Course",
    courseName: "EEL874 · Artificial Intelligence",
    term: "UFRJ · 2026/2",
    copyright: "© 2026",
  },
};
