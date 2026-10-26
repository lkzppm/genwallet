// B3's calendar. Brasília has had no daylight saving time since 2019, so
// BRT is always UTC−3; the session's hours do move with US daylight time and
// are read from Yahoo, never assumed (spec/03).

const HOLIDAYS = new Set([
  "2026-01-01",
  "2026-02-16",
  "2026-02-17",
  "2026-04-03",
  "2026-04-21",
  "2026-05-01",
  "2026-06-04",
  "2026-09-07",
  "2026-10-12",
  "2026-11-02",
  "2026-11-20",
  "2026-12-24",
  "2026-12-25",
  "2026-12-31",
  "2027-01-01",
]);

const DAY = 86_400_000;
const BRT = -3 * 3_600_000;

export function isTradingDay(date: string): boolean {
  const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
  return dow !== 0 && dow !== 6 && !HOLIDAYS.has(date);
}

export function nextTradingDay(date: string): string {
  let t = Date.parse(`${date}T12:00:00Z`);
  for (;;) {
    t += DAY;
    const d = new Date(t).toISOString().slice(0, 10);
    if (isTradingDay(d)) return d;
  }
}

/** The `count` trading days after `start`. */
export function sessionsAfter(start: string, count: number): string[] {
  const out: string[] = [];
  let d = start;
  while (out.length < count) out.push((d = nextTradingDay(d)));
  return out;
}

/** Calendar date in Brasília at instant `ms`. */
export function brtDate(ms: number): string {
  return new Date(ms + BRT).toISOString().slice(0, 10);
}

/**
 * Last instant a decision for `date` may be committed: the opening auction
 * starts at 09:45 BRT (Yahoo's pre-market window on 2026-10-26).
 */
export function decisionDeadline(date: string): number {
  return Date.parse(`${date}T09:45:00-03:00`);
}
