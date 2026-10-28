// Hyperparameter search for the GA's defaults, on history: many configs
// replayed exactly as the live run would play them (the builder's
// simulator), over many past windows, on every core.
//
//   pnpm tune [--data .cache/market-5y.json] [--configs 160] [--stride 10]
//             [--holdout 0.25] [--objective bova|sharpe|mean] [--workers N]
//             [--mutants 4] [--name run] [--seed tune] [--grid grid.json]
//
// With --grid, the random search is replaced by the listed configs (each a
// set of overrides on today's defaults), all run on every training window
// and then on the held-out ones: a controlled test of one idea.
//
// 0. Leak test: every price after a decision is scrambled, and the decision
//    must come out the same. If it does not, the search stops.
// 1. Windows: a formation every `stride` sessions, each operated for 10
//    sessions. The last `holdout` share of them (by time, after a gap) is
//    never looked at until the end.
// 2. Successive halving on the training windows: every config on a few
//    windows, the best third on more windows and seeds, the best third of
//    those on all of them.
// 3. Refinement: mutants of the best few, scored on all training windows.
// 4. Holdout: the best configs and today's defaults on the held-out windows.
//
// Every run lands in .cache/tune/<name>/results.jsonl, keyed by the config's
// content, the window and the seed: a stopped search resumes where it was.
// The report goes to .cache/tune/<name>/report.md.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { fork, type ChildProcess } from "node:child_process";
import { TUNED } from "../src/lib/ga";
import type { GaParams } from "../src/lib/ga";
import { createRng } from "../src/lib/ga/rng";
import type { Rng } from "../src/lib/ga/rng";
import { LIVE_CONFIG } from "../src/lib/live/config";
import type { Snapshot } from "../src/lib/market/snapshot";
import type { SimConfig } from "../src/lib/sim/simulate";
import { simulate } from "../src/lib/sim/simulate";
import { flag } from "./lib.mts";
import type { TuneJob, TuneOutcome } from "./tune-worker.mts";

const DATA = flag("data") ?? (existsSync(".cache/market-5y.json") ? ".cache/market-5y.json" : "public/data/market.json");
const CONFIGS = Number(flag("configs") ?? 160);
const MUTANTS = Number(flag("mutants") ?? 4);
const STRIDE = Number(flag("stride") ?? LIVE_CONFIG.sessions);
const HOLDOUT = Number(flag("holdout") ?? 0.25);
// By default the gain over BOVA11 on the same sessions, over its spread across windows.
const OBJECTIVE = (flag("objective") ?? "bova") as "sharpe" | "mean" | "bova";
const WORKERS = Number(flag("workers") ?? Math.max(1, availableParallelism() - 1));
const NAME = flag("name") ?? "run";
const SEED = flag("seed") ?? "tune";
const GRID = flag("grid");
const SESSIONS = LIVE_CONFIG.sessions;
const DIR = `.cache/tune/${NAME}`;

// ── The search space ─────────────────────────────────────────────────────

/** What a config sets: the GA's parameters and the generations of the two kinds of evening. */
interface Candidate {
  params: GaParams;
  formationGenerations: number;
  dailyGenerations: number;
}

type Knob =
  | { key: keyof GaParams | "formationGenerations" | "dailyGenerations"; kind: "int"; min: number; max: number; step?: number }
  | { key: keyof GaParams; kind: "real"; min: number; max: number; log?: boolean }
  | { key: keyof GaParams; kind: "choice"; values: readonly (string | boolean | number)[] };

