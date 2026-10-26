"use client";

import { Moon, Sun } from "lucide-react";
import { DICTIONARIES, LOCALES } from "@/i18n";
import { useLocale, useT } from "@/i18n/LocaleProvider";
import { setTheme, useTheme } from "@/lib/use-theme";

/** Paper or night: a square button that shows the theme it switches to. */
export function ThemeSwitch() {
  const t = useT();
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const label = next === "dark" ? t.common.themeDark : t.common.themeLight;
  const Icon = next === "dark" ? Moon : Sun;
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center border border-border bg-panel text-muted-foreground transition-colors hover:text-foreground"
    >
      <Icon className="size-4" />
    </button>
  );
}

/** Portuguese or English, remembered in this browser. */
export function LocaleSwitch() {
  const { locale, setLocale, t } = useLocale();
  return (
    <div role="group" aria-label={t.common.language} className="flex h-8 border border-border bg-panel font-mono text-xs">
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLocale(option)}
          aria-pressed={locale === option}
          title={DICTIONARIES[option].name}
          className="px-2.5 text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-foreground aria-pressed:text-background"
        >
          {DICTIONARIES[option].short}
        </button>
      ))}
    </div>
  );
}
