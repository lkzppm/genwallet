# 00 — Overview

## The assignment

UFRJ, Inteligência Artificial (the same course as Debait, CV-AI and GraphMan). The brief, verbatim:

> Criar Carteira de Ações com 10 empresas e operar geneticamente durante 10 pregões

Lucas wants to go beyond it, make it interactive and deploy it on Vercel. Project started on 2026-10-26.

## How we read it (Decided, 2026-10-26)

- **"Carteira com 10 empresas"**: choose 10 *companies* out of the Ibovespa (76 tickers on 2026-10-26) and their weights. Companies, not tickers: PETR3 and PETR4 are one company, so a portfolio holds at most one ticker per company. This is the cardinality-constrained Markowitz problem, which is NP-hard; that is the honest reason to use a genetic algorithm here (Chang et al. 2000; Streichert et al. 2004).
- **"Operar geneticamente durante 10 pregões"**: the market is a non-stationary environment, so this is a *dynamic optimisation problem*. The population is not recreated each session: it survives from one evening to the next, receives random immigrants, and evolves a few hundred generations over that day's fitness landscape. Each session ends in a rebalancing decision that pays real costs.
- **Can the 10 companies change during the 10 sessions?** The brief is ambiguous. It is a parameter: **free** by default (always 10 companies, swaps pay turnover), **strict** fixes the formation set and evolves weights only (Lucas, 2026-10-26).

## The three fronts (Decided, 2026-10-26)

1. **The live run.** Ten real B3 sessions, 2026-10-27 to 2026-11-10 (`03-live-run.md`). Every evening after the close, a job evolves the population and commits the next order to the public repository **before the next open**; the order fills at the open. The commit history is a timestamped proof that no decision saw the future, and every decision is reproducible from its archived inputs and its seed.
2. **The lab.** The same engine runs in the browser (Web Worker). A visitor picks any historical 10-session window, sets the parameters and watches the population evolve: the risk × return cloud per generation, convergence curves, gene frequency over generations, the champion's family tree, the equity curve against benchmarks.
3. **The study.** Ten sessions are noise, and the site says so. The portfolio is compared with the Ibovespa, the CDI, equal weights and Markowitz, and above all with a cone of 10,000 random 10-company portfolios (the percentile is the honest score). The same comparison repeated over about 50 historical 10-session windows (walk-forward, no look-ahead) is the study, in the spirit of GraphMan's case-study runner.

## Rules that shape everything

- **The code decides, deterministically.** A seeded PRNG (seed derived from the date) and archived inputs make every run replayable to the last digit. No `Math.random` in the engine.
- **No look-ahead.** A decision uses data up to the close of its day and fills at the next open. A decision committed after the open it targets is void and the session is logged as missed.
- **Honesty over hype.** In-sample fitness is never presented as a forecast; realised results are always shown next to random portfolios and the index.
- **One engine.** The nightly job, the lab and the study import the same `src/lib/ga/`. Nothing is computed twice in two ways.

## Success criteria

- The live run completes ten sessions with every order committed before its open.
- The presentation can replay any live session in the browser and get the same champion.
- The lab makes the genetic mechanics visible: selection, crossover, mutation, immigrants, convergence.
- The study answers "did the GA beat chance?" with a distribution, not an anecdote.
