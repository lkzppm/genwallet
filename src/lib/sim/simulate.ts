// The live run replayed on history, in one go: formation on a past evening,
// then every session's fill at the open, mark at the close and the next
// evening's evolution, carrying the population across evenings. Same
// modules, same order and same arithmetic as scripts/live.mts; only the
// clock guards and the archives are left out. Pure: runs in a Web Worker.

import type { GenerationStat } from "../ga/evolve";
import type { SerializedIndividual } from "../ga/individual";
import type { GaParams } from "../ga/params";
import { fill, mark } from "../live/broker";
import type { DayArchive } from "../live/decide";
import { decisionEvent, runDecision } from "../live/decide";
import type { DecisionEvent, FillEvent, LiveEvent, MarkEvent, StartEvent } from "../live/events";
import { money, reduce } from "../live/reduce";
import type { Snapshot, UniverseEntry } from "../market/snapshot";
import { problemInput } from "../market/window";

export interface SimConfig {
  /** The evening the first portfolio is formed (a date of the snapshot). */
  formation: string;
  sessions: number;
  capital: number;
  params: GaParams;
  formationGenerations: number;
  dailyGenerations: number;
  /** Seeds are `${seed}|${date}`, so two runs with the same seed are identical. */
  seed: string;
  orderBuffer: number;
  /** Companies chosen by hand: the portfolio is locked to them from the formation (`params.strict`). */
  companies?: string[];
}

export interface SimProgress {
  /** The session the evening's order is for (1-based). */
  session: number;
  sessions: number;
  gen: number;
  generations: number;
  best: number;
}

export interface Holding {
  ticker: string;
  company: string;
  sector: string;
  weight: number;
}

export interface SessionSummary {
  session: number;
  /** The evening the order was decided, and the session it filled on. */
  decidedOn: string;
  executeOn: string;
  hold: boolean;
  score: number;
  /** In-sample daily estimates of the champion, and its turnover from the holdings. */
  mean: number;
  vol: number;
  turnover: number;
  cost: number;
  portfolio: Holding[];
  entered: string[];
  left: string[];
  history: Pick<GenerationStat, "gen" | "best" | "mean" | "diversity" | "hyper">[];
  fill: FillEvent;
  mark: MarkEvent;
  /** The portfolio and the benchmarks at this session's close. */
  point: NavPoint;
  ms: number;
}

export interface NavPoint {
  date: string;
  nav: number;
  bova: number | null;
  cdi: number;
}

export interface SimResult {
  config: SimConfig;
  sessionDates: string[];
  events: LiveEvent[];
  summaries: SessionSummary[];
  /** Point 0 is the formation evening (all cash); one point per session's close. */
  nav: NavPoint[];
  final: {
    nav: number;
    ret: number;
    bovaRet: number | null;
    cdiRet: number;
    fees: number;
    trades: number;
    holds: number;
  };
  ms: number;
}

/** The `sessions` trading days after `formation`, taken from the data itself (it knows every holiday). */
export function sessionsFrom(snap: Snapshot, formation: string, sessions: number): string[] {
  const i = snap.dates.indexOf(formation);
  if (i < 0) throw new Error(`${formation} is not a trading day of the data`);
  const out = snap.dates.slice(i + 1, i + 1 + sessions);
  if (out.length < sessions) throw new Error(`the data has only ${out.length} sessions after ${formation}`);
  return out;
}

/** Formation dates the data supports: a full lookback behind, `sessions` sessions ahead. */
export function formationRange(snap: Snapshot, lookback: number, sessions: number): string[] {
  return snap.dates.slice(lookback, snap.dates.length - sessions);
}

