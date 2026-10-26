"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChartLine, ChevronDown, Dices, Dna, EyeOff, GitCommitHorizontal, Receipt, RotateCcw, Sunrise, Sunset } from "lucide-react";
import { siGithubactions, siNextdotjs, siTypescript, siVercel, siWebgpu } from "simple-icons";
import { TerrainField, type TerrainStatus } from "@/components/terrain/terrain-canvas";
import { useT } from "@/i18n/LocaleProvider";
import { BRAND } from "@/lib/brand";
import { DEFAULT_PARAMS } from "@/lib/ga/params";
import { sessionsAfter } from "@/lib/live/calendar";
import { FORMATION_DATE, LIVE_CONFIG } from "@/lib/live/config";
import { BrandIcon } from "./brand-icon";
import { GenomeFigure, OperatorsFigure } from "./figures";
import { Reveal } from "./reveal";

// Every number on the landing page comes from the engine's configuration.
const SESSIONS = sessionsAfter(FORMATION_DATE, LIVE_CONFIG.sessions);

const STACK = [
  { icon: siTypescript, label: "TypeScript", href: "https://www.typescriptlang.org" },
  { icon: siNextdotjs, label: "Next.js", href: "https://nextjs.org" },
  { icon: siWebgpu, label: "WebGPU · vgpu", href: "https://vgpu.sh" },
  { icon: siGithubactions, label: "GitHub Actions", href: "https://github.com/features/actions" },
  { icon: siVercel, label: "Vercel", href: "https://vercel.com" },
];

const STEP_ICONS = [Sunset, Dna, GitCommitHorizontal, Sunrise, ChartLine];
const HONESTY_ICONS = [EyeOff, RotateCcw, Dices, Receipt];

function shortDate(date: string, lang: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(lang, { day: "numeric", month: "short", timeZone: "UTC" });
}

