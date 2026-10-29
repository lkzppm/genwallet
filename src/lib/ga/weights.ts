// The weight projection of the engine's repair (engine/src/repair.rs), for
// the lab's figures, which draw genomes on the page without running the GA.

/**
 * The closest point of `{lo ≤ wᵢ ≤ hi, Σw = 1}` to `v`: wᵢ = clip(vᵢ − τ, lo, hi),
 * with τ found by bisection (the sum is monotone in τ).
 */
export function projectWeights(v: number[], lo: number, hi: number): number[] {
  let a = Math.min(...v) - hi;
  let b = Math.max(...v) - lo;
  const sum = (tau: number) => v.reduce((s, x) => s + Math.min(hi, Math.max(lo, x - tau)), 0);
  for (let i = 0; i < 100; i++) {
    const mid = (a + b) / 2;
    if (sum(mid) > 1) a = mid;
    else b = mid;
  }
  const tau = (a + b) / 2;
  return v.map((x) => Math.min(hi, Math.max(lo, x - tau)));
}
