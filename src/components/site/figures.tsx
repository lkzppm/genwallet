"use client";

// The landing page's figures: a chromosome that mutates, and the three
// operators at work. They are illustrations (the caption says so): their
// tickers are Ibovespa names and their bounds come from the engine's
// parameters, but no number on them is a result.

import { useEffect, useState, useSyncExternalStore } from "react";
import { useT } from "@/i18n/LocaleProvider";
import { DEFAULT_PARAMS } from "@/lib/ga/params";
import { projectWeights } from "@/lib/ga/repair";
import { createRng } from "@/lib/ga/rng";
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

/** A counter that ticks every `ms` while the tab is visible and motion is welcome. */
function useTick(ms: number): number {
  const reduced = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setTick((t) => t + 1);
    }, ms);
    return () => window.clearInterval(id);
  }, [ms, reduced]);
  return tick;
}

interface Gene {
  ticker: string;
  weight: number;
}

/** A deterministic sequence of chromosomes: each one the previous with one gene mutated. */
function chromosomes(count: number): { genes: Gene[]; mutated: number }[] {
  const rng = createRng("genwallet-figure");
  const { k, wMin, wMax } = DEFAULT_PARAMS;
  const tickers = POOL.slice(0, k);
  let weights = projectWeights(tickers.map(() => rng.range(0.3, 1)), wMin, wMax);
  const out = [{ genes: tickers.map((ticker, i) => ({ ticker, weight: weights[i] })), mutated: -1 }];
  for (let n = 1; n < count; n++) {
    const prev = out[n - 1].genes;
    const i = rng.int(k);
    const genes = prev.map((g) => ({ ...g }));
    if (rng.next() < 0.5) {
      const outside = POOL.filter((t) => !genes.some((g) => g.ticker === t));
      genes[i].ticker = rng.pick(outside);
    } else {
      genes[i].weight *= Math.exp(rng.normal() * 0.5);
    }
    weights = projectWeights(genes.map((g) => g.weight), wMin, wMax);
    genes.forEach((g, j) => (g.weight = weights[j]));
    out.push({ genes, mutated: i });
  }
  return out;
}

const SEQUENCE = chromosomes(64);

/** Ten genes in a row; every few seconds one of them mutates and flashes green. */
export function GenomeFigure() {
  const t = useT();
  const tick = useTick(2600);
  const { genes, mutated } = SEQUENCE[tick % SEQUENCE.length];
  const { wMin, wMax, sectorCap } = DEFAULT_PARAMS;
  return (
    <figure>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {genes.map((gene, i) => (
          <div
            key={i}
            className={cn(
              "flex h-40 flex-col justify-between border bg-panel p-2 transition-colors duration-700",
              i === mutated ? "border-up" : "border-border",
            )}
          >
            <span className="font-mono text-[10px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            <div className="flex flex-1 items-end py-2">
              <div
                className={cn("w-full transition-all duration-700 ease-[var(--ease)]", i === mutated ? "bg-up" : "bg-foreground/40")}
                style={{ height: `${(gene.weight / wMax) * 100}%` }}
              />
            </div>
            <span
              key={gene.ticker}
              className={cn("animate-[rise_0.5s_var(--ease)] font-mono text-[11px] tracking-tight", i === mutated && "text-up")}
            >
              {gene.ticker}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="mt-3 text-xs text-muted-foreground">
        {t.what.figure(Math.round(wMin * 100), Math.round(wMax * 100), sectorCap)}
      </figcaption>
    </figure>
  );
}

/** A tiny chromosome: ten cells, `marks[i]` colours cell i. */
function Strip({ marks, label, highlight }: { marks: ("a" | "b" | "shared" | "new")[]; label: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("w-20 shrink-0 font-mono text-[11px]", highlight ? "text-up" : "text-muted-foreground")}>{label}</span>
      <div className="grid flex-1 grid-cols-10 gap-1">
        {marks.map((m, i) => (
          <span
            key={i}
            className={cn(
              "h-5 border transition-all duration-500 ease-[var(--ease)]",
              m === "a" && "border-foreground/60 bg-foreground/60",
              m === "b" && "border-foreground/40 bg-transparent",
              m === "shared" && "border-up bg-up/70",
              m === "new" && "scale-110 border-up bg-up",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function OperatorCard({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="group flex flex-col gap-5 border border-border bg-panel p-5 transition-colors duration-300 hover:border-[color-mix(in_srgb,var(--up)_50%,var(--border))]">
      <div className="flex min-h-28 flex-col justify-center gap-2">{children}</div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

/** Selection, crossover and mutation, each a small strip animation over its explanation. */
export function OperatorsFigure() {
  const t = useT();
  const tick = useTick(2200);
  const rng = createRng(`operators-${tick % 32}`);
  const { tournament, hyperFactor } = DEFAULT_PARAMS;

  // Selection: `tournament` contenders, random fitness, the best one wins.
  const fitness = Array.from({ length: tournament }, () => rng.range(0.2, 1));
  const winner = fitness.indexOf(Math.max(...fitness));

  // Crossover: genes both parents share stay; the rest come from either.
  const shared = Array.from({ length: 10 }, () => rng.next() < 0.4);
  const fromA = Array.from({ length: 10 }, () => rng.next() < 0.5);

  // Mutation: one cell changes.
  const mutated = rng.int(10);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <OperatorCard title={t.operators.selection.title} body={t.operators.selection.body(tournament)}>
        {fitness.map((f, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={cn("grid flex-1 grid-cols-10 gap-1 border p-1 transition-colors duration-500", i === winner ? "border-up" : "border-transparent")}>
              {Array.from({ length: 10 }, (_, j) => (
                <span key={j} className={cn("h-3", i === winner ? "bg-up/70" : "bg-foreground/25")} />
              ))}
            </div>
            <div className="h-1.5 w-16 bg-border">
              <div className={cn("h-full transition-all duration-700 ease-[var(--ease)]", i === winner ? "bg-up" : "bg-muted-foreground")} style={{ width: `${f * 100}%` }} />
            </div>
          </div>
        ))}
      </OperatorCard>
      <OperatorCard title={t.operators.crossover.title} body={t.operators.crossover.body}>
        <Strip label={t.operators.labels.parentA} marks={shared.map((s) => (s ? "shared" : "a"))} />
        <Strip label={t.operators.labels.parentB} marks={shared.map((s) => (s ? "shared" : "b"))} />
        <Strip label={t.operators.labels.child} highlight marks={shared.map((s, i) => (s ? "shared" : fromA[i] ? "a" : "b"))} />
      </OperatorCard>
      <OperatorCard title={t.operators.mutation.title} body={t.operators.mutation.body(hyperFactor)}>
        <Strip label={t.operators.labels.child} marks={Array.from({ length: 10 }, (_, i) => (i === mutated ? "new" : "a"))} />
      </OperatorCard>
    </div>
  );
}
