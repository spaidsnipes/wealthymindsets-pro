/**
 * learningGenomeToJson — canon §Public Blessing / Private Recipe
 * exporter for the Learning Genome bundle (§9 diagnostic).
 *
 * Canon (Final Helicopter §Public Blessing / Private Recipe):
 *   "Let users see the blessing: Clarity, Living Profiles, Temporal
 *    Reality, Market Object Passports, WHY?, Learning Genome, Replay,
 *    Academy, Studio outcomes... Keep the manufacturing recipe private."
 *
 * A trader must be able to pull their own Learning Genome data — the
 * blessing — without asking WM for it. This exporter composes the four
 * §9 primitives into one JSON payload:
 *
 *   selectLearningGenome  — four-dimension diagnostic
 *   prescribeDrill        — canon-defined next drill
 *   selectMisreadMap      — mistake-shape counts
 *   genomeTrend           — this-week vs prior-week direction
 *
 * What we DO expose (Public Blessing): scores, sample_sizes, labels,
 * drill text, category counts, direction, delta, headlineWeakness.
 *
 * What we DO NOT expose (Private Recipe): internal thresholds
 * (STABLE = 0.05, POOR_MANAGEMENT MFE = 1.5R, FULL_STOP_LOSS MAE
 * = -0.75R), classification priority order internals, drill mapping
 * tables. Consumers get the outputs, not the factory.
 */

import type { EdgeEntry } from "../proofLane/selectSessionEdge";
import { selectLearningGenome, type LearningGenome } from "./selectLearningGenome";
import { prescribeDrill, type DrillPrescription } from "./prescribeDrill";
import {
  selectMisreadMap,
  type MisreadEntry,
  type MisreadMap,
} from "./selectMisreadMap";
import { genomeTrend, type GenomeTrend } from "./genomeTrend";
// SHIFT-N atom 4 additions — 2026-08-25 canon amendments.
import { selectSameDayDualSideGuard, type BiasSide, type DualSideGuardResult } from "./selectSameDayDualSideGuard";
import { selectFocusStreak, type FocusStreak } from "./selectFocusStreak";
import { selectRuleAdherenceStreak, type RuleAdherenceStreak } from "./selectRuleAdherenceStreak";
import { selectDayModelCoverage, type DayModelCoverage } from "./selectDayModelCoverage";

export const LEARNING_GENOME_JSON_SCHEMA_VERSION = "1.1.0" as const;

export interface LearningGenomeBundle {
  readonly version: string;
  readonly exportedAt: string;
  readonly window: {
    readonly current_days: number;
    readonly prior_days: number;
    readonly current_sample_size: number;
    readonly prior_sample_size: number;
  };
  readonly genome: LearningGenome;
  readonly drill: DrillPrescription | undefined;
  readonly misread: MisreadMap;
  readonly trend: GenomeTrend;
  // v1.1.0 additions — 2026-08-25 canon primitives.
  readonly focus_streak: FocusStreak;
  readonly rule_adherence_streak: RuleAdherenceStreak;
  readonly day_model_coverage: DayModelCoverage;
  readonly dual_side_guard: DualSideGuardResult;
}

export interface LearningGenomeInput {
  /** Entries in the CURRENT window (typically last 7 days). */
  currentEntries: readonly MisreadEntry[];
  /** Entries in the PRIOR window (typically days -14 to -7). */
  priorEntries: readonly MisreadEntry[];
  /** Window sizes in days, for provenance in the export document. */
  currentDays: number;
  priorDays: number;
  /**
   * Callers pass the timestamp explicitly so the serializer stays pure
   * (deterministic in tests; no hidden Date.now()).
   */
  exportedAt: string;
}

/** Strip dayModel from a MisreadEntry to get the plain EdgeEntry the Genome needs. */
function toEdgeEntry(e: MisreadEntry): EdgeEntry {
  return {
    date: e.date,
    result: e.result,
    realizedR: e.realizedR,
    processQuality: e.processQuality,
    mfeR: e.mfeR,
    maeR: e.maeR,
  };
}

/**
 * Build the Learning Genome bundle. Pure composition of the four §9
 * primitives — no new selector logic here, just aggregation.
 */
export function buildLearningGenomeBundle(
  input: LearningGenomeInput,
): LearningGenomeBundle {
  const currentEdge = input.currentEntries.map(toEdgeEntry);
  const priorEdge = input.priorEntries.map(toEdgeEntry);
  const genome = selectLearningGenome(currentEdge);
  const priorGenome = selectLearningGenome(priorEdge);
  const drill = prescribeDrill(genome);
  const misread = selectMisreadMap(input.currentEntries);
  const trend = genomeTrend(genome, priorGenome);
  // v1.1.0 — additional canon primitives from 2026-08-25 amendments.
  const focus_streak = selectFocusStreak(currentEdge);
  const rule_adherence_streak = selectRuleAdherenceStreak(currentEdge);
  const day_model_coverage = selectDayModelCoverage(input.currentEntries);
  // dual-side guard — MisreadEntry doesn't carry symbol/side, so derive
  // from the edge shape only if callers supply the extended data. When
  // symbol/side aren't on the input record, the guard returns an empty
  // result set (canon: no fabrication).
  const dualSideInputs = (input.currentEntries as readonly (MisreadEntry & { symbol?: string; side?: BiasSide })[])
    .filter((e): e is MisreadEntry & { symbol: string; side: BiasSide } =>
      typeof e.symbol === "string" && e.symbol.length > 0 &&
      (e.side === "long" || e.side === "short" || e.side === "call" || e.side === "put"),
    )
    .map((e) => ({ date: e.date, symbol: e.symbol, side: e.side }));
  const dual_side_guard = selectSameDayDualSideGuard(dualSideInputs);
  return {
    version: LEARNING_GENOME_JSON_SCHEMA_VERSION,
    exportedAt: input.exportedAt,
    window: {
      current_days: input.currentDays,
      prior_days: input.priorDays,
      current_sample_size: input.currentEntries.length,
      prior_sample_size: input.priorEntries.length,
    },
    genome,
    drill,
    misread,
    trend,
    focus_streak,
    rule_adherence_streak,
    day_model_coverage,
    dual_side_guard,
  };
}

/** JSON.stringify the bundle. Two-space indent; stable field order. */
export function learningGenomeToJson(bundle: LearningGenomeBundle): string {
  return JSON.stringify(bundle, null, 2);
}
