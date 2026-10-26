"use client";

import type { ReactNode } from "react";
import type { Dictionary } from "@/i18n";
import type { FitnessKind, GaParams } from "@/lib/ga/params";
import { DEFAULT_PARAMS } from "@/lib/ga/params";
import { LIVE_CONFIG } from "@/lib/live/config";
import type { SimConfig } from "@/lib/sim/simulate";
import { day } from "./format";
import { label, panel, segment } from "./ui";

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

type NumericKey = keyof typeof LIMITS;

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

function Field({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-foreground">{title}</span>
      {children}
      <span className="text-[11px] leading-snug text-muted-foreground">{hint}</span>
    </label>
  );
}

const input =
  "h-9 w-full border border-border bg-background/60 px-2.5 font-mono text-sm tabular-nums text-foreground outline-none transition-colors duration-200 hover:border-muted-foreground focus:border-foreground disabled:opacity-50";

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      <legend className={`${label} -mb-1 pr-2`}>{title}</legend>
      {children}
    </fieldset>
  );
}

export function BuilderForm({
  form,
  setForm,
  t,
  lang,
  formations,
  sessionWindow,
  disabled,
}: {
  form: FormState;
  setForm: (next: FormState) => void;
  t: Dictionary;
  lang: string;
  /** Formation evenings the data supports for the current lookback, oldest first. */
  formations: string[];
  /** The sessions the chosen formation would operate. */
  sessionWindow: string[];
  disabled: boolean;
}) {
  const f = t.builder.fields;
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm({ ...form, [key]: value });
  const num = (key: NumericKey, title: string, hint: string) => (
    <Field title={title} hint={hint} key={key}>
      <input
        type="number"
        inputMode="decimal"
        className={input}
        value={form[key]}
        min={LIMITS[key].min}
        max={LIMITS[key].max}
        step={LIMITS[key].step}
        disabled={disabled}
        onChange={(e) => set(key, e.target.value)}
      />
    </Field>
  );

  // A date the data has no session for snaps back to the trading day before it.
  const pickFormation = (value: string) => {
    if (!value || !formations.length) return;
    const clamped = value < formations[0] ? formations[0] : value;
    const snapped = formations.findLast((d) => d <= clamped) ?? formations[0];
    set("formation", snapped);
  };

  return (
    <div className={`${panel} flex flex-col gap-6 p-5`}>
      <Group title={t.builder.groups.run}>
        <Field
          title={f.formation.label}
          hint={sessionWindow.length ? f.formation.hint(day(sessionWindow[0], lang), day(sessionWindow[sessionWindow.length - 1], lang)) : ""}
        >
          <input
            type="date"
            className={input}
            value={form.formation}
            min={formations[0]}
            max={formations[formations.length - 1]}
            disabled={disabled}
            onChange={(e) => pickFormation(e.target.value)}
          />
        </Field>
        {num("capital", f.capital.label, f.capital.hint)}
        <Field title={f.seed.label} hint={f.seed.hint}>
          <input className={input} value={form.seed} disabled={disabled} onChange={(e) => set("seed", e.target.value)} />
        </Field>
        <Field title={f.mode.label} hint={f.mode.hint}>
          <div role="group" className="flex border border-border">
            {([false, true] as const).map((strict) => (
              <button
                key={String(strict)}
                type="button"
                className={segment}
                aria-pressed={form.strict === strict}
                disabled={disabled}
                onClick={() => set("strict", strict)}
              >
                {strict ? f.mode.strict : f.mode.free}
              </button>
            ))}
          </div>
        </Field>
      </Group>

      <Group title={t.builder.groups.algorithm}>
        <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
          <Field title={f.fitness.label} hint={f.fitness.hint}>
            <div role="group" className="flex border border-border">
              {(["sharpe", "sortino", "cvar"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className={segment}
                  aria-pressed={form.fitness === kind}
                  disabled={disabled}
                  onClick={() => set("fitness", kind)}
                >
                  {f.fitness[kind]}
                </button>
              ))}
            </div>
          </Field>
        </div>
        {num("populationSize", f.population.label, f.population.hint)}
        {num("formationGenerations", f.formationGenerations.label, f.formationGenerations.hint)}
        {num("dailyGenerations", f.dailyGenerations.label, f.dailyGenerations.hint)}
        {num("crossoverRate", `${f.crossover.label} (%)`, f.crossover.hint)}
        {num("swapRate", `${f.swap.label} (%)`, f.swap.hint)}
        {num("weightRate", `${f.weight.label} (%)`, f.weight.hint)}
        {num("immigrantRate", `${f.immigrants.label} (%)`, f.immigrants.hint)}
        {num("elite", f.elite.label, f.elite.hint)}
        {num("tournament", f.tournament.label, f.tournament.hint)}
      </Group>

      <Group title={t.builder.groups.constraints}>
        {num("wMin", f.wMin.label, f.wMin.hint)}
        {num("wMax", f.wMax.label, f.wMax.hint)}
        {num("sectorCap", f.sectorCap.label, f.sectorCap.hint)}
        {num("lookback", f.lookback.label, f.lookback.hint)}
        {num("meanShrink", `${f.meanShrink.label} (%)`, f.meanShrink.hint)}
      </Group>
    </div>
  );
}
