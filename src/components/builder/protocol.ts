// Messages between the builder page and its simulation worker.
import type { SessionSummary, SimConfig, SimProgress, SimResult } from "@/lib/sim/simulate";
import type { MarketView } from "./universe";

export type ToWorker = { type: "run"; config: SimConfig };

export type FromWorker =
  | { type: "ready"; dates: string[]; market: MarketView }
  | { type: "progress"; progress: SimProgress }
  | { type: "session"; summary: SessionSummary }
  | { type: "done"; result: SimResult }
  | { type: "error"; message: string };
