// A longer history for the hyperparameter search (pnpm tune): the frozen
// Ibovespa universe's daily bars over `--range` (5 years by default),
// written to .cache/market-<range>.json. Not served by the site.
//   pnpm tune:data [--range 5y]
//
// Today's constituents looked back five years are survivors: absolute
// returns on this history are flattered, comparisons between configs much
// less so.

import { truncate } from "../src/lib/market/snapshot";
import { buildSnapshot } from "../src/lib/market/snapshot";
import { brtDate } from "../src/lib/live/calendar";
import { currentUniverse, flag, writeJson } from "./lib.mts";

const range = flag("range") ?? "5y";
const out = `.cache/market-${range}.json`;

const t0 = performance.now();
let s = await buildSnapshot(await currentUniverse(), range);
const last = s.dates[s.dates.length - 1];
const now = Date.now();
if (last === brtDate(now) && s.regularEnd !== null && now < (s.regularEnd + 1800) * 1000) {
  s = truncate(s, s.dates[s.dates.length - 2]);
  console.log(`left out ${last}: its bar is not final yet`);
}
writeJson(out, s, true);
console.log(
  `${out}: ${s.dates[0]} to ${s.dates[s.dates.length - 1]}, ${s.dates.length} sessions, ${s.universe.length} tickers ` +
    `(${((performance.now() - t0) / 1000).toFixed(1)} s)`,
);
