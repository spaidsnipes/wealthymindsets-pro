import type { LearningDimensionKey } from "./selectLearningGenome";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Converts each Learning Genome dimension to the shared comparison scale.
 * Raw scores remain the source of display/export truth; this scale is only
 * for cross-dimension ranking, trend materiality, and composite weighting.
 *
 * Canonical law already used by Edge Quality:
 * - ratio dimensions: clamp to 0..1
 * - TRANSFER: 0R -> 0, +2R -> 1, with floor/cap
 */
export function normalizeLearningDimensionScore(
  key: LearningDimensionKey,
  rawScore: number,
): number {
  if (key === "TRANSFER") return clamp01(rawScore / 2);
  return clamp01(rawScore);
}
