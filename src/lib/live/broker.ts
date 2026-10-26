// Paper execution (spec/03): fills at the open with slippage and fees,
// dividends on the ex-date, CDI on idle cash, marks at the close.

import type { GaParams } from "../ga/params";
import type { Snapshot } from "../market/snapshot";
import type { DecisionEvent, Dividend, FillEvent, MarkEvent, Trade } from "./events";
import type { LiveState } from "./reduce";
import { money } from "./reduce";

function trade(ticker: string, side: Trade["side"], qty: number, open: number, params: GaParams): Trade {
  const price = side === "buy" ? open * (1 + params.slippage) : open * (1 - params.slippage);
  const value = money(qty * price);
  return { ticker, side, qty, price, value, fee: money(value * params.fee) };
}

/**
 * Fills `order` at the open of `snap.dates[day]`. The order is the champion's
 * weights, committed before the open; shares are sized here from the NAV at
 * the open, so a gap does not leave part of the portfolio in cash.
 */
export function fill(
  state: LiveState,
  order: DecisionEvent,
  snap: Snapshot,
  day: number,
  params: GaParams,
  buffer: number,
): FillEvent {
  const date = snap.dates[day];
  const index = new Map(snap.universe.map((u, i) => [u.ticker, i]));
  const open = (t: string) => {
    const a = index.get(t);
    return a === undefined ? null : snap.open[a][day];
  };

  // Shares held at the previous close receive the day's dividends.
  const dividends: Dividend[] = snap.dividends
    .filter((d) => d.date === date && (state.shares[d.ticker] ?? 0) > 0)
    .map((d) => {
      const shares = state.shares[d.ticker];
      return { ticker: d.ticker, shares, amount: d.amount, value: money(shares * d.amount) };
    });
  let cash = dividends.reduce((c, d) => money(c + d.value), state.cash);

  // A stock with no open keeps its shares and is valued at its last close.
  const price = (t: string) => open(t) ?? lastClose(snap, index.get(t)!, day - 1);
  const navOpen = Object.entries(state.shares).reduce((s, [t, q]) => s + q * price(t), cash);
  const target: Record<string, number> = {};
  if (order.hold) Object.assign(target, state.shares);
  else {
    for (const [t, w] of Object.entries(order.champion.weights)) {
      const o = open(t);
      target[t] = o === null ? (state.shares[t] ?? 0) : Math.floor((w * navOpen * (1 - buffer)) / (o * (1 + params.slippage)));
    }
  }

  const tickers = [...new Set([...Object.keys(state.shares), ...Object.keys(target)])].sort();
  const trades: Trade[] = [];
  for (const t of tickers) {
    const diff = (target[t] ?? 0) - (state.shares[t] ?? 0);
    const o = open(t);
    if (diff < 0 && o !== null) {
      const tr = trade(t, "sell", -diff, o, params);
      cash = money(cash + tr.value - tr.fee);
      trades.push(tr);
    }
  }

  const wanted = tickers
    .map((t) => ({ t, qty: (target[t] ?? 0) - (state.shares[t] ?? 0), o: open(t) }))
    .filter((b): b is { t: string; qty: number; o: number } => b.qty > 0 && b.o !== null);
  const cost = (qty: number, o: number) => {
    const tr = trade("", "buy", qty, o, params);
    return tr.value + tr.fee;
  };
  const need = wanted.reduce((s, b) => s + cost(b.qty, b.o), 0);
  if (need > cash) {
    // A gap up left cash short: scale every buy by the same factor, then trim
    // the largest by one share until the cents fit.
    const factor = cash / need;
    for (const b of wanted) b.qty = Math.floor(b.qty * factor);
    while (wanted.reduce((s, b) => s + cost(b.qty, b.o), 0) > cash) {
      const big = wanted.reduce((x, y) => (y.qty * y.o > x.qty * x.o ? y : x));
      big.qty--;
    }
  }
  for (const b of wanted) {
    if (b.qty > 0) trades.push(trade(b.t, "buy", b.qty, b.o, params));
  }

  return { type: "fill", date, session: order.session, trades, dividends };
}

/** Last close on or before `day` (a suspended stock keeps its last price). */
function lastClose(snap: Snapshot, a: number, day: number): number {
  for (let d = day; d >= 0; d--) {
    const c = snap.close[a][d];
    if (c !== null) return c;
  }
  throw new Error(`no close for ${snap.universe[a].ticker}`);
}

/** Marks the portfolio (state after the day's fill) at the close of `snap.dates[day]`. */
export function mark(state: LiveState, snap: Snapshot, day: number, session: number): MarkEvent {
  const index = new Map(snap.universe.map((u, i) => [u.ticker, i]));
  const positions = Object.entries(state.shares)
    .sort(([x], [y]) => x.localeCompare(y))
    .map(([ticker, shares]) => {
      const close = lastClose(snap, index.get(ticker)!, day);
      return { ticker, shares, close, value: money(shares * close) };
    });
  const cdi = snap.cdi[day];
  const interest = money(state.cash * cdi);
  const cash = money(state.cash + interest);
  return {
    type: "mark",
    date: snap.dates[day],
    session,
    nav: money(cash + positions.reduce((s, p) => s + p.value, 0)),
    cash,
    interest,
    cdi,
    positions,
    ibov: { open: snap.ibov.open[day], close: snap.ibov.close[day] },
    bova: { open: snap.bova.open[day], close: snap.bova.close[day] },
  };
}
