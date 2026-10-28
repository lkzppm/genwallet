// The only place the live state is derived, in the job and in the browser.

import type { GaParams } from "../ga/params";
import type { DecisionEvent, FillEvent, LiveEvent, MarkEvent, MissedEvent, StartEvent } from "./events";

export interface LiveState {
  start: StartEvent | null;
  /** The parameters in force: the start's, or the last change's. */
  params: GaParams | null;
  cash: number;
  shares: Record<string, number>;
  /** The order waiting for its open. */
  pending: DecisionEvent | null;
  decisions: DecisionEvent[];
  fills: FillEvent[];
  marks: MarkEvent[];
  missed: MissedEvent[];
  /** The last session marked, or the formation date. */
  lastDate: string | null;
}

export const money = (x: number) => Math.round(x * 100) / 100;

export function reduce(events: LiveEvent[]): LiveState {
  const s: LiveState = {
    start: null,
    params: null,
    cash: 0,
    shares: {},
    pending: null,
    decisions: [],
    fills: [],
    marks: [],
    missed: [],
    lastDate: null,
  };
  for (const e of events) {
    switch (e.type) {
      case "start":
        s.start = e;
        s.params = e.params;
        s.cash = e.capital;
        s.lastDate = e.date;
        break;
      case "decision":
        s.decisions.push(e);
        s.pending = e;
        break;
      case "fill":
        for (const d of e.dividends) s.cash = money(s.cash + d.value);
        for (const t of e.trades) {
          const sign = t.side === "buy" ? 1 : -1;
          s.cash = money(s.cash - sign * t.value - t.fee);
          s.shares[t.ticker] = (s.shares[t.ticker] ?? 0) + sign * t.qty;
          if (s.shares[t.ticker] === 0) delete s.shares[t.ticker];
        }
        s.fills.push(e);
        s.pending = null;
        break;
      case "mark":
        s.cash = money(s.cash + e.interest);
        s.marks.push(e);
        s.lastDate = e.date;
        break;
      case "missed":
        s.missed.push(e);
        if (s.pending?.session === e.session) s.pending = null;
        break;
      case "params":
        s.params = e.params;
        break;
    }
  }
  return s;
}
