// The demo behind the background: a real genetic algorithm on a toy fitness
// landscape. Individuals are points of the unit square, fitness is the height
// of a sum of Gaussian bumps (peaks and pits), and every "session" the bumps
// drift to new places, so the population has to climb again: the same
// dynamic-environment story as the portfolio engine, in two dimensions you
// can see. Seeded, so every visitor watches the same run.

import { createRng } from "@/lib/ga/rng";
import type { Rng } from "@/lib/ga/rng";

/** Bumps in the landscape; the shader's uniform array has this many slots. */
export const BUMPS = 8;
/** Individuals; the dot instancing array has this many slots. */
export const POPULATION = 96;

/** A Gaussian bump: centre in the unit square, width (in height units), signed amplitude. */
export interface Bump {
  x: number;
  y: number;
  s: number;
  a: number;
}

export interface Dot {
  /** Where the dot is drawn, eased toward its individual. */
  x: number;
  y: number;
  /** The individual this slot holds now. */
  tx: number;
  ty: number;
  fitness: number;
  /** 0..1, ramps up after an immigrant arrives. */
  alpha: number;
}

export interface LandscapeOptions {
  seed?: string;
  /** Seconds between generations. */
  generation?: number;
  /** Seconds between sessions (the landscape moves). */
  session?: number;
  /** Seconds the landscape takes to move. */
  morph?: number;
}

const ELITE = 4;
const TOURNAMENT = 2;
const BLX = 0.25;
const SIGMA = 0.035;
const HYPER = 3;
const DIVERSITY_FLOOR = 0.06;
const IMMIGRANTS = 0.15;

function randomBumps(rng: Rng): Bump[] {
  // Peaks keep to the right of the page, where no text covers the climb; pits go anywhere.
  return Array.from({ length: BUMPS }, (_, i) => ({
    x: i < 5 ? rng.range(0.5, 0.95) : rng.range(0.05, 0.95),
    y: rng.range(0.08, 0.92),
    s: rng.range(0.07, 0.2),
    // Mostly peaks, a few pits, so both colours show.
    a: i < 5 ? rng.range(0.45, 1) : -rng.range(0.4, 0.9),
  }));
}

const smooth = (t: number) => t * t * (3 - 2 * t);

export class Landscape {
  readonly rng: Rng;
  readonly opts: Required<LandscapeOptions>;
  /** Width over height of the canvas: distances are measured in height units. */
  aspect = 16 / 9;
  session = 0;
  generation = 0;
  dots: Dot[];
  champion = 0;
  private from: Bump[];
  private to: Bump[];
  private morphT = 1;
  private sinceGeneration = 0;
  private sinceSession = 0;

  constructor(options: LandscapeOptions = {}) {
    this.opts = { seed: "genwallet-terrain", generation: 0.8, session: 8, morph: 4.5, ...options };
    this.rng = createRng(this.opts.seed);
    this.from = randomBumps(this.rng);
    this.to = this.from;
    this.dots = Array.from({ length: POPULATION }, () => {
      const x = this.rng.next();
      const y = this.rng.next();
      return { x, y, tx: x, ty: y, fitness: 0, alpha: 1 };
    });
    this.evaluate();
  }

  /** The bumps as they stand now, halfway through a morph or not. */
  bumps(): Bump[] {
    const k = smooth(Math.min(1, this.morphT));
    return this.from.map((f, i) => {
      const t = this.to[i];
      return { x: f.x + (t.x - f.x) * k, y: f.y + (t.y - f.y) * k, s: f.s + (t.s - f.s) * k, a: f.a + (t.a - f.a) * k };
    });
  }

  /** Height at a point of the unit square (the same sum the shader draws). */
  height(x: number, y: number, bumps = this.bumps()): number {
    let h = 0;
    for (const b of bumps) {
      const dx = (x - b.x) * this.aspect;
      const dy = y - b.y;
      h += b.a * Math.exp(-(dx * dx + dy * dy) / (2 * b.s * b.s));
    }
    return h;
  }

