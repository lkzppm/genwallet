// One evening of evolution (spec/02): the engine builds the landscape from
// the input and evolves a population on it, from random genomes (formation)
// or from the previous evening's. The work is done in WebAssembly
// (engine/src, through engine.ts); this is its TypeScript face.

import { run } from "./engine";
import type { Individual, SerializedIndividual } from "./individual";
import type { GaParams } from "./params";
import type { Problem, ProblemInput } from "./problem";

export interface GenerationStat {
  gen: number;
  best: number;
  mean: number;
  diversity: number;
  /** Mutation rates were boosted this generation. */
  hyper: boolean;
  championId: number;
  champion: number[];
  /** Share of the population holding each asset, by asset index. */
  geneFreq: number[];
}

export interface EvolveOptions {
  generations: number;
  seed: string;
  /** Label stamped on newborns (the live run uses the decision date). */
  label: string;
  seedPopulation?: SerializedIndividual[];
  /** First id to hand out; continue from the previous evening's. */
  nextId?: number;
  /** Called after every generation with its number and best score. */
  onProgress?: (gen: number, best: number) => void;
}

export interface EvolveResult {
  /** Final population, best first. */
  population: Individual[];
  champion: Individual;
  /** The current portfolio as an individual, when there are holdings. */
  hold: Individual | null;
  history: GenerationStat[];
  nextId: number;
}

export function evolve(input: ProblemInput, params: GaParams, opts: EvolveOptions): { problem: Problem; result: EvolveResult } {
  return run(input, params, opts);
}
