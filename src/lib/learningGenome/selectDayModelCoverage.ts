/**
 * selectDayModelCoverage — canon §3 Model 0/1/2 + Personal Edge measurement.
 *
 * How often does the trader USE each day model? A trader who defaults
 * to M1 every day and never classifies M0 or M2 is likely mislabeling.
 * A trader with a healthy distribution across all three models is
 * classifying honestly.
 *
 * Deterministic count + ratio over a sample. Silent when the sample
 * is empty (never fabricates a distribution).
 *
 * Also reports the "unclassified" ratio — entries logged without a
 * dayModel at all. High unclassified rate = classification-discipline
 * gap (feeds selectLearningGenome's PERCEPTION dimension).
 */

import type { EdgeEntry } from "../proofLane/selectSessionEdge";

export interface DayModelCoverage {
  m0: number;
  m1: number;
  m2: number;
  unclassified: number;
  sample_size: number;
  /** Fraction with any dayModel set. Undefined when sample_size = 0. */
  classification_rate: number | undefined;
  /** Fraction of classified that are M1 (trend). Undefined when no classified. */
  m1_share: number | undefined;
  /** Fraction of classified that are M2 (chop). Undefined when no classified. */
  m2_share: number | undefined;
  /** Fraction of classified that are M0 (no-trade). Undefined when no classified. */
  m0_share: number | undefined;
}

export interface DayModelEntry extends EdgeEntry {
  dayModel?: "M0" | "M1" | "M2";
}

export function selectDayModelCoverage(
  entries: readonly DayModelEntry[],
): DayModelCoverage {
  const counts = { m0: 0, m1: 0, m2: 0, unclassified: 0 };
  for (const e of entries) {
    switch (e.dayModel) {
      case "M0":
        counts.m0++;
        break;
      case "M1":
        counts.m1++;
        break;
      case "M2":
        counts.m2++;
        break;
      default:
        counts.unclassified++;
    }
  }
  const sample_size = entries.length;
  if (sample_size === 0) {
    return {
      ...counts,
      sample_size,
      classification_rate: undefined,
      m0_share: undefined,
      m1_share: undefined,
      m2_share: undefined,
    };
  }
  const classified = counts.m0 + counts.m1 + counts.m2;
  const classification_rate = classified / sample_size;
  if (classified === 0) {
    return {
      ...counts,
      sample_size,
      classification_rate,
      m0_share: undefined,
      m1_share: undefined,
      m2_share: undefined,
    };
  }
  return {
    ...counts,
    sample_size,
    classification_rate,
    m0_share: counts.m0 / classified,
    m1_share: counts.m1 / classified,
    m2_share: counts.m2 / classified,
  };
}
