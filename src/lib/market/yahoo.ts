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
// the day read 0, the real opens came hours later (spec/03; fillLateOpens).
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
  await fillLateOpens(chart);
  return chart;
}

// How far back a missing open is looked for; the 5d range of 5-minute bars covers it.
const RECENT_SESSIONS = 3;

/**
 * The daily bar's open can lag its close by more than a day (it read 0 for the
 * sessions of 2026-10-28, 10-29 and 11-03 on the last run before the next
 * deadline), while the day's first 5-minute bar already has it: the two agreed
 * on 120 of 120 ticker-days checked on 2026-11-04 (spec/03). A stock with no
 * intraday bars was suspended and keeps its null. If the request fails the
 * open stays null, and the job's guard waits for the next slot.
 */
async function fillLateOpens(chart: Chart): Promise<void> {
  const from = Math.max(0, chart.dates.length - RECENT_SESSIONS);
  const late = chart.dates.slice(from).filter((d, i) => chart.open[from + i] === null);
  if (late.length === 0) return;

  const symbol = yahooSymbol(chart.symbol);
  let result;
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=5m`;
    result = (await fetchJson<RawChart>(url)).chart.result?.[0];
  } catch (err) {
    console.error(`${symbol}: no intraday bars for the opens of ${late.join(", ")}: ${String(err)}`);
    return;
  }
  if (!result) return;

  const off = result.meta.gmtoffset;
  const open = result.indicators.quote[0].open;
  (result.timestamp ?? []).forEach((ts, i) => {
    const date = localDate(ts, off);
    const at = chart.dates.indexOf(date);
    const value = cents(open[i]);
    if (!late.includes(date) || chart.open[at] !== null || value === null) return;
    chart.open[at] = value;
    console.error(`${symbol}: open of ${date} from its first 5-minute bar: ${value}`);
  });
}

export function fetchCharts(tickers: string[], range = "2y", concurrency = 4): Promise<Chart[]> {
  return mapLimit(tickers, concurrency, (t) => fetchChart(t, range));
}
