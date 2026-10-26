"use client";

import type { Dictionary } from "@/i18n";
import type { SessionSummary } from "@/lib/sim/simulate";
import { ConvergenceChart } from "./charts";
import { day, money, number, percent } from "./format";
import { label, panel } from "./ui";

/** One session: the evening's evolution, the portfolio it chose and the trades at the open. */
export function SessionView({ s, t, lang }: { s: SessionSummary; t: Dictionary; lang: string }) {
  const v = t.builder.session;
  const maxWeight = Math.max(...s.portfolio.map((h) => h.weight));
  const metrics = [
    { label: v.score, value: number(s.score, lang, 3) },
    { label: v.expReturn, value: percent(s.mean * 252, lang, 1) },
    { label: v.vol, value: percent(s.vol * Math.sqrt(252), lang, 1) },
    { label: v.turnover, value: percent(s.turnover, lang, 1) },
  ];

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        {v.decided(day(s.decidedOn, lang), day(s.executeOn, lang))}
        {s.hold && <span className="ml-1 text-foreground">{v.hold}</span>}
      </p>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className={`${panel} p-4`}>
          <h3 className={label}>{v.convergence}</h3>
          <div className="mt-3">
            <ConvergenceChart
              history={s.history}
              labels={{ best: v.best, mean: v.mean, diversity: v.diversity, generation: v.generation }}
            />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3">
            {metrics.map((m) => (
              <div key={m.label}>
                <dt className="text-[11px] text-muted-foreground">{m.label}</dt>
                <dd className="font-mono text-sm tabular-nums">{m.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[11px] leading-snug text-muted-foreground">{v.inSample}</p>
        </section>

        <section className={`${panel} p-4`}>
          <h3 className={label}>{v.portfolio}</h3>
          {/* Fixed columns: long company and sector names truncate instead of pushing the weights out. */}
          <table className="mt-3 w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[7.5rem]" />
              <col />
              <col className="hidden 2xl:table-column" />
              <col className="w-[6.5rem] sm:w-[8.5rem]" />
            </colgroup>
            <thead className="text-[11px] text-muted-foreground">
              <tr>
                <th className="pb-2 font-normal">{v.ticker}</th>
                <th className="pb-2 font-normal">{v.company}</th>
                <th className="hidden pb-2 font-normal 2xl:table-cell">{v.sector}</th>
                <th className="pb-2 text-right font-normal">{v.weight}</th>
              </tr>
            </thead>
            <tbody>
              {s.portfolio.map((h) => (
                <tr key={h.ticker} className="border-t border-border">
                  <td className="py-1.5 pr-3 font-mono">
                    {h.ticker}
                    {s.entered.includes(h.ticker) && (
                      <span className="ml-2 font-sans text-[10px] uppercase tracking-wider text-up">{v.entered}</span>
                    )}
                  </td>
                  <td className="truncate py-1.5 pr-3 text-muted-foreground" title={h.company}>
                    {h.company}
                  </td>
                  <td className="hidden truncate py-1.5 pr-3 text-xs text-muted-foreground 2xl:table-cell" title={h.sector}>
                    {h.sector}
                  </td>
                  <td className="py-1.5">
                    <div className="flex items-center justify-end gap-2">
                      <span className="hidden h-1.5 w-12 bg-border sm:block">
                        <span className="block h-full bg-foreground/70" style={{ width: `${(h.weight / maxWeight) * 100}%` }} />
                      </span>
                      <span className="w-14 text-right font-mono tabular-nums">{percent(h.weight, lang, 1)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {s.left.length > 0 && <p className="mt-3 text-xs text-down">{v.left(s.left.join(", "))}</p>}
        </section>
      </div>

      <section className={`${panel} p-4`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className={label}>{v.trades}</h3>
          <span className="text-xs text-muted-foreground">
            {v.nav}: <span className="font-mono text-foreground">{money(s.mark.nav, lang)}</span>
          </span>
        </div>
        {s.fill.trades.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{v.noTrades}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[22rem] text-left text-sm">
              <thead className="text-[11px] text-muted-foreground">
                <tr>
                  <th className="pb-2 font-normal">{v.ticker}</th>
                  <th className="pb-2 font-normal" />
                  <th className="pb-2 text-right font-normal">{v.qty}</th>
                  <th className="pb-2 text-right font-normal">{v.price}</th>
                  <th className="pb-2 text-right font-normal">{v.value}</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {s.fill.trades.map((tr) => (
                  <tr key={`${tr.ticker}-${tr.side}`} className="border-t border-border">
                    <td className="py-1.5">{tr.ticker}</td>
                    <td className="py-1.5 font-sans text-xs text-muted-foreground">{v.side[tr.side]}</td>
                    <td className="py-1.5 text-right">{tr.qty}</td>
                    <td className="py-1.5 text-right">{number(tr.price, lang)}</td>
                    <td className="py-1.5 text-right">{money(tr.value, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
