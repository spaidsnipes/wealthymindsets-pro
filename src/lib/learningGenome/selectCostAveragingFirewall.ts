/**
 * selectCostAveragingFirewall — canon §COST-AVERAGING FIREWALL
 * (Top-Down Process amendment 2026-08-25).
 *
 * Canon verbatim:
 *   "Cost averaging is not automatically strategy refinement. Adding
 *    contracts changes effective entry, debit, risk, Greeks, and
 *    sample interpretation.
 *    For clean live-strategy evidence, adding size is allowed only
 *    when the scale plan was declared before the first fill and total
 *    risk remains inside the original 1R contract. Otherwise the add
 *    is a separate experimental action or an execution violation,
 *    even if the combined position later wins."
 *
 * Deterministic classifier for scale-in / cost-average events.
 *
 * Inputs (per scale event on an open position):
 *   - originalOneRDollars   the original 1R risk budget in $
 *   - originalDebitDollars  total debit deployed on the first fill
 *   - scalePlanDeclared     was a scale plan declared before first fill
 *   - addedDebitDollars     additional $ deployed on the add
 *   - postAddStructuralRiskDollars  total $ at risk to structural
 *                                    invalidation after the add
 *
 * Verdicts (canon-ordered):
 *   PLAN_CLEAN                 — declared scale + total risk still ≤ 1R
 *   EXPERIMENTAL_MANAGEMENT    — no declared plan; canon says this is
 *                                a separate experimental action (paper OK,
 *                                journal separately)
 *   EXECUTION_VIOLATION        — declared plan present BUT total risk
 *                                exceeded the original 1R contract
 *   NO_SCALE                   — addedDebitDollars = 0 (no event to
 *                                classify)
 *
 * Rejection guarantees:
 *  - Never fabricates a "clean" verdict when scale plan was undeclared
 *  - Non-finite inputs collapse to NO_SCALE with reason
 *  - Zero or negative added debit → NO_SCALE
 *  - 1R breach detected even if scale WAS predeclared (canon: risk cap
 *    is the ceiling, plan is not permission to breach it)
 */

export interface CostAveragingInput {
  originalOneRDollars: number;
  scalePlanDeclared: boolean;
  addedDebitDollars: number;
  postAddStructuralRiskDollars: number;
}

export type CostAveragingVerdict =
  | "NO_SCALE"
  | "PLAN_CLEAN"
  | "EXPERIMENTAL_MANAGEMENT"
  | "EXECUTION_VIOLATION";

export interface CostAveragingResult {
  verdict: CostAveragingVerdict;
  post_add_risk_over_one_r: number | undefined;
  breaches_one_r: boolean;
  canon: string;
}

function isFinite(n: number): boolean {
  return typeof n === "number" && Number.isFinite(n);
}

export function selectCostAveragingFirewall(
  input: CostAveragingInput,
): CostAveragingResult {
  if (!isFinite(input.addedDebitDollars) || input.addedDebitDollars <= 0) {
    return {
      verdict: "NO_SCALE",
      post_add_risk_over_one_r: undefined,
      breaches_one_r: false,
      canon: "§Cost-Averaging Firewall — no add to classify",
    };
  }

  if (!isFinite(input.originalOneRDollars) || input.originalOneRDollars <= 0) {
    return {
      verdict: "NO_SCALE",
      post_add_risk_over_one_r: undefined,
      breaches_one_r: false,
      canon: "§Cost-Averaging Firewall — original 1R is missing or non-positive",
    };
  }

  const risk_ratio =
    isFinite(input.postAddStructuralRiskDollars)
      ? input.postAddStructuralRiskDollars / input.originalOneRDollars
      : undefined;
  const breaches_one_r =
    typeof risk_ratio === "number" && risk_ratio > 1;

  if (breaches_one_r) {
    return {
      verdict: "EXECUTION_VIOLATION",
      post_add_risk_over_one_r: risk_ratio,
      breaches_one_r,
      canon: input.scalePlanDeclared
        ? "§Cost-Averaging Firewall — declared plan cannot authorize a 1R breach"
        : "§Cost-Averaging Firewall — undeclared add exceeded 1R (violation, not experiment)",
    };
  }

  if (!input.scalePlanDeclared) {
    return {
      verdict: "EXPERIMENTAL_MANAGEMENT",
      post_add_risk_over_one_r: risk_ratio,
      breaches_one_r: false,
      canon: "§Cost-Averaging Firewall — undeclared add: journal as experimental management action",
    };
  }

  return {
    verdict: "PLAN_CLEAN",
    post_add_risk_over_one_r: risk_ratio,
    breaches_one_r: false,
    canon: "§Cost-Averaging Firewall — declared scale plan + risk inside 1R",
  };
}
