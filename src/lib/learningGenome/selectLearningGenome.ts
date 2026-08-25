/**
 * selectLearningGenome — canon §9 Learning Genome (Final Helicopter, 2026-08-24).
 *
 * "Track multidimensional skill evidence rather than one Trader Score.
 *  Core distinctions: perception, reasoning, process, live transfer.
 *  Output example: 'Your setup recognition is not the bottleneck.
 *  Management after +2R is unstable.'" — 5-Hour Finish Canon
 *
 * This is the first Learning Genome atom. It composes existing canonical
 * primitives — EdgeEntry (from selectSessionEdge) and captureEfficiency —
 * into a four-dimension diagnostic that never invents evidence:
 *
 *   PERCEPTION — did the trader resolve the process at all?
 *     (proxy: fraction of entries with processQuality != UNRESOLVED)
 *   REASONING  — when process was resolved, did they follow the plan?
 *     (proxy: FOLLOWED_PLAN ÷ (FOLLOWED_PLAN + BROKE_RULES))
 *   PROCESS    — of trades with MFE data, what capture efficiency did
 *     they achieve? (proxy: averageCapture — canon §7 Management Studio)
 *   TRANSFER   — when the process was followed, did the R come home?
 *     (proxy: mean realizedR of entries where processQuality =
 *     FOLLOWED_PLAN and realizedR is defined)
 *
 * Rejection guarantees (per §22 Orkin + §11 Truth Resolution Matrix):
 *  - Each dimension returns undefined when sample size is 0 — never a
 *    fabricated score.
 *  - Each dimension records its own sample_size so a small sample cannot
 *    be presented as a strong claim.
 *  - headlineWeakness is undefined until at least one dimension is
 *    measurable AND at least one is weaker than another — no "your
 *    weakest area is X" when all four are equal or all four are unmeasured.
 *  - Never derives R from P&L; only reads realizedR the caller supplied.
 */

import { averageCapture } from "../proofLane/captureEfficiency";
import type { EdgeEntry } from "../proofLane/selectSessionEdge";

/**
 * One measured dimension of the Learning Genome.
 * `score` is a normalized ratio in [0, 1] (or [-1, 1] for TRANSFER, since
 * a trader can have negative expectancy). Undefined = no signal yet.
 */
export interface GenomeDimension {
  score: number | undefined;
  sample_size: number;
  /** Short human phrase the UI can render. Undefined when score is undefined. */
  label: string | undefined;
}

export type LearningDimensionKey =
  | "PERCEPTION"
  | "REASONING"
  | "PROCESS"
  | "TRANSFER";

export interface LearningGenome {
  perception: GenomeDimension;
  reasoning: GenomeDimension;
  process: GenomeDimension;
  transfer: GenomeDimension;
  /**
   * The dimension the trader is strongest in (highest score) and weakest
   * in (lowest score). Only set when at least two dimensions are measured
   * AND they differ — canon: never invent a "weakest area" from one data
   * point or from a tie.
   */
  strongest: LearningDimensionKey | undefined;
  weakest: LearningDimensionKey | undefined;
  /**
   * Canon-example headline: "Your setup recognition is not the bottleneck.
   * Management after +2R is unstable." — only emitted when strongest AND
   * weakest are both defined.
   */
  headlineWeakness: string | undefined;
}

const EMPTY_DIMENSION: GenomeDimension = {
  score: undefined,
  sample_size: 0,
  label: undefined,
};

/** Perception: how often did the trader resolve the process at all? */
function measurePerception(entries: readonly EdgeEntry[]): GenomeDimension {
  if (entries.length === 0) return { ...EMPTY_DIMENSION };
  const resolved = entries.filter((e) => e.processQuality !== "UNRESOLVED");
  const score = resolved.length / entries.length;
  return {
    score,
    sample_size: entries.length,
    label: `Process resolved on ${Math.round(score * 100)}% of ${entries.length} trades`,
  };
}

