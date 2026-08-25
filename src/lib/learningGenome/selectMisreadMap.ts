/**
 * selectMisreadMap — canon §9 Trader Misread Map (Final Helicopter 2026-08-24).
 *
 * Canon (verbatim, Final Helicopter Canon §9):
 *   "Perception Checksum and Trader Misread Map create targeted practice."
 *
 * Diagnostic that classifies each trade into one canonical misread bucket
 * from fields that already exist on EdgeEntry. This is the second half of
 * the §9 diagnostic layer: selectLearningGenome scores four dimensions;
 * selectMisreadMap counts specific mistake shapes.
 *
 * A trade may fit multiple categories in principle; this selector assigns
 * exactly ONE canonical category by evaluating conditions in canon order:
 *
 *   1. MISSED_SETUP        — dayModel = M0 (no-trade day) but a trade
 *                            was taken. Perception failure.
 *   2. BROKE_PROCESS       — processQuality = BROKE_RULES. Reasoning
 *                            failure regardless of outcome.
 *   3. POOR_MANAGEMENT     — captureEfficiency < 0.5 AND mfeR ≥ 1.5R.
 *                            Trader saw the move but gave it back.
 *   4. FULL_STOP_LOSS      — result = loss AND maeR ≤ -0.75R AND
 *                            processQuality = FOLLOWED_PLAN. Executed
 *                            the plan into a real stop-out (not a
 *                            misread — often the correct trade — but
 *                            surfaced for pattern review).
 *   5. UNRESOLVED_PROCESS  — processQuality = UNRESOLVED (perception
 *                            + reasoning both unmeasured).
 *   6. CLEAN               — none of the above. The trade was
 *                            plan-followed with either a win, a small
 *                            loss, or good capture. Baseline healthy.
 *
 * Rejection guarantees:
 *  - Empty entries → all counts 0, sample_size 0. Never fabricates.
 *  - Every entry lands in exactly one bucket (mutually exclusive by
 *    canonical order). Counts always sum to sample_size.
 *  - dominant is undefined when sample_size = 0 OR when two buckets
 *    tie for the top count (canon: no "your dominant misread is X"
 *    from insufficient signal or a tie).
 */

import type { EdgeEntry } from "../proofLane/selectSessionEdge";
import { captureEfficiency } from "../proofLane/captureEfficiency";

export type MisreadCategory =
  | "MISSED_SETUP"
  | "BROKE_PROCESS"
  | "POOR_MANAGEMENT"
  | "FULL_STOP_LOSS"
  | "UNRESOLVED_PROCESS"
  | "CLEAN";

export const MISREAD_CATEGORIES: readonly MisreadCategory[] = [
  "MISSED_SETUP",
  "BROKE_PROCESS",
  "POOR_MANAGEMENT",
  "FULL_STOP_LOSS",
  "UNRESOLVED_PROCESS",
  "CLEAN",
];

/** EdgeEntry doesn't carry dayModel today; caller passes it as a sibling. */
export interface MisreadEntry extends EdgeEntry {
  /** M0 = no-trade day, M1 = trend expansion, M2 = chop/rotation. */
  dayModel?: "M0" | "M1" | "M2";
}

/**
 * Classify one entry into its canonical misread bucket.
 * Exported so the caller can render per-trade badges.
 */
export function classifyMisread(entry: MisreadEntry): MisreadCategory {
  // 1. Perception failure — trade on a no-trade day.
  if (entry.dayModel === "M0") return "MISSED_SETUP";
  // 2. Reasoning failure — broke the rules.
  if (entry.processQuality === "BROKE_RULES") return "BROKE_PROCESS";
  // 3. Management failure — big MFE, small capture.
  const cap = captureEfficiency({ realizedR: entry.realizedR, mfeR: entry.mfeR });
  if (
    typeof cap === "number" &&
    cap < 0.5 &&
    typeof entry.mfeR === "number" &&
    entry.mfeR >= 1.5
  ) {
    return "POOR_MANAGEMENT";
  }
  // 4. Full stop-out on a plan-followed trade.
  if (
    entry.result === "loss" &&
    entry.processQuality === "FOLLOWED_PLAN" &&
    typeof entry.maeR === "number" &&
    entry.maeR <= -0.75
  ) {
    return "FULL_STOP_LOSS";
  }
  // 5. Unresolved process — perception + reasoning both unmeasured.
  if (entry.processQuality === "UNRESOLVED") return "UNRESOLVED_PROCESS";
  // 6. Clean baseline.
  return "CLEAN";
}

export interface MisreadMap {
  counts: Record<MisreadCategory, number>;
  sample_size: number;
  /** Category with the highest count. Undefined on empty input or ties. */
  dominant: MisreadCategory | undefined;
}

const ZERO_COUNTS = (): Record<MisreadCategory, number> => ({
  MISSED_SETUP: 0,
  BROKE_PROCESS: 0,
  POOR_MANAGEMENT: 0,
  FULL_STOP_LOSS: 0,
  UNRESOLVED_PROCESS: 0,
  CLEAN: 0,
});

export function selectMisreadMap(entries: readonly MisreadEntry[]): MisreadMap {
  const counts = ZERO_COUNTS();
  for (const e of entries) counts[classifyMisread(e)]++;
  const sample_size = entries.length;

  // Dominant = strictly-highest count. A tie yields undefined per canon.
  let dominant: MisreadCategory | undefined;
  if (sample_size > 0) {
    let topCount = -1;
    let topCategory: MisreadCategory | undefined;
    let tied = false;
    for (const cat of MISREAD_CATEGORIES) {
      const c = counts[cat];
      if (c > topCount) {
        topCount = c;
        topCategory = cat;
        tied = false;
      } else if (c === topCount) {
        tied = true;
      }
    }
    if (!tied && topCategory) dominant = topCategory;
  }

  return { counts, sample_size, dominant };
}
