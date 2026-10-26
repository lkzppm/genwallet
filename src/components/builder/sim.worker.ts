// The builder's simulation off the main thread: loads the market data once,
// then runs one simulation per message. The page cancels a run by
// terminating the worker and starting a new one.

import type { Snapshot } from "@/lib/market/snapshot";
import { simulate } from "@/lib/sim/simulate";
import type { FromWorker, ToWorker } from "./protocol";

const post = (message: FromWorker) => self.postMessage(message);

const data: Promise<Snapshot> = fetch("/data/market.json").then((res) => {
  if (!res.ok) throw new Error(`market data: HTTP ${res.status}`);
  return res.json() as Promise<Snapshot>;
});

data
  .then((snap) => post({ type: "ready", dates: snap.dates, tickers: snap.universe.length }))
  .catch((error: unknown) => post({ type: "error", message: String(error) }));

self.onmessage = async (event: MessageEvent<ToWorker>) => {
  if (event.data.type !== "run") return;
  try {
    const snap = await data;
    let lastPost = 0;
    const result = simulate(
      snap,
      event.data.config,
      (progress) => {
        // A message per generation would flood the page; about 30 a second is plenty.
        const now = performance.now();
        if (now - lastPost < 33 && progress.gen !== progress.generations) return;
        lastPost = now;
        post({ type: "progress", progress });
      },
      (summary) => post({ type: "session", summary }),
    );
    post({ type: "done", result });
  } catch (error) {
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