// k, the liquidity floor and the costs are the assignment's and the market's, not knobs.
const SPACE: Knob[] = [
  { key: "fitness", kind: "choice", values: ["sharpe", "sortino", "cvar", "active", "goal"] },
  { key: "goal", kind: "real", min: 0.001, max: 0.01 },
  { key: "strict", kind: "choice", values: [false, true] },
  { key: "populationSize", kind: "int", min: 80, max: 300, step: 20 },
  { key: "formationGenerations", kind: "int", min: 150, max: 600, step: 50 },
  { key: "dailyGenerations", kind: "int", min: 50, max: 300, step: 25 },
  { key: "elite", kind: "int", min: 1, max: 10 },
  { key: "tournament", kind: "int", min: 2, max: 6 },
  { key: "crossoverRate", kind: "real", min: 0.5, max: 1 },
  { key: "blxAlpha", kind: "real", min: 0, max: 0.6 },
  { key: "swapRate", kind: "real", min: 0.05, max: 0.5 },
  { key: "weightRate", kind: "real", min: 0.1, max: 0.7 },
  { key: "weightSigma", kind: "real", min: 0.05, max: 0.5, log: true },
  { key: "transferRate", kind: "real", min: 0, max: 0.5 },
  { key: "hyperFactor", kind: "real", min: 1, max: 5 },
  { key: "diversityFloor", kind: "real", min: 0.05, max: 0.3 },
  { key: "immigrantRate", kind: "real", min: 0, max: 0.3 },
  { key: "wMin", kind: "real", min: 0.01, max: 0.06 },
  { key: "wMax", kind: "real", min: 0.12, max: 0.35 },
  { key: "sectorCap", kind: "int", min: 2, max: 5 },
  { key: "lookback", kind: "int", min: 120, max: 252, step: 6 },
  { key: "meanShrink", kind: "real", min: 0, max: 0.95 },
  { key: "skip", kind: "int", min: 0, max: 42, step: 3 },
  { key: "covShrink", kind: "real", min: 0, max: 0.8 },
  { key: "horizon", kind: "int", min: 3, max: 30 },
];
/** The longest lookback the space allows: every window starts after it, so all configs see the same windows. */
const MAX_LOOKBACK = 252;

const round = (x: number, digits = 3) => Number(x.toFixed(digits));

function get(c: Candidate, key: Knob["key"]): unknown {
  return key === "formationGenerations" || key === "dailyGenerations" ? c[key] : c.params[key];
}

function set(c: Candidate, knob: Knob, value: unknown): void {
  if (knob.key === "formationGenerations" || knob.key === "dailyGenerations") c[knob.key] = value as number;
  else (c.params as unknown as Record<string, unknown>)[knob.key] = value;
}

function draw(knob: Knob, rng: Rng): unknown {
  if (knob.kind === "choice") return knob.values[rng.int(knob.values.length)];
  if (knob.kind === "int") {
    const step = knob.step ?? 1;
    return knob.min + step * rng.int(Math.floor((knob.max - knob.min) / step) + 1);
  }
  const u = rng.next();
  return round(knob.log ? knob.min * (knob.max / knob.min) ** u : knob.min + u * (knob.max - knob.min));
}

/** A value near `value`: a sixth of the range around it, clipped; a choice flips. */
function nudge(knob: Knob, value: unknown, rng: Rng): unknown {
  if (knob.kind === "choice") {
    const others = knob.values.filter((v) => v !== value);
    return others[rng.int(others.length)];
  }
  const span = (knob.max - knob.min) / 6;
  const next = Math.min(knob.max, Math.max(knob.min, (value as number) + span * rng.normal()));
  if (knob.kind === "int") {
    const step = knob.step ?? 1;
    return knob.min + step * Math.round((next - knob.min) / step);
  }
  return round(next);
}

const valid = (c: Candidate) =>
  c.params.wMin * c.params.k <= 1 && c.params.wMax * c.params.k >= 1 && c.params.elite < c.params.populationSize;

const DEFAULT: Candidate = {
  params: { ...TUNED.params },
  formationGenerations: TUNED.formationGenerations,
  dailyGenerations: TUNED.dailyGenerations,
};

function sample(rng: Rng): Candidate {
  for (;;) {
    const c: Candidate = structuredClone(DEFAULT);
    for (const knob of SPACE) set(c, knob, draw(knob, rng));
    if (valid(c)) return c;
  }
}

function mutant(parent: Candidate, rng: Rng): Candidate {
  for (;;) {
    const c = structuredClone(parent);
    const n = 1 + rng.int(3);
    for (let i = 0; i < n; i++) {
      const knob = SPACE[rng.int(SPACE.length)];
      set(c, knob, nudge(knob, get(c, knob.key), rng));
    }
    if (valid(c) && id(c) !== id(parent)) return c;
  }
}

