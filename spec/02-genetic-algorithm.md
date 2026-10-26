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

## What the engine reports per generation

Best and mean score, diversity, the champion's id and assets, and the frequency of each stock in the population (the gene heatmap). The nightly job keeps every 10th generation in the log; the lab keeps all of them.
