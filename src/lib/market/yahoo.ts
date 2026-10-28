// Yahoo's chart API: unofficial, keyless, probed on 2026-10-26 (spec/01).
// B3 tickers take the ".SA" suffix; the index is "^BVSP".

import { fetchJson, mapLimit } from "./http";

export interface Chart {
  symbol: string;
  dates: string[];
  open: (number | null)[];
  close: (number | null)[];
  /** Adjusted for splits and dividends: the series for returns. */
  adjClose: (number | null)[];
  volume: (number | null)[];
  dividends: { date: string; amount: number }[];
  splits: { date: string; numerator: number; denominator: number }[];
  /** Unix seconds of the current (or last) regular session's open and close. */
  regularStart: number | null;
  regularEnd: number | null;
}

interface RawChart {
  chart: {
    result:
      | {
          meta: {
            gmtoffset: number;
            currentTradingPeriod?: { regular?: { start: number; end: number } };
          };
          timestamp?: number[];
          indicators: {
            quote: { open: (number | null)[]; close: (number | null)[]; volume: (number | null)[] }[];
            adjclose?: { adjclose: (number | null)[] }[];
          };
          events?: {
            dividends?: Record<string, { amount: number; date: number }>;
            splits?: Record<string, { date: number; numerator: number; denominator: number }>;
          };
        }[]
      | null;
    error: { code: string; description: string } | null;
  };
}

/** Exchange-local calendar date of a Yahoo timestamp. */
function localDate(ts: number, gmtoffset: number): string {
  return new Date((ts + gmtoffset) * 1000).toISOString().slice(0, 10);
}

const clean = (x: number | null | undefined) => (typeof x === "number" && Number.isFinite(x) ? x : null);
// Yahoo serves B3 prices as float32 (16.68000030517578); B3 ticks in cents.
// A price of 0 is a missing one: on 2026-10-27 at 22:30 BRT every open of
// the day read 0, the real opens came hours later (spec/03).
const cents = (x: number | null | undefined) => {
  const v = clean(x);
  return v === null || v <= 0 ? null : Math.round(v * 100) / 100;
};
const price = (x: number | null | undefined) => {
  const v = clean(x);
  return v === null || v <= 0 ? null : v;
};

export function yahooSymbol(ticker: string): string {
  return ticker.startsWith("^") ? ticker : `${ticker}.SA`;
}

export async function fetchChart(ticker: string, range = "2y"): Promise<Chart> {
  const symbol = yahooSymbol(ticker);
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?range=${range}&interval=1d&events=div%2Csplit&includeAdjustedClose=true`;
  const raw = await fetchJson<RawChart>(url);
  const result = raw.chart.result?.[0];
  if (!result) throw new Error(`Yahoo: no chart for ${symbol}: ${raw.chart.error?.description ?? "empty"}`);

  const off = result.meta.gmtoffset;
  const q = result.indicators.quote[0];
  const adj = result.indicators.adjclose?.[0]?.adjclose ?? q.close;
  const chart: Chart = {
    symbol: ticker,
    dates: [],
    open: [],
    close: [],
    adjClose: [],
    volume: [],
    dividends: Object.values(result.events?.dividends ?? {})
      .map((d) => ({ date: localDate(d.date, off), amount: d.amount }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    splits: Object.values(result.events?.splits ?? {})
      .map((s) => ({ date: localDate(s.date, off), numerator: s.numerator, denominator: s.denominator }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    regularStart: result.meta.currentTradingPeriod?.regular?.start ?? null,
    regularEnd: result.meta.currentTradingPeriod?.regular?.end ?? null,
  };

  // Yahoo sometimes repeats the live bar: the last row of a date wins.
  const row = new Map<string, number>();
  (result.timestamp ?? []).forEach((ts, i) => {
    const date = localDate(ts, off);
    let at = row.get(date);
    if (at === undefined) {
      at = chart.dates.length;
      row.set(date, at);
      chart.dates.push(date);
    }
    chart.open[at] = cents(q.open[i]);
    chart.close[at] = cents(q.close[i]);
    chart.adjClose[at] = price(adj[i]);
    chart.volume[at] = clean(q.volume[i]);
  });
  return chart;
}

export function fetchCharts(tickers: string[], range = "2y", concurrency = 4): Promise<Chart[]> {
  return mapLimit(tickers, concurrency, (t) => fetchChart(t, range));
}