/** A short, stable name for a config's content (FNV-1a over its JSON). */
function id(c: Candidate): string {
  const text = JSON.stringify([c.params, c.formationGenerations, c.dailyGenerations]);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36).padStart(7, "0");
}

// ── Windows ──────────────────────────────────────────────────────────────

const snap = JSON.parse(readFileSync(DATA, "utf8")) as Snapshot;
const snapDates = snap.dates;
const formations: string[] = [];
for (let i = MAX_LOOKBACK; i + SESSIONS < snapDates.length; i += STRIDE) formations.push(snapDates[i]);
const cut = Math.floor(formations.length * (1 - HOLDOUT));
// One window of gap, so no training run shares a session with a held-out one.
const train = formations.slice(0, Math.max(0, cut - Math.ceil(SESSIONS / STRIDE)));
const holdout = formations.slice(cut);

/** The training windows in an order whose every prefix is spread over the whole span. */
const spread = train
  .map((date, i) => ({ date, key: (i * 0.6180339887498949) % 1 }))
  .sort((a, b) => a.key - b.key)
  .map((w) => w.date);

// ── Running ──────────────────────────────────────────────────────────────

mkdirSync(DIR, { recursive: true });
const RESULTS = `${DIR}/results.jsonl`;
const done = new Map<string, TuneOutcome>();
if (existsSync(RESULTS)) {
  for (const line of readFileSync(RESULTS, "utf8").split("\n")) if (line) {
    const r = JSON.parse(line) as TuneOutcome;
    done.set(r.key, r);
  }
}

const pool: ChildProcess[] = Array.from({ length: WORKERS }, () =>
  fork(new URL("./tune-worker.mts", import.meta.url), [DATA], { execArgv: ["--import", "tsx"] }),
);

const jobKey = (c: Candidate, formation: string, seed: number) => `${id(c)}|${formation}|${seed}`;

function simConfig(c: Candidate, formation: string, seed: number): SimConfig {
  return {
    formation,
    sessions: SESSIONS,
    capital: LIVE_CONFIG.capital,
    params: c.params,
    formationGenerations: c.formationGenerations,
    dailyGenerations: c.dailyGenerations,
    seed: `${SEED}-${seed}`,
    orderBuffer: LIVE_CONFIG.orderBuffer,
  };
}

/** Runs every (config, window, seed) not on file yet, on all workers, with a progress line. */
async function runAll(label: string, jobs: TuneJob[]): Promise<void> {
  const todo = jobs.filter((j) => !done.has(j.key));
  if (!todo.length) return;
  const t0 = performance.now();
  let finished = 0;
  let next = 0;
  await new Promise<void>((resolve) => {
    const feed = (w: ChildProcess) => {
      if (next < todo.length) w.send(todo[next++]);
    };
    for (const w of pool) {
      w.removeAllListeners("message");
      w.on("message", (message) => {
        const r = message as TuneOutcome;
        done.set(r.key, r);
        appendFileSync(RESULTS, JSON.stringify(r) + "\n");
        if (r.error) console.error(`\n${r.key}: ${r.error}`);
        finished++;
        const elapsed = (performance.now() - t0) / 1000;
        const eta = (elapsed / finished) * (todo.length - finished);
        process.stdout.write(`\r${label}: ${finished}/${todo.length} runs · ${elapsed.toFixed(0)} s · ${Math.round(eta / 60)} min left   `);
        if (finished === todo.length) resolve();
        else feed(w);
      });
      feed(w);
    }
  });
  process.stdout.write("\n");
}

// ── Scoring ──────────────────────────────────────────────────────────────

