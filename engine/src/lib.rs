// The GenWallet genetic algorithm (spec/02-genetic-algorithm.md), compiled to
// WebAssembly for the nightly job, the tuner and the builder alike, so they
// run the same binary. A port of the TypeScript engine that ran the live run
// until 2026-10-29, checked against it bit for bit (`pnpm engine:check`).

// The loops index arrays as the TypeScript does, `!(x > 0.0)` keeps NaN out,
// and fdlibm's constants keep their published digits.
#![allow(
    clippy::needless_range_loop,
    clippy::neg_cmp_op_on_partial_ord,
    clippy::should_implement_trait,
    clippy::excessive_precision
)]

pub mod evolve;
pub mod fitness;
pub mod math;
pub mod operators;
pub mod params;
pub mod problem;
pub mod repair;
pub mod rng;
pub mod wasm;
