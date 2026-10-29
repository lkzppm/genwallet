// Infeasible genomes are repaired, never penalised (spec/02): one company per
// slot, exactly k slots, a cap per sector, and weights on the bounded simplex.

use crate::math::{js_max, js_min};
use crate::params::Params;
use crate::problem::Problem;
use crate::rng::Rng;

#[derive(Clone, Debug)]
pub struct Genome {
    pub assets: Vec<usize>,
    pub weights: Vec<f64>,
}

pub struct NoFeasibleAsset;

/// The closest point of `{lo ≤ wᵢ ≤ hi, Σw = 1}` to `v`: wᵢ = clip(vᵢ − τ, lo, hi),
/// with τ found by bisection (the sum is monotone in τ).
pub fn project_weights(v: &[f64], lo: f64, hi: f64) -> Vec<f64> {
    let mut a = v.iter().fold(f64::INFINITY, |m, &x| js_min(m, x)) - hi;
    let mut b = v.iter().fold(f64::NEG_INFINITY, |m, &x| js_max(m, x)) - lo;
    let sum = |tau: f64| v.iter().fold(0.0, |s, &x| s + js_min(hi, js_max(lo, x - tau)));
    for _ in 0..100 {
        let mid = (a + b) / 2.0;
        if sum(mid) > 1.0 {
            a = mid;
        } else {
            b = mid;
        }
    }
    let tau = (a + b) / 2.0;
    v.iter().map(|&x| js_min(hi, js_max(lo, x - tau))).collect()
}

/// Count per key in first-seen order, as a JavaScript Map keeps it.
fn sector_counts(p: &Problem, assets: impl Iterator<Item = usize>) -> Vec<(u32, f64)> {
    let mut count: Vec<(u32, f64)> = Vec::new();
    for a in assets {
        let s = p.sector[a];
        match count.iter_mut().find(|(k, _)| *k == s) {
            Some((_, c)) => *c += 1.0,
            None => count.push((s, 1.0)),
        }
    }
    count
}

/// A random eligible asset whose company is absent and whose sector has room.
fn candidate(p: &Problem, params: &Params, rng: &mut Rng, assets: &[usize]) -> Result<usize, NoFeasibleAsset> {
    let count = sector_counts(p, assets.iter().copied());
    let pool: Vec<usize> = p
        .eligible
        .iter()
        .copied()
        .filter(|&a| {
            !assets.iter().any(|&b| p.company[b] == p.company[a])
                && count.iter().find(|(s, _)| *s == p.sector[a]).map_or(0.0, |&(_, c)| c) < params.sector_cap
        })
        .collect();
    if pool.is_empty() {
        return Err(NoFeasibleAsset);
    }
    Ok(rng.pick(&pool))
}

#[derive(Clone, Copy)]
struct Slot {
    a: usize,
    w: f64,
}

pub fn repair(p: &Problem, params: &Params, rng: &mut Rng, genome: &Genome) -> Result<Genome, NoFeasibleAsset> {
    let k = params.k;
    let mut slots: Vec<Slot>;

    if let Some(locked) = &p.locked {
        // A later duplicate overrides an earlier one, as Map.set does.
        slots = locked
            .iter()
            .map(|&a| {
                let w = genome.assets.iter().rposition(|&x| x == a).map(|i| genome.weights[i]);
                Slot { a, w: w.unwrap_or(1.0 / k) }
            })
            .collect();
    } else {
        // One ticker per company, keeping the heavier one.
        let mut by_company: Vec<(u32, Slot)> = Vec::new();
        for (i, &a) in genome.assets.iter().enumerate() {
            if !p.is_eligible[a] {
                continue;
            }
            let w = genome.weights[i];
            let c = p.company[a];
            match by_company.iter_mut().find(|(x, _)| *x == c) {
                Some((_, prev)) => {
                    if w > prev.w || (w == prev.w && a < prev.a) {
                        *prev = Slot { a, w };
                    }
                }
                None => by_company.push((c, Slot { a, w })),
            }
        }
        slots = by_company.into_iter().map(|(_, s)| s).collect();
        slots.sort_by_key(|s| s.a);

        // Too many: drop the lightest (Chang et al. 2000).
        while slots.len() as f64 > k {
            let mut low = 0;
            for i in 1..slots.len() {
                if slots[i].w < slots[low].w {
                    low = i;
                }
            }
            slots.remove(low);
        }

        // Over-full sectors: swap their lightest member for an outsider with room.
        loop {
            let count = sector_counts(p, slots.iter().map(|s| s.a));
            let Some(&(over, _)) = count.iter().find(|(_, c)| *c > params.sector_cap) else {
                break;
            };
            let mut low: Option<usize> = None;
            for (i, s) in slots.iter().enumerate() {
                if p.sector[s.a] == over && low.is_none_or(|l| s.w < slots[l].w) {
                    low = Some(i);
                }
            }
            let removed = slots.remove(low.expect("an over-full sector has a member"));
            let assets: Vec<usize> = slots.iter().map(|s| s.a).collect();
            slots.push(Slot { a: candidate(p, params, rng, &assets)?, w: removed.w });
        }

        // Too few: fill with random outsiders at the average weight.
        while (slots.len() as f64) < k {
            let avg = if slots.is_empty() {
                1.0 / k
            } else {
                slots.iter().fold(0.0, |s, x| s + x.w) / slots.len() as f64
            };
            let assets: Vec<usize> = slots.iter().map(|s| s.a).collect();
            slots.push(Slot { a: candidate(p, params, rng, &assets)?, w: avg });
        }
    }

    slots.sort_by_key(|s| s.a);
    let raw: Vec<f64> = slots.iter().map(|s| if s.w.is_finite() && s.w > 0.0 { s.w } else { 0.0 }).collect();
    let total = raw.iter().fold(0.0, |s, &x| s + x);
    let scaled: Vec<f64> = if total > 0.0 {
        raw.iter().map(|&x| x / total).collect()
    } else {
        raw.iter().map(|_| 1.0 / k).collect()
    };
    Ok(Genome {
        assets: slots.iter().map(|s| s.a).collect(),
        weights: project_weights(&scaled, params.w_min, params.w_max),
    })
}
