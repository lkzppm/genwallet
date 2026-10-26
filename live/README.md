# The live record

Written only by the nightly workflow (`.github/workflows/live.yml` on `main`); never edited by hand.

- `log.json`: the append-only event log of the run (start, decision, fill, mark, missed).
- `days/<date>.json`: everything one evening's decision depended on.
- `population/<date>.json`: the population at the end of that evening.

Replay any evening with `pnpm live:verify --dir <path to this folder> <date>` from `main`. Each decision's commit is timestamped before the open it fills on. Paper money only.
