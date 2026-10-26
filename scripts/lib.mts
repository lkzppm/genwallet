// Helpers shared by the scripts: flags and the snapshot cache.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fetchIbovComposition } from "../src/lib/market/b3";
import type { Snapshot, UniverseEntry } from "../src/lib/market/snapshot";
import { buildSnapshot } from "../src/lib/market/snapshot";

export function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

export const has = (name: string) => process.argv.includes(`--${name}`);

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

/** Pretty for the log people read; compact for the archives (prices, populations). */
export function writeJson(path: string, value: unknown, compact = false): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, (compact ? JSON.stringify(value) : JSON.stringify(value, null, 1)) + "\n");
}

export async function currentUniverse(): Promise<UniverseEntry[]> {
  const { constituents } = await fetchIbovComposition();
  return constituents.map(({ ticker, company, sector }) => ({ ticker, company, sector }));
}

/**
 * A snapshot from the network, or from `.cache/snapshot.json` with --cache
 * (fetched once, then reused: for quick terminal experiments only).
 */
export async function snapshot(universe: UniverseEntry[], useCache: boolean): Promise<Snapshot> {
  const path = ".cache/snapshot.json";
  if (useCache && existsSync(path)) return readJson<Snapshot>(path);
  const t0 = performance.now();
  const s = await buildSnapshot(universe);
  console.error(`fetched ${universe.length} charts + ^BVSP + BOVA11 + CDI in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  if (useCache) writeJson(path, s);
  return s;
}
