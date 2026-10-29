"use client";

// The landing's figure: the genetic algorithm in three tabs. The chromosome
// (click a gene to mutate it), the three operators at work, and one session
// from the close to the open. The tabs turn on their own, a green line
// filling under the current one; the pointer on the figure pauses
// everything. Illustrations: the tickers are Ibovespa names and the bounds
// come from the engine's parameters, but no number here is a result.

import { ChartLine, Dna, GitCommitHorizontal, GitMerge, Shuffle, Sunrise, Sunset, Trophy, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useT } from "@/i18n/LocaleProvider";
import { DEFAULT_PARAMS } from "@/lib/ga/params";
import { projectWeights } from "@/lib/ga/weights";
import { createRng } from "@/lib/ga/rng";
import { LIVE_CONFIG } from "@/lib/live/config";
import { cn } from "@/lib/utils";

const POOL = [
  "PETR4", "VALE3", "ITUB4", "BBAS3", "WEGE3", "ABEV3", "BBSE3", "PRIO3", "SBSP3", "EQTL3",
  "RENT3", "SUZB3", "GGBR4", "CMIG4", "RDOR3", "EMBJ3", "B3SA3", "TOTS3", "VIVT3", "CPLE3",
];

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(listener: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => true);
}

/** Calls `step` every `ms` while not paused and the tab is visible. */
function useEvery(ms: number, paused: boolean, step: () => void) {
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      if (!document.hidden) stepRef.current();
    }, ms);
    return () => window.clearInterval(id);
  }, [ms, paused]);
}

const TABS = ["genome", "operators", "session"] as const;
type Tab = (typeof TABS)[number];
const TAB_ICONS: Record<Tab, LucideIcon> = { genome: Dna, operators: GitMerge, session: Sunrise };
/** Seconds a tab stays before the next one comes in. */
const TAB_SECONDS = 9;

export function Lab() {
  const t = useT();
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<Tab>("genome");
  const [hovered, setHovered] = useState(false);
  const paused = hovered || reduced;
  const next = () => setTab((current) => TABS[(TABS.indexOf(current) + 1) % TABS.length]);

  return (
    <figure
      className="border border-border bg-[color-mix(in_srgb,var(--background)_86%,transparent)] shadow-[0_30px_80px_-50px_rgba(0,0,0,0.7)] backdrop-blur-md"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div role="tablist" aria-label={t.what.lab.label} className="grid grid-cols-3 border-b border-border">
        {TABS.map((key) => {
          const Icon = TAB_ICONS[key];
          const active = key === tab;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className="group relative flex h-11 items-center justify-center gap-2 text-sm text-muted-foreground transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] hover:text-foreground aria-selected:text-foreground"
            >
              <Icon
                className={cn("size-4 transition-all duration-300 ease-[var(--ease-spring)] group-hover:scale-115 group-hover:text-up", active && "text-up")}
                aria-hidden
              />
              {t.what.lab.tabs[key]}
              {/* A tab under the pointer previews the line it would fill. */}
              {!active && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-up/50 transition-transform duration-300 ease-[var(--ease)] group-hover:scale-x-100"
                />
              )}
              {active && (
                <span
                  key={tab}
                  aria-hidden
                  className={cn("absolute inset-x-0 bottom-0 h-0.5 origin-left bg-up", !reduced && "animate-[grow_var(--tab)_linear_both]")}
                  style={{ "--tab": `${TAB_SECONDS}s`, animationPlayState: paused ? "paused" : "running" } as React.CSSProperties}
                  onAnimationEnd={next}
                />
              )}
            </button>
          );
        })}
      </div>
      <div key={tab} role="tabpanel" className="min-h-[23rem] animate-[swap-in_0.45s_var(--ease)] p-5 sm:p-6">
        {tab === "genome" && <Genome paused={paused} />}
        {tab === "operators" && <Operators still={reduced} />}
        {tab === "session" && <Session paused={paused} />}
      </div>
    </figure>
  );
}

interface Gene {
  ticker: string;
  weight: number;
}

interface Chromosome {
  genes: Gene[];
  mutated: number;
  count: number;
}

