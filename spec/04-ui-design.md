# 04 — UI design

**Background, palette and mark decided 2026-10-26 (Lucas); screens beyond the landing still Proposed.**

## Starting idea (Lucas, 2026-10-26)

A vgpu background running something animated in the spirit of Conway's Game of Life. Note for the debate: Life is a cellular automaton (fixed rules, no genomes, no selection), not a genetic algorithm, so on its own it would tell the wrong story. Variants that keep the look and tell the right one are in the debate.

## The background: the moving landscape (Decided, 2026-10-26)

Lucas chose idea 1 of three (landscape, garden of 10-petal portfolios, lineage tapestry) and asked for red and green.

- A topographic map of a fitness landscape: thin contour lines (`fract` of height over `fwidth`), every fifth an index contour; **green on the peaks, red in the pits**, grey on the plain; a faint wash of the same colours; a lamp of brighter lines around the pointer (`src/components/terrain/terrain.wgsl`).
- A **real GA runs on it** (`landscape.ts`): 96 points, tournament of 2, elitism, BLX-α crossover, Gaussian mutation with hypermutation when the population collapses; every 8 s a "session" moves the bumps (4.5 s morph; 18 s and 6 s until 2026-10-26, shortened at Lucas's request so the landscape visibly changes) and 15% random immigrants arrive. Clicking the map drops 10 immigrants where it lands. The champion wears a green ring (`dots.wgsl`, instanced quads).
- It is a **demo landscape**, and the caption says so. Peaks keep to the right half, where no text covers the climb. Replacing it with the real portfolio landscape (a fixed PCA projection of the evaluated weight vectors, height from their fitness) is next once the formation run exists.
- Without WebGPU or with reduced motion: one still frame of the same map on a 2D canvas.

## Palette and type (Decided, 2026-10-26)

Green is up, red is down, and nothing else is coloured: paper `#f4f4f0` / night `#08090a`, greys for text and borders, `--up` `#12863f` / `#2bd576`, `--down` `#d62839` / `#ff4d5e`. IBM Plex Sans for text and IBM Plex Mono for numbers (Decided, 2026-10-26, Lucas: its own face among the sister projects, which use Inter and Geist, and steady figures for prices); square panels and buttons with hairline borders, like Debait. The hero's name runs from red to green, *Gen* in `--down` and *Wallet* in `--up`, as the landscape behind it does. The DNA motif (`src/components/site/helix.tsx`, two strands and rungs in the mark's colours) marks the footer's columns and hangs each check of the third section.

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

### Free choice of companies and sessions (Decided, 2026-10-26, Lucas)

- **Sessions**: a slider from 1 to 60 (default 10, the live run's). The formation range, the card, the timeline (a date every few stops past 12), the composition (narrower columns past 15) and the run button follow it.
- **Cash** (2026-10-28): an on/off control in the run group, with the trend window (5 to 200 sessions, default 100) and the exposure in a fall (0 to 90%, default 0%) sliding open under it; on by default since the evening of 2026-10-28. Off, the parameters carry no rule at all.
- **Companies per portfolio** (2026-10-28): a slider from 2 to 30 in the constraints group (default 10, the live run's). The picker's slots, the bounds check (minimum × k ≤ 100% ≤ maximum × k) and a new one (cap per sector × sectors ≥ k) follow it; chosen by hand, the picks must be exactly k.
- **Companies**: a third mode, *Escolhidas*, beside *Livres* and *Fixas*. The visitor picks the k in a picker that opens over the stage (search, sector filter, columns sortable by return, volatility over the lookback and median traded value, a sparkline per ticker). The run is then strict mode with the picks as the locked set from the formation, so the engine is unchanged (`SimConfig.companies`); the sector cap does not apply, as in strict mode. A ticker the engine would refuse on some evening of the window (no full lookback, or under the minimum traded value) cannot be picked, and a second share class of a company already in is blocked.
- **Resizable sidebar** (2026-10-26): a handle on its right edge drags it between 288 and 576 px (default 352); arrows step it, a double click restores it, and the browser remembers the width (localStorage, a per-viewer convenience).
- **The pre-run card** (2026-10-26): less text, more figure. The title, three steps (forms 10 companies, operates N sessions, compares with BOVA11 and CDI), the formation and its sessions as dots on a line, and the data in one small line. The run button lives only in the sidebar, and the button that restores every default appears beside it only once something differs from the defaults.
- **State across pages** (2026-10-26): the simulator (its worker and everything it sent) and the builder's view state (form, view, picked session, open group, picker filters) live in module memory (`use-simulator.ts`, `useKept`), so leaving `/montar` and coming back finds it as it was, and a run in progress keeps going. A reload starts fresh. The landing restarts on every visit.
- **Sidebar**: a second click on the open group closes it; the scroll bar is hidden; the explanation of a parameter floats beside it only while the pointer or the focus is on it (under it on a phone). The data line ("76 papéis do Ibovespa...") moved from the sidebar's header to the card on the stage.

## Constraints inherited from the sister projects

- Bilingual interface, Portuguese by default, every string in `src/i18n/`; no em dash in visitor text.
- Colours as tokens in `src/app/globals.css`, two themes; vgpu backgrounds with a static fallback when WebGPU is missing (Debait's cubes).
- The landing page follows GraphMan's: the name, one sentence, an animated figure that explains, numbers that come from the code.

## Screens (Proposed)

1. **Landing**: name, one sentence, the background, the live run's headline numbers.
2. **Ao vivo**: the 10 sessions as a timeline; per session the order, the fills, the NAV against the Ibovespa, the CDI and the random cone; a "replay this evening" button that runs the archived GA in the browser.
3. **Laboratório**: parameters, a historical window, run or step generation by generation; the population cloud (risk × return), convergence, gene heatmap, family tree of the champion.
4. **Estudo**: walk-forward results over ~50 windows, the percentile distribution.
