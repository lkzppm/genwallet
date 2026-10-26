// The universe as the builder's company picker sees it: which tickers the
// engine would accept for a run, and a few numbers to choose them by. The
// worker sends the prices and traded values once; everything here is pure.

import type { UniverseEntry } from "@/lib/market/snapshot";

export interface MarketView {
  universe: UniverseEntry[];
  /** Adjusted closes per ticker, aligned on the data's dates. */
  adjClose: (number | null)[][];
  /** Median daily traded value (R$) per ticker and date, over the 60 sessions before. */
  traded: number[][];
}

/** Why the engine would refuse a ticker for a run, if it would. */
export type Refusal = "history" | "liquidity";

/**
 * A run locks its chosen companies on every evening it decides on: the
 * formation and each session but the last. On each of them the engine wants
 * a full lookback of prices and the minimum traded value (problem.ts).
 */
export function refusals(
  market: MarketView,
  dates: string[],
  formation: string,
  sessions: number,
  lookback: number,
  minTraded: number,
): Map<string, Refusal> {
  const out = new Map<string, Refusal>();
  const first = dates.indexOf(formation);
  if (first < 0) return out;
  const last = Math.min(dates.length - 1, first + sessions - 1);
  market.universe.forEach((u, a) => {
    const prices = market.adjClose[a];
    for (let day = first; day <= last; day++) {
      if (day < lookback || prices.slice(day - lookback, day + 1).some((p) => p === null || !(p > 0))) {
        out.set(u.ticker, "history");
        return;
      }
      if (!(market.traded[a][day] >= minTraded)) {
        out.set(u.ticker, "liquidity");
        return;
      }
    }
  });
  return out;
}

export interface TickerStats {
  /** Return over the lookback up to the formation, and its annualised volatility. */
  ret: number | null;
  vol: number | null;
  traded: number;
  /** Closes over the lookback, for a sparkline. */
  series: number[];
}

export function tickerStats(market: MarketView, a: number, day: number, lookback: number): TickerStats {
  const window = market.adjClose[a].slice(Math.max(0, day - lookback), day + 1);
  const series = window.filter((p): p is number => p !== null && p > 0);
  const returns: number[] = [];
  for (let i = 1; i < window.length; i++) {
    const p0 = window[i - 1];
    const p1 = window[i];
    if (p0 && p1) returns.push(p1 / p0 - 1);
  }
  const mean = returns.reduce((s, r) => s + r, 0) / (returns.length || 1);
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / Math.max(1, returns.length - 1);
  return {
    ret: series.length > 1 ? series[series.length - 1] / series[0] - 1 : null,
    vol: returns.length > 1 ? Math.sqrt(variance * 252) : null,
    traded: market.traded[a][day] ?? 0,
    series,
  };
}
