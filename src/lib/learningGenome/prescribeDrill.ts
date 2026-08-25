/**
 * prescribeDrill — Adaptive Academy bridge (canon §9 / Final Helicopter 2026-08-24).
 *
 * Canon (verbatim, Final Helicopter Canon):
 *   "ACADEMY → LIVING CURRICULUM. Training assignments originate from
 *    actual misreads/rule breaks/transfer weakness. Perception Checksum
 *    and Trader Misread Map create targeted practice. Passing a concept
 *    removes scaffolding; occasional checks maintain calibration."
 *
 *   "LEARN → SEE → PRACTICE → REPLAY → PROVE → TRANSFER → FADE."
 *
 * This atom is the bridge between the diagnostic (selectLearningGenome)
 * and the prescription (Adaptive Academy assignment). It maps the
 * weakest measured dimension to a canon-defined drill — a specific,
 * actionable practice the trader can execute NOW.
 *
 * Rejection guarantees:
 *  - Returns undefined when the Genome has no weakest dimension (i.e.
 *    fewer than 2 dimensions measured or they tied). Canon: never
 *    prescribe a drill from insufficient signal.
 *  - The `stage` field is fixed to the canon-defined stage per
 *    dimension — not a percentage, not a made-up scaffolding level.
 */

import type { LearningGenome, LearningDimensionKey } from "./selectLearningGenome";

/**
 * One drill prescription. Small, canon-anchored, actionable.
 * The UI is expected to render `drill` as the CTA and `why` as the
 * one-line justification underneath.
 */
export interface DrillPrescription {
  /** The dimension being targeted (== genome.weakest). */
  dimension: LearningDimensionKey;
  /** Adaptive Academy stage per canon: LEARN/SEE/PRACTICE/REPLAY/PROVE/TRANSFER/FADE. */
  stage: "LEARN" | "SEE" | "PRACTICE" | "REPLAY" | "PROVE" | "TRANSFER" | "FADE";
  /** Short imperative — what the trader should DO. */
  drill: string;
  /** One-line reason, sourced from the Genome dimension. */
  why: string;
}

/**
 * Canon-defined drill for each dimension. Not editable at runtime —
 * changing a prescription requires a Founder canon amendment.
 *
 * The stage is chosen per canon: dimensions that fail on perception
 * (SEEING the setup) get LEARN/SEE stages; dimensions that fail on
 * execution (DOING under pressure) get PRACTICE/REPLAY/TRANSFER stages.
 */
const CANON_DRILLS: Record<
  LearningDimensionKey,
  { stage: DrillPrescription["stage"]; drill: string }
> = {
  PERCEPTION: {
    stage: "SEE",
    drill:
      "Open Replay on 20 charts from the last 7 sessions. Before each " +
      "expansion, name the setup out loud and mark the CLC. No trades — " +
      "just resolve the process.",
  },
  REASONING: {
    stage: "LEARN",
    drill:
      "Review the last 10 BROKE_RULES entries. For each, state the rule " +
      "you broke and one condition under which the rule should have won.",
  },
  PROCESS: {
    stage: "REPLAY",
    drill:
      "Replay the 5 lowest-capture trades. Re-manage each with the same " +
      "planned R but a mechanical trail. Compare capture% before/after.",
  },
  TRANSFER: {
    stage: "PROVE",
    drill:
      "Drop live size to 1/3 for the next 5 plan-followed trades. Prove " +
      "the edge shows up at reduced pressure before restoring size.",
  },
};

export function prescribeDrill(genome: LearningGenome): DrillPrescription | undefined {
  if (!genome.weakest) return undefined;
  const template = CANON_DRILLS[genome.weakest];
  const weakestDim =
    genome.weakest === "PERCEPTION" ? genome.perception :
    genome.weakest === "REASONING" ? genome.reasoning :
    genome.weakest === "PROCESS" ? genome.process :
    genome.transfer;
  const why = weakestDim.label ?? `${genome.weakest} is the weakest measured dimension.`;
  return {
    dimension: genome.weakest,
    stage: template.stage,
    drill: template.drill,
    why,
  };
}
