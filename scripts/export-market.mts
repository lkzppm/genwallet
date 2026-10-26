// The market data the builder page simulates on: the frozen Ibovespa
// universe's two years of bars, written compact to public/data/market.json.
// A bar that is not final yet (before the close + 30 min) is left out.
//   pnpm data [--cache]

import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import type { Snapshot } from "../src/lib/market/snapshot";
import { truncate } from "../src/lib/market/snapshot";
import { brtDate } from "../src/lib/live/calendar";
import { currentUniverse, has, snapshot, writeJson } from "./lib.mts";

const OUT = "public/data/market.json";

let s: Snapshot = await snapshot(await currentUniverse(), has("cache"));
const last = s.dates[s.dates.length - 1];
const now = Date.now();
if (last === brtDate(now) && s.regularEnd !== null && now < (s.regularEnd + 1800) * 1000) {
  s = truncate(s, s.dates[s.dates.length - 2]);
  console.log(`left out ${last}: its bar is not final yet`);
}

const cents = (x: number | null) => (x === null ? null : Math.round(x * 100) / 100);
const sig = (x: number | null) => (x === null ? null : Number(x.toPrecision(6)));
const whole = (x: number | null) => (x === null ? null : Math.round(x));

const compact: Snapshot = {
  ...s,
  open: s.open.map((r) => r.map(cents)),
  close: s.close.map((r) => r.map(cents)),
  adjClose: s.adjClose.map((r) => r.map(sig)),
  volume: s.volume.map((r) => r.map(whole)),
  dividends: s.dividends.map((d) => ({ ...d, amount: Number(d.amount.toPrecision(6)) })),
  ibov: { open: s.ibov.open.map(whole), close: s.ibov.close.map(whole) },
  bova: { open: s.bova.open.map(cents), close: s.bova.close.map(cents) },
  // The browser never checks finality: the file holds final bars only.
  regularStart: null,
  regularEnd: null,
};
writeJson(OUT, compact, true);
const raw = readFileSync(OUT);
console.log(
  `${OUT}: ${compact.dates[0]} to ${compact.dates[compact.dates.length - 1]}, ${compact.universe.length} tickers, ` +
    `${(raw.length / 1024).toFixed(0)} KB raw, ${(gzipSync(raw).length / 1024).toFixed(0)} KB gzipped`,
);