function firstChromosome(): Chromosome {
  const rng = createRng("genwallet-figure");
  const { k, wMin, wMax } = DEFAULT_PARAMS;
  const tickers = POOL.slice(0, k);
  const weights = projectWeights(tickers.map(() => rng.range(0.3, 1)), wMin, wMax);
  return { genes: tickers.map((ticker, i) => ({ ticker, weight: weights[i] })), mutated: -1, count: 0 };
}

/** One mutation, as the engine does it: a company swapped for an outsider, or a weight scaled; then the weights repaired. */
function mutate(c: Chromosome, at?: number): Chromosome {
  const rng = createRng(`genwallet-figure-${c.count}`);
  const { wMin, wMax } = DEFAULT_PARAMS;
  const i = at ?? rng.int(c.genes.length);
  const genes = c.genes.map((g) => ({ ...g }));
  if (rng.next() < 0.5) genes[i].ticker = rng.pick(POOL.filter((p) => !genes.some((g) => g.ticker === p)));
  else genes[i].weight *= Math.exp(rng.normal() * 0.6);
  const weights = projectWeights(genes.map((g) => g.weight), wMin, wMax);
  genes.forEach((g, j) => (g.weight = weights[j]));
  return { genes, mutated: i, count: c.count + 1 };
}

function Genome({ paused }: { paused: boolean }) {
  const t = useT();
  const [c, setC] = useState(firstChromosome);
  const { wMin, wMax, sectorCap } = DEFAULT_PARAMS;
  useEvery(2400, paused, () => setC((prev) => mutate(prev)));
  return (
    <div className="flex h-full flex-col">
      <p className="text-sm leading-relaxed text-muted-foreground">{t.what.lab.genome}</p>
      <div className="mt-5 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
        {c.genes.map((gene, i) => {
          const hot = i === c.mutated;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setC((prev) => mutate(prev, i))}
              aria-label={`${t.what.lab.mutate}: ${gene.ticker}, ${(gene.weight * 100).toFixed(1)}%`}
              className={cn(
                "group flex h-40 flex-col justify-between border bg-background/60 p-1.5 transition-[border-color,transform] duration-300 ease-[var(--ease-spring)] hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--up)_60%,var(--border))] active:scale-95",
                hot ? "border-up" : "border-border",
              )}
            >
              <span className="font-mono text-[10px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex flex-1 items-end py-2">
                <span
                  className={cn("w-full transition-all duration-700 ease-[var(--ease)]", hot ? "bg-up" : "bg-foreground/40 group-hover:bg-up/60")}
                  style={{ height: `${(gene.weight / wMax) * 100}%` }}
                />
              </span>
              <span key={gene.ticker} className={cn("animate-[rise_0.5s_var(--ease)] font-mono text-[10.5px] tracking-tight transition-colors duration-200 group-hover:text-up", hot && "text-up")}>
                {gene.ticker}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        {t.what.figure(Math.round(wMin * 100), Math.round(wMax * 100), sectorCap)} <span className="text-foreground">{t.what.lab.hint}</span>
      </p>
    </div>
  );
}

type Mark = "a" | "b" | "shared" | "new";

/** A tiny chromosome: ten cells, `marks[i]` colours cell i. */
function Strip({ marks, label, highlight, stagger }: { marks: Mark[]; label: string; highlight?: boolean; stagger?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("w-16 shrink-0 font-mono text-[10.5px] transition-colors duration-500", highlight ? "text-up" : "text-muted-foreground")}>{label}</span>
      <div className="grid flex-1 grid-cols-10 gap-1">
        {marks.map((m, i) => (
          <span
            key={i}
            className={cn(
              "h-4 border transition-all duration-500 ease-[var(--ease)]",
              m === "a" && "border-foreground/60 bg-foreground/60",
              m === "b" && "border-foreground/40 bg-transparent",
              m === "shared" && "border-up bg-up/70",
              m === "new" && "scale-110 border-up bg-up",
            )}
            // The child's genes settle one after the other, from the left.
            style={stagger ? { transitionDelay: `${i * 35}ms` } : undefined}
          />
        ))}
      </div>
    </div>
  );
}

/** Milliseconds each operator stays lit. */
const OPERATOR_MS = 2600;

/**
 * Selection, crossover and mutation in turn. A frame glides from one to the
 * next while a line inside fills up to the change, and each operator draws
 * its new case as it lights up. The pointer on one holds it.
 */
function Operators({ still }: { still: boolean }) {
  const t = useT();
  const o = t.operators;
  // Steps since the start: the operator lit is `tick % 3`, and each one draws a new case when its turn comes.
  const [tick, setTick] = useState(0);
  const [held, setHeld] = useState<number | null>(null);
  const phase = held ?? tick % 3;
  const turn = (i: number) => (tick < i ? 0 : Math.floor((tick - i) / 3) + 1);
  const { tournament, hyperFactor } = DEFAULT_PARAMS;

  const selection = createRng(`operators-selection-${turn(0) % 32}`);
  const fitness = Array.from({ length: tournament }, () => selection.range(0.2, 1));
  const winner = fitness.indexOf(Math.max(...fitness));
  const crossing = createRng(`operators-crossover-${turn(1) % 32}`);
  const shared = Array.from({ length: 10 }, () => crossing.next() < 0.4);
  const fromA = Array.from({ length: 10 }, () => crossing.next() < 0.5);
  const mutated = createRng(`operators-mutation-${turn(2) % 32}`).int(10);

  // The frame follows the lit block: its top and height, measured.
  const listRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const block = list.children[phase + 1] as HTMLElement | undefined;
      if (block) setFrame({ top: block.offsetTop, height: block.offsetHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [phase]);

  const blocks: { icon: LucideIcon; title: string; body: string; figure: React.ReactNode }[] = [
    {
      icon: Trophy,
      title: o.selection.title,
      body: o.selection.body(tournament),
      figure: fitness.map((f, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className={cn("grid flex-1 grid-cols-10 gap-1 border p-0.5 transition-colors duration-500", phase === 0 && i === winner ? "border-up" : "border-transparent")}>
            {Array.from({ length: 10 }, (_, j) => (
              <span key={j} className={cn("h-2 transition-colors duration-500", phase === 0 && i === winner ? "bg-up/70" : "bg-foreground/25")} style={{ transitionDelay: `${j * 25}ms` }} />
            ))}
          </div>
          <div className="h-1.5 w-14 bg-border">
            <div className={cn("h-full transition-all duration-700 ease-[var(--ease)]", i === winner ? "bg-up" : "bg-muted-foreground")} style={{ width: `${f * 100}%` }} />
          </div>
        </div>
      )),
    },
    {
      icon: GitMerge,
      title: o.crossover.title,
      body: o.crossover.body,
      figure: (
        <>
          <Strip label={o.labels.parentA} marks={shared.map((s) => (s ? "shared" : "a"))} />
          <Strip label={o.labels.parentB} marks={shared.map((s) => (s ? "shared" : "b"))} />
          <Strip label={o.labels.child} highlight={phase === 1} stagger marks={shared.map((s, i) => (s ? "shared" : fromA[i] ? "a" : "b"))} />
        </>
      ),
    },
    {
      icon: Shuffle,
      title: o.mutation.title,
      body: o.mutation.body(hyperFactor),
      figure: <Strip label={o.labels.child} highlight={phase === 2} marks={Array.from({ length: 10 }, (_, i) => (phase === 2 && i === mutated ? "new" : "a"))} />,
    },
  ];

  return (
    <div className="flex h-full flex-col gap-2">
      <div ref={listRef} className="relative flex flex-col gap-2" onPointerLeave={() => setHeld(null)}>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 z-10 overflow-hidden border border-[color-mix(in_srgb,var(--up)_60%,var(--border))] transition-[top,height] duration-500 ease-[var(--ease)]"
          style={frame ? { top: frame.top, height: frame.height } : { opacity: 0 }}
        >
          {/* Fills up to the next operator; holds while the pointer is on one. */}
          {!still && (
            <span
              key={tick}
              className="absolute bottom-0 left-0 h-0.5 w-full origin-left animate-[grow_var(--step)_linear_both] bg-up"
              style={{ "--step": `${OPERATOR_MS}ms`, animationPlayState: held === null ? "running" : "paused" } as React.CSSProperties}
              onAnimationEnd={() => setTick((n) => n + 1)}
            />
          )}
        </span>
        {blocks.map((b, i) => {
          const Icon = b.icon;
          const on = i === phase;
          return (
            <button
              key={b.title}
              type="button"
              aria-pressed={on}
              onPointerEnter={() => setHeld(i)}
              onFocus={() => setHeld(i)}
              onBlur={() => setHeld(null)}
              onClick={() => setHeld(i)}
              className={cn(
                "group/op flex items-center gap-4 border border-border px-3 py-2.5 text-left transition-[opacity,background-color,transform] duration-500 ease-[var(--ease)]",
                on ? "bg-[color-mix(in_srgb,var(--up)_4%,transparent)] opacity-100" : "opacity-45 hover:opacity-90",
              )}
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center border transition-colors duration-500",
                  on ? "border-up text-up" : "border-border text-muted-foreground group-hover/op:border-up group-hover/op:text-up",
                )}
              >
                <Icon className={cn("size-4 transition-transform duration-500 ease-[var(--ease-spring)]", on && "scale-110")} aria-hidden />
              </span>
              <span className="w-28 shrink-0 text-sm font-medium">{b.title}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">{b.figure}</span>
            </button>
          );
        })}
      </div>
      {/* The three explanations share one cell, so the figure never changes height; they cross-fade. */}
      <div className="mt-2 grid">
        {blocks.map((b, i) => (
          <p
            key={b.title}
            aria-hidden={i !== phase}
            className={cn(
              "text-sm leading-relaxed text-muted-foreground transition-[opacity,translate] duration-500 ease-[var(--ease)] [grid-area:1/1]",
              i === phase ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
            )}
          >
            {b.body}
          </p>
        ))}
      </div>
    </div>
  );
}