interface Score {
  runs: number;
  /** Mean 10-session return, and over the CDI and over BOVA11 on the same sessions. */
  ret: number;
  overCdi: number;
  overBova: number;
  /** Mean over the CDI divided by its spread across windows: a window Sharpe. */
  sharpe: number;
  /** Share of windows that beat BOVA11, and the worst window. */
  beatBova: number;
  worst: number;
  /** Mean over BOVA11 in the windows where BOVA11 fell, and where it rose. */
  down: number;
  up: number;
  /** A contest is won by the tail: the share of windows at least 3 points over BOVA11, and the 90th percentile of the return. */
  big: number;
  p90: number;
  objective: number;
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, xs.length - 1));
};

function score(c: Candidate, windows: string[], seeds: number): Score {
  const runs: TuneOutcome[] = [];
  for (const w of windows) for (let s = 0; s < seeds; s++) {
    const r = done.get(jobKey(c, w, s));
    if (r && !r.error) runs.push(r);
  }
  // Seeds of one window are averaged first, so every window weighs the same.
  const byWindow = windows
    .map((w) => runs.filter((r) => r.key.split("|")[1] === w))
    .filter((rs) => rs.length)
    .map((rs) => ({
      ret: mean(rs.map((r) => r.ret)),
      overCdi: mean(rs.map((r) => r.ret - r.cdi)),
      overBova: mean(rs.map((r) => r.ret - (r.bova ?? r.cdi))),
      bova: mean(rs.map((r) => r.bova ?? r.cdi)),
    }));
  const overCdi = byWindow.map((w) => w.overCdi);
  const overBova = byWindow.map((w) => w.overBova);
  const sharpe = mean(overCdi) / (sd(overCdi) || 1);
  const s: Score = {
    runs: runs.length,
    ret: mean(byWindow.map((w) => w.ret)),
    overCdi: mean(overCdi),
    overBova: mean(overBova),
    sharpe,
    beatBova: mean(overBova.map((x) => (x > 0 ? 1 : 0))),
    worst: Math.min(...byWindow.map((w) => w.ret)),
    down: mean(byWindow.filter((w) => w.bova < 0).map((w) => w.overBova)),
    up: mean(byWindow.filter((w) => w.bova >= 0).map((w) => w.overBova)),
    big: mean(overBova.map((x) => (x >= 0.03 ? 1 : 0))),
    p90: [...byWindow.map((w) => w.ret)].sort((a, b) => a - b)[Math.min(byWindow.length - 1, Math.floor(0.9 * byWindow.length))] ?? 0,
    objective: 0,
  };
  s.objective = OBJECTIVE === "sharpe" ? s.sharpe : OBJECTIVE === "mean" ? s.overCdi : s.overBova / (sd(overBova) || 1);
  return s;
}

function jobs(cs: Candidate[], windows: string[], seeds: number): TuneJob[] {
  return cs.flatMap((c) => windows.flatMap((w) => Array.from({ length: seeds }, (_, s) => ({ key: jobKey(c, w, s), config: simConfig(c, w, s) }))));
}

/** The best `n` by the objective on these windows; the defaults always come along, to compare against. */
function best(cs: Candidate[], windows: string[], seeds: number, n: number): Candidate[] {
  const ranked = [...cs].sort((a, b) => score(b, windows, seeds).objective - score(a, windows, seeds).objective || id(a).localeCompare(id(b)));
  const top = ranked.slice(0, n);
  return top.some((c) => id(c) === id(DEFAULT)) ? top : [...top, DEFAULT];
}

// ── Leak test ────────────────────────────────────────────────────────────

/**
 * The decision of an evening must not depend on anything after its close.
 * Every price, volume, index level and CDI rate after that close is
 * scrambled, and the portfolio decided that evening must come out
 * identical, for every fitness. Checked on the formation and on the
 * evening after the first session.
 */
