// The nightly step of the live run (spec/03). Idempotent: run it as often as
// you like; it fills and marks every session the data has reached, then
// decides the next order if the next open has not passed.
//
//   pnpm live                                   the real run, writes live/
//   pnpm live --dir .cache/dry --start 2026-10-23 --date 2026-10-23 --cache
//                                               a dry run as if formation were on --start,
//                                               with the data cut at --date
//
// --now <ISO instant> overrides the clock for the finality and deadline guards.
// --params <file.json> --reason "..." changes the GA's parameters from
// tonight's decision on, as an event in the log (spec/03).

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { GaParams } from "../src/lib/ga";
import { DEFAULT_PARAMS, seedFor } from "../src/lib/ga";
import type { Snapshot } from "../src/lib/market/snapshot";
import { problemInput, truncate } from "../src/lib/market/snapshot";
import { fill, mark } from "../src/lib/live/broker";
import { brtDate, decisionDeadline, sessionsAfter } from "../src/lib/live/calendar";
import { FORMATION_DATE, LIVE_CONFIG } from "../src/lib/live/config";
import type { DayArchive, PopulationFile } from "../src/lib/live/decide";
import { decisionEvent, runDecision } from "../src/lib/live/decide";
import type { LiveEvent, StartEvent } from "../src/lib/live/events";
import { money, reduce } from "../src/lib/live/reduce";
import { currentUniverse, flag, has, readJson, snapshot, writeJson } from "./lib.mts";

const dir = flag("dir") ?? "live";
const asOf = flag("date");
const now = flag("now") ? Date.parse(flag("now")!) : Date.now();
const formation = flag("start") ?? FORMATION_DATE;
const logPath = join(dir, "log.json");

const events: LiveEvent[] = existsSync(logPath) ? readJson<LiveEvent[]>(logPath) : [];
let state = reduce(events);
const append = (e: LiveEvent) => {
  events.push(e);
  state = reduce(events);
  console.log(`+ ${e.type} ${e.date}${"session" in e ? ` (session ${e.session})` : ""}`);
};
const stop = (msg: string): never => {
  console.log(msg);
  process.exit(0);
};

const start: StartEvent = state.start ?? {
  type: "start",
  date: formation,
  capital: LIVE_CONFIG.capital,
  // The Ibovespa of formation day, frozen for the whole run.
  universe: await currentUniverse(),
  sessions: sessionsAfter(formation, LIVE_CONFIG.sessions),
  params: DEFAULT_PARAMS,
  config: LIVE_CONFIG,
};
const { config, sessions } = start;

// A change of parameters applies from the next decision on and is in the
// record with its reason and its time; the commit before the open proves it.
const paramsFile = flag("params");
if (paramsFile) {
  const next = readJson<GaParams>(paramsFile);
  const reason = flag("reason");
  if (!reason) throw new Error("--params needs --reason");
  if (JSON.stringify(next) !== JSON.stringify(state.params)) {
    // The first evening whose decision is still to be made: tonight's, or the next session's if tonight's is done.
    const last = state.lastDate!;
    const evening = state.decisions.some((d) => d.date === last) ? (sessions[sessions.indexOf(last) + 1] ?? last) : last;
    append({ type: "params", date: evening, at: new Date(now).toISOString(), params: next, reason });
  }
}
const params = state.params ?? start.params;

let snap: Snapshot = await snapshot(start.universe, has("cache"));
if (asOf) snap = truncate(snap, asOf);
const last = snap.dates[snap.dates.length - 1];

// The day's bar is final 30 minutes after the regular close.
if (!asOf && last === brtDate(now) && snap.regularEnd !== null && now < (snap.regularEnd + 1800) * 1000) {
  stop(`the bar of ${last} is not final until ${new Date((snap.regularEnd + 1800) * 1000).toISOString()}`);
}
if (!state.start) {
  if (last < formation) stop(`waiting for the close of the formation day ${formation} (data ends ${last})`);
  append(start);
}

