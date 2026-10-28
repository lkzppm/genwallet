// The live run is an append-only log of these events (spec/03); reduce()
// derives every piece of state from it.

import type { GaParams } from "../ga/params";
import type { UniverseEntry } from "../market/snapshot";

export interface LiveConfig {
  capital: number;
  sessions: number;
  formationGenerations: number;
  dailyGenerations: number;
  /** Share of the NAV at the open left unallocated when sizing the fill, to absorb fees and rounding. */
  orderBuffer: number;
  /** Generations kept in a decision's history (every n-th). */
  historyEvery: number;
}

export interface StartEvent {
  type: "start";
  date: string;
  capital: number;
  universe: UniverseEntry[];
  /** The ten session dates. */
  sessions: string[];
  params: GaParams;
  config: LiveConfig;
}

export interface DecisionEvent {
  type: "decision";
  /** The cash rule's share of the NAV in stocks, when the rule is on (`GaParams.trendWindow`). */
  exposure?: number;
  date: string;
  /** The session (1-based) this order fills on. */
  session: number;
  executeOn: string;
  seed: string;
  inputsHash: string;
  /** The champion was the current portfolio: no order is sent. */
  hold: boolean;
  champion: {
    id: number;
    origin: string;
    weights: Record<string, number>;
    score: number;
    /** Expected daily return and volatility, in-sample. */
    mean: number;
    vol: number;
    turnover: number;
    cost: number;
  };
  /** Indicative only: the weights sized at the decision's close. The fill re-sizes them at the open. */
  targetShares: Record<string, number>;
  refPrices: Record<string, number>;
  nav: number;
  generations: number;
  history: { gen: number; best: number; mean: number; diversity: number; hyper: boolean; championId: number }[];
}

export interface Trade {
  ticker: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
  value: number;
  fee: number;
}

export interface Dividend {
  ticker: string;
  shares: number;
  amount: number;
  value: number;
}

export interface FillEvent {
  type: "fill";
  date: string;
  session: number;
  trades: Trade[];
  dividends: Dividend[];
}

export interface Position {
  ticker: string;
  shares: number;
  close: number;
  value: number;
}

export interface MarkEvent {
  type: "mark";
  date: string;
  session: number;
  nav: number;
  /** Cash after the day's interest. */
  cash: number;
  interest: number;
  cdi: number;
  positions: Position[];
  ibov: { open: number | null; close: number | null };
  /** The benchmark at the open (see Snapshot.bova). */
  bova: { open: number | null; close: number | null };
}

export interface MissedEvent {
  type: "missed";
  date: string;
  session: number;
  reason: string;
}

/**
 * A change of the GA's parameters from the decision of `date` on, committed
 * before the open that decision trades on, with the reason in the record.
 */
export interface ParamsEvent {
  type: "params";
  /** The evening of the first decision made with them. */
  date: string;
  /** When the change was made (ISO instant). */
  at: string;
  params: GaParams;
  reason: string;
}

export type LiveEvent = StartEvent | DecisionEvent | FillEvent | MarkEvent | MissedEvent | ParamsEvent;
