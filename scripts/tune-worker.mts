// One worker process of pnpm tune: loads the history once, then replays one
// run per message with the builder's simulator and sends back its returns.
// Processes rather than threads: the engine allocates typed arrays on every
// evaluation, and threads of one process queue on its allocator (measured:
// nine threads ran no faster than one).

import { readFileSync } from "node:fs";
import type { Snapshot } from "../src/lib/market/snapshot";
import type { SimConfig } from "../src/lib/sim/simulate";
import { simulate } from "../src/lib/sim/simulate";

export interface TuneJob {
  key: string;
  config: SimConfig;
}

export interface TuneOutcome {
  key: string;
  ret: number;
  bova: number | null;
  cdi: number;
  fees: number;
  trades: number;
  ms: number;
  error?: string;
}

const snap = JSON.parse(readFileSync(process.argv[2], "utf8")) as Snapshot;
const send = (outcome: TuneOutcome) => process.send!(outcome);

process.on("message", (job: TuneJob) => {
  try {
    const r = simulate(snap, job.config);
    send({
      key: job.key,
      ret: r.final.ret,
      bova: r.final.bovaRet,
      cdi: r.final.cdiRet,
      fees: r.final.fees,
      trades: r.final.trades,
      ms: r.ms,
    });
  } catch (error) {
    send({ key: job.key, ret: 0, bova: null, cdi: 0, fees: 0, trades: 0, ms: 0, error: String(error) });
  }
});
