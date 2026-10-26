// The knobs of the genetic algorithm. Defaults are spec/02-genetic-algorithm.md;
// the live run records the exact object it used in its start event.

export type FitnessKind = "sharpe" | "sortino" | "cvar";

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
  /** Shrinkage of the covariance toward constant correlation. */
  covShrink: number;
  /** Median daily traded value (R$) over the last 60 sessions. */
  minTraded: number;
  fee: number;
  slippage: number;
  /** Sessions over which the cost of a trade is amortised. */
  horizon: number;
  fitness: FitnessKind;
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
  covShrink: 0.3,
  minTraded: 20_000_000,
  fee: 0.0003,
  slippage: 0.0005,
  horizon: 10,
  fitness: "sharpe",
  strict: false,
};
