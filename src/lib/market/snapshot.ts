// Everything the engine and the broker read, aligned on the Ibovespa's
// trading days. Built from the network once per job, or loaded from a cache.

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

// The pure helpers live apart, so the browser can use them without the fetchers.
export { problemInput, truncate } from "./window";
