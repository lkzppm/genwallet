# 05 — Stack and versions

**Proposed** (2026-10-26): the stack of Debait, minus what this project does not need.

| Piece | Choice | Note |
|---|---|---|
| Runtime | Node 26 locally, 24 in CI; pnpm 11 | as Debait |
| Engine | plain TypeScript in `src/lib/ga/`, no dependencies | shared by the nightly job, the Web Worker and the study |
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
```

## Environment

None required: every data source is public and keyless.
