// One evening's decision, written once and used by the nightly job and by
// the replay, so both run exactly the same computation.

import { evolve } from "../ga/evolve";
import type { EvolveOptions, EvolveResult } from "../ga/evolve";
import type { SerializedIndividual } from "../ga/individual";
import { serialize } from "../ga/individual";
import type { GaParams } from "../ga/params";
import type { Problem, ProblemInput } from "../ga/problem";
import { buildProblem } from "../ga/problem";
import type { DecisionEvent } from "./events";

/** Everything a decision depends on (`live/days/<date>.json`). */
export interface DayArchive {
  date: string;
  session: number;
  executeOn: string;
  seed: string;
  generations: number;
  params: GaParams;
  input: ProblemInput;
  /** Date of the population file this evening started from, if any. */
  seededFrom: string | null;
  nextId: number;
}

/** `live/population/<date>.json`: the population at the end of an evening. */
export interface PopulationFile {
  date: string;
  nextId: number;
  population: SerializedIndividual[];
}

export function runDecision(
  day: DayArchive,
  seedPopulation?: SerializedIndividual[],
  onGeneration?: EvolveOptions["onGeneration"],
): {
  problem: Problem;
  result: EvolveResult;
  population: PopulationFile;
} {
  const problem = buildProblem(day.input, day.params);
  const result = evolve(problem, day.params, {
    generations: day.generations,
    seed: day.seed,
    label: day.date,
    seedPopulation,
    nextId: day.nextId,
    onGeneration,
  });
  return {
    problem,
    result,
    population: { date: day.date, nextId: result.nextId, population: result.population.map((i) => serialize(problem, i)) },
  };
}

/** The order: champion weights turned into whole shares at the decision's close. */
export function decisionEvent(args: {
  day: DayArchive;
  inputsHash: string;
  problem: Problem;
  result: EvolveResult;
  closes: Record<string, number>;
  shares: Record<string, number>;
  nav: number;
  buffer: number;
  historyEvery: number;
}): DecisionEvent {
  const { day, problem, result, closes, nav } = args;
  const c = result.champion;
  const hold = result.hold !== null && c.id === result.hold.id;
  const weights: Record<string, number> = {};
  const targetShares: Record<string, number> = {};
  const refPrices: Record<string, number> = {};
  c.assets.forEach((a, i) => {
    const t = problem.tickers[a];
    weights[t] = c.weights[i];
    refPrices[t] = closes[t];
    targetShares[t] = Math.floor((c.weights[i] * nav * (1 - args.buffer)) / closes[t]);
  });
  return {
    type: "decision",
    date: day.date,
    session: day.session,
    executeOn: day.executeOn,
    seed: day.seed,
    inputsHash: args.inputsHash,
    hold,
    champion: { id: c.id, origin: c.origin, weights, score: c.eval.score, ...pick(c.eval) },
    // Holding means not trading at all, not re-sizing to the champion's weights.
    targetShares: hold ? { ...args.shares } : targetShares,
    refPrices,
    nav,
    generations: day.generations,
    history: result.history
      .filter((h) => h.gen % args.historyEvery === 0 || h.gen === day.generations)
      .map(({ gen, best, mean, diversity, hyper, championId }) => ({ gen, best, mean, diversity, hyper, championId })),
  };
}

const pick = ({ mean, vol, turnover, cost }: { mean: number; vol: number; turnover: number; cost: number }) => ({
  mean,
  vol,
  turnover,
  cost,
});
