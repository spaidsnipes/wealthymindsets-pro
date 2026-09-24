/**
 * PROFILE MEMORY — prior sessions' value, carried forward and tested.
 * P-110 organism #4.
 *
 * Child: PROFILE MEMORY. Parent family: F09 Profiles. Class: CHART LANGUAGE.
 * House surface: /charts, drawn forward from where each session ended onto the
 * candles that came after. Plate: WM_H_P110_PROFILE_ORGANISM ("4 · MEMORY ·
 * Historical & contextual retention"); Registry F.4 "aged historical nodes ·
 * tests · defenses · decay · historical acceptance/rejection".
 *
 * ── WHAT IT REMEMBERS ──────────────────────────────────────────────────────
 *
 * Each COMPLETED session's final POC, VAH and VAL — exactly the last point
 * `selectValueMigration` published for that session. Not recomputed: the same
 * engine that drew the developing value is the one whose final answer is
 * remembered, so memory and movie cannot disagree.
 *
 * For every remembered level: how many later bars traded through it (TESTS),
 * whether none has (NAKED — the market has not been back), and how many
 * sessions ago it formed (AGE). Decay is AGE, stated; the canvas fades older
 * levels, and nothing here pretends to know how much an old level "matters".
 *
 * The current session is never remembered — it is still developing.
 *
 * PURE. DETERMINISTIC. No React, no canvas, no IO, no clock.
 */

import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import type { ValueMigrationVM } from "./selectValueMigration";

export const PROFILE_MEMORY_VERSION = 1;
/** Sessions remembered, newest first. Older value is lineage, not glass. */
export const MAX_MEMORY_SESSIONS = 5;

export type MemoryLevelKind = "POC" | "VAH" | "VAL";
export type ProfileMemoryReason = "DRAWN" | "NO_MIGRATION" | "NO_PRIOR_SESSION";

export interface MemoryLevel {
  readonly kind: MemoryLevelKind;
  readonly price: number;
  /** 1 = the session before the current one. */
  readonly sessionsAgo: number;
  /** Time of the session's last bar — where the memory line starts. */
  readonly formedAt: number;
  /** Later bars whose [low, high] contains the price. */
  readonly tests: number;
  /** True when no later bar has traded through the price. */
  readonly naked: boolean;
  /** Time of the first later bar that traded through it, or null. */
  readonly firstTestAt: number | null;
}

export interface ProfileMemoryVM {
  readonly version: number;
  readonly drawn: boolean;
  readonly reason: ProfileMemoryReason;
  readonly levels: readonly MemoryLevel[];
  readonly sessionsRemembered: number;
}

const none = (reason: Exclude<ProfileMemoryReason, "DRAWN">): ProfileMemoryVM => ({
  version: PROFILE_MEMORY_VERSION, drawn: false, reason, levels: [], sessionsRemembered: 0,
});

export function selectProfileMemory(
  migration: ValueMigrationVM | null | undefined,
  bars: readonly LegacyOhlcvTuple[] | null | undefined,
): ProfileMemoryVM {
  if (!migration || !migration.drawn || migration.points.length === 0) return none("NO_MIGRATION");
  const current = migration.points[migration.points.length - 1].session;

  // The final published value of each COMPLETED session.
  const finals = new Map<number, (typeof migration.points)[number]>();
  for (const p of migration.points) if (p.session < current) finals.set(p.session, p);
  if (finals.size === 0) return none("NO_PRIOR_SESSION");

  const sorted = [...(bars ?? [])]
    .filter(b => Number.isFinite(b.time) && Number.isFinite(b.high) && Number.isFinite(b.low))
    .sort((a, b) => a.time - b.time);

  const sessions = [...finals.keys()].sort((a, b) => b - a).slice(0, MAX_MEMORY_SESSIONS);
  const levels: MemoryLevel[] = [];
  for (const s of sessions) {
    const f = finals.get(s)!;
    for (const kind of ["POC", "VAH", "VAL"] as const) {
      const price = kind === "POC" ? f.poc : kind === "VAH" ? f.vah : f.val;
      let tests = 0;
      let firstTestAt: number | null = null;
      for (const b of sorted) {
        if (b.time <= f.time) continue;
        if (b.low <= price && b.high >= price) {
          tests++;
          if (firstTestAt === null) firstTestAt = b.time;
        }
      }
      levels.push({
        kind, price, sessionsAgo: current - s, formedAt: f.time,
        tests, naked: tests === 0, firstTestAt,
      });
    }
  }

  return {
    version: PROFILE_MEMORY_VERSION,
    drawn: true,
    reason: "DRAWN",
    levels,
    sessionsRemembered: sessions.length,
  };
}

export default selectProfileMemory;
