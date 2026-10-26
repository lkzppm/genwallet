# 04 — UI design

**Open: to be debated with Lucas (from 2026-10-26).**

## Starting idea (Lucas, 2026-10-26)

A vgpu background running something animated in the spirit of Conway's Game of Life. Note for the debate: Life is a cellular automaton (fixed rules, no genomes, no selection), not a genetic algorithm, so on its own it would tell the wrong story. Variants that keep the look and tell the right one are in the debate.

## Constraints inherited from the sister projects

- Bilingual interface, Portuguese by default, every string in `src/i18n/`; no em dash in visitor text.
- Colours as tokens in `src/app/globals.css`, two themes; vgpu backgrounds with a static fallback when WebGPU is missing (Debait's cubes).
- The landing page follows GraphMan's: the name, one sentence, an animated figure that explains, numbers that come from the code.

## Screens (Proposed)

1. **Landing**: name, one sentence, the background, the live run's headline numbers.
2. **Ao vivo**: the 10 sessions as a timeline; per session the order, the fills, the NAV against the Ibovespa, the CDI and the random cone; a "replay this evening" button that runs the archived GA in the browser.
3. **Laboratório**: parameters, a historical window, run or step generation by generation; the population cloud (risk × return), convergence, gene heatmap, family tree of the champion.
4. **Estudo**: walk-forward results over ~50 windows, the percentile distribution.
