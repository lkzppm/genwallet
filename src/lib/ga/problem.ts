// One evening's input to the engine. Plain JSON, so a live evening can
// archive it and anyone can rebuild the same landscape; the engine (Rust,
// engine/src/problem.rs) builds the estimates from it.

export interface ProblemInput {
  /** Decision day (the last price in the window). */
  date: string;
  tickers: string[];
  companies: string[];
  sectors: string[];
  /** Adjusted closes per ticker, `lookback + 1` sessions ending on `date`. */
  prices: (number | null)[][];
  /** Median daily traded value (R$) per ticker over the last 60 sessions. */
  traded: number[];
  /** Daily risk-free rate (CDI). */
  rf: number;
  /** Current weight of each held ticker in the portfolio's value (cash excluded). */
  current: Record<string, number>;
  /** Strict mode: the tickers the portfolio is locked to. */
  locked?: string[];
  /** The cash rule's exposure of the order in force: the holdings are read relative to it. */
  exposure?: number;
  /** BOVA11's closes over the same sessions as `prices` (the `active` fitness only). */
  bench?: (number | null)[];
}

/** What the engine reports about the landscape it built. */
export interface Problem {
  input: ProblemInput;
  n: number;
  days: number;
  tickers: string[];
  /** Asset indices that passed the history and liquidity filters. */
  eligible: number[];
}
