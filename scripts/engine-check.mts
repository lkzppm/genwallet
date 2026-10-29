// The Rust engine against the TypeScript one it replaced (engine/reference),
// on the same evenings: every number of the result must be the same double.
// Random cases over every fitness, strict mode, k, skip, the cash rule's
// exposure, a benchmark or none, and chains of evenings that carry the
// population and the holdings forward, as the live run does.
//   pnpm engine:check [--cases 120] [--data .cache/market-5y.json]

import { existsSync, readFileSync } from "node:fs";
import { evolve as referenceEvolve } from "../engine/reference/evolve";
import { serialize as referenceSerialize } from "../engine/reference/individual";
import { buildProblem } from "../engine/reference/problem";
import type { EvolveResult, FitnessKind, GaParams, ProblemInput, SerializedIndividual } from "../src/lib/ga";
import { DEFAULT_PARAMS, TUNED, createRng, evolve, serialize } from "../src/lib/ga";
import type { Snapshot } from "../src/lib/market/snapshot";
import { problemInput } from "../src/lib/market/window";
import { flag } from "./lib.mts";

const DATA = flag("data") ?? (existsSync(".cache/market-5y.json") ? ".cache/market-5y.json" : "public/data/market.json");
const CASES = Number(flag("cases") ?? 120);
const snap = JSON.parse(readFileSync(DATA, "utf8")) as Snapshot;
const rng = createRng("engine-check");
const FITNESS: FitnessKind[] = ["sharpe", "sortino", "cvar", "active", "goal"];

/** The first place two values differ, or null; numbers by Object.is, so −0 and NaN count. */
function diff(a: unknown, b: unknown, path = ""): string | null {
  if (typeof a === "number" && typeof b === "number") return Object.is(a, b) ? null : `${path}: ${a} vs ${b}`;
  if (Array.isArray(a) || Array.isArray(b) || ArrayBuffer.isView(a) || ArrayBuffer.isView(b)) {
    const x = Array.from(a as ArrayLike<unknown>);
    const y = Array.from(b as ArrayLike<unknown>);
    if (x.length !== y.length) return `${path}: length ${x.length} vs ${y.length}`;
    for (let i = 0; i < x.length; i++) {
      const d = diff(x[i], y[i], `${path}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    for (const k of keys) {
      const d = diff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`);
      if (d) return d;
    }
    return null;
  }
  return a === b ? null : `${path}: ${String(a)} vs ${String(b)}`;
}

const view = (r: EvolveResult) => ({
  population: r.population.map(({ id, assets, weights, parents, born, bornOn, origin, eval: e }) => ({ id, assets, weights, parents, born, bornOn, origin, e })),
  champion: r.champion.id,
  hold: r.hold && { id: r.hold.id, assets: r.hold.assets, weights: r.hold.weights, e: r.hold.eval },
  history: r.history,
  nextId: r.nextId,
});

type Outcome = { error: string } | { eligible: number[]; result: ReturnType<typeof view>; population: SerializedIndividual[] };

