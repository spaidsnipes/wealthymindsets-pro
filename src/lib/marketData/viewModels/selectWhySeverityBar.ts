/**
 * WHY, DRAWN BY SEVERITY.
 *
 * The WHY cell prints one headline and, one drawer down, a sampled list of
 * blockers. What it never showed is the thing a trader reads first in every
 * real cockpit: HOW MANY things are in the way, and how hard they are.
 *
 * ── THE TRAP THIS COMPILER IS BUILT AROUND ───────────────────────────────────
 *
 * `DecisionWhyVM.blockers` is a SAMPLE, capped by EVIDENCE_LABEL_SAMPLE_LIMIT.
 * `blockerCount` is the census. That asymmetry has already produced the same
 * defect four times in this codebase — "6 BLOCKERS" that was really the cap
 * wearing the clothes of a measurement.
 *
 * A bar that drew one segment per sampled blocker would be that defect's fifth
 * head, and a prettier one: nine blockers and six blockers would draw an
 * IDENTICAL picture.
 *
 * So this compiler draws `blockerCount` segments — the census — and gives a
 * KIND only to the ones the sample actually attributes. The rest are emitted as
 * `UNATTRIBUTED`: present, counted, visibly in the way, and honestly unlabelled.
 * Guessing their severity from the sample's distribution would be inventing
 * evidence to make a bar look finished.
 *
 * "No number becomes truth because it was drawn." The census is already
 * compiled upstream; this only gives it a shape.
 *
 * Pure / deterministic. Renders elsewhere.
 */

import type { DecisionWhyVM, WhyBlockerKind } from "./selectDecisionWhyNot";

export type WhySeverityState = WhyBlockerKind | "UNATTRIBUTED";

export interface WhySeveritySegment {
  readonly state: WhySeverityState;
  /** Sampled label, when this segment is one the VM could name. */
  readonly label: string | null;
}

export interface WhySeverityBar {
  /** One segment per blocker in the CENSUS, never per sampled label. */
  readonly segments: readonly WhySeveritySegment[];
  /** The census, echoed so a surface never recomputes it from the array. */
  readonly blockerCount: number;
  /** Affirmative clearances, for the cleared side of the reading. */
  readonly clearanceCount: number;
  /** True when right-of-way is granted and nothing is in the way. */
  readonly clear: boolean;
}

export function selectWhySeverityBar(why: DecisionWhyVM | null): WhySeverityBar | null {
  if (!why) return null;

  const segments: WhySeveritySegment[] = [];
  for (const blocker of why.blockers) {
    // Never emit more attributed segments than the census admits exist. If a
    // sample were ever longer than its own census, the census wins — it is the
    // field documented as authoritative.
    if (segments.length >= why.blockerCount) break;
    segments.push({ state: blocker.kind, label: blocker.label });
  }
  for (let i = segments.length; i < why.blockerCount; i += 1) {
    segments.push({ state: "UNATTRIBUTED", label: null });
  }

  if (segments.length === 0 && why.clearances.length === 0) return null;

  return {
    segments,
    blockerCount: why.blockerCount,
    clearanceCount: why.clearances.length,
    clear: why.clear,
  };
}

export default selectWhySeverityBar;
