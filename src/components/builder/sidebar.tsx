"use client";

import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpToLine,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Dices,
  Dna,
  Factory,
  GitMerge,
  History,
  Info,
  Layers,
  LoaderCircle,
  Lock,
  Play,
  Repeat,
  RotateCcw,
  Scale,
  ShieldCheck,
  Shrink,
  Shuffle,
  SlidersHorizontal,
  Sprout,
  Square,
  Target,
  Trophy,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import type { Dictionary } from "@/i18n";
import type { FitnessKind } from "@/lib/ga/params";
import { cn } from "@/lib/utils";
import { day } from "./format";
import { LIMITS, randomSeed, type FormState, type NumericKey } from "./form";
import { IconButton, Segmented, input, label } from "./ui";

export type GroupKey = "run" | "algorithm" | "constraints";

type Fields = Dictionary["builder"]["fields"];

interface SliderDef {
  key: NumericKey;
  icon: LucideIcon;
  text: keyof Fields;
  percent?: boolean;
}

const ALGORITHM: SliderDef[] = [
  { key: "populationSize", icon: Users, text: "population" },
  { key: "formationGenerations", icon: Layers, text: "formationGenerations" },
  { key: "dailyGenerations", icon: Repeat, text: "dailyGenerations" },
  { key: "crossoverRate", icon: GitMerge, text: "crossover", percent: true },
  { key: "swapRate", icon: ArrowLeftRight, text: "swap", percent: true },
  { key: "weightRate", icon: Scale, text: "weight", percent: true },
  { key: "immigrantRate", icon: UserPlus, text: "immigrants", percent: true },
  { key: "elite", icon: Crown, text: "elite" },
  { key: "tournament", icon: Trophy, text: "tournament" },
];

const CONSTRAINTS: SliderDef[] = [
  { key: "wMin", icon: ArrowDownToLine, text: "wMin", percent: true },
  { key: "wMax", icon: ArrowUpToLine, text: "wMax", percent: true },
  { key: "sectorCap", icon: Factory, text: "sectorCap" },
  { key: "lookback", icon: History, text: "lookback" },
  { key: "meanShrink", icon: Shrink, text: "meanShrink", percent: true },
];

const GROUP_KEYS: Record<GroupKey, (keyof FormState)[]> = {
  run: ["formation", "capital", "seed", "strict"],
  algorithm: ["fitness", ...ALGORITHM.map((d) => d.key)],
  constraints: CONSTRAINTS.map((d) => d.key),
};

// Numbers compare as numbers, so "20" and "20.0" are the same value.
const changed = (form: FormState, defaults: FormState, key: keyof FormState) =>
  key in LIMITS ? Number(form[key]) !== Number(defaults[key]) : form[key] !== defaults[key];

export interface RunBar {
  running: boolean;
  canRun: boolean;
  again: boolean;
  /** 0..1 through the whole run, and what to say over the bar. */
  fraction: number;
  progress: string;
  problems: string[];
  onRun: () => void;
  onCancel: () => void;
  onReset: () => void;
}

/**
 * The parameters, fixed to the left of the screen: a short header, three
 * groups of which one is open at a time, a line that explains the parameter
 * under the pointer, and the run button pinned to the bottom.
 */
