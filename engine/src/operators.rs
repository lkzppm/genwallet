// Selection, crossover and mutation. Operators may produce infeasible
// genomes; the caller always repairs before evaluating.

use crate::evolve::{by_score, Individual};
use crate::math::{dexp, dlog, js_min};
use crate::params::Params;
use crate::problem::Problem;
use crate::repair::Genome;
use crate::rng::Rng;

/// The index of the winner of a tournament.
pub fn tournament(pop: &[Individual], size: f64, rng: &mut Rng) -> usize {
    let mut best = rng.int(pop.len());
    let mut i = 1.0;
    while i < size {
        let c = rng.int(pop.len());
        if by_score(&pop[c], &pop[best]) < 0.0 {
            best = c;
        }
        i += 1.0;
    }
    best
}

/// Random genome: k eligible assets and Dirichlet(1) weights.
pub fn random_genome(p: &Problem, params: &Params, rng: &mut Rng) -> Genome {
    let mut pool: Vec<usize> = p.locked.clone().unwrap_or_else(|| p.eligible.clone());
    let mut assets = Vec::new();
    while (assets.len() as f64) < params.k && !pool.is_empty() {
        let i = rng.int(pool.len());
        assets.push(pool.remove(i));
    }
    let raw: Vec<f64> = assets.iter().map(|_| -dlog(1.0 - rng.next())).collect();
    let total = raw.iter().fold(0.0, |s, &x| s + x);
    Genome { assets, weights: raw.iter().map(|&x| x / total).collect() }
}

/// Shared assets stay, their weights blended by BLX-α; the free slots are drawn
/// from the rest of both parents, each with the weight it had there.
pub fn crossover(a: &Genome, b: &Genome, params: &Params, rng: &mut Rng) -> Genome {
    // b's entries in insertion order, removed as a claims them (a Map's delete).
    let mut wb: Vec<Option<(usize, f64)>> = b.assets.iter().zip(&b.weights).map(|(&x, &w)| Some((x, w))).collect();
    let mut shared: Vec<(usize, f64)> = Vec::new();
    let mut rest: Vec<(usize, f64)> = Vec::new();
    for (i, &x) in a.assets.iter().enumerate() {
        // A Map keeps the last weight set for a key.
        let found = wb.iter().rposition(|e| matches!(e, Some((y, _)) if *y == x));
        let Some(at) = found else {
            rest.push((x, a.weights[i]));
            continue;
        };
        let w2 = wb[at].expect("found").1;
        let lo = js_min(a.weights[i], w2);
        let hi = crate::math::js_max(a.weights[i], w2);
        let d = hi - lo;
        shared.push((x, rng.range(lo - params.blx_alpha * d, hi + params.blx_alpha * d)));
        wb.retain(|e| !matches!(e, Some((y, _)) if *y == x));
    }
    rest.extend(dedup_last(wb.into_iter().flatten()));

    let mut child = shared;
    while (child.len() as f64) < params.k && !rest.is_empty() {
        let i = rng.int(rest.len());
        child.push(rest.remove(i));
    }
    Genome { assets: child.iter().map(|s| s.0).collect(), weights: child.iter().map(|s| s.1).collect() }
}

/// A Map built from pairs: one entry per key, at its first position, with its last value.
fn dedup_last(pairs: impl Iterator<Item = (usize, f64)>) -> Vec<(usize, f64)> {
    let mut out: Vec<(usize, f64)> = Vec::new();
    for (x, w) in pairs {
        match out.iter_mut().find(|e| e.0 == x) {
            Some(e) => e.1 = w,
            None => out.push((x, w)),
        }
    }
    out
}

pub fn mutate(p: &Problem, params: &Params, rng: &mut Rng, g: &Genome, boost: f64) -> Genome {
    let mut assets = g.assets.clone();
    let mut weights = g.weights.clone();
    let rate = |r: f64| js_min(1.0, r * boost);

    if p.locked.is_none() && rng.next() < rate(params.swap_rate) {
        let outsiders: Vec<usize> = p.eligible.iter().copied().filter(|a| !assets.contains(a)).collect();
        if !outsiders.is_empty() {
            let i = rng.int(assets.len());
            assets[i] = rng.pick(&outsiders);
        }
    }
    if rng.next() < rate(params.weight_rate) {
        for w in weights.iter_mut() {
            *w *= dexp(params.weight_sigma * rng.normal());
        }
    }
    if rng.next() < rate(params.transfer_rate) && weights.len() > 1 {
        let i = rng.int(weights.len());
        let mut j = rng.int(weights.len() - 1);
        if j >= i {
            j += 1;
        }
        let room = weights[i] - params.w_min;
        if room > 0.0 {
            let delta = rng.next() * room;
            weights[i] -= delta;
            weights[j] += delta;
        }
    }
    Genome { assets, weights }
}

/// 1 − mean Jaccard similarity of asset sets over random pairs.
pub fn diversity(pop: &[Individual], rng: &mut Rng) -> f64 {
    const PAIRS: usize = 200;
    if pop.len() < 2 {
        return 0.0;
    }
    let mut sim = 0.0;
    for _ in 0..PAIRS {
        let ix = rng.int(pop.len());
        let mut iy = rng.int(pop.len() - 1);
        if iy == ix {
            iy = pop.len() - 1;
        }
        let (x, y) = (&pop[ix].genome.assets, &pop[iy].genome.assets);
        // Both sorted: merge to count the intersection.
        let (mut i, mut j, mut inter) = (0, 0, 0);
        while i < x.len() && j < y.len() {
            if x[i] == y[j] {
                inter += 1;
                i += 1;
                j += 1;
            } else if x[i] < y[j] {
                i += 1;
            } else {
                j += 1;
            }
        }
        sim += inter as f64 / (x.len() + y.len() - inter) as f64;
    }
    1.0 - sim / PAIRS as f64
}