function leakTest(): void {
  const formation = formations[Math.floor(formations.length / 2)];
  const at = snapDates.indexOf(formation);
  for (const evening of [0, 1]) {
    const cut = at + evening;
    const noise = createRng(`leak-${evening}`);
    const scramble = (row: (number | null)[]) => row.map((x, d) => (d > cut && x !== null ? x * noise.range(0.5, 1.5) : x));
    const poisoned: Snapshot = {
      ...snap,
      open: snap.open.map(scramble),
      close: snap.close.map(scramble),
      adjClose: snap.adjClose.map(scramble),
      volume: snap.volume.map(scramble),
      ibov: { open: scramble(snap.ibov.open), close: scramble(snap.ibov.close) },
      bova: { open: scramble(snap.bova.open), close: scramble(snap.bova.close) },
      cdi: snap.cdi.map((x, d) => (d > cut ? x * noise.range(0.5, 1.5) : x)),
    };
    for (const fitness of ["sharpe", "sortino", "cvar", "active", "goal"] as const) {
      const c: Candidate = { ...DEFAULT, params: { ...DEFAULT.params, fitness, skip: 21, goal: 0.005 } };
      const config = { ...simConfig(c, formation, 0), sessions: evening + 1 };
      const clean = simulate(snap, config).summaries[evening].portfolio;
      const dirty = simulate(poisoned, config).summaries[evening].portfolio;
      if (JSON.stringify(clean) !== JSON.stringify(dirty)) {
        throw new Error(`look-ahead: the ${fitness} decision of evening ${evening + 1} after ${formation} changed when the future was scrambled`);
      }
    }
  }
  console.log(`leak test passed: decisions on ${formation} and the evening after ignore every later price`);
}

// ── The search ───────────────────────────────────────────────────────────

console.log(
  `${DATA}: ${snapDates[0]} to ${snapDates[snapDates.length - 1]} · ${train.length} training windows, ${holdout.length} held out ` +
    `(${holdout[0]} on) · ${GRID ? `grid ${GRID}` : `${CONFIGS} configs`} · ${WORKERS} workers · objective ${OBJECTIVE}`,
);
if (train.length < 12 || !holdout.length) throw new Error("too little history for the windows: fetch more with pnpm tune:data");
leakTest();

const rng = createRng(`${SEED}-space`);
const all = { windows: spread, seeds: 3 };
let field: Candidate[];
let finalists: Candidate[];
let method: string;

if (GRID) {
  const overrides = JSON.parse(readFileSync(GRID, "utf8")) as Record<string, unknown>[];
  field = [
    DEFAULT,
    ...overrides.map((o) => {
      const c = structuredClone(DEFAULT);
      for (const [key, value] of Object.entries(o)) {
        if (key === "formationGenerations" || key === "dailyGenerations") c[key] = value as number;
        else (c.params as unknown as Record<string, unknown>)[key] = value;
      }
      if (!valid(c)) throw new Error(`invalid grid config: ${JSON.stringify(o)}`);
      return c;
    }),
  ];
  await runAll(`grid (${field.length} configs × ${spread.length} windows × 3 seeds)`, jobs(field, all.windows, all.seeds));
  // Every config goes to the holdout, ranked on training: the pick is still made before looking.
  finalists = best(field, all.windows, all.seeds, field.length);
  method = `a grid of ${overrides.length} configs (${GRID}) plus the defaults, all on every window`;
} else {
  field = [DEFAULT, ...Array.from({ length: CONFIGS }, () => sample(rng))];
  const rungs = [
    { windows: spread.slice(0, 12), seeds: 1 },
    { windows: spread.slice(0, 24), seeds: 2 },
    { windows: spread, seeds: 3 },
  ];
  for (const [i, rung] of rungs.entries()) {
    await runAll(`rung ${i + 1}/${rungs.length} (${field.length} configs × ${rung.windows.length} windows × ${rung.seeds} seeds)`, jobs(field, rung.windows, rung.seeds));
    if (i < rungs.length - 1) field = best(field, rung.windows, rung.seeds, Math.max(4, Math.ceil(field.length / 3)));
  }

  const parents = best(field, all.windows, all.seeds, 4).filter((c) => id(c) !== id(DEFAULT));
  const mutants = parents.flatMap((p) => Array.from({ length: MUTANTS }, () => mutant(p, rng)));
  await runAll(`refine (${mutants.length} mutants of the best ${parents.length})`, jobs(mutants, all.windows, all.seeds));
  field = [...field, ...mutants];
  finalists = best(field, all.windows, all.seeds, 5);
  method = `${CONFIGS} random configs plus the defaults, successive halving, ${mutants.length} mutants of the best ${parents.length}`;
}

