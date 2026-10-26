// Scores are risk-adjusted excess returns net of the cost of moving from the
// current portfolio, with the cost amortised over `horizon` sessions so a
// swap must pay for itself before the run ends.

import type { GaParams } from "./params";
import type { Problem } from "./problem";
import type { Genome } from "./repair";

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

const SQRT_252 = Math.sqrt(252);

export function evaluate(p: Problem, params: GaParams, g: Genome): Evaluation {
  const { n, mu, cov, currentWeight } = p;
  const k = g.assets.length;

  let mean = 0;
  let variance = 0;
  let turnover = p.currentSum;
  for (let i = 0; i < k; i++) {
    const a = g.assets[i];
    const w = g.weights[i];
    mean += w * mu[a];
    const row = a * n;
    for (let j = 0; j < k; j++) variance += w * g.weights[j] * cov[row + g.assets[j]];
    // Held assets left out of the genome are sold in full: they stay in the
    // starting sum; those kept are swapped for their |Δw|.
    turnover += Math.abs(w - currentWeight[a]) - currentWeight[a];
  }
  const vol = Math.sqrt(Math.max(variance, 0));
  const cost = (params.fee + params.slippage) * turnover;
  const excess = mean - p.rf - cost / params.horizon;

  let risk = vol;
  if (params.fitness !== "sharpe") {
    const series = new Float64Array(p.days);
    for (let d = 0; d < p.days; d++) {
      let r = 0;
      const row = d * n;
      for (let i = 0; i < k; i++) r += g.weights[i] * p.returns[row + g.assets[i]];
      series[d] = r;
    }
    if (params.fitness === "sortino") {
      let s = 0;
      for (const r of series) {
        const down = Math.min(0, r - p.rf);
        s += down * down;
      }
      risk = Math.sqrt(s / p.days);
    } else {
      series.sort();
      const tail = Math.max(1, Math.ceil(0.05 * p.days));
      let s = 0;
      for (let i = 0; i < tail; i++) s += series[i];
      risk = Math.max(0, -s / tail);
    }
  }

  const score = risk > 0 ? (excess * SQRT_252) / risk : -Infinity;
  return { score: Number.isFinite(score) ? score : -Infinity, mean, vol, turnover, cost };
}
