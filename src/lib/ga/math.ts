// exp and log that give the same bits everywhere. The engine had to replay in
// the browser exactly as it ran in the nightly job, and Math.exp, log, sin,
// cos and tanh do not: Node 26 and Chromium 1243 disagree in the last bits
// (measured on 2026-10-26; sqrt and pow agreed). These use only + − × ÷ and
// comparisons, which IEEE 754 rounds identically on every engine. The engine
// itself is now Rust (engine/src/math.rs, the same series); this copy serves
// rng.ts and the reference engine.

// fdlibm's split of ln 2: the high part has trailing zero bits, so k × LN2_HI is exact.
const LN2_HI = 6.93147180369123816490e-1;
const LN2_LO = 1.90821492927058770002e-10;
const LN2 = 0.6931471805599453;
const SQRT2 = 1.4142135623730951;

/** Natural logarithm. */
export function dlog(x: number): number {
  if (Number.isNaN(x) || x < 0) return NaN;
  if (x === 0) return -Infinity;
  if (x === Infinity) return Infinity;
  // x = m · 2^e with m in (√½, √2]; halving and doubling are exact.
  let m = x;
  let e = 0;
  while (m >= 2) {
    m /= 2;
    e++;
  }
  while (m < 1) {
    m *= 2;
    e--;
  }
  if (m > SQRT2) {
    m /= 2;
    e++;
  }
  // log m = 2 atanh(s), s = (m − 1)/(m + 1), |s| < 0.172: the series is done by s²³.
  const s = (m - 1) / (m + 1);
  const s2 = s * s;
  let term = s;
  let sum = 0;
  for (let k = 1; k <= 23; k += 2) {
    sum += term / k;
    term *= s2;
  }
  return e * LN2_HI + (2 * sum + e * LN2_LO);
}

/** e^x. */
export function dexp(x: number): number {
  if (Number.isNaN(x)) return NaN;
  if (x > 709.78) return Infinity;
  if (x < -745.13) return 0;
  // x = k ln 2 + r with |r| ≤ ln 2 / 2; e^r by its Taylor series (done by the 18th term).
  const k = Math.round(x / LN2);
  const r = x - k * LN2_HI - k * LN2_LO;
  let term = 1;
  let sum = 1;
  for (let n = 1; n <= 18; n++) {
    term = (term * r) / n;
    sum += term;
  }
  // × 2^k by exact doublings or halvings.
  const step = k > 0 ? 2 : 0.5;
  for (let i = Math.abs(k); i > 0; i--) sum *= step;
  return sum;
}
