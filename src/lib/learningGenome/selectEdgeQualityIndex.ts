/**
 * selectEdgeQualityIndex — canon §Personal Edge Lab composite.
 *
 * Canon (Top-Down Process §Personal Edge + §Public Blessing):
 *   "Boring trader / family-freedom principle: one great trade, take
 *    the money, go live your life. A red day can still be an A
 *    Process Day. Process before P&L."
 *
 * A single 0-100 index that composes multiple already-tested §9
 * signals into one number the trader can watch move:
 *
 *   30 pts  — plan adherence (from selectLearningGenome REASONING)
 *   30 pts  — capture efficiency (from selectLearningGenome PROCESS)
 *   20 pts  — live R capture (from selectLearningGenome TRANSFER,
 *             normalized: 0R = 0, +1R = 10, +2R = 20)
 *   20 pts  — classification discipline (from selectDayModelCoverage)
 *
 * Any dimension that is UNMEASURED contributes 0 points AND its
 * weight is subtracted from the max — so an all-unmeasured trader
 * gets index UNDEFINED, not 0. A partially-measured trader gets a
 * scaled 0-100 that only counts what evidence exists.
 *
 * Rejection guarantees:
 *  - Never returns a number when zero signals are measured
 *  - Never fabricates a component score from a missing dimension
 *  - TRANSFER dimension is bounded to [0, 20] so a huge single
 *    winning trade doesn't inflate the index above its cap
 *  - All-perfect result caps at 100; no overrun
 */

import type { LearningGenome } from "./selectLearningGenome";
import type { DayModelCoverage } from "./selectDayModelCoverage";

export interface EdgeQualityIndex {
  index: number | undefined;
  components: {
    plan_adherence: { points: number; max: number } | undefined;
    capture_efficiency: { points: number; max: number } | undefined;
    live_r_capture: { points: number; max: number } | undefined;
    classification: { points: number; max: number } | undefined;
  };
  measured_max: number;
  sample_size: number;
}

export function selectEdgeQualityIndex(
  genome: LearningGenome,
  coverage: DayModelCoverage,
): EdgeQualityIndex {
  const components: EdgeQualityIndex["components"] = {
    plan_adherence: undefined,
    capture_efficiency: undefined,
    live_r_capture: undefined,
    classification: undefined,
  };
  let sum = 0;
  let measured_max = 0;

  // Plan adherence (REASONING). Max 30.
  if (typeof genome.reasoning.score === "number") {
    const points = genome.reasoning.score * 30;
    components.plan_adherence = { points, max: 30 };
    sum += points;
    measured_max += 30;
  }

  // Capture efficiency (PROCESS). Max 30. Score is already a ratio.
  if (typeof genome.process.score === "number") {
    // Clamp negatives to 0 — a negative capture is bad but doesn't
    // pull points below zero (canon: honest reporting, not punishment).
    const clamped = Math.max(0, Math.min(1, genome.process.score));
    const points = clamped * 30;
    components.capture_efficiency = { points, max: 30 };
    sum += points;
    measured_max += 30;
  }

  // Live R capture (TRANSFER). Max 20. Normalize: 0R → 0, +2R → 20 (cap).
  if (typeof genome.transfer.score === "number") {
    const clamped = Math.max(0, Math.min(2, genome.transfer.score));
    const points = (clamped / 2) * 20;
    components.live_r_capture = { points, max: 20 };
    sum += points;
    measured_max += 20;
  }

  // Classification discipline. Max 20.
  if (typeof coverage.classification_rate === "number" && coverage.sample_size > 0) {
    const points = coverage.classification_rate * 20;
    components.classification = { points, max: 20 };
    sum += points;
    measured_max += 20;
  }

  // Sample size = the greater of the underlying selectors' sample sizes
  // (they're derived from the same journal, but this reports the
  // largest evidence pool that contributed).
  const sample_size = Math.max(
    genome.perception.sample_size,
    genome.reasoning.sample_size,
    genome.process.sample_size,
    genome.transfer.sample_size,
    coverage.sample_size,
  );

  if (measured_max === 0) {
    return {
      index: undefined,
      components,
      measured_max: 0,
      sample_size,
    };
  }

  // Scale to 0-100 based on the max of what was measured.
  const index = (sum / measured_max) * 100;
  return {
    index: Math.round(index * 10) / 10,
    components,
    measured_max,
    sample_size,
  };
}
