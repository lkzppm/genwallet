// The WebAssembly engine (engine/src, built by `pnpm engine:build` into
// engine-wasm.ts) and its wire format. One evening goes in as a flat
// Float64Array and comes out as another: tickers become indices, companies
// and sectors interned ids, null becomes NaN, so nothing crosses but numbers,
// bit for bit. engine/src/wasm.rs reads and writes the same layout.
//
// The module is compiled synchronously on first use, so the nightly job, the
// tuner's workers and the builder's Web Worker call the engine as a plain
// function. (Browsers allow synchronous compilation off the main thread.)

import { ENGINE_WASM } from "./engine-wasm";
import type { EvolveOptions, EvolveResult, GenerationStat } from "./evolve";
import type { Individual, Origin } from "./individual";
import type { FitnessKind, GaParams } from "./params";
import type { Problem, ProblemInput } from "./problem";

interface Exports {
  memory: WebAssembly.Memory;
  input_buffer(len: number): number;
  seed_buffer(len: number): number;
  run(): number;
  output_ptr(): number;
}

const FITNESS: FitnessKind[] = ["sharpe", "sortino", "cvar", "active", "goal"];
const ORIGINS: Origin[] = ["random", "immigrant", "hold", "cross", "mutant"];

let engine: Exports | null = null;
let onProgress: EvolveOptions["onProgress"];

function instance(): Exports {
  if (!engine) {
    const text = atob(ENGINE_WASM);
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
    const env = { progress: (gen: number, best: number) => onProgress?.(gen, best) };
    engine = new WebAssembly.Instance(new WebAssembly.Module(bytes), { env }).exports as unknown as Exports;
  }
  return engine;
}

/** Interned ids in first-seen order. */
function intern(names: string[]): number[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    let id = seen.get(name);
    if (id === undefined) {
      id = seen.size;
      seen.set(name, id);
    }
    return id;
  });
}

const num = (x: number | null | undefined) => (x === null || x === undefined ? NaN : x);

function encode(input: ProblemInput, params: GaParams, opts: EvolveOptions): number[] {
  const out: number[] = [
    params.k,
    params.wMin,
    params.wMax,
    params.sectorCap,
    params.populationSize,
    params.elite,
    params.tournament,
    params.crossoverRate,
    params.blxAlpha,
    params.swapRate,
    params.weightRate,
    params.weightSigma,
    params.transferRate,
    params.hyperFactor,
    params.diversityFloor,
    params.immigrantRate,
    params.meanShrink,
    params.skip ?? 0,
    params.covShrink,
    params.minTraded,
    params.fee,
    params.slippage,
    params.horizon,
    FITNESS.indexOf(params.fitness),
    params.goal ?? 0,
    params.strict ? 1 : 0,
  ];

  const n = input.tickers.length;
  const days = input.prices[0].length - 1;
  const index = new Map(input.tickers.map((t, i) => [t, i]));
  out.push(n);
  for (let a = 0; a < n; a++) {
    const p = input.prices[a];
    out.push(p.length);
    for (const x of p) out.push(num(x));
  }
  // `null >= minTraded` compares 0, a missing value NaN.
  for (let a = 0; a < n; a++) out.push(input.traded[a] === null ? 0 : num(input.traded[a]));
  out.push(...intern(input.companies.slice(0, n)), ...intern(input.sectors.slice(0, n)));
  out.push(input.rf);

  const current = Object.entries(input.current).flatMap(([t, w]) => {
    const a = index.get(t);
    return a === undefined ? [] : [[a, num(w)]];
  });
  out.push(current.length, ...current.flat());
  if (input.locked) out.push(input.locked.length, ...input.locked.map((t) => index.get(t) ?? -1));
  else out.push(-1);
  out.push(num(input.exposure));
  if (input.bench) {
    out.push(1, days + 1);
    for (let d = 0; d <= days; d++) out.push(num(input.bench[d]));
  } else out.push(0);

  out.push(opts.generations, opts.nextId ?? 1);
  const seed = opts.seedPopulation ?? [];
  out.push(seed.length);
  for (const s of seed) {
    // Back to indices of this universe; unknown tickers are dropped (repair refills them).
    const assets: number[] = [];
    const weights: number[] = [];
    s.tickers.forEach((t, i) => {
      const a = index.get(t);
      if (a !== undefined) {
        assets.push(a);
        weights.push(s.weights[i]);
      }
    });
    out.push(s.id, ORIGINS.indexOf(s.origin), s.born, s.parents.length, ...s.parents, assets.length, ...assets, ...weights);
  }
  return out;
}

function decode(data: Float64Array, input: ProblemInput, opts: EvolveOptions): { problem: Problem; result: EvolveResult } {
  let at = 0;
  const f = () => data[at++];
  const list = (len: number) => Array.from(data.subarray(at, (at += len)));
  const status = f();
  if (status === 1) throw new Error("the active fitness needs the benchmark in the input");
  if (status === 2) throw new Error("strict mode needs k locked tickers");
  if (status === 3) throw new Error(`locked ticker ${input.locked![f()]} is not eligible on ${input.date}`);
  if (status === 4) throw new Error("no feasible asset left to fill the portfolio");

  const individual = (): Individual => {
    const id = f();
    const origin = ORIGINS[f()];
    const born = f();
    const from = f();
    const parents = list(f());
    const k = f();
    const assets = list(k);
    const weights = list(k);
    const [score, mean, vol, turnover, cost] = list(5);
    const bornOn = from < 0 ? opts.label : opts.seedPopulation![from].bornOn;
    return { assets, weights, id, parents, born, bornOn, origin, eval: { score, mean, vol, turnover, cost } };
  };

  const n = f();
  const days = f();
  const eligible = list(f());
  const nextId = f();
  const population = Array.from({ length: f() }, individual);
  const hold = f() ? individual() : null;
  const history = Array.from({ length: f() }, (): GenerationStat => {
    const [gen, best, mean, diversity, hyper, championId] = list(6);
    const champion = list(f());
    return { gen, best, mean, diversity, hyper: hyper === 1, championId, champion, geneFreq: list(n) };
  });
  return {
    problem: { input, n, days, tickers: input.tickers, eligible },
    result: { population, champion: population[0], hold, history, nextId },
  };
}

export function run(input: ProblemInput, params: GaParams, opts: EvolveOptions): { problem: Problem; result: EvolveResult } {
  const e = instance();
  const data = encode(input, params, opts);
  // Allocate first: a growing memory detaches the views taken before.
  const at = e.input_buffer(data.length);
  new Float64Array(e.memory.buffer, at, data.length).set(data);
  const seed = new TextEncoder().encode(opts.seed);
  const seedAt = e.seed_buffer(seed.length);
  new Uint8Array(e.memory.buffer, seedAt, seed.length).set(seed);
  onProgress = opts.onProgress;
  let len: number;
  try {
    len = e.run();
  } finally {
    onProgress = undefined;
  }
  // A copy: the memory may grow, and detach this view, on the next run.
  const out = new Float64Array(e.memory.buffer, e.output_ptr(), len).slice();
  return decode(out, input, opts);
}
