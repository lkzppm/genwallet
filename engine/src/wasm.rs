// The boundary with TypeScript (src/lib/ga/engine.ts). One evening goes in as
// a flat array of f64 and comes out as another; strings stay on the
// TypeScript side (tickers become indices, companies and sectors interned
// ids), so nothing crosses but numbers, bit for bit. The layout is written
// out in engine.ts, which is the only other reader and writer.

use std::cell::RefCell;

use crate::evolve::{evolve, BornOn, EvolveOptions, EvolveResult, Individual, Origin, SeedIndividual};
use crate::params::{Fitness, Params};
use crate::problem::{build_problem, Input, Problem, ProblemError};
use crate::repair::Genome;

thread_local! {
    static INPUT: RefCell<Vec<f64>> = const { RefCell::new(Vec::new()) };
    static SEED: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
    static OUTPUT: RefCell<Vec<f64>> = const { RefCell::new(Vec::new()) };
}

#[cfg(target_arch = "wasm32")]
#[link(wasm_import_module = "env")]
extern "C" {
    fn progress(gen: f64, best: f64);
}

#[cfg(not(target_arch = "wasm32"))]
unsafe fn progress(_gen: f64, _best: f64) {}

/// Room for `len` input numbers; TypeScript writes them there before `run`.
#[no_mangle]
pub extern "C" fn input_buffer(len: usize) -> *mut f64 {
    INPUT.with(|b| {
        let mut b = b.borrow_mut();
        b.clear();
        b.resize(len, 0.0);
        b.as_mut_ptr()
    })
}

/// Room for the seed's UTF-8 bytes.
#[no_mangle]
pub extern "C" fn seed_buffer(len: usize) -> *mut u8 {
    SEED.with(|b| {
        let mut b = b.borrow_mut();
        b.clear();
        b.resize(len, 0);
        b.as_mut_ptr()
    })
}

/// Runs one evening; returns the length of the output, read at `output_ptr`.
#[no_mangle]
pub extern "C" fn run() -> usize {
    let input = INPUT.with(|b| std::mem::take(&mut *b.borrow_mut()));
    let seed = SEED.with(|b| String::from_utf8(std::mem::take(&mut *b.borrow_mut())).unwrap_or_default());
    let out = run_encoded(&input, &seed, &mut |gen, best| unsafe { progress(gen, best) });
    OUTPUT.with(|o| {
        *o.borrow_mut() = out;
        o.borrow().len()
    })
}

#[no_mangle]
pub extern "C" fn output_ptr() -> *const f64 {
    OUTPUT.with(|o| o.borrow().as_ptr())
}

struct Reader<'a> {
    data: &'a [f64],
    at: usize,
}

impl Reader<'_> {
    fn f(&mut self) -> f64 {
        let x = self.data[self.at];
        self.at += 1;
        x
    }
    fn u(&mut self) -> usize {
        self.f() as usize
    }
    fn vec(&mut self, len: usize) -> Vec<f64> {
        let v = self.data[self.at..self.at + len].to_vec();
        self.at += len;
        v
    }
    fn indices(&mut self, len: usize) -> Vec<usize> {
        (0..len).map(|_| self.u()).collect()
    }
}

fn origin(code: f64) -> Origin {
    match code as u8 {
        0 => Origin::Random,
        1 => Origin::Immigrant,
        2 => Origin::Hold,
        3 => Origin::Cross,
        _ => Origin::Mutant,
    }
}

fn fitness(code: f64) -> Fitness {
    match code as u8 {
        0 => Fitness::Sharpe,
        1 => Fitness::Sortino,
        2 => Fitness::Cvar,
        3 => Fitness::Active,
        _ => Fitness::Goal,
    }
}

fn read_params(r: &mut Reader) -> Params {
    Params {
        k: r.f(),
        w_min: r.f(),
        w_max: r.f(),
        sector_cap: r.f(),
        population_size: r.f(),
        elite: r.f(),
        tournament: r.f(),
        crossover_rate: r.f(),
        blx_alpha: r.f(),
        swap_rate: r.f(),
        weight_rate: r.f(),
        weight_sigma: r.f(),
        transfer_rate: r.f(),
        hyper_factor: r.f(),
        diversity_floor: r.f(),
        immigrant_rate: r.f(),
        mean_shrink: r.f(),
        skip: r.f(),
        cov_shrink: r.f(),
        min_traded: r.f(),
        fee: r.f(),
        slippage: r.f(),
        horizon: r.f(),
        fitness: fitness(r.f()),
        goal: r.f(),
        strict: r.f() != 0.0,
    }
}

