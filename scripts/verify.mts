// Replays one evening from its archive and checks that the GA lands on the
// same champion and the same final population.
//   pnpm live:verify 2026-10-26 [--dir live]

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DayArchive, PopulationFile } from "../src/lib/live/decide";
import { runDecision } from "../src/lib/live/decide";
import type { DecisionEvent, LiveEvent } from "../src/lib/live/events";
import { flag, readJson } from "./lib.mts";

const date = process.argv.slice(2).find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
if (!date) throw new Error("usage: pnpm live:verify YYYY-MM-DD [--dir live]");
const dir = flag("dir") ?? "live";

const dayPath = join(dir, "days", `${date}.json`);
const day = readJson<DayArchive>(dayPath);
const seed = day.seededFrom ? readJson<PopulationFile>(join(dir, "population", `${day.seededFrom}.json`)) : null;
const decision = readJson<LiveEvent[]>(join(dir, "log.json")).find(
  (e): e is DecisionEvent => e.type === "decision" && e.date === date,
);
if (!decision) throw new Error(`no decision on ${date} in the log`);

const hash = createHash("sha256").update(readFileSync(dayPath)).digest("hex");
const { problem, result, population } = runDecision(day, seed?.population);
const c = result.champion;
const weights = Object.fromEntries(c.assets.map((a, i) => [problem.tickers[a], c.weights[i]]));
const stored = readFileSync(join(dir, "population", `${date}.json`), "utf8");

const checks: [string, boolean][] = [
  ["inputs hash", hash === decision.inputsHash],
  ["champion id", c.id === decision.champion.id],
  ["champion score", c.eval.score === decision.champion.score],
  ["champion weights", JSON.stringify(weights) === JSON.stringify(decision.champion.weights)],
  ["final population", JSON.stringify(population) + "\n" === stored],
];
for (const [name, ok] of checks) console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log(`${date}: replay identical (champion #${c.id}, score ${c.eval.score})`);
