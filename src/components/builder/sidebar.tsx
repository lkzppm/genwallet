"use client";

import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpToLine,
  Banknote,
  Boxes,
  ChartLine,
  ChartPie,
  Building2,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Dices,
  Dna,
  Factory,
  Flag,
  GitMerge,
  History,
  Info,
  Layers,
  ListChecks,
  LoaderCircle,
  Lock,
  Play,
  Repeat,
  RotateCcw,
  Scale,
  ShieldCheck,
  Shrink,
  Shuffle,
  SkipForward,
  SlidersHorizontal,
  Sprout,
  Square,
  Target,
  Trophy,
  UserPlus,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState, type CSSProperties, type FocusEvent, type ReactNode } from "react";
import { useKept } from "./use-simulator";
import type { Dictionary } from "@/i18n";
import type { FitnessKind } from "@/lib/ga/params";
import { cn } from "@/lib/utils";
import { day } from "./format";
import { LIMITS, randomSeed, read, type CashMode, type CompanyMode, type FormState, type NumericKey } from "./form";
import { IconButton, Segmented, input } from "./ui";
import type { Refusal } from "./universe";

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
  { key: "k", icon: Boxes, text: "k" },
  { key: "wMin", icon: ArrowDownToLine, text: "wMin", percent: true },
  { key: "wMax", icon: ArrowUpToLine, text: "wMax", percent: true },
  { key: "sectorCap", icon: Factory, text: "sectorCap" },
  { key: "lookback", icon: History, text: "lookback" },
  { key: "meanShrink", icon: Shrink, text: "meanShrink", percent: true },
  { key: "skip", icon: SkipForward, text: "skip" },
];

const GROUP_KEYS: Record<GroupKey, (keyof FormState)[]> = {
  run: ["formation", "sessions", "capital", "seed", "mode", "picks", "cash", "trendWindow", "exposureDown"],
  algorithm: ["fitness", "goal", ...ALGORITHM.map((d) => d.key)],
  constraints: CONSTRAINTS.map((d) => d.key),
};

// Numbers compare as numbers, so "20" and "20.0" are the same value; the picks as a list.
const changed = (form: FormState, defaults: FormState, key: keyof FormState) => {
  const [a, b] = [form[key], defaults[key]];
  if (key in LIMITS) return Number(a) !== Number(b);
  if (Array.isArray(a) && Array.isArray(b)) return a.join() !== b.join();
  return a !== b;
};

/** Where the hint floats: beside the row on a desk, under it on a phone. */
interface Hint {
  text: string;
  top: number;
  bottom: number;
  visible: boolean;
}

/** Handlers that show a row's hint while the pointer or the focus is on it. */
type HintFor = (text: string) => {
  onPointerEnter: (event: { currentTarget: HTMLElement }) => void;
  onPointerLeave: () => void;
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
};

