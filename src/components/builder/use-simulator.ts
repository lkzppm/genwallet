"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionSummary, SimConfig, SimProgress, SimResult } from "@/lib/sim/simulate";
import type { FromWorker, ToWorker } from "./protocol";
import type { MarketView } from "./universe";

export type SimStatus = "loading" | "idle" | "running" | "done" | "error";

export interface Simulator {
  status: SimStatus;
  /** Trading dates of the market data, once the worker has loaded it. */
  dates: string[];
  /** The universe with its prices and traded values, for the company picker. */
  market: MarketView | null;
  /** The configuration of the run in progress or last made. */
  config: SimConfig | null;
  progress: SimProgress | null;
  /** Sessions finished so far in the current run. */
  sessions: SessionSummary[];
  result: SimResult | null;
  error: string | null;
  run: (config: SimConfig) => void;
  cancel: () => void;
}

/** Owns the simulation worker: one per page, replaced when a run is cancelled. */
export function useSimulator(): Simulator {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<SimStatus>("loading");
  const [dates, setDates] = useState<string[]>([]);
  const [market, setMarket] = useState<MarketView | null>(null);
  const [config, setConfig] = useState<SimConfig | null>(null);
  const [progress, setProgress] = useState<SimProgress | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [result, setResult] = useState<SimResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const spawn = useCallback(() => {
    const worker = new Worker(new URL("./sim.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<FromWorker>) => {
      const message = event.data;
      switch (message.type) {
        case "ready":
          setDates(message.dates);
          setMarket(message.market);
          setStatus((s) => (s === "loading" ? "idle" : s));
          break;
        case "progress":
          setProgress(message.progress);
          break;
        case "session":
          setSessions((list) => [...list, message.summary]);
          break;
        case "done":
          setResult(message.result);
          setStatus("done");
          break;
        case "error":
          setError(message.message);
          setStatus("error");
          break;
      }
    };
    worker.onerror = (event) => {
      setError(event.message || "worker failed");
      setStatus("error");
    };
    workerRef.current = worker;
    return worker;
  }, []);

  useEffect(() => {
    const worker = spawn();
    return () => worker.terminate();
  }, [spawn]);

  const run = useCallback((next: SimConfig) => {
    setConfig(next);
    setProgress(null);
    setSessions([]);
    setResult(null);
    setError(null);
    setStatus("running");
    workerRef.current?.postMessage({ type: "run", config: next } satisfies ToWorker);
  }, []);

  const cancel = useCallback(() => {
    workerRef.current?.terminate();
    // The data is in the HTTP cache by now, so the new worker is ready almost at once.
    spawn();
    setProgress(null);
    setStatus("idle");
  }, [spawn]);

  return { status, dates, market, config, progress, sessions, result, error, run, cancel };
}
