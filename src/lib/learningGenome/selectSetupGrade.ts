/**
 * selectSetupGrade — canon §A-SETUP-ONLY DOCTRINE (2026-08-24 Founder canon,
 * Trading Academy source-derived layer §Joover 7-Level Model).
 *
 * Verbatim canon:
 *   "Live capital is reserved for A and A+ setups only.
 *    A+ = all mandatory gates pass with exceptional alignment...
 *    A  = all mandatory gates pass and the setup is fully authorized,
 *         but conditions are not as exceptional as A+.
 *    B+ = observation/replay/journal only. One meaningful ingredient is
 *         weak, unresolved, or incomplete. No live capital.
 *    B or lower = NO TRADE."
 *
 * Also canon §Model 0/1/2 (Top-Down §Model rules):
 *   Model 0 = NO_TRADE day (expected 0R)
 *   Model 1 = TREND/EXPANSION (3R min, 4R+ preferred)
 *   Model 2 = CHOP/ROTATION (1R baseline, 2R+ earned)
 *
 * This selector maps existing per-entry evidence to a canon-defined
 * setup grade. Deterministic; never fabricates a grade when required
 * evidence is missing.
 *
 * Grade priority (evaluated in canon order):
 *   1. dayModel = M0        → NO_TRADE   (canon: M0 = no-trade day)
 *   2. processQuality = BROKE_RULES → NO_TRADE (canon: authorization failed)
 *   3. plannedR unknown OR processQuality UNRESOLVED → B+
 *      (canon: missing evidence, observation-only)
 *   4. dayModel = M1 AND plannedR ≥ 4 AND FOLLOWED_PLAN → A_PLUS
 *   5. dayModel = M1 AND plannedR ≥ 3 AND FOLLOWED_PLAN → A
 *   6. dayModel = M2 AND plannedR ≥ 2 AND FOLLOWED_PLAN → A_PLUS
 *   7. dayModel = M2 AND plannedR ≥ 1 AND FOLLOWED_PLAN → A
 *   8. Anything else → B (borderline; not enough R for model)
 *
 * Note: this is a POST-HOC grade over a logged trade. Canon §A-Setup
 * uses A+/A/B+/B as PRE-TRADE decision language. The post-hoc grade
 * feeds the Journal review + Learning Genome; the pre-trade version
 * belongs in a future Log-New-Trade guard atom.
 */

export type SetupGrade = "A_PLUS" | "A" | "B_PLUS" | "B" | "NO_TRADE";

export interface SetupGradeInput {
  dayModel?: "M0" | "M1" | "M2";
  plannedR?: number;
  processQuality?: "FOLLOWED_PLAN" | "BROKE_RULES" | "UNRESOLVED";
}

export function selectSetupGrade(input: SetupGradeInput): SetupGrade {
  const { dayModel, plannedR, processQuality } = input;

  // 1. M0 = no-trade day, regardless of anything else.
  if (dayModel === "M0") return "NO_TRADE";

  // 2. Broke the rules = authorization failed.
  if (processQuality === "BROKE_RULES") return "NO_TRADE";

  // 3. Missing evidence → B+ (observation-only).
  if (typeof plannedR !== "number" || !Number.isFinite(plannedR)) return "B_PLUS";
  if (processQuality !== "FOLLOWED_PLAN") return "B_PLUS";

  // 4-7. Model-specific R thresholds per canon.
  if (dayModel === "M1") {
    if (plannedR >= 4) return "A_PLUS";
    if (plannedR >= 3) return "A";
    return "B";
  }
  if (dayModel === "M2") {
    if (plannedR >= 2) return "A_PLUS";
    if (plannedR >= 1) return "A";
    return "B";
  }

  // 8. dayModel unset — no model context to grade against.
  return "B_PLUS";
}

/**
 * Canon rule: "Live capital is reserved for A and A+ setups only."
 * B+ = observation/replay/journal only.
 * B or NO_TRADE = do not trade at all.
 */
export function isLiveCapitalGrade(grade: SetupGrade): boolean {
  return grade === "A_PLUS" || grade === "A";
}

/**
 * Aggregate a series of grades — used to render "X of Y trades this
 * week met the A/A+ live-capital threshold" summaries.
 */
export interface SetupGradeSummary {
  a_plus: number;
  a: number;
  b_plus: number;
  b: number;
  no_trade: number;
  live_capital_qualified: number;
  sample_size: number;
  /** Ratio of live-capital-qualified to (live-capital-qualified + non-M0 B/B+). */
  live_capital_rate: number | undefined;
}

export function summarizeSetupGrades(grades: readonly SetupGrade[]): SetupGradeSummary {
  const counts = { A_PLUS: 0, A: 0, B_PLUS: 0, B: 0, NO_TRADE: 0 };
  for (const g of grades) counts[g]++;
  const live_capital_qualified = counts.A_PLUS + counts.A;
  const non_m0 = grades.length - counts.NO_TRADE;
  const live_capital_rate =
    non_m0 === 0 ? undefined : live_capital_qualified / non_m0;
  return {
    a_plus: counts.A_PLUS,
    a: counts.A,
    b_plus: counts.B_PLUS,
    b: counts.B,
    no_trade: counts.NO_TRADE,
    live_capital_qualified,
    sample_size: grades.length,
    live_capital_rate,
  };
}
