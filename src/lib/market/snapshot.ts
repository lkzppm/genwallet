// Everything the engine and the broker read, aligned on the Ibovespa's
// trading days. Built from the network once per job, or loaded from a cache.

import type { ProblemInput } from "../ga/problem";
import { fetchCdi } from "./bcb";
import type { Chart } from "./yahoo";
import { fetchChart, fetchCharts } from "./yahoo";

export interface UniverseEntry {
  ticker: string;
  company: string;
  sector: string;
}

export interface Snapshot {
  dates: string[];
  universe: UniverseEntry[];
  /** Per ticker, aligned on `dates`. */
  open: (number | null)[][];
  close: (number | null)[][];
  adjClose: (number | null)[][];
  volume: (number | null)[][];
  dividends: { ticker: string; date: string; amount: number }[];
  ibov: { open: (number | null)[]; close: (number | null)[] };
  /**
   * BOVA11, the Ibovespa ETF: the benchmark at the open. Yahoo's ^BVSP "open"
   * is the index's first print, which still sits at the previous close (on
   * 2026-10-26 it read 205,070 while every stock had opened about 16% lower).
   */
  bova: { open: (number | null)[]; close: (number | null)[] };
  /** Daily CDI per date, the last published value carried forward. */
  cdi: number[];
  /** Unix seconds of the last session's regular open and close (Yahoo). */
  regularStart: number | null;
  regularEnd: number | null;
}

function align(chart: Chart, index: Map<string, number>, len: number) {
  const pick = (series: (number | null)[]) => {
    const out = new Array<number | null>(len).fill(null);
    chart.dates.forEach((d, i) => {
      const at = index.get(d);
      if (at !== undefined) out[at] = series[i];
    });
    return out;
  };
  return { open: pick(chart.open), close: pick(chart.close), adjClose: pick(chart.adjClose), volume: pick(chart.volume) };
}

export async function buildSnapshot(universe: UniverseEntry[], range = "2y"): Promise<Snapshot> {
  const ibov = await fetchChart("^BVSP", range);
  const dates = ibov.dates.filter((_, i) => ibov.close[i] !== null);
  const index = new Map(dates.map((d, i) => [d, i]));
  const charts = await fetchCharts(universe.map((u) => u.ticker), range);
  const rows = charts.map((c) => align(c, index, dates.length));
  const ib = align(ibov, index, dates.length);
  const bova = align(await fetchChart("BOVA11", range), index, dates.length);

  // Fetch a little before the first date so the first days have a value to carry.
  const from = new Date(Date.parse(dates[0]) - 10 * 86_400_000).toISOString().slice(0, 10);
  const cdiRows = await fetchCdi(from, dates[dates.length - 1]);
  const cdi: number[] = [];
  let j = 0;
  let last = cdiRows[0]?.rate ?? 0;
  for (const d of dates) {
    while (j < cdiRows.length && cdiRows[j].date <= d) last = cdiRows[j++].rate;
    cdi.push(last);
  }

  return {
    dates,
    universe,
    open: rows.map((r) => r.open),
    close: rows.map((r) => r.close),
    adjClose: rows.map((r) => r.adjClose),
    volume: rows.map((r) => r.volume),
    dividends: charts.flatMap((c) => c.dividends.map((d) => ({ ticker: c.symbol, ...d }))),
    ibov: { open: ib.open, close: ib.close },
    bova: { open: bova.open, close: bova.close },
    cdi,
    regularStart: ibov.regularStart,
    regularEnd: ibov.regularEnd,
  };
}

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
    traded: s.universe.map((_, a) => {
      const values: number[] = [];
      for (let d = Math.max(0, day - 59); d <= day; d++) {
        const c = s.close[a][d];
        const v = s.volume[a][d];
        if (c !== null && v !== null) values.push(c * v);
      }
      return median(values);
    }),
    rf: s.cdi[day],
    current,
    ...(locked ? { locked } : {}),
  };
}
