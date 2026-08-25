/**
 * selectDailyScore — canon §14 DAILY SCORE — PROCESS BEFORE P&L
 * (Top-Down Process 2026-08-24).
 *
 * Canon verbatim:
 *   "Score each session across five categories, 0–2 points each:
 *     1. Preparation / top-down.
 *     2. Classification accuracy.
 *     3. Entry authorization discipline.
 *     4. Risk / management discipline.
 *     5. Journal / learning completion.
 *
 *    8–10 = A Process Day
 *    6–7  = B Process Day
 *    4–5  = C Process Day
 *    0–3  = Process Failure / mandatory review before next live session
 *
 *    A red P&L day can still be an A Process Day.
 *    A green P&L day can still be a process failure."
 *
 * This selector derives what it CAN measure from stored per-day entries
 * and honestly reports what it CANNOT measure. It never fabricates
 * scores for dimensions the trader hasn't recorded evidence for.
 *
 * Available signals per-day (from JournalEntry set):
 *   PREPARATION       — a morning-prep entry existed (out of scope
 *                       for this selector; input via `hadMorningPrep`)
 *   CLASSIFICATION    — dayModel is set on every trade + is consistent
 *   AUTHORIZATION     — no BROKE_RULES entries + processQuality resolved
 *   RISK_MANAGEMENT   — realizedR ≥ -2 (canon §Daily Risk: -2R max)
 *                       AND no more than 2 losing trades
 *   JOURNAL           — every trade has a resolved processQuality
 *                       (FOLLOWED_PLAN or BROKE_RULES, not UNRESOLVED)
 *
 * Each category returns a score 0..2:
 *   2 = full evidence, discipline held
 *   1 = evidence exists but partial (e.g. mixed dayModel)
 *   0 = evidence missing or discipline broke
 *   undefined = not enough data to score (never converts to 0)
 */

import type { EdgeEntry } from "../proofLane/selectSessionEdge";

export type CategoryScore = 0 | 1 | 2 | undefined;

export type ProcessGrade =
  | "A_PROCESS"
  | "B_PROCESS"
  | "C_PROCESS"
  | "PROCESS_FAILURE"
  | "INSUFFICIENT_EVIDENCE";

export interface DayModelSignal {
  dayModel?: "M0" | "M1" | "M2";
}

export interface DailyScoreInput {
  /** All entries logged for the day (may be empty for a no-trade day). */
  entries: readonly (EdgeEntry & DayModelSignal)[];
  /** True if a MorningPrep entry existed for this date. Optional signal. */
  hadMorningPrep?: boolean;
}

export interface DailyScore {
  preparation: CategoryScore;
  classification: CategoryScore;
  authorization: CategoryScore;
  risk_management: CategoryScore;
  journal_completion: CategoryScore;
  /** Sum of measured categories only; undefined if fewer than 3 measurable. */
  total: number | undefined;
  grade: ProcessGrade;
  measured_categories: number;
}

function measurePreparation(input: DailyScoreInput): CategoryScore {
  if (input.hadMorningPrep === undefined) return undefined;
  return input.hadMorningPrep ? 2 : 0;
}

function measureClassification(input: DailyScoreInput): CategoryScore {
  // No trades means M0 was correctly executed as a no-trade day —
  // classification signal is undefined (nothing to classify).
  if (input.entries.length === 0) return undefined;
  const withModel = input.entries.filter((e) => e.dayModel !== undefined);
  if (withModel.length === 0) return 0;
  const distinctModels = new Set(withModel.map((e) => e.dayModel));
  // All entries tagged with same model = 2
  // Some tagged / some unset = 1
  // Mixed models across the same day = 1 (canon: dayModel is per-session)
  if (withModel.length === input.entries.length && distinctModels.size === 1) return 2;
  if (withModel.length < input.entries.length) return 1;
  return 1; // multiple distinct models on one session — mid signal
}

function measureAuthorization(input: DailyScoreInput): CategoryScore {
  if (input.entries.length === 0) return undefined;
  const broke = input.entries.filter((e) => e.processQuality === "BROKE_RULES").length;
  const unresolved = input.entries.filter((e) => e.processQuality === "UNRESOLVED").length;
  if (broke > 0) return 0;
  if (unresolved === input.entries.length) return undefined;
  // All resolved + none broke = 2
  // Some resolved + none broke = 1
  if (unresolved === 0) return 2;
  return 1;
}

function measureRiskManagement(input: DailyScoreInput): CategoryScore {
  if (input.entries.length === 0) return undefined;
  const rTagged = input.entries.filter((e) => typeof e.realizedR === "number");
  if (rTagged.length === 0) return undefined;
  const totalR = rTagged.reduce((sum, e) => sum + (e.realizedR ?? 0), 0);
  const losingTrades = rTagged.filter((e) => (e.realizedR ?? 0) < 0).length;
  // Canon §Daily Risk: -2R max daily loss, no more than 2 losing trades.
  if (totalR < -2 || losingTrades > 2) return 0;
  if (totalR < -1 || losingTrades === 2) return 1;
  return 2;
}

function measureJournalCompletion(input: DailyScoreInput): CategoryScore {
  if (input.entries.length === 0) {
    // No-trade day — journal is complete if hadMorningPrep is known.
    if (input.hadMorningPrep === true) return 2;
    return undefined;
  }
  const resolved = input.entries.filter(
    (e) => e.processQuality === "FOLLOWED_PLAN" || e.processQuality === "BROKE_RULES",
  ).length;
  const ratio = resolved / input.entries.length;
  if (ratio >= 1) return 2;
  if (ratio >= 0.5) return 1;
  return 0;
}

function classifyGrade(total: number, measured: number): ProcessGrade {
  if (measured < 3) return "INSUFFICIENT_EVIDENCE";
  // Scale the canon thresholds by the fraction of measured categories.
  // Canon assumes 5 categories × 2 points = 10 possible; if only 4 are
  // measured, an A day is 8/10 * 4/5 = 6.4 (round to >= 6).
  const scale = measured / 5;
  const aFloor = 8 * scale;
  const bFloor = 6 * scale;
  const cFloor = 4 * scale;
  if (total >= aFloor) return "A_PROCESS";
  if (total >= bFloor) return "B_PROCESS";
  if (total >= cFloor) return "C_PROCESS";
  return "PROCESS_FAILURE";
}

export function selectDailyScore(input: DailyScoreInput): DailyScore {
  const preparation = measurePreparation(input);
  const classification = measureClassification(input);
  const authorization = measureAuthorization(input);
  const risk_management = measureRiskManagement(input);
  const journal_completion = measureJournalCompletion(input);
  const scores = [preparation, classification, authorization, risk_management, journal_completion];
  const measured = scores.filter((s): s is 0 | 1 | 2 => s !== undefined);
  const measured_categories = measured.length;
  const total: number | undefined = measured_categories === 0
    ? undefined
    : measured.reduce<number>((a, b) => a + b, 0);
  const grade = total === undefined ? "INSUFFICIENT_EVIDENCE" : classifyGrade(total, measured_categories);
  return {
    preparation,
    classification,
    authorization,
    risk_management,
    journal_completion,
    total,
    grade,
    measured_categories,
  };
}