await runAll(`holdout (${finalists.length} configs × ${holdout.length} windows × 3 seeds)`, jobs(finalists, holdout, 3));
for (const w of pool) w.kill();

// ── Report ───────────────────────────────────────────────────────────────

const pct = (x: number) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(2)}%`;
// Every key either side sets (a grid may set ones outside the space, k among them).
const keys = (c: Candidate) => ["formationGenerations", "dailyGenerations", ...Object.keys(c.params)] as Knob["key"][];
const changes = (c: Candidate) =>
  [...new Set([...keys(DEFAULT), ...keys(c)])]
    .filter((k) => (get(c, k) ?? 0) !== (get(DEFAULT, k) ?? 0))
    .map((k) => `${k} ${String(get(DEFAULT, k) ?? 0)} → ${String(get(c, k))}`)
    .join(", ") || "(defaults)";

const rows = finalists.map((c) => ({ c, train: score(c, all.windows, all.seeds), held: score(c, holdout, 3) }));
const base = rows.find((r) => id(r.c) === id(DEFAULT))!;
const winner = rows.find((r) => id(r.c) !== id(DEFAULT))!;
const line = (s: Score) =>
  `${pct(s.ret)} | ${pct(s.overCdi)} | ${pct(s.overBova)} | ${pct(s.down)} | ${pct(s.up)} | ${s.sharpe.toFixed(2)} | ${(s.beatBova * 100).toFixed(0)}% | ${(s.big * 100).toFixed(0)}% | ${pct(s.p90)} | ${pct(s.worst)}`;

const report = [
  `# Tuning run "${NAME}"`,
  "",
  `${DATA}, ${snapDates[0]} to ${snapDates[snapDates.length - 1]}. A formation every ${STRIDE} sessions, each operated ${SESSIONS} sessions with the live run's costs.`,
  `${train.length} training windows (${train[0]} to ${train[train.length - 1]}), ${holdout.length} held out (${holdout[0]} to ${holdout[holdout.length - 1]}).`,
  `${method}; objective: ${OBJECTIVE}. ${done.size} runs on file.`,
  "",
  "Returns are per 10-session window, averaged over windows (seeds of a window averaged first). Sharpe: mean over the CDI / its spread across windows. \"When BOVA11 fell / rose\": the mean over BOVA11 in those windows only. \"Big wins\": windows at least 3 points over BOVA11; p90: the 90th percentile of the window return.",
  "",
  "| config | set | return | over CDI | over BOVA11 | when BOVA11 fell | when it rose | Sharpe | beats BOVA11 | big wins | p90 | worst |",
  "|---|---|---|---|---|---|---|---|---|---|---|---|",
  ...rows.flatMap((r) => [
    `| \`${id(r.c)}\`${id(r.c) === id(DEFAULT) ? " (defaults)" : ""} | train | ${line(r.train)} |`,
    `| | holdout | ${line(r.held)} |`,
  ]),
  "",
  "## Changes from the defaults",
  "",
  ...rows.map((r) => `- \`${id(r.c)}\`: ${changes(r.c)}`),
  "",
  "## Verdict",
  "",
  winner.held.objective > base.held.objective
    ? `\`${id(winner.c)}\` beats the defaults on the held-out windows too (${OBJECTIVE} ${winner.held.objective.toFixed(2)} against ${base.held.objective.toFixed(2)}).`
    : `\`${id(winner.c)}\` leads on training but not on the held-out windows (${OBJECTIVE} ${winner.held.objective.toFixed(2)} against ${base.held.objective.toFixed(2)} for the defaults): the gain does not generalise, keep the defaults or search wider.`,
  "",
  "```json",
  JSON.stringify({ params: winner.c.params, formationGenerations: winner.c.formationGenerations, dailyGenerations: winner.c.dailyGenerations }, null, 2),
  "```",
  "",
].join("\n");
writeFileSync(`${DIR}/report.md`, report);
console.log(`\n${report}\nwritten to ${DIR}/report.md`);
