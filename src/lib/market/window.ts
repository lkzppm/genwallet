// Pure helpers over a snapshot: no network, safe for the browser (the
// builder's worker) as well as the nightly job.

import type { ProblemInput } from "../ga/problem";
import type { Snapshot } from "./snapshot";

/** The snapshot as it stood at the close of `date`: later days dropped. */
export function truncate(s: Snapshot, date: string): Snapshot {
  const end = s.dates.findLastIndex((d) => d <= date) + 1;
  if (end === 0) throw new Error(`no data on or before ${date}`);
  const cut = <T>(rows: T[][]) => rows.map((r) => r.slice(0, end));
  return {
    ...s,
    dates: s.dates.slice(0, end),
    open: cut(s.open),
    close: cut(s.close),
    adjClose: cut(s.adjClose),
    volume: cut(s.volume),
    dividends: s.dividends.filter((d) => d.date <= date),
    ibov: { open: s.ibov.open.slice(0, end), close: s.ibov.close.slice(0, end) },
    bova: { open: s.bova.open.slice(0, end), close: s.bova.close.slice(0, end) },
    cdi: s.cdi.slice(0, end),
  };
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Median daily traded value (R$) of ticker `a` over the 60 sessions ending on `dates[day]`. */
export function tradedValue(s: Snapshot, a: number, day: number): number {
  const values: number[] = [];
  for (let d = Math.max(0, day - 59); d <= day; d++) {
    const c = s.close[a][d];
    const v = s.volume[a][d];
    if (c !== null && v !== null) values.push(c * v);
  }
  return median(values);
}

/** The engine's input for a decision at the close of `dates[day]`. */
export function problemInput(
  s: Snapshot,
  day: number,
  lookback: number,
  current: Record<string, number>,
  locked?: string[],
): ProblemInput {
  const from = day - lookback;
  if (from < 0) throw new Error(`need ${lookback + 1} sessions before ${s.dates[day]}, have ${day + 1}`);
  return {
    date: s.dates[day],
    tickers: s.universe.map((u) => u.ticker),
    companies: s.universe.map((u) => u.company),
    sectors: s.universe.map((u) => u.sector),
    prices: s.adjClose.map((row) => row.slice(from, day + 1)),
    traded: s.universe.map((_, a) => tradedValue(s, a, day)),
    rf: s.cdi[day],
    current,
    ...(locked ? { locked } : {}),
  };
}
