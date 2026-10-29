// One GA run in the terminal for any past date, from cash, no writes.
//   pnpm evolve --date 2026-10-23 [--generations 400] [--fitness sharpe|sortino|cvar] [--cache]

import { DEFAULT_PARAMS, evolve, seedFor } from "../src/lib/ga";
import type { FitnessKind } from "../src/lib/ga";
import { problemInput, truncate } from "../src/lib/market/snapshot";
import { currentUniverse, flag, has, snapshot } from "./lib.mts";

const date = flag("date");
if (!date) throw new Error("usage: pnpm evolve --date YYYY-MM-DD");
const generations = Number(flag("generations") ?? 400);
const params = { ...DEFAULT_PARAMS, fitness: (flag("fitness") ?? DEFAULT_PARAMS.fitness) as FitnessKind };

const s = truncate(await snapshot(await currentUniverse(), has("cache")), date);
const day = s.dates.length - 1;
const input = problemInput(s, day, params.lookback, {});
const t0 = performance.now();
const { problem, result } = evolve(input, params, { generations, seed: seedFor(s.dates[day]), label: s.dates[day] });
const t1 = performance.now();

console.log(`decision day ${s.dates[day]}, ${problem.eligible.length}/${problem.n} eligible, fitness ${params.fitness}`);
for (const h of result.history) {
  if (h.gen % 50 === 0 || h.gen === generations) {
    console.log(
      `gen ${String(h.gen).padStart(4)}  best ${h.best.toFixed(4)}  mean ${h.mean.toFixed(4)}  ` +
        `diversity ${h.diversity.toFixed(3)}${h.hyper ? "  hyper" : ""}`,
    );
  }
}
const c = result.champion;
console.log(`\nchampion #${c.id} (${c.origin}, born gen ${c.born})  score ${c.eval.score.toFixed(4)}`);
console.log(
  `expected ${(c.eval.mean * 252 * 100).toFixed(1)}% a.a., vol ${(c.eval.vol * Math.sqrt(252) * 100).toFixed(1)}% a.a., ` +
    `rf ${(input.rf * 252 * 100).toFixed(1)}% a.a.`,
);
c.assets.forEach((a, i) =>
  console.log(
    `  ${problem.tickers[a].padEnd(7)} ${(c.weights[i] * 100).toFixed(2).padStart(6)}%  ` +
      `${input.companies[a]} · ${input.sectors[a]}`,
  ),
);
console.log(`\n${(t1 - t0).toFixed(0)} ms for ${generations} generations`);
