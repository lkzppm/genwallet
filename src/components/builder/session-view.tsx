"use client";

import { ArrowDownRight, ArrowUpRight, Briefcase, Dna, Moon, Receipt } from "lucide-react";
import type { Dictionary } from "@/i18n";
import type { SessionSummary } from "@/lib/sim/simulate";
import { cn } from "@/lib/utils";
import { ConvergenceChart, Swatch } from "./charts";
import { day, money, number, percent, signClass } from "./format";
import { Panel, label } from "./ui";

const ROW = 34;

/**
 * One session: the portfolio the evening chose, how that evening's evolution
 * went, and the trades at the open. The portfolio is not remounted between
 * sessions: its rows are keyed by ticker, so moving to the next session
 * slides each company to its new rank and grows or shrinks its bar.
 */
export function SessionView({ s, before, t, lang }: { s: SessionSummary; before: number; t: Dictionary; lang: string }) {
  const v = t.builder.session;
  const maxWeight = Math.max(...s.portfolio.map((h) => h.weight));
  const ret = s.mark.nav / before - 1;
  const metrics = [
    { label: v.score, value: number(s.score, lang, 3) },
    { label: v.expReturn, value: percent(s.mean * 252, lang, 1) },
    { label: v.vol, value: percent(s.vol * Math.sqrt(252), lang, 1) },
    { label: v.turnover, value: percent(s.turnover, lang, 1) },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div key={s.session} className="animate-[swap-in_0.35s_var(--ease)]">
          <h2 className="text-xl font-medium tracking-tight">{v.label(s.session)}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{v.decided(day(s.decidedOn, lang), day(s.executeOn, lang))}</p>
        </div>
        <div className="flex items-center gap-5">
          {s.hold && (
            <span className="flex animate-[pop_0.4s_var(--ease-spring)] items-center gap-1.5 border border-border px-2 py-1 text-[11px] text-muted-foreground">
              <Moon className="size-3" aria-hidden />
              {v.hold}
            </span>
          )}
          <div className="text-right">
            <p className={label}>{v.nav}</p>
            <p className="font-mono text-sm tabular-nums">{money(s.mark.nav, lang)}</p>
          </div>
          <div className="text-right">
            <p className={label}>{v.day}</p>
            <p className={cn("font-mono text-sm tabular-nums transition-colors duration-300", signClass(ret))}>{percent(ret, lang, 2, true)}</p>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-[minmax(16rem,auto)] gap-3 overflow-y-auto @4xl:grid-cols-2 @4xl:grid-rows-[minmax(0,1.25fr)_minmax(0,1fr)] @4xl:overflow-visible">
        <Panel title={v.portfolio} icon={Briefcase} className="@4xl:row-span-2" bodyClassName="scroll-thin flex flex-col">
          <div className="relative shrink-0" style={{ height: s.portfolio.length * ROW }}>
            {[...s.portfolio]
              .sort((a, b) => a.ticker.localeCompare(b.ticker))
              .map((h) => {
                const rank = s.portfolio.indexOf(h);
                const entered = s.entered.includes(h.ticker);
                return (
                  <div
                    key={h.ticker}
                    className="absolute inset-x-0 flex animate-[fade_0.45s_var(--ease)_both] items-center gap-3 border-b border-border transition-transform duration-500 ease-[var(--ease)]"
                    style={{ height: ROW, transform: `translateY(${rank * ROW}px)` }}
                  >
                    <span className="w-14 shrink-0 font-mono text-xs">{h.ticker}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-muted-foreground" title={h.company}>
                        {h.company}
                      </span>
                      <span className="block truncate text-[10px] text-muted-foreground/70" title={h.sector}>
                        {h.sector}
                      </span>
                    </span>
                    {entered && <span className="shrink-0 animate-[pop_0.4s_var(--ease-spring)] font-mono text-[9.5px] uppercase tracking-wider text-up">{v.entered}</span>}
                    <span className="h-1.5 w-[22%] shrink-0 bg-border">
                      <span
                        className={cn("block h-full transition-[width] duration-500 ease-[var(--ease)]", entered ? "bg-up" : "bg-foreground/70")}
                        style={{ width: `${(h.weight / maxWeight) * 100}%` }}
                      />
                    </span>
                    <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums">{percent(h.weight, lang, 1)}</span>
                  </div>
                );
              })}
          </div>
          {s.left.length > 0 && <p className="mt-3 animate-[rise_0.4s_var(--ease)] text-xs text-down">{v.left(s.left.join(", "))}</p>}
        </Panel>

        <Panel
          title={v.convergence}
          icon={Dna}
          bodyClassName="flex flex-col gap-2"
          actions={
            <span className="hidden items-center gap-3 text-[10.5px] text-muted-foreground @6xl:flex">
              <span className="flex items-center gap-1.5">
                <Swatch width={2} /> {v.best}
              </span>
              <span className="flex items-center gap-1.5">
                <Swatch width={1.25} muted /> {v.mean}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-3.5 bg-muted-foreground/25" /> {v.diversity}
              </span>
            </span>
          }
        >
          <div key={s.session} className="min-h-0 flex-1 animate-[swap-in_0.35s_var(--ease)]">
            <ConvergenceChart
              history={s.history}
              lang={lang}
              labels={{ best: v.best, mean: v.mean, diversity: v.diversity, generation: v.generation }}
            />
          </div>
          <dl className="grid shrink-0 grid-cols-4 gap-px border border-border bg-border" title={v.inSample}>
            {metrics.map((m) => (
              <div key={m.label} className="bg-background px-2 py-1.5">
                <dt className="truncate text-[10px] text-muted-foreground">{m.label}</dt>
                <dd className="font-mono text-xs tabular-nums">{m.value}</dd>
              </div>
            ))}
          </dl>
          <p className="shrink-0 truncate text-[10.5px] text-muted-foreground" title={v.inSample}>
            {v.inSample}
          </p>
        </Panel>

        <Panel title={v.trades} icon={Receipt} bodyClassName="scroll-thin p-0">
          {s.fill.trades.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">{v.noTrades}</p>
          ) : (
            <table key={s.session} className="w-full animate-[swap-in_0.35s_var(--ease)] text-left text-xs">
              <thead className="sticky top-0 bg-background text-[10.5px] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-normal">{v.ticker}</th>
                  <th className="py-2 text-right font-normal">{v.qty}</th>
                  <th className="py-2 text-right font-normal">{v.price}</th>
                  <th className="px-3 py-2 text-right font-normal">{v.value}</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {s.fill.trades.map((tr) => {
                  const Side = tr.side === "buy" ? ArrowUpRight : ArrowDownRight;
                  return (
                    <tr key={`${tr.ticker}-${tr.side}`} className="border-t border-border transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]">
                      <td className="px-3 py-1.5">
                        <span className="flex items-center gap-1.5">
                          <Side className={cn("size-3.5", tr.side === "buy" ? "text-up" : "text-down")} aria-label={v.side[tr.side]} />
                          {tr.ticker}
                        </span>
                      </td>
                      <td className="py-1.5 text-right">{tr.qty}</td>
                      <td className="py-1.5 text-right">{number(tr.price, lang)}</td>
                      <td className="px-3 py-1.5 text-right">{money(tr.value, lang)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}
