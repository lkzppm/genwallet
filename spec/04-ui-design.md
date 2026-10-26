# 04 — UI design

**Background, palette and mark decided 2026-10-26 (Lucas); screens beyond the landing still Proposed.**

## Starting idea (Lucas, 2026-10-26)

A vgpu background running something animated in the spirit of Conway's Game of Life. Note for the debate: Life is a cellular automaton (fixed rules, no genomes, no selection), not a genetic algorithm, so on its own it would tell the wrong story. Variants that keep the look and tell the right one are in the debate.

## The background: the moving landscape (Decided, 2026-10-26)

Lucas chose idea 1 of three (landscape, garden of 10-petal portfolios, lineage tapestry) and asked for red and green.

- A topographic map of a fitness landscape: thin contour lines (`fract` of height over `fwidth`), every fifth an index contour; **green on the peaks, red in the pits**, grey on the plain; a faint wash of the same colours; a lamp of brighter lines around the pointer (`src/components/terrain/terrain.wgsl`).
- A **real GA runs on it** (`landscape.ts`): 96 points, tournament of 2, elitism, BLX-α crossover, Gaussian mutation with hypermutation when the population collapses; every 18 s a "session" moves the bumps (6 s morph) and 15% random immigrants arrive. Clicking the map drops 10 immigrants where it lands. The champion wears a green ring (`dots.wgsl`, instanced quads).
- It is a **demo landscape**, and the caption says so. Peaks keep to the right half, where no text covers the climb. Replacing it with the real portfolio landscape (a fixed PCA projection of the evaluated weight vectors, height from their fitness) is next once the formation run exists.
- Without WebGPU or with reduced motion: one still frame of the same map on a 2D canvas.

## Palette and type (Decided, 2026-10-26)

Green is up, red is down, and nothing else is coloured: paper `#f4f4f0` / night `#08090a`, greys for text and borders, `--up` `#12863f` / `#2bd576`, `--down` `#d62839` / `#ff4d5e`. Inter for text, Geist Mono for numbers; square panels and buttons with hairline borders, like Debait.

## The mark (Decided, 2026-10-26, Lucas)

A dollar sign drawn as a DNA double helix whose two strands are the letter's two strokes: the **S** (black on paper, the text colour at night) and the **stem** (green) it winds around, joined by **red rungs**. The S passes over the stem at the top and bottom crossings and under it in the middle, so the pair twists. `src/app/icon.svg` is the paper tile (legible on light and dark tabs); `src/components/site/logo.tsx` takes the theme's colours.

Rejected on the way, all on 2026-10-26: two mirrored S strands (read as an 8), an S knocked out over a helix stem, the S as a twisting ribbon, ten genes forming the S, contour lines, a coin, an S with a strand wound round it, and an S as one strand of a vertical sine helix (read as a zigzag).

## The landing, three screens (Decided, 2026-10-26, Lucas)

Each section is about one viewport and has its own ground:

1. **Hero** on the moving landscape (WebGPU).
2. **How it works** on a plain tint: the brief and four facts beside one figure in three tabs (the chromosome, whose genes mutate on a click; selection, crossover and mutation in turn; the five stops of a session). The tabs turn on their own, a green line filling under the current one, and the pointer on the figure pauses them.
3. **Built to be checked** on the gene pool (`src/components/site/gene-pool.tsx`, a 2D canvas): a grid of genes that a generation sweeps every 5.5 s, mutating a few in green or red; the pointer lights the genes around it and a click sends a ring of mutations. The four checks and the way into the builder.

## The builder, one fixed screen (Decided, 2026-10-26, Lucas)

`/montar` follows GraphMan's observatory: nothing scrolls the page, and the footer is not shown.

- **Sidebar (22rem, left)**: three groups (Operation, Algorithm, Constraints), one open at a time. Every parameter has an icon; numbers are a slider plus a typed value, with a tick at the default and a green dot that restores it. A line above the run button explains the parameter under the pointer. The run button turns into the progress bar while the worker runs.
- **Stage (the rest)**: before the first run, the landscape behind a card that lists the ten sessions the run will operate. After it, six figures across the top (the three returns, final value, costs, timing), three views (overview: value chart and per-session returns; session: portfolio, that evening's evolution, trades; composition: weights as a heatmap of companies by sessions) and the ten sessions on a timeline along the bottom. ← → and clicks on any chart move between sessions.
- **Motion**: views and sessions enter from the side of the move; the portfolio's rows slide to their new ranks; lines draw in from the left; groups open with a height transition.
- **Phone**: a switch at the top shows the parameters or the result, each on the full screen.

## Constraints inherited from the sister projects

- Bilingual interface, Portuguese by default, every string in `src/i18n/`; no em dash in visitor text.
- Colours as tokens in `src/app/globals.css`, two themes; vgpu backgrounds with a static fallback when WebGPU is missing (Debait's cubes).
- The landing page follows GraphMan's: the name, one sentence, an animated figure that explains, numbers that come from the code.

## Screens (Proposed)

1. **Landing**: name, one sentence, the background, the live run's headline numbers.
2. **Ao vivo**: the 10 sessions as a timeline; per session the order, the fills, the NAV against the Ibovespa, the CDI and the random cone; a "replay this evening" button that runs the archived GA in the browser.
3. **Laboratório**: parameters, a historical window, run or step generation by generation; the population cloud (risk × return), convergence, gene heatmap, family tree of the champion.
4. **Estudo**: walk-forward results over ~50 windows, the percentile distribution.
