"use client";

import { Moon, Sun } from "lucide-react";
import { DICTIONARIES, LOCALES } from "@/i18n";
import { useLocale, useT } from "@/i18n/LocaleProvider";
import { setTheme, useTheme } from "@/lib/use-theme";

/** Paper or night: a square button that shows the theme it switches to, turning as it swaps. */
export function ThemeSwitch() {
  const t = useT();
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const label = next === "dark" ? t.common.themeDark : t.common.themeLight;
  const Icon = next === "dark" ? Moon : Sun;
  return (
    <button type="button" onClick={() => setTheme(next)} aria-label={label} title={label} className="btn btn-icon">
      <Icon key={next} className="size-4 animate-[spin-in_0.45s_var(--ease)]" />
    </button>
  );
}

/** Portuguese or English, remembered in this browser; the dark block slides to the chosen one. */
export function LocaleSwitch() {
  const { locale, setLocale, t } = useLocale();
  const index = LOCALES.indexOf(locale);
  return (
    <div role="group" aria-label={t.common.language} className="relative grid h-[34px] grid-cols-2 border border-border bg-panel font-mono text-xs">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1/2 bg-foreground transition-transform duration-300 ease-[var(--ease)]"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLocale(option)}
          aria-pressed={locale === option}
          title={DICTIONARIES[option].name}
          className="relative px-2.5 text-muted-foreground transition-colors duration-300 hover:text-foreground aria-pressed:text-background aria-pressed:hover:text-background"
        >
          {DICTIONARIES[option].short}
        </button>
      ))}
    </div>
  );
}
