// One evening of evolution. A run either starts from random genomes
// (formation) or carries the previous evening's population onto the new
// landscape: repaired, re-scored, its worst replaced by immigrants, and the
// hold individual injected so "do nothing" is always a candidate.

use crate::fitness::{evaluate, Evaluation};
use crate::math::{js_max, js_round};
use crate::operators::{crossover, diversity, mutate, random_genome, tournament};
use crate::params::Params;
use crate::problem::Problem;
use crate::repair::{repair, Genome, NoFeasibleAsset};
use crate::rng::Rng;

/// How an individual entered the population. Elites keep theirs.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Origin {
    Random = 0,
    Immigrant = 1,
    Hold = 2,
    Cross = 3,
    Mutant = 4,
}

/// Where an individual's `bornOn` label comes from.
#[derive(Clone, Copy, Debug)]
pub enum BornOn {
    /// This run's label.
    Label,
    /// The label it had in the seed population (by position there).
    Seed(usize),
}

#[derive(Clone, Debug)]
pub struct Individual {
    pub genome: Genome,
    pub id: f64,
    pub parents: Vec<f64>,
    /// Generation of birth within the run labelled `born_on`.
    pub born: f64,
    pub born_on: BornOn,
    pub origin: Origin,
    pub eval: Evaluation,
}

/// An individual of the previous evening, its tickers already turned into indices of this problem.
pub struct SeedIndividual {
    pub genome: Genome,
    pub id: f64,
    pub parents: Vec<f64>,
    pub born: f64,
    pub origin: Origin,
}

pub struct GenerationStat {
    pub gen: f64,
    pub best: f64,
    pub mean: f64,
    pub diversity: f64,
    /// Mutation rates were boosted this generation.
    pub hyper: bool,
    pub champion_id: f64,
    pub champion: Vec<usize>,
    /// Share of the population holding each asset, by asset index.
    pub gene_freq: Vec<f64>,
}

pub struct EvolveOptions<'a> {
    pub generations: f64,
    pub seed: &'a str,
    pub seed_population: Vec<SeedIndividual>,
    /// First id to hand out; continue from the previous evening's.
    pub next_id: f64,
}

pub struct EvolveResult {
    /// Final population, best first.
    pub population: Vec<Individual>,
    /// The current portfolio as an individual, when there are holdings.
    pub hold: Option<Individual>,
    pub history: Vec<GenerationStat>,
    pub next_id: f64,
}

/// Best first; ties break on the smaller id so every sort is deterministic.
/// The comparator of the TypeScript engine, `y − x || x.id − y.id`, as a number.
pub fn by_score(x: &Individual, y: &Individual) -> f64 {
    let d = y.eval.score - x.eval.score;
    if d != 0.0 && !d.is_nan() {
        d
    } else {
        x.id - y.id
    }
}

fn sort_by_score(pop: &mut [Individual]) {
    // A stable sort with a consistent comparator: the order of Array.prototype.sort.
    pop.sort_by(|x, y| by_score(x, y).partial_cmp(&0.0).expect("scores are never NaN"));
}

/// Called once per generation with (gen, best); the builder shows it as progress.
pub type Progress<'a> = &'a mut dyn FnMut(f64, f64);

