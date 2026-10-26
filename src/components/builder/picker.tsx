"use client";

import { ArrowDown, ArrowUp, Check, Dices, Eraser, ListChecks, Search, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import type { Dictionary } from "@/i18n";
import { cn } from "@/lib/utils";
import { percent } from "./format";
import { IconButton, input, label } from "./ui";
import { tickerStats, type MarketView, type Refusal, type TickerStats } from "./universe";
import { useKept } from "./use-simulator";

type SortKey = "ticker" | "sector" | "ret" | "vol" | "traded";

interface Entry {
  ticker: string;
  company: string;
  sector: string;
  stats: TickerStats;
  refusal: Refusal | undefined;
}

/** Closes over the lookback as a small line, green if it ended up, red if down. */
function Sparkline({ series }: { series: number[] }) {
  if (series.length < 2) return <span className="block h-5 w-16" />;
  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const w = 64;
  const h = 20;
  const step = Math.max(1, Math.floor(series.length / 64));
  const points: string[] = [];
  for (let i = 0; i < series.length; i += step) points.push(`${((i / (series.length - 1)) * w).toFixed(1)},${(h - 2 - ((series[i] - lo) / (hi - lo || 1)) * (h - 4)).toFixed(1)}`);
  points.push(`${w},${(h - 2 - ((series[series.length - 1] - lo) / (hi - lo || 1)) * (h - 4)).toFixed(1)}`);
  const up = series[series.length - 1] >= series[0];
  return (
    <svg width={w} height={h} aria-hidden className="shrink-0">
      <polyline points={points.join(" ")} fill="none" className={up ? "stroke-up" : "stroke-down"} strokeWidth={1.25} strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The company picker, over the stage: ten slots on top that fill as the
 * visitor picks, and the whole universe below, searchable, filtered by
 * sector and sorted by any column, each with its year in a sparkline. A
 * ticker the window cannot operate, or a second share class of a company
 * already in, cannot be picked; the reason is on the row.
 */
export function Picker({
  market,
  dates,
  formation,
  lookback,
  refused,
  picks,
  onChange,
  onClose,
  t,
  lang,
}: {
  market: MarketView;
  dates: string[];
  formation: string;
  lookback: number;
  refused: Map<string, Refusal>;
  picks: string[];
  onChange: (picks: string[]) => void;
  onClose: () => void;
  t: Dictionary;
  lang: string;
}) {
  const p = t.builder.picker;
  const k = 10;
  const [query, setQuery] = useKept("builder.picker.query", "");
  const [sector, setSector] = useKept<string | null>("builder.picker.sector", null);
  const [sort, setSort] = useKept<{ key: SortKey; dir: 1 | -1 }>("builder.picker.sort", { key: "traded", dir: -1 });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const day = dates.indexOf(formation);
  const entries: Entry[] = useMemo(
    () =>
      market.universe.map((u, a) => ({
        ...u,
        stats: tickerStats(market, a, Math.max(0, day), lookback),
        refusal: refused.get(u.ticker),
      })),
    [market, day, lookback, refused],
  );
  const byTicker = useMemo(() => new Map(entries.map((e) => [e.ticker, e])), [entries]);
  const sectors = useMemo(() => {
    const count = new Map<string, number>();
    for (const e of entries) count.set(e.sector, (count.get(e.sector) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [entries]);

  // One ticker per company: a second share class is blocked by the first.
  const sibling = (e: Entry) => picks.find((x) => x !== e.ticker && byTicker.get(x)?.company === e.company);
  const blocked = (e: Entry) => !picks.includes(e.ticker) && (!!e.refusal || !!sibling(e) || picks.length >= k);

  const toggle = (e: Entry) => {
    if (picks.includes(e.ticker)) onChange(picks.filter((x) => x !== e.ticker));
    else if (!blocked(e)) onChange([...picks, e.ticker]);
  };

  // Fills the free slots with tickers the run accepts, one per company.
  const drawRest = () => {
    const next = [...picks];
    const pool = entries.filter((e) => !e.refusal && !next.includes(e.ticker));
    const random = crypto.getRandomValues(new Uint32Array(pool.length));
    while (next.length < k && pool.length) {
      const [e] = pool.splice(random[pool.length - 1] % pool.length, 1);
      if (!next.some((x) => byTicker.get(x)?.company === e.company)) next.push(e.ticker);
    }
    onChange(next);
  };

  const q = query.trim().toLowerCase();
  const rows = entries
    .filter((e) => (!sector || e.sector === sector) && (!q || `${e.ticker} ${e.company} ${e.sector}`.toLowerCase().includes(q)))
    .sort((a, b) => {
      const value = (e: Entry) => (sort.key === "ticker" ? e.ticker : sort.key === "sector" ? e.sector : (e.stats[sort.key] ?? -Infinity));
      const [x, y] = [value(a), value(b)];
      const order = typeof x === "string" ? x.localeCompare(y as string) : (x as number) - (y as number);
      return order * sort.dir || a.ticker.localeCompare(b.ticker);
    });

  const compact = new Intl.NumberFormat(lang, { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 0 });
  const columns: { key: SortKey; name: string; className: string }[] = [
    { key: "ticker", name: p.ticker, className: "text-left" },
    { key: "sector", name: p.sector, className: "text-left @max-3xl:hidden" },
    { key: "ret", name: p.ret, className: "text-right" },
    { key: "vol", name: p.vol, className: "text-right @max-xl:hidden" },
    { key: "traded", name: p.traded, className: "text-right @max-2xl:hidden" },
  ];
  const grid = "grid grid-cols-[1.75rem_minmax(0,1fr)_4.5rem] items-center gap-x-3 @xl:grid-cols-[1.75rem_minmax(0,1fr)_4.5rem_4.5rem] @2xl:grid-cols-[1.75rem_minmax(0,1fr)_7.5rem_5rem_5rem] @3xl:grid-cols-[1.75rem_minmax(0,1.3fr)_minmax(0,1fr)_7.5rem_5rem_5rem]";

  return (
    <div className="absolute inset-0 z-10 flex animate-[swap-in_0.4s_var(--ease)] flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-3 sm:px-4">
        <span className="grid size-7 place-items-center border border-up text-up">
          <ListChecks className="size-3.5" aria-hidden />
        </span>
        <h2 className="min-w-0 truncate text-sm font-medium">{p.title(k)}</h2>
        <span className={cn("shrink-0 font-mono text-[11px] whitespace-nowrap tabular-nums", picks.length === k ? "text-up" : "text-muted-foreground")}>
          {t.builder.fields.picks.count(picks.length, k)}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <IconButton label={p.random} disabled={picks.length >= k} onClick={drawRest} className="group/dice">
            <Dices className="size-3.5 transition-transform duration-500 ease-[var(--ease-spring)] group-hover/dice:rotate-180" aria-hidden />
          </IconButton>
          <IconButton label={p.clear} disabled={!picks.length} onClick={() => onChange([])} className="hover:border-down hover:text-down">
            <Eraser className="size-3.5" aria-hidden />
          </IconButton>
          <button type="button" className="btn btn-primary h-8 px-3 text-xs" onClick={onClose}>
            <Check className="size-3.5" aria-hidden />
            {p.done}
          </button>
        </div>
      </header>

      {/* The ten slots, filling in the order of the picks. */}
      <div className="shrink-0 border-b border-border px-3 py-3 sm:px-4">
        <div className="relative mb-3 h-0.5 bg-border">
          <span className="absolute inset-y-0 left-0 bg-up transition-[width] duration-500 ease-[var(--ease)]" style={{ width: `${(picks.length / k) * 100}%` }} />
        </div>
        <ol className="grid grid-cols-5 gap-1.5 @3xl:grid-cols-10">
          {Array.from({ length: k }, (_, i) => {
            const e = picks[i] ? byTicker.get(picks[i]) : undefined;
            return (
              <li key={picks[i] ?? `empty-${i}`} className={cn(e && "animate-[pop_0.35s_var(--ease-spring)]")}>
                {e ? (
                  <button
                    type="button"
                    onClick={() => toggle(e)}
                    title={t.builder.fields.picks.remove(e.ticker)}
                    className={cn(
                      "group/slot relative flex h-11 w-full min-w-0 flex-col justify-center border bg-panel px-2 text-left transition-colors duration-200 hover:border-down",
                      e.refusal ? "border-down" : "border-border",
                    )}
                  >
                    <span className={cn("font-mono text-xs", e.refusal && "text-down")}>{e.ticker}</span>
                    <span className="truncate text-[10px] text-muted-foreground">{e.company}</span>
                    <X className="absolute top-1 right-1 size-3 text-down opacity-0 transition-opacity duration-200 group-hover/slot:opacity-100" aria-hidden />
                  </button>
                ) : (
                  <span className="grid h-11 place-items-center border border-dashed border-border font-mono text-[10px] text-muted-foreground/60">{i + 1}</span>
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-2.5 text-[11px] leading-snug text-muted-foreground">
          {p.lead} {p.sectorNote}
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-b border-border px-3 py-2.5 sm:px-4 @3xl:flex-row @3xl:items-center">
        <label className="relative block shrink-0 @3xl:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input type="search" aria-label={p.search} placeholder={p.search} className={cn(input, "pl-8 font-sans")} value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="scroll-none flex min-w-0 gap-1 overflow-x-auto [mask-image:linear-gradient(to_right,black_92%,transparent)] pr-6">
          {[[null, entries.length] as const, ...sectors].map(([name, count]) => (
            <button
              key={name ?? "all"}
              type="button"
              aria-pressed={sector === name}
              onClick={() => setSector(name)}
              className="flex h-7 shrink-0 items-center gap-1.5 border border-border px-2.5 text-[11px] whitespace-nowrap text-muted-foreground transition-colors duration-200 hover:border-muted-foreground hover:text-foreground aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
            >
              {name ?? p.all}
              <span className="font-mono text-[10px] opacity-60">{count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-thin min-h-0 flex-1">
        <div role="row" className={cn(grid, "sticky top-0 z-10 h-9 border-b border-border bg-background px-3 sm:px-4")}>
          <span />
          {columns.map((c) => {
            const active = sort.key === c.key;
            const Arrow = sort.dir === 1 ? ArrowUp : ArrowDown;
            return (
              <button
                key={c.key}
                type="button"
                aria-label={p.sort(c.name)}
                onClick={() => setSort({ key: c.key, dir: active ? (-sort.dir as 1 | -1) : c.key === "ticker" || c.key === "sector" ? 1 : -1 })}
                className={cn(label, c.className, "flex items-center gap-1 whitespace-nowrap transition-colors duration-200 hover:text-foreground", c.className.includes("text-right") && "justify-end", active && "text-foreground")}
              >
                {c.name}
                <Arrow className={cn("size-3 transition-opacity", active ? "opacity-100" : "opacity-0")} aria-hidden />
              </button>
            );
          })}
        </div>
        {rows.length ? (
          <ul>
            {rows.map((e) => {
              const chosen = picks.includes(e.ticker);
              const off = blocked(e);
              const twin = sibling(e);
              // A refusal or a twin is said on the row; a full portfolio only in the tooltip.
              const reason = e.refusal ? p.refused[e.refusal] : twin ? p.sibling(twin) : undefined;
              const why = reason ?? (picks.length >= k && !chosen ? p.full : undefined);
              return (
                <li key={e.ticker}>
                  <button
                    type="button"
                    aria-pressed={chosen}
                    aria-disabled={off}
                    title={why}
                    onClick={() => toggle(e)}
                    className={cn(
                      grid,
                      "group/pick relative h-12 w-full border-b border-border px-3 text-left transition-colors duration-200 sm:px-4",
                      chosen ? "bg-[color-mix(in_srgb,var(--up)_8%,transparent)]" : off ? "cursor-not-allowed" : "hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]",
                    )}
                  >
                    <span aria-hidden className={cn("absolute inset-y-0 left-0 w-0.5 bg-up transition-transform duration-300 ease-[var(--ease)]", chosen ? "scale-y-100" : "scale-y-0")} />
                    <span
                      className={cn(
                        "grid size-4 place-items-center border transition-all duration-200",
                        chosen ? "border-up bg-up text-background" : off ? "border-border opacity-40" : "border-muted-foreground/60 group-hover/pick:border-up",
                      )}
                    >
                      {chosen && <Check className="size-3 animate-[pop_0.3s_var(--ease-spring)]" strokeWidth={3} aria-hidden />}
                    </span>
                    <span className={cn("flex min-w-0 items-center gap-3", off && "opacity-45")}>
                      <span className="w-14 shrink-0 font-mono text-xs">{e.ticker}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs">{e.company}</span>
                        <span className={cn("block truncate text-[10.5px]", reason ? "text-down" : "text-muted-foreground @3xl:hidden")}>{reason ?? e.sector}</span>
                      </span>
                    </span>
                    <span className={cn("truncate text-[11px] text-muted-foreground @max-3xl:hidden", off && "opacity-45")}>{e.sector}</span>
                    <span className={cn("flex items-center justify-end gap-2 font-mono text-xs tabular-nums", off && "opacity-45")}>
                      <span className="@max-2xl:hidden">
                        <Sparkline series={e.stats.series} />
                      </span>
                      <span className={e.stats.ret === null ? "text-muted-foreground" : e.stats.ret >= 0 ? "text-up" : "text-down"}>
                        {e.stats.ret === null ? "–" : percent(e.stats.ret, lang, 0, true)}
                      </span>
                    </span>
                    <span className={cn("text-right font-mono text-xs tabular-nums text-muted-foreground @max-xl:hidden", off && "opacity-45")}>
                      {e.stats.vol === null ? "–" : percent(e.stats.vol, lang, 0)}
                    </span>
                    <span className={cn("text-right font-mono text-xs tabular-nums text-muted-foreground @max-2xl:hidden", off && "opacity-45")}>
                      {compact.format(e.stats.traded)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="p-6 text-center text-xs text-muted-foreground">{p.empty}</p>
        )}
        <p className="px-3 py-3 text-[11px] text-muted-foreground sm:px-4">{p.window(lookback)}</p>
      </div>
    </div>
  );
}