export interface RunBar {
  running: boolean;
  canRun: boolean;
  /** Sessions the run will operate, for the button. */
  sessions: number;
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
 * The parameters, fixed to the left of the screen: three groups of which at
 * most one is open, a hint that floats beside the parameter under the
 * pointer, and the run button pinned to the bottom.
 */
export function Sidebar({
  form,
  defaults,
  setForm,
  t,
  lang,
  formations,
  sessionWindow,
  refused,
  onPick,
  onUnpick,
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
  /** Tickers the engine would refuse over the chosen window. */
  refused: Map<string, Refusal>;
  /** Opens and closes the company picker on the stage. */
  onPick: () => void;
  onUnpick: () => void;
  bar: RunBar;
}) {
  const b = t.builder;
  const f = b.fields;
  const [open, setOpen] = useKept<GroupKey | null>("builder.group", "run");
  const [hint, setHint] = useState<Hint>({ text: "", top: 0, bottom: 0, visible: false });
  const rootRef = useRef<HTMLDivElement>(null);
  const disabled = bar.running;

  const hide = () => setHint((h) => (h.visible ? { ...h, visible: false } : h));
  const hintFor: HintFor = (text) => {
    const show = (row: HTMLElement) => {
      const root = rootRef.current?.getBoundingClientRect();
      const box = row.getBoundingClientRect();
      if (!root) return;
      // Kept clear of the run bar at the bottom.
      const top = Math.min(box.top - root.top, root.height - 150);
      setHint({ text, top, bottom: box.bottom - root.top, visible: true });
    };
    return {
      onPointerEnter: (event) => show(event.currentTarget),
      onPointerLeave: hide,
      onFocus: (event) => show(event.currentTarget),
      // Focus moving between the row's own controls keeps the hint.
      onBlur: (event) => !event.currentTarget.contains(event.relatedTarget as Node | null) && hide(),
    };
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => form && setForm({ ...form, [key]: value });
  const resetGroup = (group: GroupKey) =>
    form && defaults && setForm({ ...form, ...Object.fromEntries(GROUP_KEYS[group].map((k) => [k, defaults[k]])) });
  const count = (group: GroupKey) => (form && defaults ? GROUP_KEYS[group].filter((k) => changed(form, defaults, k)).length : 0);
  const modified = (Object.keys(GROUP_KEYS) as GroupKey[]).some((g) => count(g) > 0);

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

  const slider = (d: SliderDef, hintText?: string) => {
    if (!form || !defaults) return null;
    const text = f[d.text] as { label: string; hint: string };
    return (
      <SliderRow
        key={d.key}
        hint={hintFor(hintText ?? text.hint)}
        icon={d.icon}
        title={text.label}
        unit={d.percent ? "%" : undefined}
        value={form[d.key]}
        fallback={defaults[d.key]}
        limits={LIMITS[d.key]}
        disabled={disabled}
        resetLabel={b.sidebar.resetField}
        onChange={(v) => set(d.key, v)}
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
          <Row icon={CalendarDays} title={f.formation.label} hint={hintFor(f.formation.hint(...windowEnds(sessionWindow, lang)))}>
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
          {slider({ key: "sessions", icon: CalendarRange, text: "sessions" })}
          <Row icon={Wallet} title={f.capital.label} hint={hintFor(f.capital.hint)}>
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
          <Row icon={Sprout} title={f.seed.label} hint={hintFor(f.seed.hint)}>
            <div className="flex gap-1">
              <input aria-label={f.seed.label} className={input} value={form.seed} disabled={disabled} onChange={(e) => set("seed", e.target.value)} />
              <IconButton label={b.sidebar.randomSeed} disabled={disabled} onClick={() => set("seed", randomSeed())} className="group/dice">
                <Dices className="size-3.5 transition-transform duration-500 ease-[var(--ease-spring)] group-hover/dice:rotate-180" aria-hidden />
              </IconButton>
            </div>
          </Row>
          <Row icon={Building2} title={f.mode.label} hint={hintFor(f.mode.hint)}>
            <Segmented<CompanyMode>
              label={f.mode.label}
              value={form.mode}
              disabled={disabled}
              onChange={(v) => {
                set("mode", v);
                // Choosing by hand opens the picker until the k are there; leaving that mode closes it.
                if (v === "custom" && form.picks.length < Math.round(read(form, "k"))) onPick();
                if (v !== "custom") onUnpick();
              }}
              options={[
                { value: "free", label: f.mode.free, icon: Shuffle },
                { value: "strict", label: f.mode.strict, icon: Lock },
                { value: "custom", label: f.mode.custom, icon: ListChecks },
              ]}
            />
          </Row>
          <div className="accordion" data-open={form.mode === "custom" || undefined} inert={form.mode !== "custom"}>
            <div>
              <Picks
                k={Math.round(read(form, "k"))}
                picks={form.picks}
                refused={refused}
                disabled={disabled}
                text={f.picks}
                hint={hintFor(f.picks.hint)}
                onRemove={(ticker) => set("picks", form.picks.filter((x) => x !== ticker))}
                onPick={onPick}
              />
            </div>
          </div>
          <Row icon={Banknote} title={f.cash.label} hint={hintFor(f.cash.hint)}>
            <Segmented<CashMode>
              label={f.cash.label}
              value={form.cash}
              disabled={disabled}
              onChange={(v) => set("cash", v)}
              options={[
                { value: "off", label: f.cash.off },
                { value: "on", label: f.cash.on },
              ]}
            />
          </Row>
          <div className="accordion" data-open={form.cash === "on" || undefined} inert={form.cash !== "on"}>
            <div>
              {slider({ key: "trendWindow", icon: ChartLine, text: "trendWindow" })}
              {slider({ key: "exposureDown", icon: ChartPie, text: "exposureDown", percent: true })}
            </div>
          </div>
        </>
      ),
    },
    {
      key: "algorithm",
      title: b.groups.algorithm,
      icon: Dna,
      body: form && (
        <>
          <Row icon={Target} title={f.fitness.label} hint={hintFor(f.fitness.hint)}>
            <Segmented<FitnessKind>
              label={f.fitness.label}
              value={form.fitness}
              disabled={disabled}
              onChange={(v) => set("fitness", v)}
              options={(["sharpe", "sortino", "cvar", "active", "goal"] as const).map((k) => ({ value: k, label: f.fitness[k] }))}
            />
          </Row>
          <div className="accordion" data-open={form.fitness === "goal" || undefined} inert={form.fitness !== "goal"}>
            <div>{slider({ key: "goal", icon: Flag, text: "goal", percent: true })}</div>
          </div>
          {ALGORITHM.map((d) => slider(d))}
        </>
      ),
    },
    {
      key: "constraints",
      title: b.groups.constraints,
      icon: ShieldCheck,
      // Chosen by hand, the companies skip the sector cap.
      body: form && CONSTRAINTS.map((d) => slider(d, d.key === "sectorCap" && form.mode === "custom" ? `${f.sectorCap.hint}. ${b.picker.sectorNote}` : undefined)),
    },
  ];

  return (
    <div ref={rootRef} className="relative flex h-full min-h-0 flex-col">
      <div className="scroll-none min-h-0 flex-1" onScroll={hide}>
        {groups.map((g) => {
          const isOpen = open === g.key;
          const n = count(g.key);
          const Icon = g.icon;
          return (
            <section key={g.key} className="border-b border-border">
              <button
                type="button"
                aria-expanded={isOpen}
                // A second click on the open group closes it.
                onClick={() => setOpen(isOpen ? null : g.key)}
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

      {/* What the parameter under the pointer does: beside it on a desk, under it on a phone. */}
      <div
        role="tooltip"
        aria-hidden={!hint.visible}
        className={cn(
          "pointer-events-none absolute inset-x-4 z-30 top-[var(--below)] flex gap-2.5 border border-border bg-background/95 px-3 py-2.5 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.55)] backdrop-blur-sm transition-[top,opacity,translate] duration-300 ease-[var(--ease)] lg:right-auto lg:left-[calc(100%+10px)] lg:top-[var(--beside)] lg:w-64",
          hint.visible ? "translate-x-0 opacity-100" : "opacity-0 lg:-translate-x-1.5",
        )}
        style={{ "--beside": `${hint.top + 4}px`, "--below": `${hint.bottom + 4}px` } as CSSProperties}
      >
        <span aria-hidden className="absolute top-3.5 -left-[5px] hidden size-2 rotate-45 border-b border-l border-border bg-background lg:block" />
        <Info className="mt-px size-3.5 shrink-0 text-up" aria-hidden />
        <p key={hint.text} aria-live="polite" className="animate-[fade_0.3s_var(--ease)] text-[11.5px] leading-snug text-muted-foreground first-letter:uppercase">
          {hint.text}
        </p>
      </div>

      {bar.problems.map((p) => (
        <p key={p} className="shrink-0 animate-[rise_0.35s_var(--ease)] border-t border-border px-4 py-2 text-[11.5px] leading-snug text-down">
          {p}
        </p>
      ))}

      <div className="flex shrink-0 border-t border-border p-3">
        {bar.running ? (
          <div className="relative h-10 flex-1 overflow-hidden border border-up" role="progressbar" aria-valuenow={Math.round(bar.fraction * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="absolute inset-y-0 left-0 bg-[color-mix(in_srgb,var(--up)_22%,transparent)] transition-[width] duration-150 ease-out" style={{ width: `${bar.fraction * 100}%` }} />
            <span className="relative flex h-full items-center gap-2 px-3 font-mono text-[11px] tabular-nums">
              <LoaderCircle className="size-3.5 shrink-0 animate-spin text-up" aria-hidden />
              <span className="truncate">{bar.progress}</span>
            </span>
          </div>
        ) : (
          <button type="button" className="btn btn-primary h-10 min-w-0 flex-1" disabled={!bar.canRun} onClick={bar.onRun}>
            <Play className="size-3.5" aria-hidden />
            {bar.again ? b.again : b.run(bar.sessions)}
          </button>
        )}
        {/* The second slot opens beside the run button while there is something to undo or to cancel, and closes again: the run button widens and narrows with it. Clipped across only, so the button can still lift on hover. */}
        <div
          inert={!bar.running && !modified}
          className={cn(
            "flex shrink-0 justify-end overflow-x-clip transition-[width,opacity] duration-400 ease-[var(--ease)]",
            bar.running || modified ? "w-12 opacity-100" : "w-0 opacity-0",
          )}
        >
          <span className={cn("transition-transform duration-400 ease-[var(--ease-spring)]", bar.running || modified ? "scale-100" : "scale-75")}>
            {bar.running ? (
              <IconButton label={b.cancel} onClick={bar.onCancel} className="size-10 hover:border-down hover:text-down">
                <Square className="size-3.5" aria-hidden />
              </IconButton>
            ) : (
              <IconButton label={b.reset} onClick={bar.onReset} className="group/reset size-10">
                <RotateCcw className="size-3.5 transition-transform duration-500 ease-[var(--ease)] group-hover/reset:-rotate-180" aria-hidden />
              </IconButton>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

function windowEnds(sessionWindow: string[], lang: string): [string, string] {
  return sessionWindow.length ? [day(sessionWindow[0], lang), day(sessionWindow[sessionWindow.length - 1], lang)] : ["", ""];
}

/** A parameter that is not a slider: its icon and name over its control. */
function Row({ icon: Icon, title, hint, children }: { icon: LucideIcon; title: string; hint: ReturnType<HintFor>; children: ReactNode }) {
  return (
    <div className="group/row px-4 py-1.5 transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)]" {...hint}>
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
  hint,
  icon: Icon,
  title,
  unit,
  value,
  fallback,
  limits,
  disabled,
  resetLabel,
  onChange,
}: {
  hint: ReturnType<HintFor>;
  icon: LucideIcon;
  title: string;
  unit?: string;
  value: string;
  fallback: string;
  limits: { min: number; max: number; step: number };
  disabled: boolean;
  resetLabel: string;
  onChange: (value: string) => void;
}) {
  const { min, max, step } = limits;
  const share = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, (n - min) / (max - min))) : 0;
  };
  const isChanged = Number(value) !== Number(fallback);
  return (
    <div className="group/row px-4 pt-1 transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)]" {...hint}>
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

/**
 * The companies chosen by hand: k slots that fill as they are picked, a
 * ticker the window cannot operate in red, and the way into the picker.
 */
function Picks({
  k,
  picks,
  refused,
  disabled,
  text,
  hint,
  onRemove,
  onPick,
}: {
  k: number;
  picks: string[];
  refused: Map<string, Refusal>;
  disabled: boolean;
  text: Fields["picks"];
  hint: ReturnType<HintFor>;
  onRemove: (ticker: string) => void;
  onPick: () => void;
}) {
  return (
    <div className="group/row px-4 pt-1 pb-2 transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)]" {...hint}>
      <div className="mb-1.5 flex items-center gap-2">
        <ListChecks className="size-3.5 text-muted-foreground transition-colors duration-200 group-hover/row:text-up" aria-hidden />
        <span className="text-xs">{text.label}</span>
        <span className={cn("ml-auto font-mono text-[10.5px] tabular-nums", picks.length === k ? "text-up" : "text-muted-foreground")}>
          {text.count(picks.length, k)}
        </span>
      </div>
      <ol className="grid grid-cols-5 gap-1">
        {Array.from({ length: k }, (_, i) => {
          const ticker = picks[i];
          if (!ticker)
            return (
              <li key={`empty-${i}`}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={onPick}
                  aria-label={text.open}
                  className="grid h-7 w-full place-items-center border border-dashed border-border font-mono text-[10px] text-muted-foreground/60 transition-colors duration-200 hover:border-up hover:text-up"
                >
                  +
                </button>
              </li>
            );
          const bad = refused.has(ticker);
          return (
            <li key={ticker} className="animate-[pop_0.35s_var(--ease-spring)]">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemove(ticker)}
                aria-label={text.remove(ticker)}
                title={text.remove(ticker)}
                className={cn(
                  "group/chip relative grid h-7 w-full place-items-center border bg-background font-mono text-[10.5px] transition-colors duration-200 hover:border-down hover:text-down",
                  bad ? "border-down text-down" : "border-border",
                )}
              >
                <span className="transition-opacity duration-200 group-hover/chip:opacity-0">{ticker}</span>
                <X className="absolute size-3 opacity-0 transition-opacity duration-200 group-hover/chip:opacity-100" aria-hidden />
              </button>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        disabled={disabled}
        onClick={onPick}
        className="mt-2 flex h-8 w-full items-center justify-center gap-2 border border-border bg-background text-xs transition-colors duration-200 hover:border-up hover:text-up disabled:opacity-40"
      >
        <ListChecks className="size-3.5" aria-hidden />
        {picks.length ? text.edit : text.open}
      </button>
    </div>
  );
}