const STEP_ICONS = [Sunset, Dna, GitCommitHorizontal, Sunrise, ChartLine];

/** One session as five stops on a line; the current one is lit and explained, and the line fills up to it. */
function Session({ paused }: { paused: boolean }) {
  const t = useT();
  const [at, setAt] = useState(0);
  useEvery(2000, paused, () => setAt((i) => (i + 1) % STEP_ICONS.length));
  const { lookback, immigrantRate } = DEFAULT_PARAMS;
  const { close, evolve, commit, open, mark } = t.session.steps;
  const steps = [
    { title: close.title, body: close.body(lookback) },
    { title: evolve.title, body: evolve.body(LIVE_CONFIG.dailyGenerations, Math.round(immigrantRate * 100)) },
    commit,
    open,
    mark,
  ];
  const Icon = STEP_ICONS[at];

  return (
    <div className="flex h-full flex-col">
      <p className="text-sm leading-relaxed text-muted-foreground">{t.session.lead}</p>
      <ol className="relative mt-7 grid grid-cols-5">
        <span aria-hidden className="absolute top-5 right-[10%] left-[10%] h-px bg-border" />
        <span aria-hidden className="absolute top-5 left-[10%] h-px bg-up transition-[width] duration-700 ease-[var(--ease)]" style={{ width: `${at * 20}%` }} />
        {steps.map((s, i) => {
          const StepIcon = STEP_ICONS[i];
          const on = i === at;
          return (
            <li key={s.title} className="flex justify-center">
              <button type="button" onClick={() => setAt(i)} aria-pressed={on} className="group flex flex-col items-center gap-2">
                <span
                  className={cn(
                    "relative grid size-10 place-items-center border bg-background transition-all duration-500 ease-[var(--ease-spring)] group-hover:scale-110",
                    on
                      ? "scale-110 border-up text-up"
                      : cn("group-hover:border-up group-hover:text-up", i < at ? "border-foreground/50 text-foreground" : "border-border text-muted-foreground"),
                  )}
                >
                  <StepIcon className="size-4" aria-hidden />
                </span>
                <span className={cn("text-xs transition-colors duration-300", on ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{s.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div key={at} className="mt-6 flex animate-[swap-in_0.4s_var(--ease)] gap-4 border border-border bg-background/60 p-4">
        <Icon className="mt-0.5 size-5 shrink-0 text-up" aria-hidden />
        <div>
          <p className="font-medium">
            <span className="mr-2 font-mono text-xs text-muted-foreground">{String(at + 1).padStart(2, "0")}</span>
            {steps[at].title}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{steps[at].body}</p>
        </div>
      </div>
    </div>
  );
}
