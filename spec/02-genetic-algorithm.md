# 02 — The genetic algorithm

Everything here is **Proposed** (2026-10-26) until the engine is built and run; the numbers are starting defaults, all of them parameters.

## The problem one evening

Given the universe (the Ibovespa frozen at formation), the adjusted closes of the last `lookback` sessions up to the decision day, the CDI, and the current holdings, find 10 companies and weights that maximise risk-adjusted return **net of the cost of getting there from the current portfolio**.

Estimates, computed once per evening (`problem.ts`):

- Daily simple returns from adjusted closes (dividends included), `lookback = 252`.
- Expected return `μ`: each stock's mean shrunk toward the cross-sectional mean, `μᵢ = (1 − α)·meanᵢ + α·mean(all)`, `α = 0.5`. Raw historical means are the noisiest input and the reason GAs chase past winners.
- Covariance `Σ`: sample covariance shrunk toward the constant-correlation target, fixed intensity `δ = 0.3`.
- Eligible stocks: a full price history in the window and median daily traded value ≥ R$ 20 M over the last 60 sessions.

## Chromosome

```
assets:  [i₁ … i₁₀]   distinct universe indices, sorted, one per company
weights: [w₁ … w₁₀]   same order
id, parents, born, origin   genealogy for the family tree in the UI
```

Sorting the assets keeps crossover alignment trivial and makes two equal portfolios equal genomes.

## Constraints and repair

Infeasible children are repaired, never penalised:

1. **Companies**: duplicates (two tickers of one company, or the same ticker twice) are replaced by a random eligible company not in the genome.
2. **Sector cap**: at most 3 of 10 in one B3 macro-sector (Financeiro, Utilidade Pública, …); the lightest asset of an over-full sector is swapped for one from a sector with room.
3. **Weights**: projected onto the bounded simplex `{3% ≤ wᵢ ≤ 20%, Σw = 1}` by bisection on a shift `τ`, `wᵢ = clip(vᵢ − τ, lo, hi)`. Exact, and the closest feasible point to what the operators produced.
4. **Strict mode**: the asset set is locked to the formation set; only weights evolve.

## Fitness

Default, a Sharpe ratio net of costs:

```
turnover = Σ |wᵢ − hᵢ|            (h = current weights, cash excluded; 1.0 when starting from cash)
cost     = (fee + slippage) · turnover            fee 0.03%, slippage 0.05%
score    = (μₚ − r_f − cost / H) · 252  /  (σₚ · √252)
```

`H = 10` sessions amortises the cost of a trade over the horizon of the run, so a swap must pay for itself. Alternatives selectable in the lab: Sortino (downside deviation of the historical portfolio series) and return over CVaR 95% (historical simulation).

**Against the index (Decided, 2026-10-26, Lucas: "make the GA beat BOVA11")**: `fitness: "active"` scores the expected return above BOVA11 over the tracking error, an information ratio net of the same costs:

```
active   = μₚ − μ_BOVA − cost / H
tracking = √( w'Σw − 2 w'c + σ²_BOVA )      c = covariance of each asset with BOVA11, floored at 10⁻⁸
score    = active · √252 / tracking
```

**A goal to reach (Proposed, 2026-10-28, Lucas: "I wanna win" the class challenge)**: `fitness: "goal"` scores the chance of reaching a daily return `goal` by the deadline, Browne's (1999) criterion for beating a target: `score = (μₚ − goal − cost / H) · √252 / σₚ`. With a goal above what any portfolio can expect, the numerator is negative and the score rises with the volatility, so the GA concentrates (up to `wMax`) on the names most likely to get there; with a low goal it is Sharpe over a hurdle. A contest ranked on results rewards exactly that: a rank prize pays for variance, not for the mean. Tested on the tuner's windows with two new columns, big wins (windows at least 3 points over BOVA11) and the 90th percentile (`scripts/grids/goal.json`).

