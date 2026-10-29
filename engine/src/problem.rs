// One evening's fitness landscape: the estimates every individual is scored
// against, built once per run from the evening's input (ProblemInput in
// src/lib/ga/problem.ts, decoded by wasm.rs).

use crate::math::{js_max, js_min, js_round};
use crate::params::{Fitness, Params};

pub struct Input {
    /// Adjusted closes per asset; null is NaN. Arrays may differ in length.
    pub prices: Vec<Vec<f64>>,
    /// Median daily traded value per asset; null is 0, as `>=` reads it.
    pub traded: Vec<f64>,
    /// Interned company and sector of each asset.
    pub company: Vec<u32>,
    pub sector: Vec<u32>,
    pub rf: f64,
    /// The holdings in the order of the input object; tickers outside the universe left out.
    pub current: Vec<(usize, f64)>,
    /// Strict mode's tickers by index, None for a ticker outside the universe.
    pub locked: Option<Vec<Option<usize>>>,
    /// NaN when absent.
    pub exposure: f64,
    /// BOVA11 over the same sessions, `days + 1` values (null and missing are NaN).
    pub bench: Option<Vec<f64>>,
}

pub enum ProblemError {
    ActiveNeedsBench,
    StrictNeedsLocked,
    /// The position in `locked` of a ticker that is not eligible.
    LockedNotEligible(usize),
}

pub struct Problem {
    pub n: usize,
    pub days: usize,
    pub company: Vec<u32>,
    pub sector: Vec<u32>,
    pub eligible: Vec<usize>,
    pub is_eligible: Vec<bool>,
    /// Shrunk expected daily return per asset.
    pub mu: Vec<f64>,
    /// Shrunk daily covariance, n × n row-major.
    pub cov: Vec<f64>,
    /// Daily returns, days × n row-major (zero for ineligible assets).
    pub returns: Vec<f64>,
    pub rf: f64,
    /// Current weight per asset (cash excluded).
    pub current_weight: Vec<f64>,
    pub current_sum: f64,
    /// Held assets, sorted.
    pub held: Vec<usize>,
    pub locked: Option<Vec<usize>>,
    pub bench_mean: f64,
    pub bench_var: f64,
    pub bench_cov: Option<Vec<f64>>,
}

/// JavaScript truthiness of a number.
fn truthy(x: f64) -> bool {
    x != 0.0 && !x.is_nan()
}

