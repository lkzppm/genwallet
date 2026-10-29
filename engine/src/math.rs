// exp and log that give the same bits everywhere. The engine must replay the
// runs recorded by the TypeScript engine (src/lib/ga before 2026-10-29), which
// used these instead of Math.exp and Math.log because Node and Chromium
// disagree in the last bits. Only + − × ÷ and comparisons, which IEEE 754
// rounds identically on every machine, and JavaScript's own semantics for
// min, max and round (helpers below), so the port is bit for bit.

// fdlibm's split of ln 2: the high part has trailing zero bits, so k × LN2_HI is exact.
const LN2_HI: f64 = 6.93147180369123816490e-1;
const LN2_LO: f64 = 1.90821492927058770002e-10;
const LN2: f64 = std::f64::consts::LN_2;
const SQRT2: f64 = std::f64::consts::SQRT_2;

/// Natural logarithm.
pub fn dlog(x: f64) -> f64 {
    if x.is_nan() || x < 0.0 {
        return f64::NAN;
    }
    if x == 0.0 {
        return f64::NEG_INFINITY;
    }
    if x == f64::INFINITY {
        return f64::INFINITY;
    }
    // x = m · 2^e with m in (√½, √2]; halving and doubling are exact.
    let mut m = x;
    let mut e = 0.0;
    while m >= 2.0 {
        m /= 2.0;
        e += 1.0;
    }
    while m < 1.0 {
        m *= 2.0;
        e -= 1.0;
    }
    if m > SQRT2 {
        m /= 2.0;
        e += 1.0;
    }
    // log m = 2 atanh(s), s = (m − 1)/(m + 1), |s| < 0.172: the series is done by s²³.
    let s = (m - 1.0) / (m + 1.0);
    let s2 = s * s;
    let mut term = s;
    let mut sum = 0.0;
    let mut k = 1.0;
    while k <= 23.0 {
        sum += term / k;
        term *= s2;
        k += 2.0;
    }
    e * LN2_HI + (2.0 * sum + e * LN2_LO)
}

/// e^x.
pub fn dexp(x: f64) -> f64 {
    if x.is_nan() {
        return f64::NAN;
    }
    if x > 709.78 {
        return f64::INFINITY;
    }
    if x < -745.13 {
        return 0.0;
    }
    // x = k ln 2 + r with |r| ≤ ln 2 / 2; e^r by its Taylor series (done by the 18th term).
    let k = js_round(x / LN2);
    let r = x - k * LN2_HI - k * LN2_LO;
    let mut term = 1.0;
    let mut sum = 1.0;
    for n in 1..=18 {
        term = (term * r) / n as f64;
        sum += term;
    }
    // × 2^k by exact doublings or halvings.
    let step = if k > 0.0 { 2.0 } else { 0.5 };
    let mut i = k.abs();
    while i > 0.0 {
        sum *= step;
        i -= 1.0;
    }
    sum
}

/// JavaScript's Math.round: the nearest integer, halves toward +∞.
pub fn js_round(x: f64) -> f64 {
    if !x.is_finite() {
        return x;
    }
    let f = x.floor();
    let r = if x - f >= 0.5 { f + 1.0 } else { f };
    // Math.round keeps the sign of a zero, and gives −0 on [−0.5, 0).
    if r == 0.0 && (x < 0.0 || (x == 0.0 && x.is_sign_negative())) {
        -0.0
    } else {
        r
    }
}

/// JavaScript's Math.min of two: NaN wins, and −0 is below +0.
pub fn js_min(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        f64::NAN
    } else if a < b || (a == b && a.is_sign_negative()) {
        a
    } else {
        b
    }
}

/// JavaScript's Math.max of two: NaN wins, and +0 is above −0.
pub fn js_max(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        f64::NAN
    } else if a > b || (a == b && !a.is_sign_negative()) {
        a
    } else {
        b
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn close_to_std() {
        let mut x = 1e-300;
        while x < 1e300 {
            assert!((dlog(x) - x.ln()).abs() <= 8e-16 * x.ln().abs().max(1.0), "log {x}");
            x *= 1.37;
        }
        let mut y = -700.0;
        while y < 700.0 {
            assert!((dexp(y) - y.exp()).abs() <= 8e-16 * y.exp(), "exp {y}");
            y += 0.731;
        }
    }

    #[test]
    fn round_like_javascript() {
        assert_eq!(js_round(0.5), 1.0);
        assert_eq!(js_round(-0.5), -0.0);
        assert!(js_round(-0.5).is_sign_negative());
        assert_eq!(js_round(-1.5), -1.0);
        assert_eq!(js_round(2.5), 3.0);
        assert_eq!(js_round(0.49999999999999994), 0.0);
        assert_eq!(js_round(-2.4), -2.0);
    }

    #[test]
    fn min_max_like_javascript() {
        assert!(js_min(0.0, -0.0).is_sign_negative());
        assert!(!js_max(-0.0, 0.0).is_sign_negative());
        assert!(js_min(f64::NAN, 1.0).is_nan());
        assert_eq!(js_max(1.0, 2.0), 2.0);
    }
}
