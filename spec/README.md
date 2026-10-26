# spec/ : project knowledge base

Short, stable documents so any session (human or Claude Code) can pick up the work without re-deriving it. Read in this order:

| File | What it holds |
|---|---|
| [00-overview.md](00-overview.md) | The assignment, how we read it, the three fronts (live run, lab, study), success criteria |
| [01-research.md](01-research.md) | Web research and endpoint probes of 2026-10-26: literature, data sources, costs, hosting limits, sources |
| [02-genetic-algorithm.md](02-genetic-algorithm.md) | The AI core: chromosome, repair, fitness, operators, the population that lives across sessions, parameters |
| [03-live-run.md](03-live-run.md) | The real 10-session run: calendar, timing, accounting, the event log, integrity (commit before the open, seeded replay), the nightly job |
| [04-ui-design.md](04-ui-design.md) | Visual direction (open, to be debated with Lucas), screens, figures |
| [05-stack-and-versions.md](05-stack-and-versions.md) | Planned stack, commands, environment |
| [06-roadmap.md](06-roadmap.md) | Status, the plan to the end of the live run, risks, open questions |

## Status legend

Documents written before the code mark their claims:

- **Decided**: chosen, build it this way unless a new fact appears.
- **Proposed**: a default worth starting from; change freely and record why.
- **Unverified**: read from docs or a search summary, never run. Check before relying on it.

## Maintenance rules

- Update the spec when a decision changes, not when a line of code changes.
- Absolute dates only (2026-10-26, never "yesterday").
- When something marked Proposed or Unverified gets built and tested, rewrite it as fact with the date.
- `CLAUDE.md` at the root points here; do not duplicate content there.
- Sister projects worth copying from: `../Debate-ai` (Debait: Next.js 16, event log + `reduce()`, i18n, vgpu background, Vercel setup), `../CV-AI`, and `../GraphMan` (`web/` uses vgpu for heavy rendering; `spec/DESIGN.md` is a full design system; its case-study runner is the model for our study).
