"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { siGithub } from "simple-icons";
import type { Dictionary } from "@/i18n";
import { useLocale } from "@/i18n/LocaleProvider";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { BrandIcon } from "./brand-icon";
import { Logo } from "./logo";
import { LocaleSwitch, ThemeSwitch } from "./switches";

const TABS: { href: string; label: keyof Dictionary["nav"] }[] = [{ href: "/montar", label: "builder" }];

/**
 * Sticky top bar, the same on every page: the mark and name are the home
 * link, then one tab per page. The green moves with the visitor: on the home
 * page it is the name's colour; on a tab it is the underline, which leaves
 * from under the name (or the previous tab) and slides to the current one.
 */
export function Nav() {
  const pathname = usePathname();
  const { locale, t } = useLocale();
  const barRef = useRef<HTMLDivElement>(null);
  // `moves` counts measurements: the first places the line without a slide.
  const [indicator, setIndicator] = useState({ left: 0, width: 0, moves: 0 });
  const home = pathname === "/";
  const active = TABS.findIndex((tab) => pathname.startsWith(tab.href));

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const name = bar.querySelector<HTMLElement>("[data-brand-name]");
    const target = bar.querySelector<HTMLElement>("[data-active]") ?? (name?.offsetWidth ? name : bar.querySelector<HTMLElement>("[data-brand]"));
    const measure = () => {
      if (!target) return;
      const from = bar.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const left = to.left - from.left;
      setIndicator((i) =>
        Math.abs(i.left - left) < 0.5 && Math.abs(i.width - to.width) < 0.5 ? i : { left, width: to.width, moves: i.moves + 1 },
      );
    };
    measure();
    // The name and the tabs change width when the font loads or the language switches.
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    if (name) observer.observe(name);
    if (target) observer.observe(target);
    return () => observer.disconnect();
  }, [active, locale]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-[color-mix(in_srgb,var(--background)_82%,transparent)] backdrop-blur-md">
      <div ref={barRef} className="relative mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:gap-8 sm:px-6">
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute bottom-0 h-0.5 bg-up",
            indicator.moves > 1 && "transition-[left,width,opacity] duration-700 ease-[var(--ease)]",
          )}
          style={{ left: indicator.left, width: indicator.width, opacity: active >= 0 ? 1 : 0 }}
        />
        <Link href="/" aria-label={t.nav.home} data-brand className="group flex h-full shrink-0 items-center gap-2.5">
          <Logo className="size-8 transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-rotate-12 group-hover:scale-110" />
          <span
            data-brand-name
            className={cn("hidden font-medium tracking-tight transition-colors duration-500 ease-[var(--ease)] sm:inline", home ? "text-up" : "text-foreground group-hover:text-up")}
          >
            {BRAND.name}
          </span>
        </Link>
        <nav aria-label={t.nav.pages} className="flex h-full items-center gap-1">
          {TABS.map((tab, i) => (
            <Link
              key={tab.href}
              href={tab.href}
              data-active={i === active || undefined}
              aria-current={i === active ? "page" : undefined}
              className="flex h-full items-center px-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground aria-[current=page]:text-foreground"
            >
              {t.nav[tab.label]}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a href={BRAND.repo} target="_blank" rel="noreferrer" aria-label={t.common.source} title={t.common.source} className="btn btn-icon">
            <BrandIcon icon={siGithub} size={16} />
          </a>
          <LocaleSwitch />
          <ThemeSwitch />
        </div>
      </div>
    </header>
  );
}
