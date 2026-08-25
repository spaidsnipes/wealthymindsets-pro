/**
 * selectRuleAdherenceStreak — canon §Loss-as-Data Rule + §Discipline
 * (Top-Down Process 2026-08-24).
 *
 * Canon:
 *   "A red day can still be a high-grade process day. A no-trade day
 *    can still be successful."
 *
 * Consecutive DAYS (not trades) where the trader had zero BROKE_RULES
 * entries. This is the day-level companion to selectFocusStreak
 * (which counts consecutive plan-followed trades regardless of day).
 *
 * A day counts as "clean" when:
 *   - Every entry that day has processQuality === "FOLLOWED_PLAN"
 *   - OR the day has zero entries (canon: no-trade day is successful)
 *
 * A day counts as "broken" when:
 *   - Any entry that day has processQuality === "BROKE_RULES"
 *
 * A day counts as "unresolved" (breaks the streak but not the same
 * as broken) when:
 *   - Entries exist but all are UNRESOLVED (perception gap)
 *
 * Rejection guarantees:
 *  - Empty entries → { current: 0, best: 0, days_measured: 0 }
 *  - Days are grouped by ISO date string (caller responsibility to
 *    normalize dates to YYYY-MM-DD)
 *  - Current streak counts back from the newest date present in the
 *    entries; if today is missing from the set, the streak starts
 *    from the most-recent day the trader logged
 */

import type { EdgeEntry } from "../proofLane/selectSessionEdge";

export interface RuleAdherenceStreak {
  current: number;
  best: number;
  days_measured: number;
  /** ISO date of the newest day considered. Undefined on empty input. */
  newest_day: string | undefined;
}

type DayVerdict = "CLEAN" | "BROKEN" | "UNRESOLVED";

function classifyDay(entries: readonly EdgeEntry[]): DayVerdict {
  if (entries.length === 0) return "CLEAN"; // no-trade day is successful
  if (entries.some((e) => e.processQuality === "BROKE_RULES")) return "BROKEN";
  if (entries.every((e) => e.processQuality === "UNRESOLVED")) return "UNRESOLVED";
  // Every entry FOLLOWED_PLAN OR mix of FOLLOWED_PLAN + UNRESOLVED
  // Canon: FOLLOWED_PLAN is the discipline signal; a mix isn't fully
  // clean but isn't broken either — treat as CLEAN for streak purposes
  // (matches selectFocusStreak's "any FOLLOWED_PLAN counts" semantics).
  return "CLEAN";
}

export function selectRuleAdherenceStreak(
  entries: readonly EdgeEntry[],
): RuleAdherenceStreak {
  if (entries.length === 0) {
    return { current: 0, best: 0, days_measured: 0, newest_day: undefined };
  }

  // Group by date.
  const byDay = new Map<string, EdgeEntry[]>();
  for (const e of entries) {
    const arr = byDay.get(e.date) ?? [];
    arr.push(e);
    byDay.set(e.date, arr);
  }

  // Sort dates newest-first (string compare works for YYYY-MM-DD).
  const sortedDays = [...byDay.keys()].sort((a, b) => (a < b ? 1 : -1));
  const newest_day = sortedDays[0];

  // Verdicts newest-first.
  const verdicts = sortedDays.map((d) => classifyDay(byDay.get(d) ?? []));

  // Current streak: consecutive CLEAN from newest.
  let current = 0;
  for (const v of verdicts) {
    if (v === "CLEAN") current++;
    else break;
  }

  // Best streak: max run of CLEAN anywhere.
  let best = 0;
  let run = 0;
  for (const v of verdicts) {
    if (v === "CLEAN") {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  return {
    current,
    best,
    days_measured: sortedDays.length,
    newest_day,
  };
}