**The cash rule (Decided, 2026-10-28, Lucas: "teste o gene de caixa"; an option, off by default)**: with `trendWindow` N and `exposureDown` e, an evening whose BOVA11 close is below its mean over the last N sessions puts only e of the NAV in stocks, the rest in cash at the CDI (`exposureOn` in `window.ts`; the decision's weights and target shares are scaled, a change of exposure is never a hold, and the holdings enter the problem as relative weights). The GA is untouched: it still picks the stocks and their relative weights. Off, the arithmetic is the recorded one, bit for bit. Grid (`scripts/grids/cash.json`, 4,410 runs), per held-out window: on the vs BOVA11 config, N 100 and all cash in a fall turns +0.01% over BOVA11 into +0.30%, the worst window from −6.58% to −5.12% and the window Sharpe from 0.14 to 0.25, while on the training windows it costs 0.25 points of mean; in every variant it gains 0.9 to 2.7 points when BOVA11 fell and loses 0.3 to 1.6 when it rose. On the goal default it changes little overall and does not lift the floor. A trend filter, not a forecast: it trades rallies for shallower falls, so it stays off by default and off the live run.

BOVA11's closes enter the problem only for this fitness (`ProblemInput.bench`), cut on the same window as the stock prices, so it ends on the decision's close like everything else. `skip` (0 by default) leaves the latest sessions out of every expected return, the benchmark's included (12-1 momentum skips about 21); the covariances keep the whole window. With `fitness` other than `active` and `skip` 0 the arithmetic is the one recorded before, bit for bit: the live run that started on 2026-10-26 with Sharpe replays unchanged. Only the score changes: selection, crossover, mutation, repair and the carried population are the same GA.

## Operators

| Operator | Default |
|---|---|
| Population | 200 |
| Selection | tournament of 3 |
| Elitism | the best 4 pass unchanged |
| Crossover (p = 0.9) | assets the parents share are kept; the free slots are drawn from the rest of the union; shared weights by BLX-α (α = 0.3), the others inherited; repair |
| Swap mutation (p = 0.25) | replace one asset with an eligible outsider, keeping its weight |
| Weight mutation (p = 0.35) | `wᵢ ← wᵢ · exp(0.25 · N(0,1))`, repair |
| Transfer mutation (p = 0.25) | move a random share of one weight to another asset |
| Hypermutation | mutation rates × 3 while diversity < 0.15 |
| Diversity | 1 − mean Jaccard similarity of the asset sets over 200 random pairs |

## The population across sessions

- **Formation** (the evening before session 1): random population, 400 generations.
- **Each later evening**: load the previous evening's final population, repair it against the new eligible set, re-evaluate it on the new landscape, replace the worst 15% with random immigrants, inject the **hold** individual (exactly the current portfolio, zero turnover, so "do nothing" is always a candidate), then 200 generations.
- The champion (best score) is the target portfolio. If the hold individual wins, no order is sent.

## Determinism

`rng.ts` is a seeded sfc32 with the seed hashed from `genwallet|<date>`. Ties in sorting break on the individual's id. Given the archived inputs of a day (`03-live-run.md`) and the previous day's population, the champion is reproducible to the last digit, in Node and in the browser.

**No transcendental `Math` in the engine** (Decided, 2026-10-26). `Math.exp`, `log`, `sin`, `cos` and `tanh` return different last bits in Node 26 and Chromium 1243 (measured; `sqrt` and `pow` agreed), which made a browser replay drift from the job at the 7th session. The engine uses `dexp`/`dlog` (`src/lib/ga/math.ts`: range reduction plus series, only + − × ÷), and normals come from Marsaglia's polar method instead of Box-Muller. Checked on 2026-10-26: the two dry-run evenings replayed in Node and in Chromium give the same champion, score and final population bit for bit; `dexp`/`dlog` stay within 8e-16 relative of `Math`.

## Tuning the defaults (Decided, 2026-10-26)

`pnpm tune` searches the knobs the assignment leaves open (everything in `GaParams` but `k`, the liquidity floor and the costs, plus the generations of the formation and of each evening) by replaying the live run with the builder's simulator over past windows.

- **History**: `pnpm tune:data` writes five years of the frozen universe to `.cache/market-5y.json` (1,248 sessions on 2026-10-26). Today's constituents looked back are survivors, so absolute returns are flattered; comparisons between configs much less.
- **Windows**: a formation every 10 sessions from session 252 on (so every lookback up to 252 sees the same windows), each operated 10 sessions. The last quarter by time, after a one-window gap, is held out until the end.
- **Search**: 160 random configs plus the defaults, successive halving on the training windows (12 windows × 1 seed, the best third on 24 × 2, the best third of those on all × 3), 4 mutants of each of the best 4, then the best 5 and the defaults on the held-out windows.
- **Objective**: by default the 10-session return over BOVA11 on the same sessions, averaged over windows (seeds first) and divided by its spread across windows; `--objective sharpe` (over the CDI) or `mean` for the alternatives. The space includes the `active` fitness and `skip`.
- **No look-ahead, checked**: before searching, every price, volume, index level and CDI rate after a decision's close is scrambled, and the decisions of the formation and of the next evening must come out identical for every fitness; scrambling from the decision day itself does change them (checked on 2026-10-26), so the test can see a one-day leak.
- **Running**: one process per core but one (threads of one process queue on the allocator: nine ran no faster than one). One to two runs a second on this machine, awake and on mains power; the 2026-10-26 search took 11,079 runs and about four hours awake, resumable from `.cache/tune/<name>/results.jsonl`, reported in `report.md`.
- A config replaces the defaults only if it also beats them on the held-out windows. The live run is not affected: it reads its parameters from its own start event.

**Result (Decided, 2026-10-27)**: the builder starts from `TUNED` (`src/lib/ga/params.ts`, config `0xfd49e`); `DEFAULT_PARAMS` stays the object the live run recorded. **Since 2026-10-28 (Lucas: "deixe o Meta como fitness padrão")** `TUNED` carries the goal fitness at 0.4% a session and a 20% weight cap, the grid's balanced pick (`1032i85`): one held-out window in five finishes 3 points over BOVA11, the mean is 0.35% below it, the worst window −11%. The search's numbers below are the `active` fitness's. Per 10-session window, averaged:

| config | over BOVA11, train | over BOVA11, held out | beats BOVA11, held out | worst, held out |
|---|---|---|---|---|
| old defaults (`DEFAULT_PARAMS`, 400/200 generations) | +0.33% | −0.62% | 44% | −7.15% |
| `15n0ra5` (the report's winner, strict) | +0.46% | +0.02% | 52% | −7.12% |
| `0xfd49e` (the same, free swaps): adopted | +0.38% | +0.01% | 60% | −6.58% |

- What changed: the `active` fitness, at most 2 companies per sector and 14% per company (from 3 and 20%), `skip` 3, `lookback` 240, `meanShrink` 0.21, `horizon` 17, a population of 260 with 9 elites, almost no transfer mutation, and 300 / 150 generations.
- Read honestly: about 0.6 points per window better than the old defaults on the held-out year, and level with BOVA11 there, not ahead of it. The history is survivors, which flatters every config alike.
- `15n0ra5` and `0xfd49e` differ only in strict mode and tie on the held-out windows; free swaps were taken because strict mode throws when a locked company later drops below the liquidity floor (`locked ticker … is not eligible`), which failed 21 of the search's runs in 8 strict configs (failed runs were left out of their scores; neither adopted config had one).
- The builder's default run (formation 2026-10-08) now gives R$ 97,637.08 (−2.36% against BOVA11's −1.49%), in Node and in Chromium to the cent: one window, against an average over 25.

## What the engine reports per generation

Best and mean score, diversity, the champion's id and assets, and the frequency of each stock in the population (the gene heatmap). The nightly job keeps every 10th generation in the log; the lab keeps all of them.
