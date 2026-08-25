/**
 * selectFocusStreak — canon §Public Blessing / §9 Learning Genome
 * companion signal: "let users see the blessing."
 *
 * Consecutive plan-followed trades is the strongest single measurable
 * proof of trader discipline. This selector counts:
 *   - `current` — the length of the most-recent consecutive run of
 *     FOLLOWED_PLAN entries, starting from the newest entry.
 *     Zero when the newest entry broke the plan or is unresolved.
 *   - `best` — the longest FOLLOWED_PLAN run in the sample.
 *   - `sample_size` — total entries considered (for provenance).
 *
 * Canon rejection guarantees:
 *  - UNRESOLVED entries do NOT extend a streak (perception gap
 *    counts as broken — canon: absence of proof is not proof).
 *  - BROKE_RULES entries reset current to 0.
 *  - Empty input returns { current: 0, best: 0, sample_size: 0 }.
 *  - `entries` must be ordered newest-first for `current` to be
 *    correct; callers pass their existing sort (Journal is already
 *    stored newest-first).
 */

import type { EdgeEntry } from "../proofLane/selectSessionEdge";

export interface FocusStreak {
  current: number;
  best: number;
  sample_size: number;
}

export function selectFocusStreak(
  newestFirstEntries: readonly EdgeEntry[],
): FocusStreak {
  if (newestFirstEntries.length === 0) {
    return { current: 0, best: 0, sample_size: 0 };
  }
  // Current streak: count consecutive FOLLOWED_PLAN from newest.
  let current = 0;
  for (const e of newestFirstEntries) {
    if (e.processQuality === "FOLLOWED_PLAN") current++;
    else break;
  }
  // Best streak: max run anywhere in the array.
  let best = 0;
  let run = 0;
  for (const e of newestFirstEntries) {
    if (e.processQuality === "FOLLOWED_PLAN") {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return { current, best, sample_size: newestFirstEntries.length };
}
