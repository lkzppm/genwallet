# The TypeScript engine, kept as the reference

These files are `src/lib/ga` as it ran the live run from 2026-10-26 until the
port to Rust (`engine/src`, 2026-10-29). Nothing on the site or in the jobs
imports them; `pnpm engine:check` runs them beside the WebAssembly engine on
the same evenings and requires the same result to the last bit. They change
only if the Rust engine changes on purpose, and then together with it.
