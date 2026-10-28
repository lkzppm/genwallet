// The knobs of the genetic algorithm. Defaults are spec/02-genetic-algorithm.md;
// the live run records the exact object it used in its start event.

/**
 * Sharpe, Sortino and return over CVaR measure the CDI; `active` measures
 * BOVA11 (an information ratio); `goal` measures a hurdle above the CDI, the
 * probability of reaching it by the end of the run (Browne, 1999).
 */
export type FitnessKind = "sharpe" | "sortino" | "cvar" | "active" | "goal";

export interface GaParams {
  /** Companies per portfolio. */
  k: number;
  wMin: number;
  wMax: number;
  /** Max companies from one B3 macro-sector. */
  sectorCap: number;
  populationSize: number;
  elite: number;
  tournament: number;
  crossoverRate: number;
  blxAlpha: number;
  swapRate: number;
  weightRate: number;
  weightSigma: number;
  transferRate: number;
  /** Mutation rates are multiplied by this while diversity is below the floor. */
  hyperFactor: number;
  diversityFloor: number;
  /** Share of a carried-over population replaced by random immigrants. */
  immigrantRate: number;
  /** Sessions of returns behind each estimate. */
  lookback: number;
  /** Shrinkage of each mean toward the cross-sectional mean. */
  meanShrink: number;
  /**
   * The latest sessions left out of each expected return (12-1 momentum
   * skips about 21, the month that tends to reverse). Absent or 0: the whole
   * lookback, as the runs recorded before 2026-10-26 had it.
   */
  skip?: number;
  /** Shrinkage of the covariance toward constant correlation. */
  covShrink: number;
  /** Median daily traded value (R$) over the last 60 sessions. */
  minTraded: number;
  fee: number;
  slippage: number;
  /** Sessions over which the cost of a trade is amortised. */
  horizon: number;
  fitness: FitnessKind;
  /**
   * The `goal` fitness's hurdle: a daily return. Above what any portfolio can
   * expect, the score (mean − goal) / vol rises with the vol, so the GA
   * concentrates on the names most likely to get there; below it, it
   * diversifies as Sharpe would. Absent: 0, which is Sharpe over 0.
   */
  goal?: number;
  /** Strict mode: the asset set never changes, only weights evolve. */
  strict: boolean;
}

export const DEFAULT_PARAMS: GaParams = {
  k: 10,
  wMin: 0.03,
  wMax: 0.2,
  sectorCap: 3,
  populationSize: 200,
  elite: 4,
  tournament: 3,
  crossoverRate: 0.9,
  blxAlpha: 0.3,
  swapRate: 0.25,
  weightRate: 0.35,
  weightSigma: 0.25,
  transferRate: 0.25,
  hyperFactor: 3,
  diversityFloor: 0.15,
  immigrantRate: 0.15,
  lookback: 252,
  meanShrink: 0.5,
  skip: 0,
  covShrink: 0.3,
  minTraded: 20_000_000,
  fee: 0.0003,
  slippage: 0.0005,
  horizon: 10,
  fitness: "sharpe",
  strict: false,
};

/**
 * The builder's starting point: the hyperparameter search's pick (pnpm tune on
 * five years, 2026-10-27; spec/02), with the goal fitness at 0.4% a session
 * and a 20% weight cap since 2026-10-28 (Lucas: the class challenge rewards
 * the tail). The live run keeps DEFAULT_PARAMS, the object its start event
 * recorded.
 */
export const TUNED = {
  params: {
    ...DEFAULT_PARAMS,
    wMin: 0.021,
    wMax: 0.2,
    sectorCap: 2,
    populationSize: 260,
    elite: 9,
    tournament: 3,
    crossoverRate: 0.675,
    blxAlpha: 0.484,
    swapRate: 0.077,
    weightRate: 0.271,
    weightSigma: 0.139,
    transferRate: 0.002,
    hyperFactor: 4.926,
    diversityFloor: 0.236,
    immigrantRate: 0.151,
    lookback: 240,
    meanShrink: 0.206,
    skip: 3,
    covShrink: 0.297,
    horizon: 17,
    fitness: "goal",
    goal: 0.004,
    strict: false,
  } satisfies GaParams as GaParams,
  formationGenerations: 300,
  dailyGenerations: 150,
};
