"use client";

import Link from "next/link";
import { siGithub } from "simple-icons";
import { useT } from "@/i18n/LocaleProvider";
import { BRAND } from "@/lib/brand";
import { BrandIcon, LINKEDIN } from "./brand-icon";
import { Logo } from "./logo";
import { Reveal } from "./reveal";

const linkClass = "w-fit transition-colors duration-200 hover:text-up";

/* The footer as GraphMan's: a hairline across the top and a dot per column
   hanging from it; a column's dot turns green while it is hovered. */
export function Footer() {
  const t = useT();
  const columns = [
    {
      heading: t.footer.project,
      body: (
        <>
          <a className={linkClass} href={BRAND.repo} target="_blank" rel="noreferrer">
            {t.common.source}
          </a>
          <a className={linkClass} href={BRAND.record} target="_blank" rel="noreferrer">
            {t.common.record}
          </a>
          <Link className={linkClass} href="/montar">
            {t.nav.builder}
          </Link>
        </>
      ),
    },
    {
      heading: t.footer.stack,
      body: (
        <>
          <span>TypeScript · Next.js 16</span>
          <span>vgpu (WebGPU)</span>
          <span>GitHub Actions · Vercel</span>
          <span>{t.footer.licence}</span>
        </>
      ),
    },
    {
      heading: t.footer.author,
      body: (
        <>
          <span className="text-foreground">{t.footer.authorName}</span>
          <a className={`${linkClass} flex items-center gap-2`} href={BRAND.github} target="_blank" rel="noreferrer">
            <BrandIcon icon={siGithub} size={14} />
            {t.footer.github}
          </a>
          <a className={`${linkClass} flex items-center gap-2`} href={BRAND.linkedin} target="_blank" rel="noreferrer">
            <BrandIcon icon={LINKEDIN} size={14} />
            {t.footer.linkedin}
          </a>
        </>
      ),
    },
    {
      heading: t.footer.course,
      body: (
        <>
          <span>{t.footer.courseName}</span>
          <span>{t.footer.term}</span>
        </>
      ),
    },
  ];
  return (
    <footer className="border-t border-border bg-[color-mix(in_srgb,var(--foreground)_3%,var(--background))]">
      <Reveal className="mx-auto max-w-6xl px-4 pt-14 pb-9 sm:px-6">
        <div className="relative grid grid-cols-2 gap-8 pt-7 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-border md:grid-cols-4">
          {columns.map((column) => (
            <div key={column.heading} className="group relative flex flex-col gap-2 text-sm text-muted-foreground">
              <span
                aria-hidden
                className="absolute -top-[34px] left-0 size-3 rounded-full border border-border bg-background transition-all duration-300 ease-[var(--ease-spring)] group-hover:scale-125 group-hover:border-up group-hover:bg-up"
              />
              <h3 className="eyebrow mb-1">{column.heading}</h3>
              {column.body}
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          <Link href="/" className="group flex items-center gap-2.5">
            <Logo className="size-7 transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-rotate-12" />
            <span className="font-medium tracking-tight">{BRAND.name}</span>
          </Link>
          <span className="font-mono text-xs text-muted-foreground">
            {t.common.paper} {t.footer.copyright}
          </span>
        </div>
      </Reveal>
    </footer>
  );
}