export function simulate(
  snap: Snapshot,
  config: SimConfig,
  onProgress?: (p: SimProgress) => void,
  onSession?: (s: SessionSummary) => void,
): SimResult {
  const t0 = performance.now();
  const { params, sessions: n } = config;
  const sessionDates = sessionsFrom(snap, config.formation, n);
  const byTicker = new Map<string, UniverseEntry>(snap.universe.map((u) => [u.ticker, u]));
  const index = new Map(snap.universe.map((u, i) => [u.ticker, i]));

  const events: LiveEvent[] = [];
  let state = reduce(events);
  const append = (e: LiveEvent) => {
    events.push(e);
    state = reduce(events);
  };
  const start: StartEvent = {
    type: "start",
    date: config.formation,
    capital: config.capital,
    universe: snap.universe,
    sessions: sessionDates,
    params,
    config: {
      capital: config.capital,
      sessions: n,
      formationGenerations: config.formationGenerations,
      dailyGenerations: config.dailyGenerations,
      orderBuffer: config.orderBuffer,
      historyEvery: 1,
    },
  };
  append(start);

  // Benchmarks over the same sessions: BOVA11 bought at the first open, and
  // the capital left in the CDI.
  const bovaOpen = snap.bova.open[snap.dates.indexOf(sessionDates[0])];
  let cdiValue = config.capital;

  const summaries: SessionSummary[] = [];
  let population: { date: string; nextId: number; population: SerializedIndividual[] } | null = null;
  let locked: string[] | undefined = params.strict ? config.companies : undefined;
  let previous: string[] = [];

  for (let k = 0; k < n; k++) {
    const t1 = performance.now();
    const session = k + 1;
    const date = k === 0 ? config.formation : sessionDates[k - 1];
    const executeOn = sessionDates[k];
    const day = snap.dates.indexOf(date);

    // Current weights at the decision's close, as the nightly job computes them.
    const closes: Record<string, number> = {};
    for (const [t, a] of index) {
      const c = snap.close[a][day];
      if (c !== null) closes[t] = c;
    }
    const held = Object.entries(state.shares);
    const nav = money(state.cash + held.reduce((s, [t, q]) => s + q * closes[t], 0));
    const current = Object.fromEntries(held.map(([t, q]) => [t, (q * closes[t]) / nav]));

    // Strict mode picks the companies at formation (or takes the ones chosen by hand) and only re-weights them after.
    const effective: GaParams = { ...params, strict: params.strict && locked !== undefined };
    const generations = population ? config.dailyGenerations : config.formationGenerations;
    const archive: DayArchive = {
      date,
      session,
      executeOn,
      seed: `${config.seed}|${date}`,
      generations,
      params: effective,
      input: problemInput(snap, day, params.lookback, current, effective.strict ? locked : undefined),
      seededFrom: population?.date ?? null,
      nextId: population?.nextId ?? 1,
    };
    const { problem, result, population: next } = runDecision(archive, population?.population, (stat) =>
      onProgress?.({ session, sessions: n, gen: stat.gen, generations, best: stat.best }),
    );
    population = next;

    const decision: DecisionEvent = decisionEvent({
      day: archive,
      inputsHash: "",
      problem,
      result,
      closes,
      shares: state.shares,
      nav,
      buffer: config.orderBuffer,
      historyEvery: 1,
    });
    append(decision);
    if (params.strict && !locked) locked = Object.keys(decision.champion.weights);

    const fillDay = snap.dates.indexOf(executeOn);
    const filled = fill(state, decision, snap, fillDay, params, config.orderBuffer);
    append(filled);
    const marked = mark(state, snap, fillDay, session);
    append(marked);

    const tickers = Object.keys(decision.champion.weights);
    cdiValue *= 1 + snap.cdi[fillDay];
    const bovaClose = snap.bova.close[fillDay];
    summaries.push({
      session,
      decidedOn: date,
      executeOn,
      hold: decision.hold,
      score: decision.champion.score,
      mean: decision.champion.mean,
      vol: decision.champion.vol,
      turnover: decision.champion.turnover,
      cost: decision.champion.cost,
      portfolio: Object.entries(decision.champion.weights)
        .map(([ticker, weight]) => ({ ticker, company: byTicker.get(ticker)!.company, sector: byTicker.get(ticker)!.sector, weight }))
        .sort((a, b) => b.weight - a.weight),
      entered: k === 0 ? [] : tickers.filter((t) => !previous.includes(t)),
      left: k === 0 ? [] : previous.filter((t) => !tickers.includes(t)),
      history: decision.history.map(({ gen, best, mean, diversity, hyper }) => ({ gen, best, mean, diversity, hyper })),
      fill: filled,
      mark: marked,
      point: {
        date: executeOn,
        nav: marked.nav,
        bova: bovaOpen && bovaClose ? (config.capital * bovaClose) / bovaOpen : null,
        cdi: cdiValue,
      },
      ms: performance.now() - t1,
    });
    onSession?.(summaries[summaries.length - 1]);
    previous = tickers;
  }

  const navSeries: NavPoint[] = [
    { date: config.formation, nav: config.capital, bova: config.capital, cdi: config.capital },
    ...summaries.map((s) => s.point),
  ];
  const last = navSeries[navSeries.length - 1];
  const fills = summaries.map((s) => s.fill);
  return {
    config,
    sessionDates,
    events,
    summaries,
    nav: navSeries,
    final: {
      nav: last.nav,
      ret: last.nav / config.capital - 1,
      bovaRet: last.bova === null ? null : last.bova / config.capital - 1,
      cdiRet: last.cdi / config.capital - 1,
      fees: money(fills.reduce((s, f) => s + f.trades.reduce((x, t) => x + t.fee, 0), 0)),
      trades: fills.reduce((s, f) => s + f.trades.length, 0),
      holds: summaries.filter((s) => s.hold).length,
    },
    ms: performance.now() - t0,
  };
}
