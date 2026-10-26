// Selection, crossover and mutation. Operators may produce infeasible
// genomes; the caller always repairs before evaluating.

import { dexp, dlog } from "./math";
import type { Individual } from "./individual";
import { byScore } from "./individual";
import type { GaParams } from "./params";
import type { Problem } from "./problem";
import type { Genome } from "./repair";
import type { Rng } from "./rng";

export function tournament(pop: Individual[], size: number, rng: Rng): Individual {
  let best = pop[rng.int(pop.length)];
  for (let i = 1; i < size; i++) {
    const c = pop[rng.int(pop.length)];
    if (byScore(c, best) < 0) best = c;
  }
  return best;
}

/** Random genome: k eligible assets and Dirichlet(1) weights. */
export function randomGenome(p: Problem, params: GaParams, rng: Rng): Genome {
  const pool = p.locked ? [...p.locked] : [...p.eligible];
  const assets: number[] = [];
  while (assets.length < params.k && pool.length) assets.push(pool.splice(rng.int(pool.length), 1)[0]);
  const raw = assets.map(() => -dlog(1 - rng.next()));
  const total = raw.reduce((s, x) => s + x, 0);
  return { assets, weights: raw.map((x) => x / total) };
}

/**
 * Shared assets stay, their weights blended by BLX-α; the free slots are drawn
 * from the rest of both parents, each with the weight it had there.
 */
export function crossover(a: Genome, b: Genome, params: GaParams, rng: Rng): Genome {
  const wb = new Map(b.assets.map((x, i) => [x, b.weights[i]]));
  const shared: { a: number; w: number }[] = [];
  const rest: { a: number; w: number }[] = [];
  a.assets.forEach((x, i) => {
    const w2 = wb.get(x);
    if (w2 === undefined) {
      rest.push({ a: x, w: a.weights[i] });
      return;
    }
    const lo = Math.min(a.weights[i], w2);
    const hi = Math.max(a.weights[i], w2);
    const d = hi - lo;
    shared.push({ a: x, w: rng.range(lo - params.blxAlpha * d, hi + params.blxAlpha * d) });
    wb.delete(x);
  });
  for (const [x, w] of wb) rest.push({ a: x, w });

  const child = [...shared];
  while (child.length < params.k && rest.length) child.push(rest.splice(rng.int(rest.length), 1)[0]);
  return { assets: child.map((s) => s.a), weights: child.map((s) => s.w) };
}

export function mutate(p: Problem, params: GaParams, rng: Rng, g: Genome, boost: number): Genome {
  const assets = [...g.assets];
  const weights = [...g.weights];
  const rate = (r: number) => Math.min(1, r * boost);

  if (!p.locked && rng.next() < rate(params.swapRate)) {
    const inGenome = new Set(assets);
    const outsiders = p.eligible.filter((a) => !inGenome.has(a));
    if (outsiders.length) assets[rng.int(assets.length)] = rng.pick(outsiders);
  }
  if (rng.next() < rate(params.weightRate)) {
    for (let i = 0; i < weights.length; i++) weights[i] *= dexp(params.weightSigma * rng.normal());
  }
  if (rng.next() < rate(params.transferRate) && weights.length > 1) {
    const i = rng.int(weights.length);
    let j = rng.int(weights.length - 1);
    if (j >= i) j++;
    const room = weights[i] - params.wMin;
    if (room > 0) {
      const delta = rng.next() * room;
      weights[i] -= delta;
      weights[j] += delta;
    }
  }
  return { assets, weights };
}

/** 1 − mean Jaccard similarity of asset sets over random pairs. */
export function diversity(pop: Individual[], rng: Rng, pairs = 200): number {
  if (pop.length < 2) return 0;
  let sim = 0;
  for (let t = 0; t < pairs; t++) {
    const x = pop[rng.int(pop.length)];
    let y = pop[rng.int(pop.length - 1)];
    if (y === x) y = pop[pop.length - 1];
    // Both sorted: merge to count the intersection.
    let i = 0;
    let j = 0;
    let inter = 0;
    while (i < x.assets.length && j < y.assets.length) {
      if (x.assets[i] === y.assets[j]) {
        inter++;
        i++;
        j++;
      } else if (x.assets[i] < y.assets[j]) i++;
      else j++;
    }
    sim += inter / (x.assets.length + y.assets.length - inter);
  }
  return 1 - sim / pairs;
}