fn read_input(r: &mut Reader) -> Input {
    let n = r.u();
    let prices = (0..n)
        .map(|_| {
            let len = r.u();
            r.vec(len)
        })
        .collect();
    let traded = r.vec(n);
    let company = (0..n).map(|_| r.f() as u32).collect();
    let sector = (0..n).map(|_| r.f() as u32).collect();
    let rf = r.f();
    let held = r.u();
    let current = (0..held).map(|_| (r.u(), r.f())).collect();
    let locked = r.f();
    let locked = (locked >= 0.0).then(|| {
        (0..locked as usize)
            .map(|_| {
                let a = r.f();
                (a >= 0.0).then_some(a as usize)
            })
            .collect()
    });
    let exposure = r.f();
    let bench = (r.f() != 0.0).then(|| {
        let len = r.u();
        r.vec(len)
    });
    Input { prices, traded, company, sector, rf, current, locked, exposure, bench }
}

fn read_seed_population(r: &mut Reader) -> Vec<SeedIndividual> {
    let count = r.u();
    (0..count)
        .map(|_| {
            let id = r.f();
            let origin = origin(r.f());
            let born = r.f();
            let np = r.u();
            let parents = r.vec(np);
            let k = r.u();
            let assets = r.indices(k);
            let weights = r.vec(k);
            SeedIndividual { genome: Genome { assets, weights }, id, parents, born, origin }
        })
        .collect()
}

fn write_individual(out: &mut Vec<f64>, ind: &Individual) {
    out.push(ind.id);
    out.push(ind.origin as u8 as f64);
    out.push(ind.born);
    out.push(match ind.born_on {
        BornOn::Label => -1.0,
        BornOn::Seed(i) => i as f64,
    });
    out.push(ind.parents.len() as f64);
    out.extend_from_slice(&ind.parents);
    out.push(ind.genome.assets.len() as f64);
    out.extend(ind.genome.assets.iter().map(|&a| a as f64));
    out.extend_from_slice(&ind.genome.weights);
    let e = &ind.eval;
    out.extend_from_slice(&[e.score, e.mean, e.vol, e.turnover, e.cost]);
}

fn write_result(out: &mut Vec<f64>, p: &Problem, r: &EvolveResult) {
    out.push(p.n as f64);
    out.push(p.days as f64);
    out.push(p.eligible.len() as f64);
    out.extend(p.eligible.iter().map(|&a| a as f64));
    out.push(r.next_id);
    out.push(r.population.len() as f64);
    for ind in &r.population {
        write_individual(out, ind);
    }
    match &r.hold {
        Some(h) => {
            out.push(1.0);
            write_individual(out, h);
        }
        None => out.push(0.0),
    }
    out.push(r.history.len() as f64);
    for s in &r.history {
        out.extend_from_slice(&[s.gen, s.best, s.mean, s.diversity, s.hyper as u8 as f64, s.champion_id]);
        out.push(s.champion.len() as f64);
        out.extend(s.champion.iter().map(|&a| a as f64));
        out.extend_from_slice(&s.gene_freq);
    }
}

/// Status codes of the output's first number.
const OK: f64 = 0.0;
const ACTIVE_NEEDS_BENCH: f64 = 1.0;
const STRICT_NEEDS_LOCKED: f64 = 2.0;
const LOCKED_NOT_ELIGIBLE: f64 = 3.0;
const NO_FEASIBLE_ASSET: f64 = 4.0;

pub fn run_encoded(data: &[f64], seed: &str, progress: &mut dyn FnMut(f64, f64)) -> Vec<f64> {
    let mut r = Reader { data, at: 0 };
    let params = read_params(&mut r);
    let input = read_input(&mut r);
    let generations = r.f();
    let next_id = r.f();
    let seed_population = read_seed_population(&mut r);

    let p = match build_problem(&input, &params) {
        Ok(p) => p,
        Err(ProblemError::ActiveNeedsBench) => return vec![ACTIVE_NEEDS_BENCH],
        Err(ProblemError::StrictNeedsLocked) => return vec![STRICT_NEEDS_LOCKED],
        Err(ProblemError::LockedNotEligible(i)) => return vec![LOCKED_NOT_ELIGIBLE, i as f64],
    };
    let opts = EvolveOptions { generations, seed, seed_population, next_id };
    match evolve(&p, &params, opts, progress) {
        Ok(result) => {
            let mut out = vec![OK];
            write_result(&mut out, &p, &result);
            out
        }
        Err(_) => vec![NO_FEASIBLE_ASSET],
    }
}