function runReference(input: ProblemInput, params: GaParams, opts: Parameters<typeof evolve>[2]): Outcome {
  try {
    const p = buildProblem(input, params);
    const r = referenceEvolve(p, params, opts);
    return { eligible: p.eligible, result: view(r), population: r.population.map((i) => referenceSerialize(p, i)) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

function runRust(input: ProblemInput, params: GaParams, opts: Parameters<typeof evolve>[2]): Outcome {
  try {
    const { problem, result } = evolve(input, params, opts);
    return { eligible: problem.eligible, result: view(result), population: result.population.map((i) => serialize(problem, i)) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const pick = <T,>(xs: readonly T[]) => xs[rng.int(xs.length)];

/** A random but feasible config around the two defaults. */
function config(): GaParams {
  const base = rng.next() < 0.5 ? DEFAULT_PARAMS : TUNED.params;
  const sectors = new Set(snap.universe.map((u) => u.sector)).size;
  const k = rng.next() < 0.6 ? 10 : 2 + rng.int(19);
  const sectorCap = Math.max(Math.ceil(k / sectors), 1 + rng.int(4));
  const wMax = Math.max(1 / k + 0.01, rng.range(0.1, 0.5));
  const wMin = Math.min(1 / k - 0.005, rng.range(0, 0.05));
  const fitness = pick(FITNESS);
  return {
    ...base,
    k,
    sectorCap,
    wMin: Math.max(0, wMin),
    wMax,
    populationSize: 20 + rng.int(180),
    elite: rng.int(8),
    tournament: 1 + rng.int(4),
    crossoverRate: rng.next(),
    blxAlpha: rng.range(0, 0.6),
    swapRate: rng.range(0, 0.5),
    weightRate: rng.range(0, 0.6),
    weightSigma: rng.range(0.05, 0.4),
    transferRate: rng.range(0, 0.5),
    hyperFactor: rng.range(1, 5),
    diversityFloor: rng.range(0, 0.4),
    immigrantRate: rng.range(0, 0.4),
    lookback: pick([60, 120, 240, 252]),
    meanShrink: rng.next(),
    skip: pick([0, 0, 3, 21]),
    covShrink: rng.next(),
    horizon: pick([5, 10, 17]),
    fitness,
    ...(fitness === "goal" ? { goal: rng.range(0, 0.01) } : {}),
    strict: rng.next() < 0.15,
  };
}

let checked = 0;
let errors = 0;
let tsMs = 0;
let rustMs = 0;
const failures: string[] = [];

for (let c = 0; c < CASES; c++) {
  const params = config();
  const day = params.lookback + rng.int(snap.dates.length - params.lookback - 4);
  const evenings = 1 + rng.int(3);
  const bench = params.fitness === "active" || rng.next() < 0.3;
  let current: Record<string, number> = {};
  let seed: { ts: SerializedIndividual[]; rust: SerializedIndividual[] } | null = null;
  let nextId = 1;
  let locked: string[] | undefined;
  let exposure: number | undefined;
  for (let e = 0; e < evenings; e++) {
    const d = day + e;
    // Strict mode locks to the previous champion, or to random tickers (some ineligible) at formation.
    if (params.strict && !locked) locked = snap.universe.slice(rng.int(20), 60).map((u) => u.ticker).filter((_, i) => i % 3 === 0).slice(0, params.k);
    const input = problemInput(snap, d, params.lookback, current, params.strict ? locked : undefined, bench, exposure);
    const generations = 1 + rng.int(40);
    const opts = (pop?: SerializedIndividual[]) => ({ generations, seed: `check|${c}|${e}`, label: snap.dates[d], seedPopulation: pop, nextId });
    const t0 = performance.now();
    const ts = runReference(input, params, opts(seed?.ts));
    const t1 = performance.now();
    const rust = runRust(input, params, opts(seed?.rust));
    const t2 = performance.now();
    tsMs += t1 - t0;
    rustMs += t2 - t1;
    checked++;
    const d0 = diff(ts, rust);
    if (d0) {
      failures.push(`case ${c} evening ${e} (${params.fitness}, k ${params.k}, strict ${params.strict}): ${d0}`);
      break;
    }
    if ("error" in ts) {
      errors++;
      break;
    }
    const rr = rust as Exclude<Outcome, { error: string }>;
    // The next evening holds the champion, perhaps under the cash rule, with a ticker outside the universe.
    const champ = rr.population[0];
    exposure = rng.next() < 0.3 ? pick([0, 0.3, 0.5, 1]) : undefined;
    const scale = exposure ?? 1;
    current = Object.fromEntries(champ.tickers.map((t, i) => [t, champ.weights[i] * scale * rng.range(0.95, 1.05)]));
    if (rng.next() < 0.2) current["XXXX3"] = 0.01;
    if (params.strict) locked = champ.tickers;
    seed = { ts: (ts as typeof rr).population, rust: rr.population };
    nextId = rr.result.nextId;
  }
}

console.log(`${checked} evenings in ${CASES} cases (${errors} ending in the same error); TypeScript ${tsMs.toFixed(0)} ms, Rust ${rustMs.toFixed(0)} ms`);
if (failures.length) {
  for (const f of failures) console.log(`FAIL ${f}`);
  process.exit(1);
}
console.log("ok: identical to the last bit");
