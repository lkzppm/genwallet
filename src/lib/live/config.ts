import type { LiveConfig } from "./events";

/** The evening the universe is frozen and the first order is decided. */
export const FORMATION_DATE = "2026-10-26";

export const LIVE_CONFIG: LiveConfig = {
  capital: 100_000,
  sessions: 10,
  formationGenerations: 400,
  dailyGenerations: 200,
  orderBuffer: 0.002,
  historyEvery: 10,
};
