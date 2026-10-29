"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown, Dices, EyeOff, Receipt, RotateCcw } from "lucide-react";
import { siGithubactions, siNextdotjs, siRust, siTypescript, siVercel, siWebassembly, siWebgpu } from "simple-icons";
import { TerrainField } from "@/components/terrain/terrain-canvas";
import { useT } from "@/i18n/LocaleProvider";
import { BRAND } from "@/lib/brand";
import { DEFAULT_PARAMS } from "@/lib/ga/params";
import { sessionsAfter } from "@/lib/live/calendar";
import { FORMATION_DATE, LIVE_CONFIG } from "@/lib/live/config";
import { BrandIcon } from "./brand-icon";
import { GenePool } from "./gene-pool";
import { Helix } from "./helix";
import { Lab } from "./lab";
import { Reveal } from "./reveal";

// Every number on the landing page comes from the engine's configuration.
const SESSIONS = sessionsAfter(FORMATION_DATE, LIVE_CONFIG.sessions);

const STACK = [
  { icon: siRust, label: "Rust", href: "https://www.rust-lang.org" },
  { icon: siWebassembly, label: "WebAssembly", href: "https://webassembly.org" },
  { icon: siTypescript, label: "TypeScript", href: "https://www.typescriptlang.org" },
  { icon: siNextdotjs, label: "Next.js", href: "https://nextjs.org" },
  { icon: siWebgpu, label: "WebGPU · vgpu", href: "https://vgpu.sh" },
  { icon: siGithubactions, label: "GitHub Actions", href: "https://github.com/features/actions" },
  { icon: siVercel, label: "Vercel", href: "https://vercel.com" },
];

const HONESTY_ICONS = [EyeOff, RotateCcw, Dices, Receipt];

function shortDate(date: string, lang: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(lang, { day: "numeric", month: "short", timeZone: "UTC" });
}

export function Home() {
  const t = useT();
  const { k, populationSize } = DEFAULT_PARAMS;

  const facts = [
    { value: k, label: t.what.facts.companies },
    {
      value: LIVE_CONFIG.sessions,
      label: t.what.facts.sessions(shortDate(SESSIONS[0], t.lang), shortDate(SESSIONS[SESSIONS.length - 1], t.lang)),
    },
    { value: populationSize, label: t.what.facts.population },
    { value: LIVE_CONFIG.formationGenerations, label: t.what.facts.generations(LIVE_CONFIG.dailyGenerations) },
  ];
  return (
    <main className="page">
      {/* One viewport: the GA on its landscape behind, the name and the brief over it. */}
      <section className="relative flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden border-b border-border">
        <TerrainField />
        {/* A veil behind the words, so the map never cuts a letter: wide on a phone, the left half on a desk. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_srgb,var(--background)_88%,transparent)_0%,color-mix(in_srgb,var(--background)_55%,transparent)_70%,transparent_100%)] sm:bg-[linear-gradient(to_right,color-mix(in_srgb,var(--background)_70%,transparent)_0%,color-mix(in_srgb,var(--background)_30%,transparent)_45%,transparent_60%)]"
        />
        <div className="relative mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-16 sm:px-6">
          <div className="max-w-xl">
            <p className="eyebrow animate-[rise_0.6s_var(--ease)_0.05s_backwards]">{t.hero.eyebrow}</p>
            <h1 className="mt-5 animate-[rise_0.7s_var(--ease)_0.12s_backwards] text-6xl font-medium tracking-tight sm:text-7xl">
              {/* From the red of the pits to the green of the peaks, as the landscape behind it runs. */}
              <span className="text-down">Gen</span>
              <span className="text-up">Wallet</span>
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
        <div className="relative mx-auto flex w-full max-w-6xl justify-center px-4 pb-6 sm:px-6">
          <a href="#como-funciona" className="group flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
            {t.hero.discover}
            <ChevronDown className="size-4 animate-[nudge_1.8s_var(--ease)_infinite]" aria-hidden />
          </a>
        </div>
      </section>

      {/* How it works, on a plain ground: the words and the facts on the
          left, the algorithm in three tabs on the right. */}
      <section
        id="como-funciona"
        className="relative flex min-h-[calc(100svh-4rem)] scroll-mt-16 items-center border-b border-border bg-[color-mix(in_srgb,var(--foreground)_2.5%,var(--background))]"
      >
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <Reveal as="h2" className="section-title">
              {t.what.title}
              <span className="text-up">.</span>
            </Reveal>
            <Reveal as="p" className="section-lead" delay={0.1}>
              {t.what.lead}
            </Reveal>
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-border pt-6">
              {facts.map((fact, i) => (
                <Reveal key={fact.label} delay={0.15 + i * 0.07}>
                  <dt className="font-mono text-4xl tabular-nums">{fact.value}</dt>
                  <dd className="mt-2 text-sm leading-snug text-muted-foreground">{fact.label}</dd>
                </Reveal>
              ))}
            </dl>
          </div>
          <Reveal delay={0.2}>
            <Lab />
          </Reveal>
        </div>
      </section>

      {/* Built to be checked, on the gene pool, and the way into the builder. */}
      <section className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden">
        <GenePool />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <Reveal className="relative isolate before:pointer-events-none before:absolute before:-inset-x-24 before:-inset-y-14 before:-z-10 before:bg-[radial-gradient(closest-side,var(--background)_55%,transparent)] mx-auto max-w-3xl text-center">
            <p className="eyebrow">{t.honesty.title}</p>
            <h2 className="mt-5 text-[clamp(34px,5.2vw,62px)] leading-[1.05] font-medium tracking-tight text-balance">{t.honesty.headline}</h2>
            <p className="section-lead mx-auto">{t.honesty.cta.body}</p>
          </Reveal>
          <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.honesty.items.map((item, i) => {
              const Icon = HONESTY_ICONS[i];
              return (
                <Reveal
                  key={item.title}
                  as="li"
                  delay={0.1 + i * 0.08}
                  className="group relative flex gap-4 bg-[radial-gradient(ellipse_at_left,color-mix(in_srgb,var(--background)_88%,transparent),color-mix(in_srgb,var(--background)_55%,transparent))] py-2 pr-3 transition-transform duration-300 ease-[var(--ease)] hover:-translate-y-1"
                >
                  {/* No box: each check hangs on a strand of helix. */}
                  <Helix vertical className="shrink-0 self-stretch" />
                  <div className="py-1">
                    <Icon className="size-5 text-muted-foreground transition-colors duration-300 group-hover:text-up" aria-hidden />
                    <h3 className="mt-4 font-medium">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </ol>
          <Reveal delay={0.3} className="mt-14 flex flex-col items-center gap-6 text-center">
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/montar" className="btn btn-primary">
                {t.honesty.cta.title}
                <ArrowRight className="btn-arrow size-4" aria-hidden />
              </Link>
              <a href={BRAND.record} target="_blank" rel="noreferrer" className="btn btn-secondary">
                {t.common.record}
              </a>
            </div>
            <p className="relative isolate before:pointer-events-none before:absolute before:-inset-x-10 before:-inset-y-2 before:-z-10 before:bg-[radial-gradient(closest-side,var(--background)_55%,transparent)] max-w-md text-xs leading-relaxed text-muted-foreground">{t.what.lab.pool}</p>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