/** Reasoning: when resolved, did the trader follow the plan? */
function measureReasoning(entries: readonly EdgeEntry[]): GenomeDimension {
  const resolved = entries.filter((e) => e.processQuality !== "UNRESOLVED");
  if (resolved.length === 0) return { ...EMPTY_DIMENSION };
  const followed = resolved.filter((e) => e.processQuality === "FOLLOWED_PLAN");
  const score = followed.length / resolved.length;
  return {
    score,
    sample_size: resolved.length,
    label: `Plan followed on ${followed.length}/${resolved.length} resolved trades`,
  };
}

/** Process: of trades with MFE data, what capture efficiency? */
function measureProcess(entries: readonly EdgeEntry[]): GenomeDimension {
  const withMfe = entries.filter(
    (e): e is EdgeEntry & { realizedR: number; mfeR: number } =>
      typeof e.mfeR === "number" && typeof e.realizedR === "number",
  );
  if (withMfe.length === 0) return { ...EMPTY_DIMENSION };
  const { avgCapture, sampleSize } = averageCapture(withMfe);
  if (avgCapture === undefined) return { ...EMPTY_DIMENSION };
  return {
    score: avgCapture,
    sample_size: sampleSize,
    label: `Capture ${Math.round(avgCapture * 100)}% of MFE across ${sampleSize} trades`,
  };
}

/** Transfer: when plan followed, did realized R come home? */
function measureTransfer(entries: readonly EdgeEntry[]): GenomeDimension {
  const eligible = entries.filter(
    (e): e is EdgeEntry & { realizedR: number } =>
      e.processQuality === "FOLLOWED_PLAN" && typeof e.realizedR === "number",
  );
  if (eligible.length === 0) return { ...EMPTY_DIMENSION };
  const meanR =
    eligible.reduce((acc, e) => acc + e.realizedR, 0) / eligible.length;
  return {
    score: meanR,
    sample_size: eligible.length,
    label: `Mean ${meanR >= 0 ? "+" : ""}${meanR.toFixed(2)}R across ${eligible.length} plan-followed trades`,
  };
}

const DIMENSION_ORDER: readonly LearningDimensionKey[] = [
  "PERCEPTION",
  "REASONING",
  "PROCESS",
  "TRANSFER",
];

const HEADLINE_NAME: Record<LearningDimensionKey, string> = {
  PERCEPTION: "Setup recognition",
  REASONING: "Plan adherence",
  PROCESS: "Management after entry",
  TRANSFER: "Live R capture",
};

export function selectLearningGenome(
  entries: readonly EdgeEntry[],
): LearningGenome {
  const perception = measurePerception(entries);
  const reasoning = measureReasoning(entries);
  const process = measureProcess(entries);
  const transfer = measureTransfer(entries);

  const dimensions: readonly {
    key: LearningDimensionKey;
    dim: GenomeDimension;
  }[] = [
    { key: "PERCEPTION", dim: perception },
    { key: "REASONING", dim: reasoning },
    { key: "PROCESS", dim: process },
    { key: "TRANSFER", dim: transfer },
  ];

  const measured = dimensions.filter(
    (d): d is { key: LearningDimensionKey; dim: GenomeDimension & { score: number } } =>
      typeof d.dim.score === "number",
  );

  let strongest: LearningDimensionKey | undefined;
  let weakest: LearningDimensionKey | undefined;
  let headlineWeakness: string | undefined;

  if (measured.length >= 2) {
    // Iterate in canonical order so a tie resolves deterministically.
    const sorted = [...measured].sort((a, b) => {
      if (a.dim.score === b.dim.score) {
        return (
          DIMENSION_ORDER.indexOf(a.key) - DIMENSION_ORDER.indexOf(b.key)
        );
      }
      return b.dim.score - a.dim.score; // descending
    });
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    if (top.dim.score !== bottom.dim.score) {
      strongest = top.key;
      weakest = bottom.key;
      headlineWeakness =
        `${HEADLINE_NAME[strongest]} is not the bottleneck. ` +
        `${HEADLINE_NAME[weakest]} is the weakest link.`;
    }
  }

  return {
    perception,
    reasoning,
    process,
    transfer,
    strongest,
    weakest,
    headlineWeakness,
  };
}