pub fn build_problem(input: &Input, params: &Params) -> Result<Problem, ProblemError> {
    let n = input.prices.len();
    let days = input.prices[0].len() - 1;

    let mut is_eligible = vec![false; n];
    let mut eligible = Vec::new();
    for a in 0..n {
        let p = &input.prices[a];
        let full = p.len() == days + 1 && p.iter().all(|&x| x > 0.0);
        if full && input.traded[a] >= params.min_traded {
            is_eligible[a] = true;
            eligible.push(a);
        }
    }

    let mut returns = vec![0.0; days * n];
    let mut mean = vec![0.0; n];
    for &a in &eligible {
        let p = &input.prices[a];
        let mut sum = 0.0;
        for d in 0..days {
            let r = p[d + 1] / p[d] - 1.0;
            returns[d * n + a] = r;
            sum += r;
        }
        mean[a] = sum / days as f64;
    }

    // The expected returns may leave the latest sessions out (`skip`); the
    // covariance always uses the whole window.
    let skip = js_min(days as f64 - 2.0, js_max(0.0, js_round(params.skip)));
    let skip = if skip > 0.0 { skip as usize } else { 0 };
    let signal = if skip > 0 {
        let mut signal = vec![0.0; n];
        for &a in &eligible {
            let mut sum = 0.0;
            for d in 0..days - skip {
                sum += returns[d * n + a];
            }
            signal[a] = sum / (days - skip) as f64;
        }
        signal
    } else {
        mean.clone()
    };

    // Raw means are the noisiest estimate; pulling them toward the average
    // keeps the GA from simply buying last year's winners.
    let mut grand = 0.0;
    for &a in &eligible {
        grand += signal[a];
    }
    grand /= if eligible.is_empty() { 1.0 } else { eligible.len() as f64 };
    let mut mu = vec![0.0; n];
    for &a in &eligible {
        mu[a] = (1.0 - params.mean_shrink) * signal[a] + params.mean_shrink * grand;
    }

    let mut sample = vec![0.0; n * n];
    for i in 0..eligible.len() {
        let a = eligible[i];
        for &b in &eligible[i..] {
            let mut s = 0.0;
            for d in 0..days {
                s += (returns[d * n + a] - mean[a]) * (returns[d * n + b] - mean[b]);
            }
            s /= days as f64 - 1.0;
            sample[a * n + b] = s;
            sample[b * n + a] = s;
        }
    }

    // Constant-correlation target: same variances, every pair at the mean correlation.
    let mut sd = vec![0.0; n];
    for &a in &eligible {
        sd[a] = sample[a * n + a].sqrt();
    }
    let mut corr_sum = 0.0;
    let mut pairs = 0u32;
    for i in 0..eligible.len() {
        for j in i + 1..eligible.len() {
            let a = eligible[i];
            let b = eligible[j];
            if sd[a] > 0.0 && sd[b] > 0.0 {
                corr_sum += sample[a * n + b] / (sd[a] * sd[b]);
                pairs += 1;
            }
        }
    }
    let rbar = if pairs > 0 { corr_sum / pairs as f64 } else { 0.0 };
    let mut cov = vec![0.0; n * n];
    for &a in &eligible {
        for &b in &eligible {
            let target = if a == b { sample[a * n + a] } else { rbar * sd[a] * sd[b] };
            cov[a * n + b] = (1.0 - params.cov_shrink) * sample[a * n + b] + params.cov_shrink * target;
        }
    }

    // The benchmark, from the same window as the prices (it ends on the decision's close too).
    let mut bench_mean = 0.0;
    let mut bench_var = 0.0;
    let mut bench_cov = None;
    if let Some(b) = &input.bench {
        let mut br = vec![0.0; days];
        for d in 0..days {
            let p0 = b[d];
            let p1 = b[d + 1];
            br[d] = if truthy(p0) && truthy(p1) { p1 / p0 - 1.0 } else { 0.0 };
        }
        let mut all = 0.0;
        for d in 0..days {
            all += br[d];
        }
        all /= days as f64;
        let mut recent = 0.0;
        for d in 0..days - skip {
            recent += br[d];
        }
        bench_mean = recent / (days - skip) as f64;
        for d in 0..days {
            bench_var += (br[d] - all) * (br[d] - all);
        }
        bench_var /= days as f64 - 1.0;
        let mut c = vec![0.0; n];
        for &a in &eligible {
            let mut s = 0.0;
            for d in 0..days {
                s += (returns[d * n + a] - mean[a]) * (br[d] - all);
            }
            c[a] = s / (days as f64 - 1.0);
        }
        bench_cov = Some(c);
    }
    if params.fitness == Fitness::Active && bench_cov.is_none() {
        return Err(ProblemError::ActiveNeedsBench);
    }

    let mut current_weight = vec![0.0; n];
    let mut held = Vec::new();
    let mut current_sum = 0.0;
    for &(a, w) in &input.current {
        if !(w > 0.0) {
            continue;
        }
        current_weight[a] = w;
        current_sum += w;
        held.push(a);
    }
    held.sort_unstable();
    // Under the cash rule the holdings are `exposure` of the NAV: the GA
    // compares its weights, which sum to 1, with the holdings as a share of it.
    let e = input.exposure;
    if e > 0.0 && e < 1.0 {
        for &a in &held {
            current_weight[a] /= e;
        }
        current_sum /= e;
    }

    let mut locked = None;
    if params.strict {
        let given = match &input.locked {
            Some(l) if l.len() as f64 == params.k => l,
            _ => return Err(ProblemError::StrictNeedsLocked),
        };
        let mut l = Vec::with_capacity(given.len());
        for (i, a) in given.iter().enumerate() {
            match a {
                Some(a) if is_eligible[*a] => l.push(*a),
                _ => return Err(ProblemError::LockedNotEligible(i)),
            }
        }
        l.sort_unstable();
        locked = Some(l);
    }

    Ok(Problem {
        n,
        days,
        company: input.company.clone(),
        sector: input.sector.clone(),
        eligible,
        is_eligible,
        mu,
        cov,
        returns,
        rf: input.rf,
        current_weight,
        current_sum,
        held,
        locked,
        bench_mean,
        bench_var,
        bench_cov,
    })
}
