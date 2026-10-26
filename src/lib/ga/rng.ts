// Seeded randomness for the engine. Every random choice in a GA run goes
// through one Rng built from a string seed, so a run is reproducible to the
// last digit in Node and in the browser. Never use Math.random in src/lib/ga.

import { dlog } from "./math";

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform integer in [0, n). */
  int(n: number): number;
  /** Uniform in [lo, hi). */
  range(lo: number, hi: number): number;
  /** Standard normal (Marsaglia's polar method). */
  normal(): number;
  pick<T>(items: readonly T[]): T;
}

/** 128-bit string hash (cyrb128), used to seed sfc32. */
export function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function createRng(seed: string): Rng {
  const next = sfc32(...cyrb128(seed));
  // Warm up: the first outputs of sfc32 correlate with the seed.
  for (let i = 0; i < 15; i++) next();
  let spare: number | null = null;
  return {
    next,
    int: (n) => Math.floor(next() * n),
    range: (lo, hi) => lo + (hi - lo) * next(),
    normal() {
      if (spare !== null) {
        const s = spare;
        spare = null;
        return s;
      }
      // Marsaglia's polar method: no sin or cos, and the log is dlog (see math.ts).
      let u = 0;
      let v = 0;
      let s = 0;
      do {
        u = 2 * next() - 1;
        v = 2 * next() - 1;
        s = u * u + v * v;
      } while (s >= 1 || s === 0);
      const f = Math.sqrt((-2 * dlog(s)) / s);
      spare = v * f;
      return u * f;
    },
    pick: (items) => items[Math.floor(next() * items.length)],
  };
}

/** The seed of a live evening: one per calendar date. */
export function seedFor(date: string): string {
  return `genwallet|${date}`;
}