// Fill and mark every session the data has reached.
for (const [i, date] of sessions.entries()) {
  if (date > last) break;
  if (date <= state.lastDate!) continue;
  const day = snap.dates.indexOf(date);
  if (day < 0) throw new Error(`session ${date} is missing from the data: a holiday not in the calendar?`);
  const session = i + 1;
  // Yahoo publishes a day's closes before its opens are right: at 22:30 BRT
  // on 2026-10-27 every open of the day, the index's included, still read 0.
  // A single stock without an open is a suspension and the fill handles it;
  // the index without one is data that is not there yet.
  if (snap.ibov.open[day] === null || snap.bova.open[day] === null) {
    writeJson(logPath, events);
    stop(`the opens of ${date} are not published yet: nothing filled or marked`);
  }
  if (state.pending?.executeOn === date) {
    append(fill(state, state.pending, snap, day, params, config.orderBuffer));
  } else if (!state.missed.some((m) => m.session === session)) {
    append({ type: "missed", date, session, reason: "no decision was committed before the open" });
  }
  append(mark(state, snap, day, session));
}

const done = sessions.filter((d) => d <= state.lastDate!).length;
if (done === sessions.length) {
  writeJson(logPath, events);
  stop(`run complete: NAV ${state.marks[state.marks.length - 1].nav}`);
}

const session = done + 1;
const executeOn = sessions[done];
const date = state.lastDate!;
if (state.decisions.some((d) => d.session === session)) {
  writeJson(logPath, events);
  stop(`session ${session} (${executeOn}) is already decided`);
}
if (now >= decisionDeadline(executeOn) && !asOf) {
  writeJson(logPath, events);
  stop(`too late to decide for ${executeOn}: its open has passed; it will be logged as missed`);
}
const day = snap.dates.indexOf(date);
if (day < 0) stop(`waiting for the close of ${date}`);

// Current weights at the decision's close.
const index = new Map(snap.universe.map((u, i) => [u.ticker, i]));
const closes: Record<string, number> = {};
for (const [t, a] of index) {
  const c = snap.close[a][day];
  if (c !== null) closes[t] = c;
}
const held = Object.entries(state.shares);
const nav = money(state.cash + held.reduce((s, [t, q]) => s + q * closes[t], 0));
const current = Object.fromEntries(held.map(([t, q]) => [t, (q * closes[t]) / nav]));

const prev = state.decisions[state.decisions.length - 1];
const prevPath = prev && join(dir, "population", `${prev.date}.json`);
const prevPop = prevPath && existsSync(prevPath) ? readJson<PopulationFile>(prevPath) : null;

const archive: DayArchive = {
  date,
  session,
  executeOn,
  seed: seedFor(date),
  generations: prevPop ? config.dailyGenerations : config.formationGenerations,
  params,
  input: problemInput(snap, day, params.lookback, current, undefined, params.fitness === "active"),
  seededFrom: prevPop?.date ?? null,
  nextId: prevPop?.nextId ?? 1,
};
const dayPath = join(dir, "days", `${date}.json`);
writeJson(dayPath, archive, true);
const inputsHash = createHash("sha256").update(readFileSync(dayPath)).digest("hex");

const t0 = performance.now();
const { problem, result, population } = runDecision(archive, prevPop?.population);
console.log(`evolved ${archive.generations} generations in ${(performance.now() - t0).toFixed(0)} ms`);
writeJson(join(dir, "population", `${date}.json`), population, true);

const decision = decisionEvent({
  day: archive,
  inputsHash,
  problem,
  result,
  closes,
  shares: state.shares,
  nav,
  buffer: config.orderBuffer,
  historyEvery: config.historyEvery,
});
append(decision);
writeJson(logPath, events);

console.log(`\norder for ${executeOn}${decision.hold ? ": hold, no trades" : ""}`);
for (const [t, w] of Object.entries(decision.champion.weights)) {
  console.log(`  ${t.padEnd(7)} ${(w * 100).toFixed(2).padStart(6)}%  ${String(decision.targetShares[t] ?? 0).padStart(6)} shares @ ${closes[t]}`);
}
console.log(`score ${decision.champion.score.toFixed(4)}, turnover ${decision.champion.turnover.toFixed(3)}, NAV ${nav}`);
