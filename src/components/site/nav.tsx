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
 * Sticky top bar: the mark and name are the home link, then one tab per page.
 * A green underline slides to the current tab (hidden on the home page).
 */
export function Nav() {
  const pathname = usePathname();
  const { locale, t } = useLocale();
  const tabsRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const active = TABS.findIndex((tab) => pathname.startsWith(tab.href));
  const app = pathname.startsWith("/montar");

  useLayoutEffect(() => {
    const list = tabsRef.current;
    if (!list) return;
    const measure = () => {
      const el = list.querySelector<HTMLElement>("[data-active]");
      setIndicator(el ? { left: el.offsetLeft, width: el.offsetWidth } : { left: 0, width: 0 });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [active, locale]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-[color-mix(in_srgb,var(--background)_82%,transparent)] backdrop-blur-md">
      {/* Full width over the builder's fixed screen, so the mark sits over its sidebar. */}
      <div className={cn("mx-auto flex h-16 items-center gap-4 px-4 sm:gap-8 sm:px-6", app ? "max-w-none" : "max-w-6xl")}>
        <Link href="/" aria-label={t.nav.home} className="group flex shrink-0 items-center gap-2.5">
          <Logo className="size-8 transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-rotate-12 group-hover:scale-110" />
          <span className="hidden font-medium tracking-tight sm:inline">{BRAND.name}</span>
        </Link>
        <nav ref={tabsRef} aria-label={t.nav.pages} className="relative flex h-full items-center gap-1">
          <span
            aria-hidden
            className="absolute bottom-0 h-0.5 bg-up transition-all duration-500 ease-[var(--ease)]"
            style={{ left: indicator.left, width: indicator.width, opacity: indicator.width ? 1 : 0 }}
          />
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
