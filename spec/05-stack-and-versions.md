# 05 — Stack and versions

**Proposed** (2026-10-26): the stack of Debait, minus what this project does not need.

| Piece | Choice | Note |
|---|---|---|
| Runtime | Node 26 locally, 24 in CI; pnpm 11 | as Debait |
| Engine | Rust 1.98.1 in `engine/` (no crates), compiled to WebAssembly and embedded as base64 in `src/lib/ga/engine-wasm.ts`; TypeScript until 2026-10-29 (kept in `engine/reference`) | one binary for the nightly job, the tuner and the Web Worker; no Rust toolchain needed to build the site or run the job |
| Scripts | `tsx scripts/<name>.mts` | `.mts` for top-level `await` (lesson from CV-AI) |
| Site | Next.js 16, React 19, Tailwind 4, shadcn (radix-nova) | config copied from Debait when the site starts; read `node_modules/next/dist/docs/` before using an API from memory |
| Background | vgpu 0.5 | as Debait and GraphMan |
| Storage | none: `live/` files on the `live` branch | no Redis |
| TypeScript / ESLint | 5.9 / 9, pinned | as Debait |

## Commands (as they land)

```
pnpm live                 # nightly step: fill, mark, decide (idempotent)
pnpm live:verify <date>   # re-run a day's GA from its archived inputs
pnpm evolve --date <d>    # one GA run in the terminal, no side effects
pnpm data                 # public/data/market.json, the builder's two years
pnpm simulate             # the builder's replay in the terminal (--sessions, --companies, --strict)
pnpm tune:data            # .cache/market-5y.json, five years for the search
pnpm tune                 # the hyperparameter search (02-genetic-algorithm.md)
pnpm engine:build         # engine/src to WebAssembly, into src/lib/ga/engine-wasm.ts (needs cargo)
pnpm engine:check         # the WebAssembly engine against engine/reference, bit for bit
```

## Hosting (Decided, 2026-10-26)

Vercel project `genwallet` in the team `lucas-pachecos-projects-68b6e0dc`, connected to `lkzppm/genwallet`: production builds from `main`, previews from the other branches. Both pages are static; the worker fetches `/data/market.json`. First production deploy on 2026-10-26; served at `genwallet-ufrj.vercel.app` since 2026-10-27, the default replay checked there to the cent (R$ 97,637.08 with the tuned defaults).

## Environment

None required: every data source is public and keyless.