export function Sidebar({
  form,
  defaults,
  setForm,
  t,
  lang,
  formations,
  sessionWindow,
  dataLine,
  bar,
}: {
  form: FormState | null;
  defaults: FormState | null;
  setForm: (next: FormState) => void;
  t: Dictionary;
  lang: string;
  /** Formation evenings the data supports for the current lookback, oldest first. */
  formations: string[];
  /** The sessions the chosen formation would operate. */
  sessionWindow: string[];
  dataLine: string;
  bar: RunBar;
}) {
  const b = t.builder;
  const f = b.fields;
  const [open, setOpen] = useState<GroupKey>("run");
  const [hint, setHint] = useState<string | null>(null);
  const disabled = bar.running;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => form && setForm({ ...form, [key]: value });
  const resetGroup = (group: GroupKey) =>
    form && defaults && setForm({ ...form, ...Object.fromEntries(GROUP_KEYS[group].map((k) => [k, defaults[k]])) });
  const count = (group: GroupKey) => (form && defaults ? GROUP_KEYS[group].filter((k) => changed(form, defaults, k)).length : 0);

  // A date the data has no session for snaps back to the trading day before it.
  const pickFormation = (value: string) => {
    if (!value || !formations.length) return;
    const clamped = value < formations[0] ? formations[0] : value;
    set("formation", formations.findLast((d) => d <= clamped) ?? formations[0]);
  };
  const at = form ? formations.indexOf(form.formation) : -1;
  const windowText = sessionWindow.length
    ? b.sidebar.window(day(sessionWindow[0], lang), day(sessionWindow[sessionWindow.length - 1], lang))
    : "";

  const slider = (d: SliderDef) => {
    if (!form || !defaults) return null;
    const text = f[d.text] as { label: string; hint: string };
    return (
      <SliderRow
        key={d.key}
        icon={d.icon}
        title={text.label}
        unit={d.percent ? "%" : undefined}
        value={form[d.key]}
        fallback={defaults[d.key]}
        limits={LIMITS[d.key]}
        disabled={disabled}
        resetLabel={b.sidebar.resetField}
        onChange={(v) => set(d.key, v)}
        onHint={() => setHint(text.hint)}
      />
    );
  };

  const groups: { key: GroupKey; title: string; icon: LucideIcon; body: ReactNode }[] = [
    {
      key: "run",
      title: b.groups.run,
      icon: SlidersHorizontal,
      body: form && (
        <>
          <Row icon={CalendarDays} title={f.formation.label} onHint={() => setHint(f.formation.hint(...windowEnds(sessionWindow, lang)))}>
            <div className="flex gap-1">
              <IconButton label={b.sidebar.prevEvening} disabled={disabled || at <= 0} onClick={() => set("formation", formations[at - 1])}>
                <ChevronLeft className="size-3.5" aria-hidden />
              </IconButton>
              <input
                type="date"
                aria-label={f.formation.label}
                className={cn(input, "text-center")}
                value={form.formation}
                min={formations[0]}
                max={formations[formations.length - 1]}
                disabled={disabled}
                onChange={(e) => pickFormation(e.target.value)}
              />
              <IconButton
                label={b.sidebar.nextEvening}
                disabled={disabled || at < 0 || at >= formations.length - 1}
                onClick={() => set("formation", formations[at + 1])}
              >
                <ChevronRight className="size-3.5" aria-hidden />
              </IconButton>
            </div>
            <p key={windowText} className="mt-1.5 animate-[rise_0.4s_var(--ease)] font-mono text-[10.5px] text-muted-foreground">
              {windowText}
            </p>
          </Row>
          <Row icon={Wallet} title={f.capital.label} onHint={() => setHint(f.capital.hint)}>
            <input
              type="number"
              inputMode="decimal"
              aria-label={f.capital.label}
              className={input}
              value={form.capital}
              min={LIMITS.capital.min}
              max={LIMITS.capital.max}
              step={LIMITS.capital.step}
              disabled={disabled}
              onChange={(e) => set("capital", e.target.value)}
            />
          </Row>
          <Row icon={Sprout} title={f.seed.label} onHint={() => setHint(f.seed.hint)}>
            <div className="flex gap-1">
              <input aria-label={f.seed.label} className={input} value={form.seed} disabled={disabled} onChange={(e) => set("seed", e.target.value)} />
              <IconButton label={b.sidebar.randomSeed} disabled={disabled} onClick={() => set("seed", randomSeed())} className="group/dice">
                <Dices className="size-3.5 transition-transform duration-500 ease-[var(--ease-spring)] group-hover/dice:rotate-180" aria-hidden />
              </IconButton>
            </div>
          </Row>
          <Row icon={Building2} title={f.mode.label} onHint={() => setHint(f.mode.hint)}>
            <Segmented
              label={f.mode.label}
              value={form.strict ? "strict" : "free"}
              disabled={disabled}
              onChange={(v) => set("strict", v === "strict")}
              options={[
                { value: "free", label: f.mode.free, icon: Shuffle },
                { value: "strict", label: f.mode.strict, icon: Lock },
              ]}
            />
          </Row>
        </>
      ),
    },
    {
      key: "algorithm",
      title: b.groups.algorithm,
      icon: Dna,
      body: form && (
        <>
          <Row icon={Target} title={f.fitness.label} onHint={() => setHint(f.fitness.hint)}>
            <Segmented<FitnessKind>
              label={f.fitness.label}
              value={form.fitness}
              disabled={disabled}
              onChange={(v) => set("fitness", v)}
              options={(["sharpe", "sortino", "cvar"] as const).map((k) => ({ value: k, label: f.fitness[k] }))}
            />
          </Row>
          {ALGORITHM.map(slider)}
        </>
      ),
    },
    { key: "constraints", title: b.groups.constraints, icon: ShieldCheck, body: form && CONSTRAINTS.map(slider) },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-border px-4 py-3">
        <p className={label}>{b.eyebrow}</p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{dataLine}</p>
      </header>

      <div className="scroll-thin min-h-0 flex-1" onPointerLeave={() => setHint(null)}>
        {groups.map((g) => {
          const isOpen = open === g.key;
          const n = count(g.key);
          const Icon = g.icon;
          return (
            <section key={g.key} className="border-b border-border">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(g.key)}
                className="group/head flex h-12 w-full items-center gap-3 px-4 text-left transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]"
              >
                <span
                  className={cn(
                    "grid size-7 place-items-center border transition-all duration-300 ease-[var(--ease-spring)] group-hover/head:scale-110",
                    isOpen ? "border-up text-up" : "border-border text-muted-foreground",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <span className="text-sm font-medium">{g.title}</span>
                {n > 0 && (
                  <span className="ml-auto flex animate-[pop_0.35s_var(--ease-spring)] items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="size-1.5 bg-up" aria-hidden />
                    {b.sidebar.modified(n)}
                  </span>
                )}
                <ChevronDown
                  className={cn("size-4 text-muted-foreground transition-transform duration-300 ease-[var(--ease)]", n === 0 && "ml-auto", isOpen && "rotate-180")}
                  aria-hidden
                />
              </button>
              <div className="accordion" data-open={isOpen || undefined} inert={!isOpen}>
                <div>
                  <div className="flex flex-col pb-2">{g.body}</div>
                  {n > 0 && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => resetGroup(g.key)}
                      className="mx-4 mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors duration-200 hover:text-up disabled:opacity-40"
                    >
                      <RotateCcw className="size-3" aria-hidden />
                      {b.sidebar.resetGroup}
                    </button>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* What the parameter under the pointer does. */}
      <div className="flex min-h-[4.75rem] shrink-0 gap-2.5 border-t border-border px-4 py-3">
        <Info className={cn("mt-px size-3.5 shrink-0 transition-colors duration-300", hint ? "text-up" : "text-muted-foreground")} aria-hidden />
        <p key={hint ?? ""} aria-live="polite" className="animate-[rise_0.35s_var(--ease)] text-[11.5px] leading-snug text-muted-foreground first-letter:uppercase">
          {hint ?? b.sidebar.hintIdle}
        </p>
      </div>

      {bar.problems.map((p) => (
        <p key={p} className="shrink-0 animate-[rise_0.35s_var(--ease)] border-t border-border px-4 py-2 text-[11.5px] leading-snug text-down">
          {p}
        </p>
      ))}

      <div className="flex shrink-0 gap-2 border-t border-border p-3">
        {bar.running ? (
          <div className="relative h-10 flex-1 overflow-hidden border border-up" role="progressbar" aria-valuenow={Math.round(bar.fraction * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="absolute inset-y-0 left-0 bg-[color-mix(in_srgb,var(--up)_22%,transparent)] transition-[width] duration-150 ease-out" style={{ width: `${bar.fraction * 100}%` }} />
            <span className="relative flex h-full items-center gap-2 px-3 font-mono text-[11px] tabular-nums">
              <LoaderCircle className="size-3.5 shrink-0 animate-spin text-up" aria-hidden />
              <span className="truncate">{bar.progress}</span>
            </span>
          </div>
        ) : (
          <button type="button" className="btn btn-primary h-10 flex-1" disabled={!bar.canRun} onClick={bar.onRun}>
            <Play className="size-3.5" aria-hidden />
            {bar.again ? b.again : b.run}
          </button>
        )}
        {bar.running ? (
          <IconButton label={b.cancel} onClick={bar.onCancel} className="size-10 hover:border-down hover:text-down">
            <Square className="size-3.5" aria-hidden />
          </IconButton>
        ) : (
          <IconButton label={b.reset} onClick={bar.onReset} disabled={!form} className="group/reset size-10">
            <RotateCcw className="size-3.5 transition-transform duration-500 ease-[var(--ease)] group-hover/reset:-rotate-180" aria-hidden />
          </IconButton>
        )}
      </div>
    </div>
  );
}

function windowEnds(sessionWindow: string[], lang: string): [string, string] {
  return sessionWindow.length ? [day(sessionWindow[0], lang), day(sessionWindow[sessionWindow.length - 1], lang)] : ["", ""];
}

/** A parameter that is not a slider: its icon and name over its control. */
function Row({ icon: Icon, title, onHint, children }: { icon: LucideIcon; title: string; onHint: () => void; children: ReactNode }) {
  return (
    <div
      className="group/row px-4 py-1.5 transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)]"
      onPointerEnter={onHint}
      onFocus={onHint}
    >
      <div className="mb-1 flex items-center gap-2">
        <Icon className="size-3.5 text-muted-foreground transition-colors duration-200 group-hover/row:text-up" aria-hidden />
        <span className="text-xs">{title}</span>
      </div>
      {children}
    </div>
  );
}

/**
 * A numeric parameter: icon, name and a typed value on one line, a slider
 * under it with a tick at the default. Changed from the default, a green dot
 * appears that puts it back.
 */
function SliderRow({
  icon: Icon,
  title,
  unit,
  value,
  fallback,
  limits,
  disabled,
  resetLabel,
  onChange,
  onHint,
}: {
  icon: LucideIcon;
  title: string;
  unit?: string;
  value: string;
  fallback: string;
  limits: { min: number; max: number; step: number };
  disabled: boolean;
  resetLabel: string;
  onChange: (value: string) => void;
  onHint: () => void;
}) {
  const { min, max, step } = limits;
  const share = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, (n - min) / (max - min))) : 0;
  };
  const isChanged = Number(value) !== Number(fallback);
  return (
    <div
      className="group/row px-4 pt-1 transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)]"
      onPointerEnter={onHint}
      onFocus={onHint}
    >
      <div className="flex h-6 items-center gap-2">
        <Icon className="size-3.5 shrink-0 text-muted-foreground transition-colors duration-200 group-hover/row:text-up" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-xs">{title}</span>
        {isChanged && (
          <button
            type="button"
            aria-label={`${resetLabel}: ${fallback}${unit ?? ""}`}
            title={`${resetLabel}: ${fallback}${unit ?? ""}`}
            disabled={disabled}
            onClick={() => onChange(fallback)}
            className="grid size-4 animate-[pop_0.35s_var(--ease-spring)] place-items-center"
          >
            <span className="size-1.5 bg-up transition-transform duration-200 hover:scale-150" />
          </button>
        )}
        <span className="flex items-center">
          <input
            type="number"
            inputMode="decimal"
            aria-label={title}
            className="h-6 w-14 border border-transparent bg-transparent px-1 text-right font-mono text-xs tabular-nums text-foreground outline-none transition-colors duration-200 hover:border-border focus:border-up disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            value={value}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
          <span className="w-3 font-mono text-[10px] text-muted-foreground">{unit}</span>
        </span>
      </div>
      <div className="relative pb-1">
        <span aria-hidden className="absolute top-[calc(50%-2px)] h-2 w-px -translate-y-1/2 bg-muted-foreground/60" style={{ left: `calc(6px + ${share(fallback)} * (100% - 12px))` }} />
        <input
          type="range"
          aria-label={title}
          className="range relative"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(Number(value)) ? value : fallback}
          disabled={disabled}
          style={{ "--fill": `calc(6px + ${share(value)} * (100% - 12px))` } as CSSProperties}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
