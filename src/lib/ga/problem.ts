// One evening's fitness landscape: the estimates every individual is scored
// against. Built once per run from a ProblemInput, which is plain JSON so a
// live evening can archive it and anyone can rebuild the same landscape.

import type { GaParams } from "./params";

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
  /** BOVA11's closes over the same sessions as `prices` (the `active` fitness only). */
  bench?: (number | null)[];
}

export interface Problem {
  input: ProblemInput;
  n: number;
  days: number;
  tickers: string[];
  company: Int32Array;
  sector: Int32Array;
  sectorNames: string[];
  eligible: number[];
  isEligible: Uint8Array;
  /** Shrunk expected daily return per asset. */
  mu: Float64Array;
  /** Shrunk daily covariance, n × n row-major. */
  cov: Float64Array;
  /** Daily returns, days × n row-major (zero for ineligible assets). */
  returns: Float64Array;
  rf: number;
  /** Current weight per asset index (cash excluded). */
  currentWeight: Float64Array;
  currentSum: number;
  /** Held asset indices, sorted. */
  held: number[];
  locked: number[] | null;
  /** BOVA11 over the window, for the `active` fitness: its expected daily return, its variance, its covariance with each asset. */
  benchMean: number;
  benchVar: number;
  benchCov: Float64Array | null;
}

function intern(names: string[]): { ids: Int32Array; names: string[] } {
  const seen = new Map<string, number>();
  const ids = new Int32Array(names.length);
  names.forEach((name, i) => {
    let id = seen.get(name);
    if (id === undefined) {
      id = seen.size;
      seen.set(name, id);
    }
    ids[i] = id;
  });
  return { ids, names: [...seen.keys()] };
}

export function buildProblem(input: ProblemInput, params: GaParams): Problem {
  const n = input.tickers.length;
  const days = input.prices[0].length - 1;
  const company = intern(input.companies).ids;
  const sectors = intern(input.sectors);

  const isEligible = new Uint8Array(n);
  const eligible: number[] = [];
  for (let a = 0; a < n; a++) {
    const p = input.prices[a];
    const full = p.length === days + 1 && p.every((x) => x !== null && x > 0);
    if (full && input.traded[a] >= params.minTraded) {
      isEligible[a] = 1;
      eligible.push(a);
    }
  }

  const returns = new Float64Array(days * n);
  const mean = new Float64Array(n);
  for (const a of eligible) {
    const p = input.prices[a] as number[];
    let sum = 0;
    for (let d = 0; d < days; d++) {
      const r = p[d + 1] / p[d] - 1;
      returns[d * n + a] = r;
      sum += r;
    }
    mean[a] = sum / days;
  }

  // The expected returns may leave the latest sessions out (`skip`); the
  // covariance always uses the whole window.
  const skip = Math.min(days - 2, Math.max(0, Math.round(params.skip ?? 0)));
  let signal = mean;
  if (skip > 0) {
    signal = new Float64Array(n);
    for (const a of eligible) {
      let sum = 0;
      for (let d = 0; d < days - skip; d++) sum += returns[d * n + a];
      signal[a] = sum / (days - skip);
    }
  }

  // Raw means are the noisiest estimate; pulling them toward the average
  // keeps the GA from simply buying last year's winners.
  let grand = 0;
  for (const a of eligible) grand += signal[a];
  grand /= eligible.length || 1;
  const mu = new Float64Array(n);
  for (const a of eligible) mu[a] = (1 - params.meanShrink) * signal[a] + params.meanShrink * grand;

  const sample = new Float64Array(n * n);
  for (let i = 0; i < eligible.length; i++) {
    const a = eligible[i];
    for (let j = i; j < eligible.length; j++) {
      const b = eligible[j];
      let s = 0;
      for (let d = 0; d < days; d++) s += (returns[d * n + a] - mean[a]) * (returns[d * n + b] - mean[b]);
      s /= days - 1;
      sample[a * n + b] = s;
      sample[b * n + a] = s;
    }
  }

  // Constant-correlation target: same variances, every pair at the mean correlation.
  const sd = new Float64Array(n);
  for (const a of eligible) sd[a] = Math.sqrt(sample[a * n + a]);
  let corrSum = 0;
  let pairs = 0;
  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const a = eligible[i];
      const b = eligible[j];
      if (sd[a] > 0 && sd[b] > 0) {
        corrSum += sample[a * n + b] / (sd[a] * sd[b]);
        pairs++;
      }
    }
  }
  const rbar = pairs ? corrSum / pairs : 0;
  const cov = new Float64Array(n * n);
  for (const a of eligible) {
    for (const b of eligible) {
      const target = a === b ? sample[a * n + a] : rbar * sd[a] * sd[b];
      cov[a * n + b] = (1 - params.covShrink) * sample[a * n + b] + params.covShrink * target;
    }
  }

  // The benchmark, from the same window as the prices (it ends on the decision's close too).
  let benchMean = 0;
  let benchVar = 0;
  let benchCov: Float64Array | null = null;
  if (input.bench) {
    const b = input.bench;
    const br = new Float64Array(days);
    for (let d = 0; d < days; d++) {
      const p0 = b[d];
      const p1 = b[d + 1];
      br[d] = p0 && p1 ? p1 / p0 - 1 : 0;
    }
    let all = 0;
    for (let d = 0; d < days; d++) all += br[d];
    all /= days;
    let recent = 0;
    for (let d = 0; d < days - skip; d++) recent += br[d];
    benchMean = recent / (days - skip);
    for (let d = 0; d < days; d++) benchVar += (br[d] - all) * (br[d] - all);
    benchVar /= days - 1;
    benchCov = new Float64Array(n);
    for (const a of eligible) {
      let s = 0;
      for (let d = 0; d < days; d++) s += (returns[d * n + a] - mean[a]) * (br[d] - all);
      benchCov[a] = s / (days - 1);
    }
  }
  if (params.fitness === "active" && !benchCov) throw new Error("the active fitness needs the benchmark in the input");

  const index = new Map(input.tickers.map((t, i) => [t, i]));
  const currentWeight = new Float64Array(n);
  const held: number[] = [];
  let currentSum = 0;
  for (const [ticker, w] of Object.entries(input.current)) {
    const a = index.get(ticker);
    if (a === undefined || !(w > 0)) continue;
    currentWeight[a] = w;
    currentSum += w;
    held.push(a);
  }
  held.sort((x, y) => x - y);

  let locked: number[] | null = null;
  if (params.strict) {
    if (!input.locked || input.locked.length !== params.k) throw new Error("strict mode needs k locked tickers");
    locked = input.locked.map((t) => {
      const a = index.get(t);
      if (a === undefined || !isEligible[a]) throw new Error(`locked ticker ${t} is not eligible on ${input.date}`);
      return a;
    });
    locked.sort((x, y) => x - y);
  }

  return {
    input,
    n,
    days,
    tickers: input.tickers,
    company,
    sector: sectors.ids,
    sectorNames: sectors.names,
    eligible,
    isEligible,
    mu,
    cov,
    returns,
    rf: input.rf,
    currentWeight,
    currentSum,
    held,
    locked,
    benchMean,
    benchVar,
    benchCov,
  };
}
