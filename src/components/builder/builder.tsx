"use client";

import { Play, RotateCcw, Square } from "lucide-react";
import { useMemo, useState } from "react";
import { useT } from "@/i18n/LocaleProvider";
import { LIVE_CONFIG } from "@/lib/live/config";
import { NavChart } from "./charts";
import { day, money, percent, signClass } from "./format";
import { BuilderForm, defaultForm, toConfig } from "./form";
import type { FormState } from "./form";
import { SessionView } from "./session-view";
import { button, label, panel } from "./ui";
import { useSimulator } from "./use-simulator";

const SESSIONS = LIVE_CONFIG.sessions;

/**
 * The "Montar carteira" page: pick the starting parameters, then watch the
 * genetic algorithm form a portfolio on a past evening and operate it over
 * the next sessions, in a worker, with the live run's engine and broker.
 */
export function Builder() {
  const t = useT();
  const lang = t.lang;
  const b = t.builder;
  const sim = useSimulator();
  const [formState, setForm] = useState<FormState | null>(null);
  const [picked, setPicked] = useState<number | null>(null);

  const lookback = Number(formState?.lookback ?? 252);
  const formations = useMemo(() => {
    const lb = Number.isFinite(lookback) ? Math.min(400, Math.max(60, Math.round(lookback))) : 252;
    return sim.dates.slice(lb, Math.max(lb, sim.dates.length - SESSIONS));
  }, [sim.dates, lookback]);

  // The form starts on the latest evening that still has ten sessions after it.
  const form = formState ?? (formations.length ? defaultForm(formations[formations.length - 1]) : null);
  // A longer lookback can push the chosen evening out of range: keep it inside.
  const formation =
    form && formations.length && !formations.includes(form.formation)
      ? (formations.findLast((d) => d <= form.formation) ?? formations[0])
      : (form?.formation ?? "");
  const sessionWindow = useMemo(() => {
    const i = sim.dates.indexOf(formation);
    return i < 0 ? [] : sim.dates.slice(i + 1, i + 1 + SESSIONS);
  }, [sim.dates, formation]);

  const { config, problems } = form ? toConfig({ ...form, formation }, t) : { config: null, problems: [] };
  const running = sim.status === "running";
  const sessions = sim.sessions;
  const shown = sessions.length ? sessions[Math.min(picked ?? sessions.length - 1, sessions.length - 1)] : null;

  const totalGenerations = config ? config.formationGenerations + (SESSIONS - 1) * config.dailyGenerations : 1;
  const done = sim.progress
    ? (sim.progress.session === 1 ? 0 : (config?.formationGenerations ?? 0) + (sim.progress.session - 2) * (config?.dailyGenerations ?? 0)) +
      sim.progress.gen
    : 0;
  const fraction = sim.status === "done" ? 1 : Math.min(1, done / Math.max(1, totalGenerations));

  const run = () => {
    if (!config) return;
    setPicked(null);
    sim.run(config);
  };

  const r = sim.result;
  const tiles = r
    ? [
        { name: b.results.ga, value: r.final.ret, strong: true },
        { name: b.results.bova, value: r.final.bovaRet, strong: false },
        { name: b.results.cdi, value: r.final.cdiRet, strong: false },
      ]
    : [];

  return (
    <main className="page mx-auto w-full max-w-6xl px-4 pt-10 pb-16 sm:px-6">
      <header className="max-w-3xl">
        <p className={label}>{b.eyebrow}</p>
        <h1 className="mt-3 text-4xl font-medium tracking-tight sm:text-5xl">{b.title}</h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">{b.lead}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {sim.dates.length
            ? b.data(sim.tickers,day(sim.dates[0], lang), day(sim.dates[sim.dates.length - 1], lang))
            : sim.status === "error"
              ? null
              : b.loading}
        </p>
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        {/* The actions stay on top; on a wide screen the parameters scroll inside the column. */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-20">
          <div className="flex flex-wrap gap-2">
            {running ? (
              <button type="button" className={button.danger} onClick={sim.cancel}>
                <Square className="size-3.5" aria-hidden /> {b.cancel}
              </button>
            ) : (
              <button type="button" className={button.primary} onClick={run} disabled={!config || sim.status === "loading"}>
                <Play className="size-3.5" aria-hidden /> {r ? b.again : b.run}
              </button>
            )}
            <button
              type="button"
              className={button.secondary}
              disabled={running || !formations.length}
              onClick={() => setForm(defaultForm(formations[formations.length - 1]))}
            >
              <RotateCcw className="size-3.5" aria-hidden /> {b.reset}
            </button>
          </div>
          {problems.map((p) => (
            <p key={p} className="text-xs text-down">
              {p}
            </p>
          ))}
          <div className="lg:max-h-[calc(100svh-9.5rem)] lg:overflow-y-auto lg:overscroll-contain">
          {form ? (
            <BuilderForm
              form={{ ...form, formation }}
              setForm={setForm}
              t={t}
              lang={lang}
              formations={formations}
              sessionWindow={sessionWindow}
              disabled={running}
            />
          ) : (
            <div className={`${panel} h-96 animate-pulse`} />
          )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col gap-4">
          {(running || sim.progress) && (
            <div className={`${panel} p-4`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                <span className="font-mono tabular-nums text-foreground">
                  {sim.progress
                    ? b.progress(sim.progress.session, sim.progress.sessions, sim.progress.gen, sim.progress.generations)
                    : b.loading}
                </span>
                <span className="font-mono tabular-nums text-muted-foreground">{percent(fraction, lang, 0)}</span>
              </div>
              <div className="mt-2 h-1 bg-border">
                <div className="h-full bg-foreground transition-[width] duration-150 ease-out" style={{ width: `${fraction * 100}%` }} />
              </div>
            </div>
          )}

          {sim.status === "error" && sim.error && <p className="text-sm text-down">{b.error(sim.error)}</p>}
          {sim.status === "idle" && sessions.length > 0 && !r && <p className="text-sm text-muted-foreground">{b.cancelled}</p>}

          {!sessions.length && !running && sim.status !== "error" && (
            <div className={`${panel} p-6 text-sm leading-relaxed text-muted-foreground`}>{b.empty}</div>
          )}

          {r && (
            <div className={`${panel} p-4 sm:p-5`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className={label}>{b.results.title}</h2>
                <span className="text-xs text-muted-foreground">{b.results.seconds((r.ms / 1000).toFixed(1))}</span>
              </div>
              <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                {tiles.map((tile) => (
                  <div key={tile.name} className={tile.strong ? "border-l-2 border-foreground pl-3" : "border-l border-border pl-3"}>
                    <dt className="text-xs text-muted-foreground">{tile.name}</dt>
                    <dd className={`mt-1 font-mono text-2xl tabular-nums ${signClass(tile.value)}`}>
                      {tile.value === null ? "n/a" : percent(tile.value, lang, 2, true)}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs text-muted-foreground">
                {b.results.finalValue}: <span className="font-mono text-foreground">{money(r.final.nav, lang)}</span>
                {" · "}
                {b.results.fees(money(r.final.fees, lang), r.final.trades)}
                {" · "}
                {b.results.holds(r.final.holds)}
              </p>
              <div className="mt-5">
                <h3 className="text-xs text-muted-foreground">{b.results.chart}</h3>
                {/* On a phone the chart keeps a readable size and scrolls sideways. */}
                <div className="mt-2 overflow-x-auto [&>svg]:min-w-[34rem]">
                  <NavChart
                    points={r.nav}
                    capital={r.config.capital}
                    lang={lang}
                    labels={{ ga: b.results.ga, bova: "BOVA11", cdi: b.results.cdi, formation: b.results.formation }}
                  />
                </div>
              </div>
              <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">{b.results.oneSample}</p>
            </div>
          )}

          {sessions.length > 0 && (
            <div className="flex flex-col gap-4">
              <div role="tablist" aria-label={b.session.tabs} className="flex flex-wrap gap-1">
                {Array.from({ length: SESSIONS }, (_, i) => {
                  const ready = i < sessions.length;
                  const active = shown?.session === i + 1;
                  return (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      disabled={!ready}
                      title={ready ? day(sessions[i].executeOn, lang) : undefined}
                      onClick={() => setPicked(i)}
                      className="h-8 min-w-10 border border-border px-2 font-mono text-xs tabular-nums text-muted-foreground transition-[color,background-color,border-color,transform] duration-200 ease-out hover:border-foreground hover:text-foreground active:scale-[0.95] disabled:opacity-30 aria-selected:border-foreground aria-selected:bg-foreground aria-selected:text-background"
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              {shown && (
                <>
                  <h2 className="text-lg font-medium">{b.session.label(shown.session)}</h2>
                  <SessionView s={shown} t={t} lang={lang} />
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
