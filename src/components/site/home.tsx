"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/LocaleProvider";
import { DEFAULT_PARAMS } from "@/lib/ga/params";
import { sessionsAfter } from "@/lib/live/calendar";
import { FORMATION_DATE, LIVE_CONFIG } from "@/lib/live/config";
import { BRAND } from "@/lib/brand";
import { TerrainField, type TerrainStatus } from "@/components/terrain/terrain-canvas";
import { Logo } from "./logo";
import { LocaleSwitch, ThemeSwitch } from "./switches";

// Every number on the landing page comes from the engine's configuration.
const SESSIONS = sessionsAfter(FORMATION_DATE, LIVE_CONFIG.sessions);

function shortDate(date: string, lang: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(lang, { day: "numeric", month: "short", timeZone: "UTC" });
}

export function Home() {
  const t = useT();
  const [status, setStatus] = useState<TerrainStatus>({ session: 0, generation: 0 });
  const facts = [
    { value: DEFAULT_PARAMS.k, label: t.home.facts.companies },
    {
      value: LIVE_CONFIG.sessions,
      label: t.home.facts.sessions(shortDate(SESSIONS[0], t.lang), shortDate(SESSIONS[SESSIONS.length - 1], t.lang)),
    },
    { value: DEFAULT_PARAMS.populationSize, label: t.home.facts.population },
  ];

  return (
    <>
      <TerrainField onStatus={setStatus} />

      <header className="fixed inset-x-0 top-0 z-10 flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="size-8" />
          <span className="font-medium tracking-tight">{BRAND.name}</span>
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={BRAND.repo}
            className="hidden h-8 items-center border border-border bg-panel px-3 text-xs text-muted-foreground transition-colors hover:text-foreground sm:flex"
          >
            {t.common.source}
          </a>
          <LocaleSwitch />
          <ThemeSwitch />
        </div>
      </header>

      <main className="flex items-center px-4 pt-20 pb-8 sm:min-h-svh sm:px-6 sm:py-24">
        <div className="w-full max-w-xl border border-border bg-panel p-6 backdrop-blur-[2px] sm:ml-[4vw] sm:p-9">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{t.home.eyebrow}</p>
          <h1 className="mt-4 text-5xl font-medium tracking-tight sm:text-6xl">{BRAND.name}</h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t.home.tagline(DEFAULT_PARAMS.k, LIVE_CONFIG.sessions)}
          </p>
          <dl className="mt-8 grid gap-5 border-t border-border pt-6 sm:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="font-mono text-3xl tabular-nums">{fact.value}</dt>
                <dd className="mt-2 text-xs leading-snug text-muted-foreground">{fact.label}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <a href={BRAND.record} className="border border-up px-4 py-2 text-up transition-colors hover:bg-up hover:text-background">
              {t.common.record}
            </a>
            <a href={BRAND.repo} className="border border-border px-4 py-2 text-muted-foreground transition-colors hover:text-foreground">
              {t.common.source}
            </a>
          </div>
        </div>
      </main>

      <footer className="pointer-events-none flex flex-col gap-2 px-4 pb-4 sm:fixed sm:inset-x-0 sm:bottom-0 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          {t.home.background}{" "}
          <span className="font-mono text-foreground">{t.home.counter(status.session + 1, status.generation)}</span>
        </p>
        <p className="text-xs text-muted-foreground">{t.home.paper}</p>
      </footer>
    </>
  );
}
