// The builder's parameters: what the sidebar edits, their bounds, and how
// they become a simulation. No markup here; the controls are in sidebar.tsx.
import type { Dictionary } from "@/i18n";
import type { FitnessKind, GaParams } from "@/lib/ga/params";
import { DEFAULT_PARAMS } from "@/lib/ga/params";
import { LIVE_CONFIG } from "@/lib/live/config";
import type { SimConfig } from "@/lib/sim/simulate";

/** What the form holds: numbers as typed (strings), so a half-typed value never jumps. */
export interface FormState {
  formation: string;
  capital: string;
  seed: string;
  strict: boolean;
  fitness: FitnessKind;
  populationSize: string;
  formationGenerations: string;
  dailyGenerations: string;
  crossoverRate: string;
  swapRate: string;
  weightRate: string;
  immigrantRate: string;
  elite: string;
  tournament: string;
  wMin: string;
  wMax: string;
  sectorCap: string;
  lookback: string;
  meanShrink: string;
}

const pct = (x: number) => String(Math.round(x * 1000) / 10);

/** A new seed for the seed field: a Brazilian tree and a number, easy to read back. */
export function randomSeed(): string {
  const words = ["ipe", "jatoba", "aroeira", "jacaranda", "peroba", "cedro", "angico", "guapuruvu"];
  const n = crypto.getRandomValues(new Uint32Array(2));
  return `${words[n[0] % words.length]}-${(n[1] % 9000) + 1000}`;
}

export function defaultForm(formation: string): FormState {
  const p = DEFAULT_PARAMS;
  return {
    formation,
    capital: String(LIVE_CONFIG.capital),
    seed: "genwallet",
    strict: p.strict,
    fitness: p.fitness,
    populationSize: String(p.populationSize),
    formationGenerations: String(LIVE_CONFIG.formationGenerations),
    dailyGenerations: String(LIVE_CONFIG.dailyGenerations),
    crossoverRate: pct(p.crossoverRate),
    swapRate: pct(p.swapRate),
    weightRate: pct(p.weightRate),
    immigrantRate: pct(p.immigrantRate),
    elite: String(p.elite),
    tournament: String(p.tournament),
    wMin: pct(p.wMin),
    wMax: pct(p.wMax),
    sectorCap: String(p.sectorCap),
    lookback: String(p.lookback),
    meanShrink: pct(p.meanShrink),
  };
}

/** Bounds per numeric field: what the inputs accept and what a run is clamped to. */
export const LIMITS = {
  capital: { min: 1_000, max: 100_000_000, step: 1_000 },
  populationSize: { min: 20, max: 1_000, step: 10 },
  formationGenerations: { min: 10, max: 2_000, step: 10 },
  dailyGenerations: { min: 0, max: 2_000, step: 10 },
  crossoverRate: { min: 0, max: 100, step: 5 },
  swapRate: { min: 0, max: 100, step: 5 },
  weightRate: { min: 0, max: 100, step: 5 },
  immigrantRate: { min: 0, max: 50, step: 5 },
  elite: { min: 0, max: 50, step: 1 },
  tournament: { min: 1, max: 10, step: 1 },
  wMin: { min: 0, max: 10, step: 0.5 },
  wMax: { min: 10, max: 100, step: 1 },
  sectorCap: { min: 1, max: 10, step: 1 },
  lookback: { min: 60, max: 400, step: 10 },
  meanShrink: { min: 0, max: 100, step: 5 },
} satisfies Partial<Record<keyof FormState, { min: number; max: number; step: number }>>;

export type NumericKey = keyof typeof LIMITS;

function read(form: FormState, key: NumericKey): number {
  const { min, max } = LIMITS[key];
  const value = Number(form[key]);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

/** The form as a simulation, or the reasons it cannot run. */
export function toConfig(form: FormState, t: Dictionary): { config: SimConfig | null; problems: string[] } {
  const k = DEFAULT_PARAMS.k;
  const params: GaParams = {
    ...DEFAULT_PARAMS,
    strict: form.strict,
    fitness: form.fitness,
    populationSize: Math.round(read(form, "populationSize")),
    crossoverRate: read(form, "crossoverRate") / 100,
    swapRate: read(form, "swapRate") / 100,
    weightRate: read(form, "weightRate") / 100,
    immigrantRate: read(form, "immigrantRate") / 100,
    elite: Math.round(read(form, "elite")),
    tournament: Math.round(read(form, "tournament")),
    wMin: read(form, "wMin") / 100,
    wMax: read(form, "wMax") / 100,
    sectorCap: Math.round(read(form, "sectorCap")),
    lookback: Math.round(read(form, "lookback")),
    meanShrink: read(form, "meanShrink") / 100,
  };
  const problems: string[] = [];
  if (params.wMin * k > 1 + 1e-9 || params.wMax * k < 1 - 1e-9) problems.push(t.builder.invalid.bounds(k));
  if (params.elite >= params.populationSize) problems.push(t.builder.invalid.elite);
  if (problems.length) return { config: null, problems };
  return {
    problems,
    config: {
      formation: form.formation,
      sessions: LIVE_CONFIG.sessions,
      capital: Math.round(read(form, "capital")),
      params,
      formationGenerations: Math.round(read(form, "formationGenerations")),
      dailyGenerations: Math.round(read(form, "dailyGenerations")),
      seed: form.seed.trim() || "genwallet",
      orderBuffer: LIVE_CONFIG.orderBuffer,
    },
  };
}