  /** Advances the clock: eases the dots, moves the landscape, runs generations. */
  step(dt: number): void {
    this.morphT += dt / this.opts.morph;
    this.sinceSession += dt;
    if (this.sinceSession >= this.opts.session) {
      this.sinceSession = 0;
      this.newSession();
    }
    this.sinceGeneration += dt;
    if (this.sinceGeneration >= this.opts.generation) {
      this.sinceGeneration = 0;
      this.evolve();
    }
    const ease = 1 - Math.pow(0.002, dt / this.opts.generation);
    for (const d of this.dots) {
      d.x += (d.tx - d.x) * ease;
      d.y += (d.ty - d.y) * ease;
      d.alpha = Math.min(1, d.alpha + dt * 1.5);
    }
  }

  /** Drops immigrants around a point (a click), in place of the weakest. */
  immigrate(x: number, y: number, count = 10): void {
    const order = this.ranked().reverse();
    for (let i = 0; i < count; i++) {
      const d = this.dots[order[i]];
      d.tx = d.x = Math.min(0.99, Math.max(0.01, x + this.rng.normal() * 0.04));
      d.ty = d.y = Math.min(0.99, Math.max(0.01, y + this.rng.normal() * 0.04));
      d.alpha = 0;
    }
    this.evaluate();
  }

  private newSession(): void {
    this.from = this.bumps();
    this.to = randomBumps(this.rng);
    this.morphT = 0;
    this.session += 1;
    // Random immigrants keep the population from betting everything on the old peaks.
    const order = this.ranked().reverse();
    for (let i = 0; i < Math.round(POPULATION * IMMIGRANTS); i++) {
      const d = this.dots[order[i]];
      d.tx = d.x = this.rng.next();
      d.ty = d.y = this.rng.next();
      d.alpha = 0;
    }
  }

  private evaluate(): void {
    const bumps = this.bumps();
    for (const d of this.dots) d.fitness = this.height(d.tx, d.ty, bumps);
    this.champion = this.ranked()[0];
  }

  /** Slot indices, fittest first; ties by slot so the order is stable. */
  private ranked(): number[] {
    return this.dots.map((_, i) => i).sort((a, b) => this.dots[b].fitness - this.dots[a].fitness || a - b);
  }

  /** Mean distance to the population's centre, in height units. */
  private diversity(): number {
    const n = this.dots.length;
    const cx = this.dots.reduce((s, d) => s + d.tx, 0) / n;
    const cy = this.dots.reduce((s, d) => s + d.ty, 0) / n;
    return this.dots.reduce((s, d) => s + Math.hypot((d.tx - cx) * this.aspect, d.ty - cy), 0) / n;
  }

  private evolve(): void {
    this.evaluate();
    const rank = this.ranked();
    const parents = this.dots.map((d) => ({ x: d.tx, y: d.ty, f: d.fitness }));
    const sigma = SIGMA * (this.diversity() < DIVERSITY_FLOOR ? HYPER : 1);
    const pickOne = () => {
      let best = this.rng.int(parents.length);
      for (let i = 1; i < TOURNAMENT; i++) {
        const c = this.rng.int(parents.length);
        if (parents[c].f > parents[best].f) best = c;
      }
      return parents[best];
    };

    const children = rank.slice(0, ELITE).map((i) => ({ x: parents[i].x, y: parents[i].y }));
    while (children.length < POPULATION) {
      const a = pickOne();
      const b = pickOne();
      // BLX-alpha on each coordinate, then a Gaussian mutation.
      const blend = (u: number, v: number) => {
        const lo = Math.min(u, v);
        const span = Math.abs(u - v);
        return this.rng.range(lo - BLX * span, lo + span + BLX * span);
      };
      const x = blend(a.x, b.x) + (this.rng.normal() * sigma) / this.aspect;
      const y = blend(a.y, b.y) + this.rng.normal() * sigma;
      children.push({ x: Math.min(0.99, Math.max(0.01, x)), y: Math.min(0.99, Math.max(0.01, y)) });
    }

    // Each child goes to the nearest free slot, so dots glide instead of jumping across the page.
    const free = new Set(this.dots.map((_, i) => i));
    for (const c of children) {
      let best = -1;
      let bestD = Infinity;
      for (const i of free) {
        const d = this.dots[i];
        const dist = ((d.tx - c.x) * this.aspect) ** 2 + (d.ty - c.y) ** 2;
        if (dist < bestD) {
          bestD = dist;
          best = i;
        }
      }
      free.delete(best);
      this.dots[best].tx = c.x;
      this.dots[best].ty = c.y;
    }
    this.generation += 1;
    this.evaluate();
  }
}
