/**
 * genomeTrend — canon §9 sub-invention (Final Helicopter 2026-08-24).
 *
 * Canon (verbatim, Final Helicopter §9):
 *   "distinguish knowing from doing, diagnosis from outcome, and
 *    skill from luck."
 *
 * A single-week Genome score can be luck; a two-week direction is
 * evidence of skill (or its erosion). This selector compares a current
 * Genome to a prior Genome and emits per-dimension direction:
 *
 *   IMPROVING  — current score > prior score by >= 0.05 (both measured)
 *   DEGRADING  — current score < prior score by >= 0.05 (both measured)
 *   STABLE     — |delta| < 0.05, both measured
 *   NEW        — prior was undefined, current measured (first signal)
 *   LOST       — current is undefined, prior measured (regressed to
 *                unmeasured — canon: honest reporting of lost data,
 *                not silent gap)
 *   UNMEASURED — both undefined (nothing to compare)
 *
 * The 0.05 threshold prevents noise from a single trade nudging the
 * mean up or down. Canon: "materiality gate — don't call a 3% change
 * a story."
 *
 * Rejection guarantees:
 *  - Never fabricates a delta when either side is undefined.
 *  - Never emits IMPROVING/DEGRADING/STABLE unless BOTH sides measured.
 *  - Deterministic — same inputs → same output.
 */

import type {
  LearningGenome,
  LearningDimensionKey,
} from "./selectLearningGenome";

export type TrendDirection =
  | "IMPROVING"
  | "DEGRADING"
  | "STABLE"
  | "NEW"
  | "LOST"
  | "UNMEASURED";

/** Delta threshold below which two measured scores are considered STABLE. */
export const TREND_STABLE_THRESHOLD = 0.05;

export interface DimensionTrend {
  direction: TrendDirection;
  /** current - prior, undefined when either side unmeasured. */
  delta: number | undefined;
  current_score: number | undefined;
  prior_score: number | undefined;
}

export interface GenomeTrend {
  perception: DimensionTrend;
  reasoning: DimensionTrend;
  process: DimensionTrend;
  transfer: DimensionTrend;
  /**
   * The dimension with the strongest positive movement (largest delta).
   * Undefined when no dimension is IMPROVING.
   */
  most_improved: LearningDimensionKey | undefined;
  /**
   * The dimension with the strongest negative movement (largest |delta|).
   * Undefined when no dimension is DEGRADING.
   */
  most_degraded: LearningDimensionKey | undefined;
}

function compareDimension(
  current: number | undefined,
  prior: number | undefined,
): DimensionTrend {
  if (current === undefined && prior === undefined) {
    return {
      direction: "UNMEASURED",
      delta: undefined,
      current_score: undefined,
      prior_score: undefined,
    };
  }
  if (current !== undefined && prior === undefined) {
    return {
      direction: "NEW",
      delta: undefined,
      current_score: current,
      prior_score: undefined,
    };
  }
  if (current === undefined && prior !== undefined) {
    return {
      direction: "LOST",
      delta: undefined,
      current_score: undefined,
      prior_score: prior,
    };
  }
  // Both defined.
  const c = current as number;
  const p = prior as number;
  const delta = c - p;
  let direction: TrendDirection;
  if (Math.abs(delta) < TREND_STABLE_THRESHOLD) direction = "STABLE";
  else if (delta > 0) direction = "IMPROVING";
  else direction = "DEGRADING";
  return { direction, delta, current_score: c, prior_score: p };
}

const DIMENSION_KEYS: readonly LearningDimensionKey[] = [
  "PERCEPTION",
  "REASONING",
  "PROCESS",
  "TRANSFER",
];

export function genomeTrend(
  current: LearningGenome,
  prior: LearningGenome,
): GenomeTrend {
  const perception = compareDimension(
    current.perception.score,
    prior.perception.score,
  );
  const reasoning = compareDimension(
    current.reasoning.score,
    prior.reasoning.score,
  );
  const process = compareDimension(
    current.process.score,
    prior.process.score,
  );
  const transfer = compareDimension(
    current.transfer.score,
    prior.transfer.score,
  );

  const byKey: Record<LearningDimensionKey, DimensionTrend> = {
    PERCEPTION: perception,
    REASONING: reasoning,
    PROCESS: process,
    TRANSFER: transfer,
  };

  // Winner: largest positive delta among IMPROVING dimensions.
  // Loser: largest negative delta among DEGRADING dimensions.
  let most_improved: LearningDimensionKey | undefined;
  let most_degraded: LearningDimensionKey | undefined;
  let bestUp = 0;
  let bestDown = 0;
  for (const key of DIMENSION_KEYS) {
    const t = byKey[key];
    if (t.direction === "IMPROVING" && typeof t.delta === "number" && t.delta > bestUp) {
      bestUp = t.delta;
      most_improved = key;
    }
    if (t.direction === "DEGRADING" && typeof t.delta === "number" && t.delta < bestDown) {
      bestDown = t.delta;
      most_degraded = key;
    }
  }

  return {
    perception,
    reasoning,
    process,
    transfer,
    most_improved,
    most_degraded,
  };
}
