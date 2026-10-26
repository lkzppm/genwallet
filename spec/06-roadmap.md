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
- [ ] Lucas picks the mark among six variants; then the Vercel project.

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
