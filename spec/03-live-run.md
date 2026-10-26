# 03 — The live run

## Calendar (Decided, 2026-10-26)

| | Date | What happens |
|---|---|---|
| Formation | Mon 2026-10-26, evening | Universe frozen (Ibovespa composition of the day), first GA run from a random population, order 1 committed |
| Sessions 1–4 | 2026-10-27, 28, 29, 30 | Each: order fills at the open, portfolio marked at the close; that evening the next order |
| — | Mon 2026-11-02 | Finados, B3 closed |
| Sessions 5–10 | 2026-11-03, 04, 05, 06, 09, 10 | Same; the evening of 2026-11-10 only marks the final close, no new order |

Capital: R$ 100,000 of paper money. B3 trades 10:00–17:00 BRT while the US is on daylight time and 10:00–18:00 after it ends (2026-11-01); the job reads the real close time from Yahoo's `currentTradingPeriod.regular.end`, never a constant.

## Timing and integrity

- Decide after the close of day `t` with data up to `t`; fill at the **open** of `t+1`; mark at the close of `t+1`.
- The job refuses to run while the day's bar is not final (now < `regular.end` + 30 min).
- The job refuses to decide once the open of the target session has passed. That session is logged as `missed` and the portfolio rides unchanged.
- Each evening archives its inputs (`live/days/<date>.json`: the price window, eligibility, sectors, companies, CDI, current holdings, parameters, seed) and the final population (`live/population/<date>.json`). `pnpm live:verify <date>` re-runs the GA from them and must reproduce the champion exactly.
- The nightly commit lands on the public repository before the open: its timestamp is the proof.

## Accounting (`src/lib/live/`)

- **Order** (Decided, 2026-10-26): the order committed before the open is the champion's **weights**. The fill sizes them at the open: `⌊wᵢ · NAV_open · (1 − 0.2%) / (openᵢ · (1 + slippage))⌋`. Sizing in shares at the decision's close was tried first and, in a dry run filling on the 2026-10-26 gap (Ibovespa about −16% at the open), left 12% of the portfolio in cash. No look-ahead: the weights are fixed before the open. Integer shares, fractional market, so lots of 100 are not needed.
- **Fill**: sells first at `open · (1 − slippage)`, then buys at `open · (1 + slippage)`; fees on traded value. If cash falls short after a gap up, all buys are scaled down by the same factor. A stock with no open that day is not traded.
- **Dividends**: credited on the ex-date to the shares held before that day's fill (Yahoo `events.dividends`, gross).
- **Cash** earns the CDI of the day (last published value carried forward).
- **Mark**: NAV = cash + Σ shares × close, plus the benchmark. The benchmark is **BOVA11** (the Ibovespa ETF) at the open and the close: Yahoo's `^BVSP` open is the index's first print and sits at the previous close (205,070 on 2026-10-26, while BOVA11 opened at 169.00 against a 201.69 close).

## The event log (Proposed)

Like Debait, the run is an append-only log in `live/log.json` and one `reduce()` derives the state (cash, shares, pending order, NAV history). Events:

```
start     date, capital, universe [{ticker, company, sector}], params, sessions
decision  date, session, executeOn, seed, inputsHash, champion {weights, score, μ, σ, turnover, cost},
          targetShares, refPrices, nav, history (every 10th generation)
fill      date, session, trades [{ticker, side, qty, price, value, fee}], dividends
mark      date, session, nav, cash, positions, ibov {open, close}, interest
missed    date, session, reason
```

## The nightly job (Proposed)

GitHub Actions on a schedule (22:30 UTC, with retries at 01:30 and 10:00 UTC; all idempotent), runs `pnpm live`, and commits `live/` to the branch `live`, which carries no code changes, so `main` can stay protected. The site reads the log from `raw.githubusercontent.com/lkzppm/genwallet/live/live/log.json` with revalidation. Tonight's formation run is done from Lucas's machine with the same command if the Action is not ready by then.

## Benchmarks shown during the run

BOVA11 from the open of session 1 (the Ibovespa as traded), CDI, the formation portfolio bought and held, equal weights over the same 10, and the cone of 10,000 random 10-company portfolios bought at the open of session 1.
