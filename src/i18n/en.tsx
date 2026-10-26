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

  builder: {
    meta: "Build a portfolio: choose the genetic algorithm's starting parameters and operate 10 past B3 sessions in your browser.",
    eyebrow: "Build a portfolio",
    title: "Operate 10 sessions of the past",
    lead: "Choose how the genetic algorithm starts and pick an evening in the data. It forms a portfolio of 10 companies and operates it session by session, with the same engine, costs and rules as the live run, here in your browser.",
    data: (tickers: number, first: string, last: string) =>
      `Data: ${tickers} Ibovespa tickers, ${first} to ${last}, adjusted for dividends.`,
    loading: "Loading market data",
    groups: { run: "Operation", algorithm: "Algorithm", constraints: "Constraints" },
    fields: {
      formation: {
        label: "Formation evening",
        hint: (first: string, last: string) =>
          `the portfolio is formed at this close and operated over the 10 sessions after it (${first} to ${last})`,
      },
      capital: { label: "Capital (R$)", hint: "paper money" },
      seed: { label: "Seed", hint: "the same seed gives the same run" },
      mode: {
        label: "Companies",
        free: "Free",
        strict: "Fixed",
        hint: "free: the algorithm may swap companies every evening, always 10, paying the cost; fixed: the 10 of the formation stay, only the weights change",
      },
      fitness: {
        label: "Fitness",
        sharpe: "Sharpe",
        sortino: "Sortino",
        cvar: "Return / CVaR",
        hint: "risk-adjusted return over the CDI, net of the cost of trading from the current portfolio",
      },
      population: { label: "Population", hint: "portfolios per generation" },
      formationGenerations: { label: "Generations at formation", hint: "from a random population" },
      dailyGenerations: { label: "Generations per evening", hint: "the population carries over from the evening before" },
      crossover: { label: "Crossover rate", hint: "share of children born from two parents" },
      swap: { label: "Swap mutation", hint: "chance of trading one company for another" },
      weight: { label: "Weight mutation", hint: "chance of nudging the weights" },
      immigrants: { label: "Immigrants", hint: "share of the population replaced by random portfolios each evening" },
      elite: { label: "Elite", hint: "best portfolios copied unchanged to the next generation" },
      tournament: { label: "Tournament", hint: "candidates per parent selection" },
      wMin: { label: "Minimum weight", hint: "per company, %" },
      wMax: { label: "Maximum weight", hint: "per company, %" },
      sectorCap: { label: "Companies per sector", hint: "at most, out of 10" },
      lookback: { label: "Lookback (sessions)", hint: "history behind every estimate" },
      meanShrink: { label: "Mean shrinkage", hint: "pull of each stock's mean return toward the average of all" },
    },
    invalid: {
      bounds: (k: number) =>
        `With ${k} companies the weights must allow a sum of 100%: minimum × ${k} ≤ 100% ≤ maximum × ${k}.`,
      elite: "The elite must be smaller than the population.",
    },
    run: "Run 10 sessions",
    again: "Run again",
    cancel: "Cancel",
    reset: "Defaults",
    progress: (session: number, sessions: number, gen: number, generations: number) =>
      `Session ${session} of ${sessions} · generation ${gen} of ${generations}`,
    cancelled: "Cancelled.",
    error: (message: string) => `The simulation failed: ${message}`,
    empty: "Set the parameters and run. Each evening evolves the population and decides the next order; each session fills it at the open and marks the portfolio at the close.",
    results: {
      title: "Result",
      ga: "Genetic portfolio",
      bova: "BOVA11 (Ibovespa)",
      cdi: "CDI",
      finalValue: "final value",
      fees: (fees: string, trades: number) => `${fees} in fees over ${trades} trades`,
      holds: (n: number) => (n === 1 ? "1 session without trading" : `${n} sessions without trading`),
      seconds: (s: string) => `computed in ${s} s`,
      chart: "Value through the sessions",
      formation: "formation",
      oneSample:
        "Ten sessions are one sample: another evening or another seed can give the opposite result. Compare with the benchmarks over the same sessions, not with zero.",
    },
    session: {
      tabs: "Sessions",
      label: (n: number) => `Session ${n}`,
      decided: (on: string, fill: string) => `Decided on the evening of ${on}, filled at the open of ${fill}.`,
      hold: "The current portfolio won the evening: no order was sent.",
      convergence: "That evening's evolution",
      best: "best",
      mean: "mean",
      diversity: "diversity",
      generation: "generation",
      portfolio: "Portfolio",
      ticker: "Ticker",
      company: "Company",
      sector: "Sector",
      weight: "Weight",
      entered: "entered",
      left: (tickers: string) => `Left the portfolio: ${tickers}.`,
      inSample: "In-sample estimates over the lookback before the decision, not forecasts.",
      score: "score",
      expReturn: "return a.y.",
      vol: "volatility a.y.",
      turnover: "turnover",
      trades: "Trades at the open",
      side: { buy: "buy", sell: "sell" },
      qty: "Qty",
      price: "Price",
      value: "Value",
      noTrades: "No trades this session.",
      nav: "value at the close",
    },
  },
};
