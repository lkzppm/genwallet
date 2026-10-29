// The knobs the engine reads, decoded from GaParams (src/lib/ga/params.ts).
// Counts stay f64 and are compared as JavaScript compares numbers.

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Fitness {
    Sharpe,
    Sortino,
    Cvar,
    Active,
    Goal,
}

#[derive(Clone, Debug)]
pub struct Params {
    pub k: f64,
    pub w_min: f64,
    pub w_max: f64,
    pub sector_cap: f64,
    pub population_size: f64,
    pub elite: f64,
    pub tournament: f64,
    pub crossover_rate: f64,
    pub blx_alpha: f64,
    pub swap_rate: f64,
    pub weight_rate: f64,
    pub weight_sigma: f64,
    pub transfer_rate: f64,
    pub hyper_factor: f64,
    pub diversity_floor: f64,
    pub immigrant_rate: f64,
    pub mean_shrink: f64,
    /// `skip ?? 0`.
    pub skip: f64,
    pub cov_shrink: f64,
    pub min_traded: f64,
    pub fee: f64,
    pub slippage: f64,
    pub horizon: f64,
    pub fitness: Fitness,
    /// `goal ?? 0`.
    pub goal: f64,
    pub strict: bool,
}

impl Params {
    /// k as a count (the TypeScript engine only ever compared lengths with it).
    pub fn k_count(&self) -> usize {
        self.k as usize
    }
}
