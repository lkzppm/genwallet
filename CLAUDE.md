# GenWallet — guide for Claude Code sessions

A genetic algorithm that builds a 10-company portfolio from the Ibovespa and operates it, live, over 10 real B3 sessions (2026-10-27 to 2026-11-10), plus an in-browser lab and a walk-forward study. UFRJ, Inteligência Artificial: "Criar Carteira de Ações com 10 empresas e operar geneticamente durante 10 pregões". Repository: `lkzppm/genwallet`.

**Read `spec/README.md` first.** It indexes the knowledge base.

## Rules

- The engine (`src/lib/ga/`) is deterministic: a seeded PRNG, ties broken by id, no `Math.random`. The nightly job, the lab and the study share it.
- No look-ahead: decide on the close of `t`, fill at the open of `t+1`. Never edit `live/` by hand; it is the record of the run.
- The whole codebase is English (code, comments, commits, docs). The UI is bilingual, Portuguese by default; no em dash in anything the visitor reads.
- Branches `main` ← `dev` ← `feat/*`; the bot writes only to `live`. Commit with `/commit`, integrate with `/merge`.

## When a decision changes

Update the matching file in `spec/` with an absolute date, and `spec/06-roadmap.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
