// Seeded randomness for the engine: sfc32 seeded by cyrb128 of a string, the
// generator of src/lib/ga/rng.ts, so a seed gives the same stream in both.
// Every random choice in a GA run goes through one Rng.

use crate::math::dlog;

/// 128-bit string hash (cyrb128) over UTF-16 code units, as charCodeAt reads them.
pub fn cyrb128(s: &str) -> [u32; 4] {
    let mut h1: u32 = 1779033703;
    let mut h2: u32 = 3144134277;
    let mut h3: u32 = 1013904242;
    let mut h4: u32 = 2773480762;
    for k in s.encode_utf16() {
        let k = k as u32;
        h1 = h2 ^ (h1 ^ k).wrapping_mul(597399067);
        h2 = h3 ^ (h2 ^ k).wrapping_mul(2869860233);
        h3 = h4 ^ (h3 ^ k).wrapping_mul(951274213);
        h4 = h1 ^ (h4 ^ k).wrapping_mul(2716044179);
    }
    h1 = (h3 ^ (h1 >> 18)).wrapping_mul(597399067);
    h2 = (h4 ^ (h2 >> 22)).wrapping_mul(2869860233);
    h3 = (h1 ^ (h3 >> 17)).wrapping_mul(951274213);
    h4 = (h2 ^ (h4 >> 19)).wrapping_mul(2716044179);
    h1 ^= h2 ^ h3 ^ h4;
    h2 ^= h1;
    h3 ^= h1;
    h4 ^= h1;
    [h1, h2, h3, h4]
}

pub struct Rng {
    a: u32,
    b: u32,
    c: u32,
    d: u32,
    spare: Option<f64>,
}

impl Rng {
    pub fn new(seed: &str) -> Rng {
        let [a, b, c, d] = cyrb128(seed);
        let mut rng = Rng { a, b, c, d, spare: None };
        // Warm up: the first outputs of sfc32 correlate with the seed.
        for _ in 0..15 {
            rng.next();
        }
        rng
    }

    /// Uniform in [0, 1).
    pub fn next(&mut self) -> f64 {
        let t = self.a.wrapping_add(self.b).wrapping_add(self.d);
        self.d = self.d.wrapping_add(1);
        self.a = self.b ^ (self.b >> 9);
        self.b = self.c.wrapping_add(self.c << 3);
        self.c = self.c.rotate_left(21);
        self.c = self.c.wrapping_add(t);
        t as f64 / 4294967296.0
    }

    /// Uniform integer in [0, n).
    pub fn int(&mut self, n: usize) -> usize {
        (self.next() * n as f64).floor() as usize
    }

    /// Uniform in [lo, hi).
    pub fn range(&mut self, lo: f64, hi: f64) -> f64 {
        lo + (hi - lo) * self.next()
    }

    /// Standard normal (Marsaglia's polar method: no sin or cos, and the log is dlog).
    pub fn normal(&mut self) -> f64 {
        if let Some(s) = self.spare.take() {
            return s;
        }
        let (mut u, mut v, mut s);
        loop {
            u = 2.0 * self.next() - 1.0;
            v = 2.0 * self.next() - 1.0;
            s = u * u + v * v;
            if !(s >= 1.0 || s == 0.0) {
                break;
            }
        }
        let f = ((-2.0 * dlog(s)) / s).sqrt();
        self.spare = Some(v * f);
        u * f
    }

    pub fn pick<T: Copy>(&mut self, items: &[T]) -> T {
        items[self.int(items.len())]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // From src/lib/ga/rng.ts in Node: createRng("genwallet|2026-10-26").
    #[test]
    fn same_stream_as_typescript() {
        let mut r = Rng::new("genwallet|2026-10-26");
        let got: Vec<f64> = (0..3).map(|_| r.next()).collect();
        let want = include!("../tests/rng-stream.txt");
        assert_eq!(got, want.to_vec());
    }
}
