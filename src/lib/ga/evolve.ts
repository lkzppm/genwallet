// One evening of evolution. A run either starts from random genomes
// (formation) or carries the previous evening's population onto the new
// landscape: repaired, re-scored, its worst replaced by immigrants, and the
// hold individual injected so "do nothing" is always a candidate.

import { evaluate } from "./fitness";
import type { Individual, Origin, SerializedIndividual } from "./individual";
import { byScore, deserialize } from "./individual";
import { crossover, diversity, mutate, randomGenome, tournament } from "./operators";
import type { GaParams } from "./params";
import type { Problem } from "./problem";
import type { Genome } from "./repair";
import { repair } from "./repair";
import { createRng } from "./rng";

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
  onGeneration?: (stat: GenerationStat, population: Individual[]) => void;
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

export function evolve(p: Problem, params: GaParams, opts: EvolveOptions): EvolveResult {
  const rng = createRng(opts.seed);
  let nextId = Math.max(opts.nextId ?? 1, ...(opts.seedPopulation ?? []).map((s) => s.id + 1));

  const make = (genome: Genome, origin: Origin, parents: number[], born: number): Individual => {
    const g = repair(p, params, rng, genome);
    return { ...g, id: nextId++, parents, born, bornOn: opts.label, origin, eval: evaluate(p, params, g) };
  };

  let pop: Individual[];
  if (opts.seedPopulation?.length) {
    pop = opts.seedPopulation.slice(0, params.populationSize).map((s) => {
      const ind = deserialize(p, s);
      const g = repair(p, params, rng, ind);
      return { ...ind, ...g, eval: evaluate(p, params, g) };
    });
    pop.sort(byScore);
    const keep = Math.min(pop.length, params.populationSize - Math.round(params.immigrantRate * params.populationSize));
    pop = pop.slice(0, keep);
    while (pop.length < params.populationSize) pop.push(make(randomGenome(p, params, rng), "immigrant", [], 0));
  } else {
    pop = [];
    while (pop.length < params.populationSize) pop.push(make(randomGenome(p, params, rng), "random", [], 0));
  }

  let hold: Individual | null = null;
  if (p.held.length) {
    hold = make({ assets: p.held, weights: p.held.map((a) => p.currentWeight[a]) }, "hold", [], 0);
    pop.sort(byScore);
    pop[pop.length - 1] = hold;
  }
  pop.sort(byScore);

  const history: GenerationStat[] = [];
  const record = (gen: number, hyper: boolean, div: number) => {
    const freq = new Array<number>(p.n).fill(0);
    let sum = 0;
    for (const ind of pop) {
      sum += ind.eval.score;
      for (const a of ind.assets) freq[a]++;
    }
    const stat: GenerationStat = {
      gen,
      best: pop[0].eval.score,
      mean: sum / pop.length,
      diversity: div,
      hyper,
      championId: pop[0].id,
      champion: pop[0].assets,
      geneFreq: freq.map((c) => c / pop.length),
    };
    history.push(stat);
    opts.onGeneration?.(stat, pop);
  };

  let div = diversity(pop, rng);
  record(0, false, div);

  for (let gen = 1; gen <= opts.generations; gen++) {
    const hyper = div < params.diversityFloor;
    const boost = hyper ? params.hyperFactor : 1;
    const next = pop.slice(0, params.elite);
    while (next.length < params.populationSize) {
      const a = tournament(pop, params.tournament, rng);
      if (rng.next() < params.crossoverRate) {
        const b = tournament(pop, params.tournament, rng);
        const child = mutate(p, params, rng, crossover(a, b, params, rng), boost);
        next.push(make(child, "cross", [a.id, b.id], gen));
      } else {
        next.push(make(mutate(p, params, rng, a, boost), "mutant", [a.id], gen));
      }
    }
    pop = next.sort(byScore);
    div = diversity(pop, rng);
    record(gen, hyper, div);
  }

  return { population: pop, champion: pop[0], hold, history, nextId };
}
