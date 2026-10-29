// The individuals the engine hands back, and their form in a population file.

/** How an individual entered the population. Elites keep theirs. */
export type Origin = "random" | "immigrant" | "hold" | "cross" | "mutant";

/** Asset indices into the evening's universe, sorted, and their weights. */
export interface Genome {
  assets: number[];
  weights: number[];
}

export interface Evaluation {
  score: number;
  /** Expected daily return. */
  mean: number;
  /** Daily volatility. */
  vol: number;
  /** Σ|wᵢ − hᵢ|: buys plus sells as a share of the portfolio. */
  turnover: number;
  /** Fees and slippage of the turnover, as a share of the portfolio. */
  cost: number;
}

export interface Individual extends Genome {
  id: number;
  parents: number[];
  /** Generation of birth within the run labelled `bornOn`. */
  born: number;
  bornOn: string;
  origin: Origin;
  eval: Evaluation;
}

/** By ticker, so a population survives a change of universe or of order. */
export interface SerializedIndividual {
  id: number;
  tickers: string[];
  weights: number[];
  parents: number[];
  born: number;
  bornOn: string;
  origin: Origin;
  score: number;
}

export function serialize(p: { tickers: string[] }, ind: Individual): SerializedIndividual {
  return {
    id: ind.id,
    tickers: ind.assets.map((a) => p.tickers[a]),
    weights: ind.weights,
    parents: ind.parents,
    born: ind.born,
    bornOn: ind.bornOn,
    origin: ind.origin,
    score: ind.eval.score,
  };
}
