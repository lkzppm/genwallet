import type { Evaluation } from "./fitness";
import type { Problem } from "./problem";
import type { Genome } from "./repair";

/** How an individual entered the population. Elites keep theirs. */
export type Origin = "random" | "immigrant" | "hold" | "cross" | "mutant";

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

export function serialize(p: Problem, ind: Individual): SerializedIndividual {
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

/** Back to indices of `p`; unknown tickers are dropped (repair refills them). */
export function deserialize(p: Problem, s: SerializedIndividual): Omit<Individual, "eval"> {
  const index = new Map(p.tickers.map((t, i) => [t, i]));
  const assets: number[] = [];
  const weights: number[] = [];
  s.tickers.forEach((t, i) => {
    const a = index.get(t);
    if (a !== undefined) {
      assets.push(a);
      weights.push(s.weights[i]);
    }
  });
  return { id: s.id, assets, weights, parents: s.parents, born: s.born, bornOn: s.bornOn, origin: s.origin };
}

/** Best first; ties break on the smaller id so every sort is deterministic. */
export function byScore(x: Individual, y: Individual): number {
  return y.eval.score - x.eval.score || x.id - y.id;
}
