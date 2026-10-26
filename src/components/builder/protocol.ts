// Messages between the builder page and its simulation worker.
import type { SessionSummary, SimConfig, SimProgress, SimResult } from "@/lib/sim/simulate";

export type ToWorker = { type: "run"; config: SimConfig };

export type FromWorker =
  | { type: "ready"; dates: string[]; tickers: number }
  | { type: "progress"; progress: SimProgress }
  | { type: "session"; summary: SessionSummary }
  | { type: "done"; result: SimResult }
  | { type: "error"; message: string };
