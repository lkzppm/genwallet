// fetch with retries: Yahoo answers 429 under load and the BCB API is slow at times.

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export async function fetchJson<T>(url: string, init: RequestInit = {}, tries = 5): Promise<T> {
  let delay = 1000;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "User-Agent": "Mozilla/5.0 (genwallet)", Accept: "application/json", ...init.headers },
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) return (await res.json()) as T;
      if (!RETRYABLE.has(res.status) || attempt >= tries) {
        throw new Error(`${res.status} ${res.statusText} on ${url}`);
      }
    } catch (err) {
      if (attempt >= tries) throw err;
    }
    await new Promise((r) => setTimeout(r, delay));
    delay *= 2;
  }
}

/** Runs `task` over `items` with at most `limit` in flight, keeping order. */
export async function mapLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await task(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
