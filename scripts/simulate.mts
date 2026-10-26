// The builder's simulation in the terminal, on public/data/market.json.
//   pnpm simulate [--formation YYYY-MM-DD] [--sessions N] [--strict] [--companies A,B,...] [--fitness sharpe|sortino|cvar]

import { readFileSync } from "node:fs";
import { DEFAULT_PARAMS } from "../src/lib/ga";
import type { FitnessKind } from "../src/lib/ga";
import { LIVE_CONFIG } from "../src/lib/live/config";
import type { Snapshot } from "../src/lib/market/snapshot";
import { formationRange, simulate } from "../src/lib/sim/simulate";
import { flag, has } from "./lib.mts";

const snap = JSON.parse(readFileSync("public/data/market.json", "utf8")) as Snapshot;
const companies = flag("companies")?.split(",");
const sessions = Number(flag("sessions") ?? LIVE_CONFIG.sessions);
const params = {
  ...DEFAULT_PARAMS,
  strict: has("strict") || !!companies,
  fitness: (flag("fitness") ?? DEFAULT_PARAMS.fitness) as FitnessKind,
};
const range = formationRange(snap, params.lookback, sessions);
const formation = flag("formation") ?? range[range.length - 1];
const r = simulate(snap, {
  formation,
  sessions,
  capital: LIVE_CONFIG.capital,
  params,
  formationGenerations: LIVE_CONFIG.formationGenerations,
  dailyGenerations: LIVE_CONFIG.dailyGenerations,
  seed: "genwallet",
  orderBuffer: LIVE_CONFIG.orderBuffer,
  companies,
});
for (const s of r.summaries) {
  const changes = s.hold ? "hold" : [...s.entered.map((t) => `+${t}`), ...s.left.map((t) => `-${t}`)].join(" ");
  console.log(
    `${s.session.toString().padStart(2)} ${s.executeOn}  score ${s.score.toFixed(3)}  nav ${s.mark.nav.toFixed(2).padStart(10)}  ` +
      `trades ${String(s.fill.trades.length).padStart(2)}  ${changes}  (${s.ms.toFixed(0)} ms)`,
  );
}
const pct = (x: number | null) => (x === null ? "n/a" : `${(x * 100).toFixed(2)}%`);
console.log(`formation ${formation}: GA ${pct(r.final.ret)}, BOVA11 ${pct(r.final.bovaRet)}, CDI ${pct(r.final.cdiRet)}; fees ${r.final.fees}; ${r.ms.toFixed(0)} ms`);