export function Home() {
  const t = useT();
  const [status, setStatus] = useState<TerrainStatus>({ session: 0, generation: 0 });
  const { k, populationSize, lookback, immigrantRate } = DEFAULT_PARAMS;

  const facts = [
    { value: k, label: t.what.facts.companies },
    {
      value: LIVE_CONFIG.sessions,
      label: t.what.facts.sessions(shortDate(SESSIONS[0], t.lang), shortDate(SESSIONS[SESSIONS.length - 1], t.lang)),
    },
    { value: populationSize, label: t.what.facts.population },
    { value: LIVE_CONFIG.formationGenerations, label: t.what.facts.generations(LIVE_CONFIG.dailyGenerations) },
  ];
  const { close, evolve, commit, open, mark } = t.session.steps;
  const steps = [
    { title: close.title, body: close.body(lookback) },
    { title: evolve.title, body: evolve.body(LIVE_CONFIG.dailyGenerations, Math.round(immigrantRate * 100)) },
    commit,
    open,
    mark,
  ];

  return (
    <main className="page">
      {/* One viewport: the GA on its landscape behind, the name and the brief over it. */}
      <section className="relative flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden border-b border-border">
        <TerrainField onStatus={setStatus} />
        {/* A veil behind the words, so the map never cuts a letter: wide on a phone, the left half on a desk. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_srgb,var(--background)_88%,transparent)_0%,color-mix(in_srgb,var(--background)_55%,transparent)_70%,transparent_100%)] sm:bg-[linear-gradient(to_right,color-mix(in_srgb,var(--background)_70%,transparent)_0%,color-mix(in_srgb,var(--background)_30%,transparent)_45%,transparent_60%)]"
        />
        <div className="relative mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-16 sm:px-6">
          <div className="max-w-xl">
            <p className="eyebrow animate-[rise_0.6s_var(--ease)_0.05s_backwards]">{t.hero.eyebrow}</p>
            <h1 className="mt-5 animate-[rise_0.7s_var(--ease)_0.12s_backwards] text-6xl font-medium tracking-tight sm:text-7xl">
              {BRAND.name}
            </h1>
            <p className="mt-5 animate-[rise_0.7s_var(--ease)_0.2s_backwards] text-lg leading-relaxed text-muted-foreground [text-shadow:0_0_18px_var(--background)]">
              {t.hero.brief(k, LIVE_CONFIG.sessions)}
            </p>
            <div className="mt-8 flex animate-[rise_0.7s_var(--ease)_0.28s_backwards] flex-wrap gap-3">
              <Link href="/montar" className="btn btn-primary">
                {t.hero.build}
                <ArrowRight className="btn-arrow size-4" aria-hidden />
              </Link>
              <a href={BRAND.record} target="_blank" rel="noreferrer" className="btn btn-secondary">
                {t.common.record}
              </a>
            </div>
            <ul className="mt-9 flex animate-[rise_0.7s_var(--ease)_0.36s_backwards] flex-wrap gap-2">
              {STACK.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-8 items-center gap-2 border border-border bg-panel px-2.5 text-xs text-muted-foreground transition-all duration-200 hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--foreground)_35%,var(--border))] hover:text-foreground"
                  >
                    <BrandIcon icon={item.icon} size={13} />
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-6 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <p className="pointer-events-none max-w-md text-xs leading-relaxed text-muted-foreground">
            {t.hero.background} <span className="font-mono text-foreground">{t.hero.counter(status.session + 1, status.generation)}</span>
          </p>
          <a href="#como-funciona" className="group flex items-center gap-2 self-center text-xs text-muted-foreground transition-colors hover:text-foreground sm:self-end">
            {t.hero.discover}
            <ChevronDown className="size-4 animate-[nudge_1.8s_var(--ease)_infinite]" aria-hidden />
          </a>
        </div>
      </section>

      {/* What it is: the words and the facts, then the chromosome. */}
      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
        <Reveal as="h2" className="section-title">
          {t.what.title}
          <span className="text-up">.</span>
        </Reveal>
        <Reveal as="p" className="section-lead" delay={0.1}>
          {t.what.lead}
        </Reveal>
        <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-border pt-6 md:grid-cols-4">
          {facts.map((fact, i) => (
            <Reveal key={fact.label} delay={0.15 + i * 0.07}>
              <dt className="font-mono text-4xl tabular-nums">{fact.value}</dt>
              <dd className="mt-2 text-sm leading-snug text-muted-foreground">{fact.label}</dd>
            </Reveal>
          ))}
        </dl>
        <Reveal className="mt-12" delay={0.2}>
          <GenomeFigure />
        </Reveal>
      </section>

      {/* The operators. */}
      <section className="border-y border-border bg-[color-mix(in_srgb,var(--foreground)_2.5%,var(--background))]">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <Reveal as="h2" className="section-title">
            {t.operators.title}
            <span className="text-up">.</span>
          </Reveal>
          <Reveal as="p" className="section-lead" delay={0.1}>
            {t.operators.lead}
          </Reveal>
          <Reveal className="mt-10" delay={0.2}>
            <OperatorsFigure />
          </Reveal>
        </div>
      </section>

      {/* One session: a line of five stops, the population carried along it. */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <Reveal as="h2" className="section-title">
          {t.session.title}
          <span className="text-up">.</span>
        </Reveal>
        <Reveal as="p" className="section-lead" delay={0.1}>
          {t.session.lead}
        </Reveal>
        <ol className="relative mt-12 grid gap-8 md:grid-cols-5 md:gap-6">
          <span aria-hidden className="absolute top-5 right-0 left-0 hidden h-px bg-border md:block" />
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <Reveal key={step.title} as="li" delay={0.15 + i * 0.1} className="group relative flex gap-4 md:flex-col">
                <span className="relative grid size-10 shrink-0 place-items-center border border-border bg-background text-muted-foreground transition-all duration-300 ease-[var(--ease-spring)] group-hover:scale-110 group-hover:border-up group-hover:text-up">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div>
                  <h3 className="font-medium">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </Reveal>
            );
          })}
        </ol>
      </section>

      {/* Built to be checked, and the way into the builder. */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <Reveal as="h2" className="section-title">
            {t.honesty.title}
            <span className="text-up">.</span>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.honesty.items.map((item, i) => {
              const Icon = HONESTY_ICONS[i];
              return (
                <Reveal key={item.title} delay={0.1 + i * 0.08} className="group relative border border-border bg-panel p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--up)_50%,var(--border))]">
                  {["-top-1 -left-1", "-top-1 -right-1", "-bottom-1 -left-1", "-bottom-1 -right-1"].map((corner) => (
                    <span key={corner} aria-hidden className={`absolute ${corner} size-2 border border-border bg-background transition-colors duration-300 group-hover:border-up group-hover:bg-up`} />
                  ))}
                  <Icon className="size-5 text-muted-foreground transition-colors duration-300 group-hover:text-up" aria-hidden />
                  <h3 className="mt-4 font-medium">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </Reveal>
              );
            })}
          </div>
          <Reveal delay={0.2} className="mt-16 flex flex-col items-start justify-between gap-6 border border-border bg-panel p-8 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-2xl font-medium tracking-tight">{t.honesty.cta.title}</h3>
              <p className="mt-2 max-w-xl text-muted-foreground">{t.honesty.cta.body}</p>
            </div>
            <Link href="/montar" className="btn btn-primary shrink-0">
              {t.nav.builder}
              <ArrowRight className="btn-arrow size-4" aria-hidden />
            </Link>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
