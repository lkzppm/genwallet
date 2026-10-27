"use client";

import {
  ChartColumn,
  ChartLine,
  ChevronLeft,
  ChevronRight,
  Database,
  Dna,
  Download,
  Trash2,
  Grid3x3,
  LayoutDashboard,
  CalendarDays,
  LoaderCircle,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { TerrainField } from "@/components/terrain/terrain-canvas";
import type { Dictionary } from "@/i18n";
import { useT } from "@/i18n/LocaleProvider";
import { TUNED } from "@/lib/ga/params";
import { LIVE_CONFIG } from "@/lib/live/config";
import type { NavPoint, SessionSummary, SimResult } from "@/lib/sim/simulate";
import { cn } from "@/lib/utils";
import { NavChart, ReturnBars, SERIES, Swatch } from "./charts";
import { Composition } from "./composition";
import { day, money, monthYear, percent, shortDay, signClass } from "./format";
import { defaultForm, read, toConfig, type FormState } from "./form";
import { Picker } from "./picker";
import { SessionView } from "./session-view";
import { Sidebar } from "./sidebar";
import { IconButton, Panel, Segmented, label } from "./ui";
import { refusals } from "./universe";
import { useKept, useSimulator } from "./use-simulator";

const SESSIONS = LIVE_CONFIG.sessions;

type View = "overview" | "session" | "composition";
type Pane = "params" | "result";

/**
 * The "Montar carteira" page, one fixed screen: the parameters in a sidebar
 * on the left, the run on a stage that takes the rest. Run it, and the
 * genetic algorithm forms a portfolio on a past evening and operates it
 * over the next sessions in a worker, with the live run's engine and broker;
 * the stage fills in session by session and is browsed in three views, with
 * the sessions on a timeline along the bottom. The companies can be left to
 * the algorithm or chosen by hand, in a picker that opens over the stage.
 */
export function Builder() {
  const t = useT();
  const lang = t.lang;
  const b = t.builder;
  const sim = useSimulator();
  // Kept across pages: back from another page, the builder is as it was left.
  const [formState, setForm] = useKept<FormState | null>("builder.form", null);
  const [view, setView] = useKept<View>("builder.view", "overview");
  const [pane, setPane] = useKept<Pane>("builder.pane", "params");
  // The session picked on the stage (1-based), and the side the move came from.
  const [pick, setPick] = useKept<{ session: number | null; dir: number }>("builder.pick", { session: null, dir: 0 });
  const [picking, setPicking] = useKept("builder.picking", false);
  const [sidebar, setSidebar] = useSidebarWidth();

  // The window the form asks for: how many sessions, on how long a history.
  const lookback = formState ? Math.round(read(formState, "lookback")) : TUNED.params.lookback;
  const count = formState ? Math.round(read(formState, "sessions")) : SESSIONS;
  const formations = useMemo(
    () => sim.dates.slice(lookback, Math.max(lookback, sim.dates.length - count)),
    [sim.dates, lookback, count],
  );

  // The form starts on the latest evening that still has ten sessions after it.
  const [latest, setLatest] = useState<string | null>(null);
  if (!latest && sim.dates.length > TUNED.params.lookback + SESSIONS) setLatest(sim.dates[sim.dates.length - 1 - SESSIONS]);
  const defaults = useMemo(() => (latest ? defaultForm(latest) : null), [latest]);
  const form = formState ?? defaults;
  // A longer lookback can push the chosen evening out of range: keep it inside.
  const formation =
    form && formations.length && !formations.includes(form.formation)
      ? (formations.findLast((d) => d <= form.formation) ?? formations[0])
      : (form?.formation ?? "");
  const sessionWindow = useMemo(() => {
    const i = sim.dates.indexOf(formation);
    return i < 0 ? [] : sim.dates.slice(i + 1, i + 1 + count);
  }, [sim.dates, formation, count]);
  // Tickers the engine would refuse on some evening of that window.
  const refused = useMemo(
    () => (sim.market && formation ? refusals(sim.market, sim.dates, formation, count, lookback, TUNED.params.minTraded) : new Map()),
    [sim.market, sim.dates, formation, count, lookback],
  );

  const { config, problems } = form ? toConfig({ ...form, formation }, t, refused) : { config: null, problems: [] };
  const running = sim.status === "running";
  const sessions = sim.sessions;
  const r = sim.result;
  const started = running || sessions.length > 0;

  // The stage shows the run that was made, not the form as it is being edited.
  const runConfig = r?.config ?? sim.config;
  const runDates = useMemo(() => {
    if (!runConfig) return [];
    const i = sim.dates.indexOf(runConfig.formation);
    return i < 0 ? [] : sim.dates.slice(i, i + 1 + runConfig.sessions);
  }, [sim.dates, runConfig]);
  const capital = runConfig?.capital ?? 0;
  const points: NavPoint[] = useMemo(
    () => (runConfig ? [{ date: runConfig.formation, nav: capital, bova: capital, cdi: capital }, ...sessions.map((s) => s.point)] : []),
    [runConfig, capital, sessions],
  );

  const selected = sessions.length ? Math.min(pick.session ?? sessions.length, sessions.length) : null;
  const shown = selected ? sessions[selected - 1] : null;
  const select = (session: number) => {
    if (session < 1 || session > sessions.length) return;
    setPick({ session, dir: Math.sign(session - (selected ?? session)) });
  };
  const open = (session: number) => {
    select(session);
    setView("session");
  };

  // ← and → walk the sessions, unless a field has the keyboard.
  useEffect(() => {
    if (!sessions.length) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]") || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const current = Math.min(pick.session ?? sessions.length, sessions.length);
      const next = current + (event.key === "ArrowRight" ? 1 : -1);
      if (next < 1 || next > sessions.length) return;
      event.preventDefault();
      setPick({ session: next, dir: event.key === "ArrowRight" ? 1 : -1 });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sessions.length, pick.session, setPick]);

  const totalGenerations = config ? config.formationGenerations + (config.sessions - 1) * config.dailyGenerations : 1;
  const done = sim.progress
    ? (sim.progress.session === 1 ? 0 : (config?.formationGenerations ?? 0) + (sim.progress.session - 2) * (config?.dailyGenerations ?? 0)) +
      sim.progress.gen
    : 0;
  const fraction = sim.status === "done" ? 1 : Math.min(1, done / Math.max(1, totalGenerations));

  const run = () => {
    if (!config) return;
    setPick({ session: null, dir: 0 });
    setPicking(false);
    setPane("result");
    sim.run(config);
  };

  // On a phone the picker takes the result's half, and gives the parameters back when done.
  const openPicker = () => {
    setPicking(true);
    setPane("result");
  };
  const closePicker = useCallback(() => {
    setPicking(false);
    setPane("params");
  }, [setPicking, setPane]);

  const dataLine =
    sim.dates.length && sim.market ? b.data(sim.market.universe.length, monthYear(sim.dates[0], lang), monthYear(sim.dates[sim.dates.length - 1], lang)) : "";

  return (
    <main
      className="page grid h-[calc(100dvh-4rem-1px)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden lg:grid-cols-[var(--sidebar)_minmax(0,1fr)] lg:grid-rows-1"
      style={{ "--sidebar": `${sidebar}px` } as CSSProperties}
    >
      {/* On a phone the two halves take turns on the screen. */}
      <div className="border-b border-border p-2 lg:hidden">
        <Segmented<Pane>
          label={b.panes.label}
          value={pane}
          onChange={setPane}
          options={[
            { value: "params", label: b.panes.params, icon: SlidersHorizontal },
            { value: "result", label: b.panes.result, icon: ChartLine },
          ]}
        />
      </div>

      <aside className={cn("relative z-20 min-h-0 border-border bg-[color-mix(in_srgb,var(--foreground)_2%,var(--background))] lg:border-r", pane !== "params" && "max-lg:hidden")}>
        <Sidebar
          form={form ? { ...form, formation } : null}
          defaults={defaults}
          setForm={setForm}
          t={t}
          lang={lang}
          formations={formations}
          sessionWindow={sessionWindow}
          refused={refused}
          onPick={openPicker}
          onUnpick={closePicker}
          bar={{
            running,
            canRun: !!config && sim.status !== "loading",
            sessions: count,
            again: !!r,
            fraction,
            progress: sim.progress
              ? b.progress(sim.progress.session, sim.progress.sessions, sim.progress.gen, sim.progress.generations)
              : b.loading,
            problems,
            onRun: run,
            onCancel: sim.cancel,
            onReset: () => latest && setForm(defaultForm(latest)),
          }}
        />
        <Resizer width={sidebar} onChange={setSidebar} label={b.sidebar.resize} />
      </aside>

      <section className={cn("@container relative flex min-h-0 min-w-0 flex-col", pane !== "result" && "max-lg:hidden")}>
        {picking && sim.market && form && (
          <Picker
            market={sim.market}
            dates={sim.dates}
            formation={formation}
            lookback={lookback}
            refused={refused}
            picks={form.picks}
            onChange={(picks) => setForm({ ...form, formation, picks })}
            onClose={closePicker}
            t={t}
            lang={lang}
          />
        )}
        {!started ? (
          <EmptyStage
            t={t}
            lang={lang}
            dataLine={dataLine}
            formation={formation}
            sessionWindow={sessionWindow}
            loading={sim.status === "loading"}
            error={sim.status === "error" ? sim.error : null}
          />
        ) : (
          <>
            <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-3 sm:px-4">
              <div className="w-full max-w-md">
                <Segmented<View>
                  narrow
                  label={b.views.label}
                  value={view}
                  onChange={setView}
                  options={[
                    { value: "overview", label: b.views.overview, icon: LayoutDashboard },
                    { value: "session", label: b.views.session, icon: CalendarDays },
                    { value: "composition", label: b.views.composition, icon: Grid3x3 },
                  ]}
                />
              </div>
              <div className="ml-auto flex items-center gap-3">
                {running ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-up">
                    <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
                    <span className="hidden @2xl:inline">{b.stage.running}</span>
                  </span>
                ) : sim.status === "error" ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-down">
                    <TriangleAlert className="size-3.5" aria-hidden />
                    {b.error(sim.error ?? "")}
                  </span>
                ) : !r ? (
                  <span className="text-[11px] text-muted-foreground">{b.cancelled}</span>
                ) : (
                  <span className="hidden text-[11px] text-muted-foreground @2xl:inline">{b.stage.keys}</span>
                )}
                <IconButton label={b.stage.download} disabled={!r} onClick={() => r && downloadEvents(r)}>
                  <Download className="size-3.5" aria-hidden />
                </IconButton>
                <IconButton
                  label={b.stage.discard}
                  onClick={() => {
                    sim.clear();
                    setPick({ session: null, dir: 0 });
                  }}
                  className="group/bin hover:border-down hover:text-down"
                >
                  <Trash2 className="size-3.5 transition-transform duration-300 ease-[var(--ease-spring)] group-hover/bin:-rotate-12" aria-hidden />
                </IconButton>
              </div>
            </header>

            <Kpis t={t} lang={lang} points={points} sessions={sessions} capital={capital} result={r} />

            <div className="relative min-h-0 flex-1 p-3 sm:p-4">
              <div key={view} className="h-full animate-[swap-in_0.4s_var(--ease)]">
                {view === "overview" && (
                  <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_minmax(7rem,30%)] gap-3">
                    <Panel
                      title={b.results.chart}
                      icon={ChartLine}
                      actions={
                        <span className="hidden items-center gap-3 text-[10.5px] text-muted-foreground @xl:flex">
                          <span className="flex items-center gap-1.5">
                            <Swatch {...SERIES.ga} /> {b.results.ga}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Swatch {...SERIES.bova} /> BOVA11
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Swatch {...SERIES.cdi} /> {b.results.cdi}
                          </span>
                        </span>
                      }
                    >
                      <NavChart
                        key={r ? "done" : "running"}
                        dates={runDates}
                        points={points}
                        capital={capital}
                        lang={lang}
                        labels={{ ga: b.results.ga, bova: "BOVA11", cdi: b.results.cdi, formation: b.results.formation }}
                        selected={selected}
                        onSelect={select}
                      />
                    </Panel>
                    <Panel
                      title={b.returns}
                      icon={ChartColumn}
                      bodyClassName="pt-8"
                      actions={
                        <p className="hidden max-w-md truncate text-[10.5px] text-muted-foreground @4xl:block" title={b.results.oneSample(runConfig?.sessions ?? SESSIONS)}>
                          {b.results.oneSample(runConfig?.sessions ?? SESSIONS)}
                        </p>
                      }
                    >
                      <ReturnBars
                        points={points}
                        sessions={runConfig?.sessions ?? SESSIONS}
                        lang={lang}
                        labels={{ ga: b.results.ga, bova: "BOVA11", session: b.session.label }}
                        selected={selected}
                        onSelect={open}
                      />
                    </Panel>
                  </div>
                )}
                {view === "session" &&
                  (shown ? (
                    // Not keyed by session: the portfolio's rows slide to their new ranks; the parts that change enter from the side of the move.
                    <div className="h-full" style={{ "--dir": pick.dir } as CSSProperties}>
                      <SessionView s={shown} before={points[shown.session - 1]?.nav ?? capital} t={t} lang={lang} />
                    </div>
                  ) : (
                    <Waiting t={t} />
                  ))}
                {view === "composition" &&
                  (sessions.length ? (
                    <Composition sessions={sessions} dates={runDates.slice(1)} t={t} lang={lang} selected={selected} onOpen={open} />
                  ) : (
                    <Waiting t={t} />
                  ))}
              </div>
            </div>

            <Timeline
              t={t}
              lang={lang}
              dates={runDates.slice(1)}
              points={points}
              selected={selected}
              running={running}
              onSelect={select}
            />
          </>
        )}
      </section>
    </main>
  );
}

