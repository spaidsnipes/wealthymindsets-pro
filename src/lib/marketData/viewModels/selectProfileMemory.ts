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
/** How many of a level's most recent tests the glass notches (the full count is `tests`). */
export const RECENT_TEST_TIMES = 8;
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
  /** Times of the most recent tests (at most RECENT_TEST_TIMES), oldest first — what the glass notches. */
  readonly recentTestTimes: readonly number[];
  /**
   * Memory life (Garden 16 master order §36), derived only from the counts
   * above: FRESH (S-1) · AGING (S-2/3) · OLD (S-4+) · WEAKENING (traded
   * through ≥ 3 times) · REACTIVATED (an older level that stayed naked through
   * a whole later session, then was traded into). A reading of age and
   * contact — never a claim about what the level will do.
   */
  readonly life: MemoryLife;
}

export type MemoryLife = "FRESH" | "AGING" | "OLD" | "WEAKENING" | "REACTIVATED";

/** PURE: the life word from a level's own counts and the newest session's formation time. */
export function memoryLife(l: Pick<MemoryLevel, "sessionsAgo" | "tests" | "firstTestAt">, newestSessionFormedAt: number | null): MemoryLife {
  if (l.tests >= 3) return "WEAKENING";
  if (l.tests > 0 && l.sessionsAgo >= 2 && newestSessionFormedAt != null && l.firstTestAt != null && l.firstTestAt > newestSessionFormedAt) return "REACTIVATED";
  if (l.sessionsAgo <= 1) return "FRESH";
  if (l.sessionsAgo <= 3) return "AGING";
  return "OLD";
}

export interface ProfileMemoryVM {
  readonly version: number;
  readonly drawn: boolean;
  readonly reason: ProfileMemoryReason;
  readonly levels: readonly MemoryLevel[];
  readonly sessionsRemembered: number;
  /**
   * How the remembered value was known — the migration's own quality (every
   * session profile there is bar-built, so "candle-estimated"). The glass
   * words it on each S-n chip through profileLevelTag ("S-2 POC EST …").
   */
  readonly quality: ValueMigrationVM["quality"];
}

const none = (reason: Exclude<ProfileMemoryReason, "DRAWN">): ProfileMemoryVM => ({
  version: PROFILE_MEMORY_VERSION, drawn: false, reason, levels: [], sessionsRemembered: 0,
  quality: "candle-estimated",
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
      const recentTestTimes: number[] = [];
      for (const b of sorted) {
        if (b.time <= f.time) continue;
        if (b.low <= price && b.high >= price) {
          tests++;
          if (firstTestAt === null) firstTestAt = b.time;
          recentTestTimes.push(b.time);
          if (recentTestTimes.length > RECENT_TEST_TIMES) recentTestTimes.shift();
        }
      }
      levels.push({
        kind, price, sessionsAgo: current - s, formedAt: f.time,
        tests, naked: tests === 0, firstTestAt, recentTestTimes,
        life: memoryLife({ sessionsAgo: current - s, tests, firstTestAt }, finals.get(sessions[0])?.time ?? null),
      });
    }
  }

  return {
    version: PROFILE_MEMORY_VERSION,
    drawn: true,
    reason: "DRAWN",
    levels,
    sessionsRemembered: sessions.length,
    quality: migration.quality,
  };
}

export default selectProfileMemory;
