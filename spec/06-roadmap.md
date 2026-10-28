# 06 — Roadmap

## Status on 2026-10-26 (Monday)

- [x] Research and plan (`01-research.md`); Lucas chose the live run from 2026-10-27 and free swaps by default.
- [x] `spec/`, public repository `lkzppm/genwallet`.
- [x] Engine (`src/lib/ga/`), data (`src/lib/market/`), accounting (`src/lib/live/`), `pnpm live`, `pnpm live:verify`, `pnpm evolve` (branch `feat/engine`). Dry run on 2026-10-26 with formation on 2026-10-23: two evenings, both replays identical; 400 generations in about 350 ms, the 76 charts in 5–10 s.
- [x] **2026-10-26 is a crash day**: Ibovespa about −16% (ITUB4 −15%, MGLU3 −56%, VALE3 +4%, confirmed on Yahoo and brapi). The formation runs on it anyway, and that day stays in every window of the run.
- [ ] **Formation run tonight**, after 17:30 BRT and before 10:00 BRT on 2026-10-27, committed and pushed.
- [ ] Nightly GitHub Action on the `live` branch, before the evening of 2026-10-27.
- [x] UI direction (`04-ui-design.md`): the moving landscape in red and green, the $-helix mark. Landing page on `feat/site`, checked in Chromium with WebGPU at 1440 px (both themes) and 390 px.
- [x] Landing in GraphMan's layout (hero over the terrain, chromosome and operator figures, session timeline, checks, footer with EEL874), nav tab and GitHub button, button transitions (`feat/site`).
- [x] `/montar`: pick the starting parameters and operate 10 past sessions in the browser with the live engine (`src/lib/sim/simulate.ts`, a Web Worker, `public/data/market.json` refreshed by `pnpm data`). The default run (formation 2026-10-08) gives R$ 102,164.01 in Node and in Chromium, to the cent.
- [x] Engine made bit-identical across engines (`dexp`/`dlog`, polar normals; `02-genetic-algorithm.md`), merged to `main` before the formation run.
- [x] The mark: the S and the stem as the two strands of a helix, black S, green stem, red rungs (`04-ui-design.md`).
- [x] `/montar` reworked into one fixed screen: parameters in a sidebar, a navigable stage with three views and a session timeline (`04-ui-design.md`), checked at 1440, 1280 and 390 px in both themes.
- [x] Landing cut to three screens with three grounds, the GA figure in tabs (`04-ui-design.md`); one navbar on every page, the home's green name sliding off as the tab underline.
- [x] IBM Plex for type, the hero's name in red and green, the helix motif in the footer and the checks; the hero's caption removed.
- [x] `/montar` opened up: 1 to 60 sessions, a third company mode where the visitor picks the 10 in a picker over the stage (strict mode with a given locked set, `SimConfig.companies`); groups that close, a hidden scroll bar, the hint floating beside the parameter. The default run is unchanged (R$ 102,164.01).
- [x] The terrain moves every 8 s instead of 18 s; the operators figure glides from one operator to the next (a sliding frame, a progress line, cross-faded text), and the pointer on one holds it.
- [x] `/montar` keeps its state and its running simulation across page changes (module-level store), checked by leaving mid-run and coming back.
- [x] `/montar`: a draggable, remembered sidebar width; the pre-run card cut to a title, three steps, a dot timeline and the run button.
- [x] The Vercel project: `genwallet`, production from `main`, 2026-10-26; served at `genwallet-ufrj.vercel.app` since 2026-10-27 (`genwallet-xi.vercel.app` no longer resolves). The tuned default run checked there to the cent.
- [x] Hyperparameter search (`pnpm tune`, `02-genetic-algorithm.md`), 2026-10-27: five years, 11,079 runs; the builder starts from `TUNED` (`0xfd49e`, the `active` fitness), +0.01% over BOVA11 per held-out window against −0.62% for the old defaults. The live run keeps `DEFAULT_PARAMS`. The builder's default run is now R$ 97,637.08.
- [ ] Strict mode: carry a locked company that drops below the liquidity floor instead of throwing (`problem.ts`), seen in the search.
- [x] Short selling tested on a branch, 2026-10-27 (negative weights, a gross cap, a borrow fee; a grid of 19 configs on the same windows): the training pick ties the long-only default on the held-out windows (+0.03% against +0.01% over BOVA11); Sharpe with shorts hedges falls (about +1% over BOVA11 when it fell) and gives it back in rallies. Dropped on 2026-10-28, Lucas: not good enough to keep.
- [ ] **Live run, 2026-10-27 (session 1)**: Yahoo served zero opens at 22:30 BRT and the job recorded a null fill, a null mark and a session-2 decision from `current: null` (`03-live-run.md`). The guard against it is on `feat/portfolio-size`; the repair of `live/` is Lucas's call.
- [ ] **The class challenge** (Lucas, 2026-10-28: "who gets the best results wins, I wanna win it"). Literature read and written up (`01-research.md`): a rank prize rewards variance, so a `goal` fitness (`02-genetic-algorithm.md`, Browne 1999) and two tail columns in the tuner; `scripts/grids/goal.json` tests it. A `params` event lets the live run change its parameters from a given evening on, with the reason in the record (`03-live-run.md`); checked on a copy of the dry run. Whether the live run switches is Lucas's call, committed before the open it first trades on. Grid result (3,822 runs, no failures), per held-out window: the tuned default +0.01% over BOVA11, no window 3 points above it, 90th percentile +9.3%, worst −6.6%; `goal` 0.4% a session with wMax 20% −0.35% over BOVA11, 20% of windows 3 points above it, p90 +7.1%, worst −11.0%; `goal` 1% with wMax 30% −0.92%, 20% big wins, p90 +16.9%, worst −12.3%. The tail widens both ways, as the theory says; the mean falls about 1 point.
- [x] `/montar`: companies per portfolio, 2 to 30 (`feat/portfolio-size`, 2026-10-28). The grid `scripts/grids/k.json` (`pnpm tune --grid`, 1,764 runs) found no gain in size: per held-out window over BOVA11, 10 companies +0.01%, 15 between -0.11% and -0.10%, 20 between -0.18% and -0.16%, 5 -0.52%; the same order on training. The other parameters were tuned for 10, so a wider search at 15 or 20 is still open.

## Plan

1. **2026-10-26**: engine + `pnpm live`, formation run, push.
2. **2026-10-27**: the Action; watch the first fill and mark; `pnpm live:verify` on the formation.
3. **Until 2026-11-10**: site (landing, ao vivo, lab), then the study; the run goes on by itself.
4. **2026-11-10 evening**: final mark; the study's numbers; rehearse.

## Risks

- **Yahoo blocks or changes the API** mid-run: fallback to COTAHIST for raw open/close (adjusted history is already archived per day).
- **The Action runs late** (GitHub schedules can slip): three idempotent slots before the open; worst case a session is `missed`, which the log records honestly.
- **Survivorship bias** in the study: today's composition back-tested over two years favours survivors; say it on the study page.
- **Ten sessions are noise**: the random cone and the study exist for this reason.

## Open questions for Lucas

1. Presentation date (sets the study's deadline).
3. An LLM narrator per session (Groq, the model narrates, the code decides): in or out?
