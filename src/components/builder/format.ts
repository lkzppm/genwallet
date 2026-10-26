// Number and date formatting for the builder, in the page's language.

export function money(value: number, lang: string, digits = 2): string {
  return value.toLocaleString(lang, { style: "currency", currency: "BRL", minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function number(value: number, lang: string, digits = 2): string {
  return value.toLocaleString(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** A fraction as a percentage; `signed` adds a plus to gains. */
export function percent(value: number, lang: string, digits = 2, signed = false): string {
  const text = (value * 100).toLocaleString(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${signed && value > 0 ? "+" : ""}${text}%`;
}

export function day(date: string, lang: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(lang, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function shortDay(date: string, lang: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(lang, { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

/** Green for a gain, red for a loss, the text colour for nothing. */
export function signClass(value: number | null): string {
  if (value === null || Math.abs(value) < 1e-9) return "text-foreground";
  return value > 0 ? "text-up" : "text-down";
}