function downloadEvents(result: SimResult) {
  const blob = new Blob([JSON.stringify(result.events, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `genwallet-${result.config.formation}-${result.config.seed}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function Waiting({ t }: { t: Dictionary }) {
  return (
    <div className="grid h-full place-items-center text-xs text-muted-foreground">
      <span className="flex items-center gap-2">
        <LoaderCircle className="size-4 animate-spin text-up" aria-hidden />
        {t.builder.stage.running}
      </span>
    </div>
  );
}

/** The run in six numbers, updated as each session closes. */
function Kpis({
  t,
  lang,
  points,
  sessions,
  capital,
  result,
}: {
  t: Dictionary;
  lang: string;
  points: NavPoint[];
  sessions: SessionSummary[];
  capital: number;
  result: SimResult | null;
}) {
  const b = t.builder;
  const last = points[points.length - 1];
  const ret = last && capital ? last.nav / capital - 1 : null;
  const bova = last?.bova && capital ? last.bova / capital - 1 : null;
  const cdi = last && capital ? last.cdi / capital - 1 : null;
  const fees = sessions.reduce((s, x) => s + x.fill.trades.reduce((y, tr) => y + tr.fee, 0), 0);
  const trades = sessions.reduce((s, x) => s + x.fill.trades.length, 0);
  const holds = sessions.filter((s) => s.hold).length;
  const tiles = [
    { name: b.results.ga, value: ret === null ? "–" : percent(ret, lang, 2, true), tone: signClass(ret), strong: true },
    { name: b.results.bova, value: bova === null ? "–" : percent(bova, lang, 2, true), tone: signClass(bova) },
    { name: b.results.cdi, value: cdi === null ? "–" : percent(cdi, lang, 2, true), tone: signClass(cdi) },
    { name: b.tiles.nav, value: last ? money(last.nav, lang) : "–" },
    { name: b.tiles.fees, value: `${money(fees, lang)} · ${trades}`, hint: b.tiles.trades },
    { name: result ? b.tiles.time : b.tiles.holds, value: result ? `${(result.ms / 1000).toLocaleString(lang, { maximumFractionDigits: 1 })} s · ${holds}` : String(holds), hint: result ? b.tiles.holds : undefined },
  ];
  return (
    // The three returns always; the value, the costs and the timing once the stage is wide enough.
    <dl className="grid shrink-0 grid-cols-3 gap-px border-b border-border bg-border @2xl:grid-cols-6">
      {tiles.map((tile, i) => (
        <div
          key={tile.name}
          className={cn(
            "relative min-w-0 bg-background px-3 py-2.5 transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--foreground)_3%,var(--background))] @5xl:px-4",
            i >= 3 && "@max-2xl:hidden",
          )}
        >
          {tile.strong && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-up" />}
          <dt className="flex items-baseline gap-1.5 truncate text-[10.5px] text-muted-foreground">
            {tile.name}
            {tile.hint && <span className="truncate text-[10px] opacity-70">· {tile.hint}</span>}
          </dt>
          <dd key={tile.value} className={cn("mt-0.5 animate-[fade_0.35s_var(--ease)] truncate font-mono tabular-nums", tile.strong ? "text-lg @5xl:text-xl" : "text-sm @5xl:text-base", tile.tone)}>
            {tile.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The ten sessions along the bottom of the stage: a rail that fills green as
 * they close, one stop per session with its date and its return, the
 * picked one raised. Arrows on both ends step through them.
 */
function Timeline({
  t,
  lang,
  dates,
  points,
  selected,
  running,
  onSelect,
}: {
  t: Dictionary;
  lang: string;
  dates: string[];
  points: NavPoint[];
  selected: number | null;
  running: boolean;
  onSelect: (session: number) => void;
}) {
  const v = t.builder.session;
  const done = points.length - 1;
  const n = Math.max(1, dates.length);
  // Many sessions: a date every few stops (and on the picked one), the returns left to the tooltip.
  const every = { wide: n <= 12 ? 1 : Math.ceil(n / 10), narrow: n <= 10 ? 1 : Math.ceil(n / 6) };
  const labelled = (session: number, step: number) =>
    step === 1 || session === selected || ((session - 1) % step === 0 && (!selected || Math.abs(session - selected) >= step / 2));
  return (
    <nav aria-label={v.tabs} className="flex h-14 shrink-0 items-center gap-2 border-t border-border px-3 @2xl:h-[4.5rem] @2xl:px-4">
      <IconButton label={v.prev} disabled={!selected || selected <= 1} onClick={() => selected && onSelect(selected - 1)}>
        <ChevronLeft className="size-4" aria-hidden />
      </IconButton>
      <ol className="relative grid flex-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        <span aria-hidden className="absolute top-[7px] h-px bg-border" style={{ left: `${50 / n}%`, right: `${50 / n}%` }} />
        <span
          aria-hidden
          className="absolute top-[7px] h-px bg-up transition-[width] duration-500 ease-[var(--ease)]"
          style={{ left: `${50 / n}%`, width: `${(Math.max(0, done - 1) / n) * 100}%` }}
        />
        {dates.map((d, i) => {
          const session = i + 1;
          const ready = session <= done;
          const ret = ready ? points[session].nav / points[session - 1].nav - 1 : null;
          const active = selected === session;
          const current = running && session === done + 1;
          return (
            <li key={d} className="flex justify-center">
              <button
                type="button"
                disabled={!ready}
                aria-current={active ? "step" : undefined}
                title={ready ? `${day(d, lang)} · ${percent(ret ?? 0, lang, 2, true)}` : v.pending}
                onClick={() => onSelect(session)}
                className="group/stop flex flex-col items-center gap-1 disabled:cursor-default"
              >
                <span className="relative grid size-[15px] place-items-center">
                  {current && <span className="absolute inset-0 animate-ping bg-up/50" aria-hidden />}
                  <span
                    className={cn(
                      "relative size-[9px] border transition-all duration-300 ease-[var(--ease-spring)]",
                      ready ? "animate-[pop_0.4s_var(--ease-spring)] border-foreground bg-foreground" : "border-border bg-background",
                      active && "size-[15px] border-up bg-up",
                      ready && !active && "group-hover/stop:scale-125 group-hover/stop:border-up",
                    )}
                  />
                </span>
                {/* Narrow, a stop shows its number; wide, its date and its return. */}
                <span className={cn("font-mono text-[10px] leading-none transition-colors duration-200", active ? "text-foreground" : "text-muted-foreground group-hover/stop:text-foreground")}>
                  <span className={cn("@2xl:hidden", !labelled(session, every.narrow) && "invisible")}>{session}</span>
                  <span className={cn("hidden @2xl:inline", !labelled(session, every.wide) && "invisible")}>{shortDay(d, lang)}</span>
                </span>
                {n <= 12 && (
                  <span className={cn("hidden h-3 font-mono text-[10px] leading-none tabular-nums @2xl:block", ret === null ? "text-transparent" : signClass(ret))}>
                    {ret === null ? "·" : percent(ret, lang, 1, true)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <IconButton label={v.next} disabled={!selected || selected >= done} onClick={() => selected && onSelect(selected + 1)}>
        <ChevronRight className="size-4" aria-hidden />
      </IconButton>
    </nav>
  );
}

/**
 * Before the first run: the landscape behind, and a card that says what will
 * happen in three steps and shows the sessions as dots on a line.
 */
function EmptyStage({
  t,
  lang,
  dataLine,
  formation,
  sessionWindow,
  loading,
  error,
}: {
  t: Dictionary;
  lang: string;
  dataLine: string;
  formation: string;
  sessionWindow: string[];
  loading: boolean;
  error: string | null;
}) {
  const b = t.builder;
  const st = b.stage.steps;
  const n = sessionWindow.length;
  const steps = [
    { icon: Dna, verb: st.form.verb, value: st.form.value(TUNED.params.k) },
    { icon: CalendarDays, verb: st.operate.verb, value: st.operate.value(n || SESSIONS) },
    { icon: ChartLine, verb: st.compare.verb, value: st.compare.value },
  ];
  return (
    <div className="relative h-full overflow-hidden">
      <TerrainField className="pointer-events-none absolute inset-0 overflow-hidden opacity-80" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--background)_82%,transparent)_0%,color-mix(in_srgb,var(--background)_45%,transparent)_55%,transparent_100%)]"
      />
      <div className="relative grid h-full place-items-center overflow-y-auto p-4 sm:p-8">
        <div className="w-full max-w-lg animate-[rise_0.6s_var(--ease)] border border-border bg-[color-mix(in_srgb,var(--background)_88%,transparent)] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.6)] backdrop-blur-md sm:p-8">
          <p className={label}>{b.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight">{b.title(n || SESSIONS)}</h1>

          {/* What a run does, in three steps. */}
          <ol className="mt-6 grid grid-cols-3 gap-px border border-border bg-border">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.verb}
                  className="group/step flex animate-[fade_0.5s_var(--ease)_both] flex-col gap-2.5 bg-background px-3 py-3.5 transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--foreground)_3%,var(--background))]"
                  style={{ animationDelay: `${120 + i * 90}ms` }}
                >
                  <span className="grid size-8 place-items-center border border-border text-muted-foreground transition-all duration-300 ease-[var(--ease-spring)] group-hover/step:scale-110 group-hover/step:border-up group-hover/step:text-up">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-[11px] text-muted-foreground">{step.verb}</span>
                    <span key={step.value} className="block animate-[fade_0.35s_var(--ease)] font-mono text-[13px] sm:text-sm">
                      {step.value}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>

          {error ? (
            <p className="mt-6 flex items-center gap-2 text-sm text-down">
              <TriangleAlert className="size-4" aria-hidden />
              {b.error(error)}
            </p>
          ) : loading ? (
            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin text-up" aria-hidden />
              {b.loading}
            </p>
          ) : (
            <>
              {/* The formation and its sessions as dots on a line. */}
              <div key={`${formation}-${n}`} className="mt-6">
                <div className="flex justify-between font-mono text-[10.5px] text-muted-foreground">
                  <span>
                    <span className="text-up">{b.results.formation}</span> {shortDay(formation, lang)}
                  </span>
                  {n > 0 && <span>{shortDay(sessionWindow[n - 1], lang)}</span>}
                </div>
                <ol className="relative mt-2 flex h-3 items-center justify-between">
                  <span aria-hidden className="absolute inset-x-0 top-1/2 h-px origin-left animate-[grow_0.8s_var(--ease)_both] bg-border" />
                  <li title={`${b.results.formation} · ${day(formation, lang)}`} className="relative size-3 animate-[pop_0.4s_var(--ease-spring)_both] border border-up bg-up" />
                  {sessionWindow.map((d, i) => (
                    <li
                      key={d}
                      title={`${i + 1} · ${day(d, lang)}`}
                      className="relative size-2 animate-[pop_0.4s_var(--ease-spring)_both] border border-foreground/50 bg-background transition-transform duration-200 hover:scale-150 hover:border-up"
                      style={{ animationDelay: `${80 + (i * 500) / Math.max(1, n)}ms` }}
                    />
                  ))}
                </ol>
              </div>
            </>
          )}

          {dataLine && (
            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
              <Database className="size-3 shrink-0" aria-hidden />
              {dataLine}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** The sidebar's width in pixels: the default, its bounds, and where a viewer last left it. */
const SIDEBAR = { initial: 352, min: 288, max: 576, key: "genwallet.sidebar" };

const clampWidth = (w: number) => Math.round(Math.min(SIDEBAR.max, Math.max(SIDEBAR.min, w)));

/** The sidebar's width, remembered in this browser (a convenience: without storage it starts at the default). */
function useSidebarWidth(): [number, (w: number) => void] {
  const [width, setWidth] = useKept("builder.sidebar", SIDEBAR.initial);
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(SIDEBAR.key));
      if (saved) setWidth(clampWidth(saved));
    } catch {}
  }, [setWidth]);
  const set = useCallback(
    (w: number) => {
      const next = clampWidth(w);
      setWidth(next);
      try {
        localStorage.setItem(SIDEBAR.key, String(next));
      } catch {}
    },
    [setWidth],
  );
  return [width, set];
}

/**
 * The handle on the sidebar's right edge: drag it to resize, arrows step it,
 * a double click puts the default back. A green line shows under the pointer.
 */
function Resizer({ width, onChange, label: text }: { width: number; onChange: (w: number) => void; label: string }) {
  const [dragging, setDragging] = useState(false);
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const start = { x: event.clientX, width };
    setDragging(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const move = (e: PointerEvent) => onChange(start.width + e.clientX - start.x);
    const up = () => {
      setDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  };
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={text}
      aria-valuenow={width}
      aria-valuemin={SIDEBAR.min}
      aria-valuemax={SIDEBAR.max}
      tabIndex={0}
      title={text}
      onPointerDown={onPointerDown}
      onDoubleClick={() => onChange(SIDEBAR.initial)}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        onChange(width + (event.key === "ArrowRight" ? 16 : -16));
      }}
      className="group/resize absolute inset-y-0 -right-1.5 z-30 hidden w-3 cursor-col-resize touch-none outline-none lg:block"
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-up transition-opacity duration-200",
          dragging ? "opacity-100" : "opacity-0 group-hover/resize:opacity-70 group-focus-visible/resize:opacity-100",
        )}
      />
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 left-1/2 grid h-8 w-2 -translate-1/2 place-items-center border border-border bg-background transition-opacity duration-200",
          dragging ? "opacity-100" : "opacity-0 group-hover/resize:opacity-100 group-focus-visible/resize:opacity-100",
        )}
      >
        <span className="h-3 w-px bg-muted-foreground" />
      </span>
    </div>
  );
}
