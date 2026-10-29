// Scores are risk-adjusted excess returns net of the cost of moving from the
// current portfolio, with the cost amortised over `horizon` sessions so a
// swap must pay for itself before the run ends. Over the CDI (Sharpe,
// Sortino, return over CVaR), or over BOVA11 (`active`: the expected return
// above the index over the tracking error, an information ratio), or over a
// hurdle (`goal`: the chance of reaching a daily return by the deadline; when
// no portfolio expects to, more volatility is more chance, so the GA
// concentrates).

use crate::math::{js_max, js_min};
use crate::params::{Fitness, Params};
use crate::problem::Problem;
use crate::repair::Genome;

#[derive(Clone, Copy, Debug)]
pub struct Evaluation {
    pub score: f64,
    /// Expected daily return.
    pub mean: f64,
    /// Daily volatility.
    pub vol: f64,
    /// Σ|wᵢ − hᵢ|: buys plus sells as a share of the portfolio.
    pub turnover: f64,
    /// Fees and slippage of the turnover, as a share of the portfolio.
    pub cost: f64,
}

fn finite_or_worst(score: f64) -> f64 {
    if score.is_finite() {
        score
    } else {
        f64::NEG_INFINITY
    }
}

pub fn evaluate(p: &Problem, params: &Params, g: &Genome) -> Evaluation {
    let n = p.n;
    let k = g.assets.len();
    let sqrt_252 = 252f64.sqrt();

    let mut mean = 0.0;
    let mut variance = 0.0;
    let mut turnover = p.current_sum;
    for i in 0..k {
        let a = g.assets[i];
        let w = g.weights[i];
        mean += w * p.mu[a];
        let row = a * n;
        for j in 0..k {
            variance += w * g.weights[j] * p.cov[row + g.assets[j]];
        }
        // Held assets left out of the genome are sold in full: they stay in the
        // starting sum; those kept are swapped for their |Δw|.
        turnover += (w - p.current_weight[a]).abs() - p.current_weight[a];
    }
    let vol = js_max(variance, 0.0).sqrt();
    let cost = (params.fee + params.slippage) * turnover;

    if params.fitness == Fitness::Active {
        // Var(portfolio − index) = w'Σw − 2 w'c + σ²ᵢ, floored so a near-copy of the index cannot divide by zero.
        let bench_cov = p.bench_cov.as_ref().expect("the active fitness has the benchmark");
        let mut c = 0.0;
        for i in 0..k {
            c += g.weights[i] * bench_cov[g.assets[i]];
        }
        let tracking = js_max(variance - 2.0 * c + p.bench_var, 1e-8).sqrt();
        let score = ((mean - p.bench_mean - cost / params.horizon) * sqrt_252) / tracking;
        return Evaluation { score: finite_or_worst(score), mean, vol, turnover, cost };
    }

    let target = if params.fitness == Fitness::Goal { params.goal } else { p.rf };
    let excess = mean - target - cost / params.horizon;

    let mut risk = vol;
    if params.fitness != Fitness::Sharpe && params.fitness != Fitness::Goal {
        let mut series = vec![0.0; p.days];
        for (d, out) in series.iter_mut().enumerate() {
            let mut r = 0.0;
            let row = d * n;
            for i in 0..k {
                r += g.weights[i] * p.returns[row + g.assets[i]];
            }
            *out = r;
        }
        if params.fitness == Fitness::Sortino {
            let mut s = 0.0;
            for &r in &series {
                let down = js_min(0.0, r - p.rf);
                s += down * down;
            }
            risk = (s / p.days as f64).sqrt();
        } else {
            series.sort_by(|x, y| x.total_cmp(y));
            let tail = js_max(1.0, (0.05 * p.days as f64).ceil()) as usize;
            let mut s = 0.0;
            for &r in &series[..tail] {
                s += r;
            }
            risk = js_max(0.0, -s / tail as f64);
        }
    }

    let score = if risk > 0.0 { (excess * sqrt_252) / risk } else { f64::NEG_INFINITY };
    Evaluation { score: finite_or_worst(score), mean, vol, turnover, cost }
}
