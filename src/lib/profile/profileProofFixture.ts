/**
 * /profile?scene=profile-fixture — SAMPLE books for the profile proof scene (Garden 19, 2026-10-08).
 *
 * Three deterministic synthetic books — 0, 7 and 24 closed trades — so the four tiles and the edge
 * panels can be read on serving at each of their states: a measured zero, INSUFFICIENT EVIDENCE
 * (1–19, statGuard), and MEASURED (≥ 20). Every record is synthetic (ids `SAMPLE-P…`, instrument
 * SAMPLE-FVG); it passes through the SAME owners the page uses — selectProfileTileTrades +
 * traderPerformanceStats for the tiles, journalEntriesToSnapshots for the edge panels. PURE: no
 * storage, no network, no clock (a fixed day).
 */

import { hasResolvedTradeOutcome } from "@/lib/tradeEvidence";
import { journalEntriesToSnapshots } from "@/lib/traderMemory/adapters/journalEntryToSnapshot";
import type { DecisionMemorySnapshot } from "@/lib/traderMemory/viewModels/selectProcessLandscape";
import { selectProfileTileTrades, traderPerformanceStats, type PerfStat } from "./traderPerformanceStats";

export const PROFILE_FIXTURE_BANNER = "PROOF SCENE — sample data, not your profile";
export const PROFILE_FIXTURE_OWNER = "SAMPLE-OWNER";
export const PROFILE_FIXTURE_SIZES = [0, 7, 24] as const;
/** The scene's fixed "now": the day after the last sample trade. */
export const PROFILE_FIXTURE_NOW_MS = Date.UTC(2026, 1, 20, 21, 0, 0);

export interface ProfileFixtureBook {
  readonly size: number;
  readonly records: readonly Record<string, unknown>[];
  readonly stats: readonly PerfStat[];
  readonly snapshots: readonly DecisionMemorySnapshot[];
}

/** One synthetic closed trade. Wins and losses alternate on a fixed pattern (2 wins : 1 loss). */
function record(i: number): Record<string, unknown> {
  const day = new Date(Date.UTC(2026, 0, 12 + i, 15, 0, 0));
  const win = i % 3 !== 2;
  const entry = 100 + (i % 5);
  const exit = win ? entry + 1.5 : entry - 1;
  const pnl = Math.round((exit - entry) * 100 * 100) / 100;
  return {
    id: `SAMPLE-P${String(i + 1).padStart(2, "0")}`,
    date: day.toISOString(),
    symbol: "SAMPLE-FVG",
    side: i % 4 === 3 ? "short" : "long",
    entry, exit, entryPrice: entry, exitPrice: exit,
    size: 100, pnl, pct: Math.round(((exit - entry) / entry) * 10_000) / 100,
    tags: [], setup: i % 2 ? "SAMPLE gap fade" : "SAMPLE gap reclaim",
    processQuality: i % 5 === 4 ? "BROKE_RULES" : "FOLLOWED_PLAN",
    result: win ? "win" : "loss",
  };
}

const cache = new Map<number, ProfileFixtureBook>();

export function profileFixtureBook(size: number): ProfileFixtureBook {
  const hit = cache.get(size);
  if (hit) return hit;
  const records = Array.from({ length: size }, (_, i) => record(i));
  const counted = selectProfileTileTrades(records as { pnl?: number }[], [], hasResolvedTradeOutcome).counted;
  const book: ProfileFixtureBook = {
    size, records,
    stats: traderPerformanceStats(counted),
    snapshots: journalEntriesToSnapshots(records, PROFILE_FIXTURE_OWNER),
  };
  cache.set(size, book);
  return book;
}
