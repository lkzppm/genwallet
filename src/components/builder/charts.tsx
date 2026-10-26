"use client";

// The builder's charts. Each one fills its box (measured, so text stays at
// its size whatever the panel), draws its lines in from the left when it
// mounts, and answers the pointer with a crosshair and a tooltip.

import { useState } from "react";
import type { NavPoint, SessionSummary } from "@/lib/sim/simulate";
import { cn } from "@/lib/utils";
import { day, money, number, percent, shortDay, signClass } from "./format";
import { useSize } from "./ui";

/** Round steps for an axis spanning `lo..hi`, about `count` of them. */
function ticks(lo: number, hi: number, count: number): number[] {
  const raw = (hi - lo) / Math.max(1, count);
  const magnitude = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-12; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

const path = (points: [number, number][]) => points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");

const DRAW = "animate-[draw_1.1s_var(--ease)_both]";

/** A floating box next to the pointer's column, kept inside the chart. */
function Tooltip({ x, width, children }: { x: number; width: number; children: React.ReactNode }) {
  const right = x > width * 0.6;
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 min-w-40 border border-border bg-background/95 px-3 py-2 text-[11px] shadow-[0_12px_32px_-16px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-[left] duration-150 ease-out"
      style={right ? { left: x - 12, transform: "translateX(-100%)" } : { left: x + 12 }}
    >
      {children}
    </div>
  );
}

function TipRow({ swatch, name, value, className }: { swatch?: React.ReactNode; name: string; value: string; className?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      {swatch}
      <span className="flex-1 text-muted-foreground">{name}</span>
      <span className={cn("font-mono tabular-nums", className)}>{value}</span>
    </div>
  );
}

/** A line sample for a legend or a tooltip: the series' stroke, in its weight and dash. */
export function Swatch({ dash, width = 1.5, muted }: { dash?: string; width?: number; muted?: boolean }) {
  return (
    <svg width="18" height="6" aria-hidden className="shrink-0">
      <line x1="1" x2="17" y1="3" y2="3" className={muted ? "stroke-muted-foreground" : "stroke-foreground"} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" />
    </svg>
  );
}

export const SERIES = {
  ga: { width: 2.25, dash: undefined, muted: false },
  bova: { width: 1.5, dash: "5 4", muted: true },
  cdi: { width: 1.5, dash: "1 4", muted: true },
} as const;

type SeriesKey = keyof typeof SERIES;

/**
 * The portfolio's value through the sessions against BOVA11 and the CDI, as
 * returns on the capital. Point 0 is the formation evening, all in cash.
 * `dates` holds every point of the run, so a run in progress draws on the
 * final axis; `points` may be shorter. Clicking a session selects it.
 */
export function NavChart({
  dates,
  points,
  capital,
  lang,
  labels,
  selected,
  onSelect,
}: {
  dates: string[];
  points: NavPoint[];
  capital: number;
  lang: string;
  labels: { ga: string; bova: string; cdi: string; formation: string };
  selected: number | null;
  onSelect: (session: number) => void;
}) {
  const [ref, { width: W, height: H }] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { l: 52, r: 118, t: 14, b: 28 };
  const value: Record<SeriesKey, (p: NavPoint) => number | null> = {
    ga: (p) => p.nav / capital - 1,
    bova: (p) => (p.bova === null ? null : p.bova / capital - 1),
    cdi: (p) => p.cdi / capital - 1,
  };
  const keys: SeriesKey[] = ["cdi", "bova", "ga"];
  const all = points.flatMap((p) => keys.map((k) => value[k](p)).filter((v): v is number => v !== null)).concat(0);
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  const pad = Math.max(0.004, (hi - lo) * 0.12);
  lo -= pad;
  hi += pad;
  const n = Math.max(1, dates.length - 1);
  const x = (i: number) => m.l + (i / n) * (W - m.l - m.r);
  const y = (v: number) => m.t + ((hi - v) / (hi - lo)) * (H - m.t - m.b);
  const step = (W - m.l - m.r) / n;
  const name = { ga: labels.ga, bova: labels.bova, cdi: labels.cdi };

  // End labels, pushed apart so they never overlap.
  const ends = keys
    .map((k) => ({ k, v: points.length ? value[k](points[points.length - 1]) : null }))
    .filter((e): e is { k: SeriesKey; v: number } => e.v !== null)
    .map((e) => ({ ...e, ty: y(e.v) }))
    .sort((a, b) => a.ty - b.ty);
  for (let i = 1; i < ends.length; i++) ends[i].ty = Math.max(ends[i].ty, ends[i - 1].ty + 26);

  const hp = hover !== null ? points[hover] : undefined;
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor((W - m.l - m.r) / 46))));

  return (
    <div ref={ref} className="relative h-full min-h-40 w-full" onPointerLeave={() => setHover(null)}>
      {W > 0 && H > 0 && (
        <svg width={W} height={H} className="absolute inset-0" role="img" aria-label={keys.map((k) => name[k]).join(", ")}>
          {selected !== null && selected < dates.length && (
            <rect x={x(selected) - step / 2} width={step} y={m.t} height={H - m.t - m.b} className="fill-up transition-[x] duration-300 ease-[var(--ease)]" opacity={0.07} />
          )}
          {ticks(lo, hi, Math.max(2, Math.round((H - m.t - m.b) / 56))).map((v) => (
            <g key={v}>
              <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} className={v === 0 ? "stroke-muted-foreground" : "stroke-border"} strokeWidth={1} opacity={v === 0 ? 0.5 : 1} />
              <text x={m.l - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">
                {percent(v, lang, 1, true)}
              </text>
            </g>
          ))}
          {dates.map((d, i) =>
            i % labelEvery === 0 || i === n ? (
              <text
                key={d}
                x={x(i)}
                y={H - 9}
                textAnchor="middle"
                className={cn("font-mono text-[9.5px] transition-colors duration-200", i === selected || i === hover ? "fill-foreground" : "fill-muted-foreground")}
              >
                {i === 0 ? labels.formation : shortDay(d, lang)}
              </text>
            ) : null,
          )}
          <g className={DRAW}>
            {keys.map((k) => (
              <path
                key={k}
                d={path(points.flatMap((p, i) => {
                  const v = value[k](p);
                  return v === null ? [] : [[x(i), y(v)] as [number, number]];
                }))}
                fill="none"
                className={SERIES[k].muted ? "stroke-muted-foreground" : "stroke-foreground"}
                strokeWidth={SERIES[k].width}
                strokeDasharray={SERIES[k].dash}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </g>
          {points.map((p, i) => (
            <circle
              key={p.date}
              cx={x(i)}
              cy={y(value.ga(p) ?? 0)}
              r={i === hover || i === selected ? 4.5 : 3}
              className="origin-center animate-[pop_0.4s_var(--ease-spring)_both] fill-foreground stroke-background transition-[r] duration-200 [transform-box:fill-box]"
              strokeWidth={2}
            />
          ))}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={H - m.b} className="stroke-muted-foreground" strokeDasharray="2 3" />}
          {ends.map((e) => (
            <g key={e.k} className="animate-[rise_0.5s_var(--ease)_both]">
              <text x={W - m.r + 12} y={e.ty} dy="-0.2em" className="fill-muted-foreground text-[10px]">
                {name[e.k]}
              </text>
              <text x={W - m.r + 12} y={e.ty} dy="1.05em" className={cn("font-mono text-[11.5px]", e.v > 0 ? "fill-up" : e.v < 0 ? "fill-down" : "fill-foreground")}>
                {percent(e.v, lang, 2, true)}
              </text>
            </g>
          ))}
          {dates.map((d, i) => (
            <rect
              key={d}
              x={x(i) - step / 2}
              width={step}
              y={0}
              height={H}
              fill="transparent"
              className={i > 0 && i < points.length ? "cursor-pointer" : undefined}
              onPointerEnter={() => setHover(i < points.length ? i : null)}
              onClick={() => i > 0 && i < points.length && onSelect(i)}
            />
          ))}
        </svg>
      )}
      {hp && hover !== null && (
        <Tooltip x={x(hover)} width={W}>
          <p className="mb-1 font-medium">{hover === 0 ? `${labels.formation} · ${day(hp.date, lang)}` : day(hp.date, lang)}</p>
          <TipRow swatch={<Swatch {...SERIES.ga} />} name={labels.ga} value={percent(value.ga(hp) ?? 0, lang, 2, true)} className={signClass(value.ga(hp))} />
          {value.bova(hp) !== null && (
            <TipRow swatch={<Swatch {...SERIES.bova} />} name={labels.bova} value={percent(value.bova(hp) ?? 0, lang, 2, true)} className={signClass(value.bova(hp))} />
          )}
          <TipRow swatch={<Swatch {...SERIES.cdi} />} name={labels.cdi} value={percent(value.cdi(hp) ?? 0, lang, 2, true)} className={signClass(value.cdi(hp))} />
          <p className="mt-1 border-t border-border pt-1 font-mono tabular-nums text-muted-foreground">{money(hp.nav, lang)}</p>
        </Tooltip>
      )}
    </div>
  );
}

/**
 * The return of each session, the portfolio's bar beside BOVA11's outline,
 * up from the zero line in green or down in red. Sessions not run yet are
 * empty columns.
 */
export function ReturnBars({
  points,
  sessions,
  lang,
  labels,
  selected,
  onSelect,
}: {
  points: NavPoint[];
  sessions: number;
  lang: string;
  labels: { ga: string; bova: string; session: (n: number) => string };
  selected: number | null;
  onSelect: (session: number) => void;
}) {
  const returns = Array.from({ length: sessions }, (_, k) => {
    const a = points[k];
    const b = points[k + 1];
    if (!a || !b) return null;
    return { date: b.date, ga: b.nav / a.nav - 1, bova: a.bova && b.bova ? b.bova / a.bova - 1 : null };
  });
  const max = Math.max(0.005, ...returns.flatMap((r) => (r ? [Math.abs(r.ga), Math.abs(r.bova ?? 0)] : [])));
  const bar = (v: number) => ({ height: `${(Math.abs(v) / max) * 50}%`, ...(v >= 0 ? { bottom: "50%" } : { top: "50%" }) });

  return (
    <div className="relative flex h-full min-h-20 gap-1">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-border" />
      {returns.map((r, k) => (
        <button
          key={k}
          type="button"
          disabled={!r}
          onClick={() => onSelect(k + 1)}
          aria-label={r ? `${labels.session(k + 1)}: ${percent(r.ga, lang, 2, true)}` : labels.session(k + 1)}
          aria-pressed={selected === k + 1}
          className="group/bar relative flex-1 transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] aria-pressed:bg-[color-mix(in_srgb,var(--up)_8%,transparent)]"
        >
          {r && (
            <>
              <span
                className={cn("absolute left-[22%] w-[30%] transition-all duration-500 ease-[var(--ease)]", r.ga >= 0 ? "bg-up" : "bg-down")}
                style={bar(r.ga)}
              />
              {r.bova !== null && (
                <span
                  className={cn("absolute left-[56%] w-[22%] border transition-all duration-500 ease-[var(--ease)]", r.bova >= 0 ? "border-up/70" : "border-down/70")}
                  style={bar(r.bova)}
                />
              )}
              <span className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full border border-border bg-background/95 px-2 py-1 text-left text-[10.5px] whitespace-nowrap shadow-lg group-hover/bar:block">
                <span className="block text-muted-foreground">{day(r.date, lang)}</span>
                <span className="flex justify-between gap-3">
                  {labels.ga} <span className={cn("font-mono", signClass(r.ga))}>{percent(r.ga, lang, 2, true)}</span>
                </span>
                {r.bova !== null && (
                  <span className="flex justify-between gap-3">
                    {labels.bova} <span className={cn("font-mono", signClass(r.bova))}>{percent(r.bova, lang, 2, true)}</span>
                  </span>
                )}
              </span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}

/** One evening's evolution: best and mean score per generation, diversity as a faint band. */
export function ConvergenceChart({
  history,
  lang,
  labels,
}: {
  history: SessionSummary["history"];
  lang: string;
  labels: { best: string; mean: string; diversity: string; generation: string };
}) {
  const [ref, { width: W, height: H }] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { l: 38, r: 10, t: 10, b: 22 };
  const ok = history.length >= 2 && W > 0 && H > 0;
  const gens = history.length ? history[history.length - 1].gen || 1 : 1;
  const scores = history.flatMap((h) => [h.best, h.mean]).filter(Number.isFinite);
  let lo = scores.length ? Math.min(...scores) : 0;
  let hi = scores.length ? Math.max(...scores) : 1;
  const pad = Math.max(0.02, (hi - lo) * 0.08);
  lo -= pad;
  hi += pad;
  const x = (g: number) => m.l + (g / gens) * (W - m.l - m.r);
  const y = (v: number) => m.t + ((hi - v) / (hi - lo)) * (H - m.t - m.b);
  const yd = (d: number) => H - m.b - d * (H - m.t - m.b) * 0.35;
  const h = hover !== null ? history[hover] : undefined;

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const g = ((event.clientX - rect.left - m.l) / (W - m.l - m.r)) * gens;
    let best = 0;
    for (let i = 1; i < history.length; i++) if (Math.abs(history[i].gen - g) < Math.abs(history[best].gen - g)) best = i;
    setHover(best);
  };

  return (
    <div ref={ref} className="relative h-full min-h-20 w-full" onPointerLeave={() => setHover(null)}>
      {ok && (
        <svg width={W} height={H} className="absolute inset-0" role="img" aria-label={`${labels.best}, ${labels.mean}, ${labels.diversity}`} onPointerMove={onMove}>
          <path
            d={`${path(history.map((s) => [x(s.gen), yd(s.diversity)]))}L${x(gens)} ${H - m.b}L${x(0)} ${H - m.b}Z`}
            className={cn("fill-muted-foreground", DRAW)}
            opacity={0.13}
          />
          {ticks(lo, hi, Math.max(2, Math.round((H - m.t - m.b) / 44))).map((v) => (
            <g key={v}>
              <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} />
              <text x={m.l - 6} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted-foreground font-mono text-[9.5px]">
                {number(v, lang, 2)}
              </text>
            </g>
          ))}
          <text x={W - m.r} y={H - 6} textAnchor="end" className="fill-muted-foreground font-mono text-[9.5px]">
            {labels.generation} {gens}
          </text>
          <text x={m.l} y={H - 6} className="fill-muted-foreground font-mono text-[9.5px]">
            0
          </text>
          <g className={DRAW}>
            <path d={path(history.map((s) => [x(s.gen), y(s.mean)]))} fill="none" className="stroke-muted-foreground" strokeWidth={1.25} />
            <path d={path(history.map((s) => [x(s.gen), y(s.best)]))} fill="none" className="stroke-foreground" strokeWidth={2} strokeLinejoin="round" />
          </g>
          {h && (
            <g>
              <line x1={x(h.gen)} x2={x(h.gen)} y1={m.t} y2={H - m.b} className="stroke-muted-foreground" strokeDasharray="2 3" />
              <circle cx={x(h.gen)} cy={y(h.best)} r={3.5} className="fill-foreground stroke-background" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}
      {h && hover !== null && (
        <Tooltip x={x(h.gen)} width={W}>
          <p className="mb-1 font-medium">
            {labels.generation} {h.gen}
          </p>
          <TipRow swatch={<Swatch width={2} />} name={labels.best} value={number(h.best, lang, 3)} />
          <TipRow swatch={<Swatch width={1.25} muted />} name={labels.mean} value={number(h.mean, lang, 3)} />
          <TipRow
            swatch={<span className="h-2 w-[18px] shrink-0 bg-muted-foreground/25" />}
            name={labels.diversity}
            value={percent(h.diversity, lang, 0)}
          />
        </Tooltip>
      )}
    </div>
  );
}