pub fn evolve(
    p: &Problem,
    params: &Params,
    opts: EvolveOptions,
    progress: Progress,
) -> Result<EvolveResult, NoFeasibleAsset> {
    let mut rng = Rng::new(opts.seed);
    let mut next_id = opts.seed_population.iter().fold(opts.next_id, |m, s| js_max(m, s.id + 1.0));
    let size = params.population_size;

    let mut make = |rng: &mut Rng, genome: &Genome, origin: Origin, parents: Vec<f64>, born: f64| {
        let g = repair(p, params, rng, genome)?;
        let eval = evaluate(p, params, &g);
        let id = next_id;
        next_id += 1.0;
        Ok::<_, NoFeasibleAsset>(Individual { genome: g, id, parents, born, born_on: BornOn::Label, origin, eval })
    };

    let mut pop: Vec<Individual> = Vec::new();
    if !opts.seed_population.is_empty() {
        for (i, s) in opts.seed_population.into_iter().enumerate() {
            if i as f64 >= size.trunc() {
                break;
            }
            let g = repair(p, params, &mut rng, &s.genome)?;
            let eval = evaluate(p, params, &g);
            pop.push(Individual {
                genome: g,
                id: s.id,
                parents: s.parents,
                born: s.born,
                born_on: BornOn::Seed(i),
                origin: s.origin,
                eval,
            });
        }
        sort_by_score(&mut pop);
        let keep = (pop.len() as f64).min(size - js_round(params.immigrant_rate * size));
        pop.truncate(if keep > 0.0 { keep as usize } else { 0 });
        while (pop.len() as f64) < size {
            let g = random_genome(p, params, &mut rng);
            pop.push(make(&mut rng, &g, Origin::Immigrant, vec![], 0.0)?);
        }
    } else {
        while (pop.len() as f64) < size {
            let g = random_genome(p, params, &mut rng);
            pop.push(make(&mut rng, &g, Origin::Random, vec![], 0.0)?);
        }
    }

    let mut hold = None;
    if !p.held.is_empty() {
        let g = Genome { assets: p.held.clone(), weights: p.held.iter().map(|&a| p.current_weight[a]).collect() };
        let h = make(&mut rng, &g, Origin::Hold, vec![], 0.0)?;
        sort_by_score(&mut pop);
        let last = pop.len() - 1;
        pop[last] = h.clone();
        hold = Some(h);
    }
    sort_by_score(&mut pop);

    let mut history = Vec::new();
    let mut record = |pop: &[Individual], gen: f64, hyper: bool, div: f64| {
        let mut freq = vec![0.0; p.n];
        let mut sum = 0.0;
        for ind in pop {
            sum += ind.eval.score;
            for &a in &ind.genome.assets {
                freq[a] += 1.0;
            }
        }
        let len = pop.len() as f64;
        history.push(GenerationStat {
            gen,
            best: pop[0].eval.score,
            mean: sum / len,
            diversity: div,
            hyper,
            champion_id: pop[0].id,
            champion: pop[0].genome.assets.clone(),
            gene_freq: freq.iter().map(|&c| c / len).collect(),
        });
        progress(gen, pop[0].eval.score);
    };

    let mut div = diversity(&pop, &mut rng);
    record(&pop, 0.0, false, div);

    let elite = params.elite.trunc().max(0.0) as usize;
    let mut gen = 1.0;
    while gen <= opts.generations {
        let hyper = div < params.diversity_floor;
        let boost = if hyper { params.hyper_factor } else { 1.0 };
        let mut next: Vec<Individual> = pop[..elite.min(pop.len())].to_vec();
        while (next.len() as f64) < size {
            let a = tournament(&pop, params.tournament, &mut rng);
            if rng.next() < params.crossover_rate {
                let b = tournament(&pop, params.tournament, &mut rng);
                let cross = crossover(&pop[a].genome, &pop[b].genome, params, &mut rng);
                let child = mutate(p, params, &mut rng, &cross, boost);
                next.push(make(&mut rng, &child, Origin::Cross, vec![pop[a].id, pop[b].id], gen)?);
            } else {
                let child = mutate(p, params, &mut rng, &pop[a].genome, boost);
                next.push(make(&mut rng, &child, Origin::Mutant, vec![pop[a].id], gen)?);
            }
        }
        sort_by_score(&mut next);
        pop = next;
        div = diversity(&pop, &mut rng);
        record(&pop, gen, hyper, div);
        gen += 1.0;
    }

    Ok(EvolveResult { population: pop, hold, history, next_id })
}
