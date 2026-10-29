// Infeasible genomes are repaired, never penalised (spec/02): one company per
// slot, exactly k slots, a cap per sector, and weights on the bounded simplex.

import type { GaParams } from "../../src/lib/ga/params";
import type { Problem } from "./problem";
import type { Rng } from "../../src/lib/ga/rng";

export interface Genome {
  assets: number[];
  weights: number[];
}

/**
 * The closest point of `{lo ≤ wᵢ ≤ hi, Σw = 1}` to `v`: wᵢ = clip(vᵢ − τ, lo, hi),
 * with τ found by bisection (the sum is monotone in τ).
 */
export function projectWeights(v: number[], lo: number, hi: number): number[] {
  let a = Math.min(...v) - hi;
  let b = Math.max(...v) - lo;
  const sum = (tau: number) => v.reduce((s, x) => s + Math.min(hi, Math.max(lo, x - tau)), 0);
  for (let i = 0; i < 100; i++) {
    const mid = (a + b) / 2;
    if (sum(mid) > 1) a = mid;
    else b = mid;
  }
  const tau = (a + b) / 2;
  return v.map((x) => Math.min(hi, Math.max(lo, x - tau)));
}

/** A random eligible asset whose company is absent and whose sector has room. */
function candidate(p: Problem, params: GaParams, rng: Rng, assets: number[]): number {
  const companies = new Set(assets.map((a) => p.company[a]));
  const count = new Map<number, number>();
  for (const a of assets) count.set(p.sector[a], (count.get(p.sector[a]) ?? 0) + 1);
  const pool = p.eligible.filter(
    (a) => !companies.has(p.company[a]) && (count.get(p.sector[a]) ?? 0) < params.sectorCap,
  );
  if (!pool.length) throw new Error("no feasible asset left to fill the portfolio");
  return rng.pick(pool);
}

export function repair(p: Problem, params: GaParams, rng: Rng, genome: Genome): Genome {
  const k = params.k;
  let slots: { a: number; w: number }[];

  if (p.locked) {
    const given = new Map(genome.assets.map((a, i) => [a, genome.weights[i]]));
    slots = p.locked.map((a) => ({ a, w: given.get(a) ?? 1 / k }));
  } else {
    // One ticker per company, keeping the heavier one.
    const byCompany = new Map<number, { a: number; w: number }>();
    genome.assets.forEach((a, i) => {
      if (!p.isEligible[a]) return;
      const w = genome.weights[i];
      const prev = byCompany.get(p.company[a]);
      if (!prev || w > prev.w || (w === prev.w && a < prev.a)) byCompany.set(p.company[a], { a, w });
    });
    slots = [...byCompany.values()].sort((x, y) => x.a - y.a);

    // Too many: drop the lightest (Chang et al. 2000).
    while (slots.length > k) {
      let low = 0;
      for (let i = 1; i < slots.length; i++) if (slots[i].w < slots[low].w) low = i;
      slots.splice(low, 1);
    }

    // Over-full sectors: swap their lightest member for an outsider with room.
    for (;;) {
      const count = new Map<number, number>();
      for (const s of slots) count.set(p.sector[s.a], (count.get(p.sector[s.a]) ?? 0) + 1);
      const over = [...count.entries()].find(([, c]) => c > params.sectorCap);
      if (!over) break;
      let low = -1;
      slots.forEach((s, i) => {
        if (p.sector[s.a] === over[0] && (low < 0 || s.w < slots[low].w)) low = i;
      });
      const [removed] = slots.splice(low, 1);
      slots.push({ a: candidate(p, params, rng, slots.map((s) => s.a)), w: removed.w });
    }

    // Too few: fill with random outsiders at the average weight.
    while (slots.length < k) {
      const avg = slots.length ? slots.reduce((s, x) => s + x.w, 0) / slots.length : 1 / k;
      slots.push({ a: candidate(p, params, rng, slots.map((s) => s.a)), w: avg });
    }
  }

  slots.sort((x, y) => x.a - y.a);
  const raw = slots.map((s) => (Number.isFinite(s.w) && s.w > 0 ? s.w : 0));
  const total = raw.reduce((s, x) => s + x, 0);
  const scaled = total > 0 ? raw.map((x) => x / total) : raw.map(() => 1 / k);
  return { assets: slots.map((s) => s.a), weights: projectWeights(scaled, params.wMin, params.wMax) };
}
