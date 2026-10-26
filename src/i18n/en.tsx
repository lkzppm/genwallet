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
  },

  home: {
    eyebrow: "UFRJ · Artificial Intelligence",
    tagline: (companies: number, sessions: number) =>
      `A genetic algorithm builds a portfolio of ${companies} Ibovespa companies and trades it live over ${sessions} B3 sessions. Every order is published before the open it trades on.`,
    facts: {
      companies: "companies from the Ibovespa, at most one ticker each",
      sessions: (first: string, last: string) => `trading sessions, ${first} to ${last}`,
      population: "portfolios per generation; the population lives on from one session to the next",
    },
    background:
      "Behind this page runs a real genetic algorithm on a demo landscape: each dot is an individual, height is fitness, green are the peaks and red the pits. The landscape moves every session. Click to drop immigrants.",
    counter: (session: number, generation: number) => `session ${session} · generation ${generation}`,
    paper: "Paper money. Not investment advice.",
  },
};
