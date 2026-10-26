"use client";

import type { NavPoint, SessionSummary } from "@/lib/sim/simulate";
import { percent, shortDay } from "./format";

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

interface Series {
  key: string;
  label: string;
  values: (number | null)[];
  className: string;
  dash?: string;
  width: number;
}

/**
 * The portfolio's value through the sessions against BOVA11 and the CDI, as
 * returns on the capital. Point 0 is the formation evening, all in cash.
 */
export function NavChart({
  points,
  capital,
  lang,
  labels,
}: {
  points: NavPoint[];
  capital: number;
  lang: string;
  labels: { ga: string; bova: string; cdi: string; formation: string };
}) {
  const W = 640;
  const H = 250;
  const m = { l: 52, r: 128, t: 14, b: 30 };
  const series: Series[] = [
    { key: "cdi", label: labels.cdi, values: points.map((p) => p.cdi / capital - 1), className: "stroke-muted-foreground", dash: "1 4", width: 1.5 },
    { key: "bova", label: labels.bova, values: points.map((p) => (p.bova === null ? null : p.bova / capital - 1)), className: "stroke-muted-foreground", dash: "5 4", width: 1.5 },
    { key: "ga", label: labels.ga, values: points.map((p) => p.nav / capital - 1), className: "stroke-foreground", width: 2.25 },
  ];
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null)).concat(0);
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  const pad = Math.max(0.002, (hi - lo) * 0.12);
  lo -= pad;
  hi += pad;
  const n = Math.max(1, points.length - 1);
  const x = (i: number) => m.l + (i / n) * (W - m.l - m.r);
  const y = (v: number) => m.t + ((hi - v) / (hi - lo)) * (H - m.t - m.b);

  // End labels, pushed apart so they never overlap.
  const ends = series
    .map((s) => ({ s, v: s.values[s.values.length - 1] }))
    .filter((e): e is { s: Series; v: number } => e.v !== null)
    .map((e) => ({ ...e, ty: y(e.v) }))
    .sort((a, b) => a.ty - b.ty);
  for (let i = 1; i < ends.length; i++) ends[i].ty = Math.max(ends[i].ty, ends[i - 1].ty + 26);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={series.map((s) => s.label).join(", ")}>
      {ticks(lo, hi, 4).map((v) => (
        <g key={v}>
          <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} className={v === 0 ? "stroke-muted-foreground" : "stroke-border"} strokeWidth={1} opacity={v === 0 ? 0.6 : 1} />
          <text x={m.l - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">
            {percent(v, lang, 1, true)}
          </text>
        </g>
      ))}
      {points.map((p, i) => (
        <text key={p.date} x={x(i)} y={H - 10} textAnchor="middle" className="fill-muted-foreground font-mono text-[9.5px]">
          {i === 0 ? labels.formation : shortDay(p.date, lang)}
        </text>
      ))}
      {series.map((s) => (
        <path
          key={s.key}
          d={path(s.values.flatMap((v, i) => (v === null ? [] : [[x(i), y(v)] as [number, number]])))}
          fill="none"
          className={s.className}
          strokeWidth={s.width}
          strokeDasharray={s.dash}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {series[2].values.map((v, i) =>
        v === null ? null : <circle key={i} cx={x(i)} cy={y(v)} r={2.6} className="fill-foreground" />,
      )}
      {ends.map((e) => (
        <g key={e.s.key}>
          <text x={W - m.r + 10} y={e.ty} dy="-0.15em" className="fill-muted-foreground text-[10px]">
            {e.s.label}
          </text>
          <text x={W - m.r + 10} y={e.ty} dy="1.05em" className={`font-mono text-[11px] ${e.v > 0 ? "fill-up" : e.v < 0 ? "fill-down" : "fill-foreground"}`}>
            {percent(e.v, lang, 2, true)}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** One evening's evolution: best and mean score per generation, diversity as a faint band. */
export function ConvergenceChart({
  history,
  labels,
}: {
  history: SessionSummary["history"];
  labels: { best: string; mean: string; diversity: string; generation: string };
}) {
  const W = 360;
  const H = 150;
  const m = { l: 36, r: 10, t: 10, b: 24 };
  if (history.length < 2) return null;
  const gens = history[history.length - 1].gen || 1;
  const scores = history.flatMap((h) => [h.best, h.mean]).filter(Number.isFinite);
  let lo = Math.min(...scores);
  let hi = Math.max(...scores);
  const pad = Math.max(0.02, (hi - lo) * 0.08);
  lo -= pad;
  hi += pad;
  const x = (g: number) => m.l + (g / gens) * (W - m.l - m.r);
  const y = (v: number) => m.t + ((hi - v) / (hi - lo)) * (H - m.t - m.b);
  const yd = (d: number) => H - m.b - d * (H - m.t - m.b) * 0.35;
  const diversity = `${path(history.map((h) => [x(h.gen), yd(h.diversity)]))}L${x(gens)} ${H - m.b}L${x(0)} ${H - m.b}Z`;

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${labels.best}, ${labels.mean}, ${labels.diversity}`}>
        <path d={diversity} className="fill-muted-foreground" opacity={0.12} />
        {ticks(lo, hi, 3).map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} />
            <text x={m.l - 6} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted-foreground font-mono text-[9px]">
              {v.toFixed(2)}
            </text>
          </g>
        ))}
        <text x={W - m.r} y={H - 6} textAnchor="end" className="fill-muted-foreground font-mono text-[9px]">
          {labels.generation} {gens}
        </text>
        <text x={m.l} y={H - 6} className="fill-muted-foreground font-mono text-[9px]">
          0
        </text>
        <path d={path(history.map((h) => [x(h.gen), y(h.mean)]))} fill="none" className="stroke-muted-foreground" strokeWidth={1.25} />
        <path d={path(history.map((h) => [x(h.gen), y(h.best)]))} fill="none" className="stroke-foreground" strokeWidth={1.75} strokeLinejoin="round" />
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-foreground" /> {labels.best}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-px w-4 bg-muted-foreground" /> {labels.mean}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 bg-muted-foreground/15" /> {labels.diversity}
        </span>
      </figcaption>
    </figure>
  );
}
