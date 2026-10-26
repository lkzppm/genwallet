"use client";

import { Grid3x3 } from "lucide-react";
import { useState } from "react";
import type { Dictionary } from "@/i18n";
import type { SessionSummary } from "@/lib/sim/simulate";
import { cn } from "@/lib/utils";
import { percent, shortDay } from "./format";
import { Panel } from "./ui";

/**
 * Every company the run ever held, one row each, against the sessions: the
 * cell's green deepens with the weight, an empty cell is a session outside
 * the portfolio. Rows come in the order the companies first entered.
 */
export function Composition({
  sessions,
  dates,
  t,
  lang,
  selected,
  onOpen,
}: {
  sessions: SessionSummary[];
  /** The session dates of the run, done or not. */
  dates: string[];
  t: Dictionary;
  lang: string;
  selected: number | null;
  onOpen: (session: number) => void;
}) {
  const c = t.builder.composition;
  const [hover, setHover] = useState<{ ticker: string; session: number } | null>(null);
  const rows: { ticker: string; company: string; sector: string }[] = [];
  for (const s of sessions) for (const h of s.portfolio) if (!rows.some((r) => r.ticker === h.ticker)) rows.push(h);
  const weight = (session: number, ticker: string) => sessions[session - 1]?.portfolio.find((h) => h.ticker === ticker)?.weight;
  const max = Math.max(0.01, ...sessions.flatMap((s) => s.portfolio.map((h) => h.weight)));
  const columns = `minmax(7rem, 11rem) repeat(${dates.length}, minmax(2.25rem, 1fr))`;
  // Rows share the panel's height, between 24 and 40 px each.
  const grid = { gridTemplateColumns: columns, gridTemplateRows: `auto repeat(${rows.length}, minmax(1.5rem, 1fr))`, maxHeight: `calc(2.5rem + ${rows.length} * 2.5rem)` };

  return (
    <Panel
      title={c.title}
      icon={Grid3x3}
      className="h-full"
      bodyClassName="scroll-thin flex flex-col gap-3"
      actions={
        <span className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
          0%
          <span className="h-2 w-20 bg-[linear-gradient(to_right,transparent,var(--up))] ring-1 ring-border" aria-hidden />
          {percent(max, lang, 0)}
        </span>
      }
    >
      <div className="grid min-h-0 min-w-[32rem] flex-1 gap-px text-xs" style={grid} onPointerLeave={() => setHover(null)}>
        <span />
        {dates.map((d, i) => (
          <button
            key={d}
            type="button"
            disabled={i >= sessions.length}
            onClick={() => onOpen(i + 1)}
            className={cn(
              "flex flex-col items-center py-1 font-mono text-[10px] leading-tight transition-colors duration-200 disabled:opacity-30",
              selected === i + 1 || hover?.session === i + 1 ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>{i + 1}</span>
            <span className="text-[9px]">{shortDay(d, lang)}</span>
          </button>
        ))}
        {rows.map((r, ri) => (
          <div key={r.ticker} className="contents">
            <span
              className={cn(
                "flex min-w-0 animate-[fade_0.4s_var(--ease)_both] items-center gap-2 pr-2 transition-colors duration-200",
                hover?.ticker === r.ticker && "text-up",
              )}
              style={{ animationDelay: `${ri * 18}ms` }}
              title={`${r.company} · ${r.sector}`}
            >
              <span className="font-mono">{r.ticker}</span>
              <span className="truncate text-[10px] text-muted-foreground">{r.company}</span>
            </span>
            {dates.map((d, i) => {
              const w = weight(i + 1, r.ticker);
              const isHover = hover?.ticker === r.ticker && hover.session === i + 1;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={i >= sessions.length}
                  aria-label={`${r.ticker} · ${t.builder.session.label(i + 1)}: ${w ? percent(w, lang, 1) : c.out}`}
                  onPointerEnter={() => setHover({ ticker: r.ticker, session: i + 1 })}
                  onClick={() => onOpen(i + 1)}
                  className={cn(
                    "relative min-h-6 animate-[fade_0.5s_var(--ease)_both] transition-[outline-color,transform] duration-200 outline outline-1 -outline-offset-1",
                    selected === i + 1 ? "outline-up/60" : "outline-transparent",
                    isHover && "z-10 scale-110 outline-foreground",
                    !w && "bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)]",
                  )}
                  style={{
                    animationDelay: `${(ri + i) * 14}ms`,
                    background: w ? `color-mix(in srgb, var(--up) ${Math.round(18 + (w / max) * 82)}%, transparent)` : undefined,
                  }}
                >
                  {isHover && (
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 border border-border bg-background/95 px-2 py-1 font-mono text-[10.5px] whitespace-nowrap text-foreground shadow-lg">
                      {r.ticker} · {i + 1} · {w ? percent(w, lang, 1) : c.out}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="shrink-0 text-[11px] leading-snug text-muted-foreground">{c.hint}</p>
    </Panel>
  );
}
