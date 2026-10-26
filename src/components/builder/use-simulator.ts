"use client";

import { useEffect, useState, useSyncExternalStore, type SetStateAction } from "react";
import type { SessionSummary, SimConfig, SimProgress, SimResult } from "@/lib/sim/simulate";
import type { FromWorker, ToWorker } from "./protocol";
import type { MarketView } from "./universe";

export type SimStatus = "loading" | "idle" | "running" | "done" | "error";

export interface SimState {
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
}

export interface Simulator extends SimState {
  run: (config: SimConfig) => void;
  cancel: () => void;
  /** Drops the current run (cancelling it if it is still going), back to the empty stage. */
  clear: () => void;
}

const INITIAL: SimState = {
  status: "loading",
  dates: [],
  market: null,
  config: null,
  progress: null,
  sessions: [],
  result: null,
  error: null,
};

/*
 * The simulation worker and what it has sent, kept by the module rather than
 * by the page: leaving /montar and coming back finds the same data, the same
 * run, and a run still going if one was. One worker per tab, replaced when a
 * run is cancelled.
 */
let state = INITIAL;
let worker: Worker | null = null;
const listeners = new Set<() => void>();

function update(patch: Partial<SimState> | ((s: SimState) => Partial<SimState>)) {
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  for (const listener of listeners) listener();
}

function spawn() {
  const next = new Worker(new URL("./sim.worker.ts", import.meta.url), { type: "module" });
  next.onmessage = (event: MessageEvent<FromWorker>) => {
    const message = event.data;
    switch (message.type) {
      case "ready":
        update((s) => ({ dates: message.dates, market: message.market, status: s.status === "loading" ? "idle" : s.status }));
        break;
      case "progress":
        update({ progress: message.progress });
        break;
      case "session":
        update((s) => ({ sessions: [...s.sessions, message.summary] }));
        break;
      case "done":
        update({ result: message.result, status: "done" });
        break;
      case "error":
        update({ error: message.message, status: "error" });
        break;
    }
  };
  next.onerror = (event) => update({ error: event.message || "worker failed", status: "error" });
  worker = next;
}

function run(config: SimConfig) {
  update({ config, progress: null, sessions: [], result: null, error: null, status: "running" });
  worker?.postMessage({ type: "run", config } satisfies ToWorker);
}

function cancel() {
  worker?.terminate();
  // The data is in the HTTP cache by now, so the new worker is ready almost at once.
  spawn();
  update({ progress: null, status: "idle" });
}

function clear() {
  if (state.status === "running") cancel();
  update({ config: null, progress: null, sessions: [], result: null, error: null, status: state.dates.length ? "idle" : "loading" });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSimulator(): Simulator {
  // The worker starts with the first visit to the page and stays for the tab's life.
  useEffect(() => {
    if (!worker) spawn();
  }, []);
  const snapshot = useSyncExternalStore(subscribe, () => state, () => INITIAL);
  return { ...snapshot, run, cancel, clear };
}

const kept = new Map<string, unknown>();

/**
 * `useState` whose value outlives the component: the builder's form, view
 * and picked session are where the visitor left them after a visit to
 * another page. Held in memory only, so a reload starts fresh.
 */
export function useKept<T>(key: string, initial: T): [T, (next: SetStateAction<T>) => void] {
  const [value, setValue] = useState<T>(() => (kept.has(key) ? (kept.get(key) as T) : initial));
  useEffect(() => {
    kept.set(key, value);
  }, [key, value]);
  return [value, setValue];
}
