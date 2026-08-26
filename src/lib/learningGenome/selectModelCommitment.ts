/**
 * selectModelCommitment — canon §1 CHOOSE THE MODEL BEFORE THE MARKET
 * (Top-Down Process amendment 2026-08-25 §1).
 *
 * Canon verbatim:
 *   "Before the opening bell, declare PRIMARY MODEL (0/1/2),
 *    directional thesis, meaningful locations, required evidence,
 *    invalidation, Available R requirement, and management intent.
 *    Optional alternate scenarios are allowed only when they are
 *    explicitly predeclared before the session. Intraday price
 *    movement may satisfy, invalidate, or leave the plan waiting;
 *    it may not justify hindsight strategy hopping."
 *
 * Measures whether the trader COMMITTED to a day model before the
 * session opened, and whether their eventual trades match that
 * commitment (canon: no hindsight strategy hopping).
 *
 * Input per session:
 *   - declaredModel        (M0/M1/M2 or undefined = NO DECLARATION)
 *   - declaredAtMs         (when the declaration was made)
 *   - sessionOpenMs        (when the market opened)
 *   - executedModels       (day models on entries taken during session)
 *
 * Output verdict per session:
 *   NOT_DECLARED    — no PRIMARY MODEL declared before session
 *   DECLARED_LATE   — declaration exists but was made AT or AFTER
 *                     sessionOpenMs (canon: predeclaration required)
 *   HELD            — every executed model matches the declaration
 *   SHIFTED         — at least one executed model differs from
 *                     declared (canon: hindsight strategy hop hazard)
 *   NO_TRADES       — declared M0 with zero executions = disciplined
 *                     no-trade day; or declared M1/M2 with zero
 *                     executions = plan waiting (canon-legitimate)
 *
 * Rejection guarantees:
 *  - Never rewards a late declaration
 *  - M0 declaration + executed trades → SHIFTED (M0 = no trade day
 *    per canon §Model 0)
 *  - Reports the specific shifted models for evidence-elevator UX
 */

export type DayModel = "M0" | "M1" | "M2";

export type ModelCommitmentVerdict =
  | "NOT_DECLARED"
  | "DECLARED_LATE"
  | "HELD"
  | "SHIFTED"
  | "NO_TRADES";

export interface ModelCommitmentInput {
  declaredModel?: DayModel;
  declaredAtMs?: number;
  sessionOpenMs: number;
  executedModels: readonly (DayModel | undefined)[];
}

export interface ModelCommitmentResult {
  verdict: ModelCommitmentVerdict;
  declared_model: DayModel | undefined;
  shifted_models: readonly DayModel[];
  execution_count: number;
  canon: string;
}

function uniqueSorted(models: readonly (DayModel | undefined)[]): DayModel[] {
  const set = new Set<DayModel>();
  for (const m of models) {
    if (m === "M0" || m === "M1" || m === "M2") set.add(m);
  }
  return [...set].sort();
}

export function selectModelCommitment(
  input: ModelCommitmentInput,
): ModelCommitmentResult {
  const execution_count = input.executedModels.length;
  const declared = input.declaredModel;

  if (!declared) {
    return {
      verdict: "NOT_DECLARED",
      declared_model: undefined,
      shifted_models: [],
      execution_count,
      canon: "§1 CHOOSE THE MODEL BEFORE THE MARKET",
    };
  }

  const declaredInTime =
    typeof input.declaredAtMs === "number" &&
    input.declaredAtMs < input.sessionOpenMs;

  if (!declaredInTime) {
    return {
      verdict: "DECLARED_LATE",
      declared_model: declared,
      shifted_models: [],
      execution_count,
      canon: "§1 CHOOSE THE MODEL BEFORE THE MARKET",
    };
  }

  // M0 declared: any execution is a SHIFT (canon: M0 = no trade day).
  if (declared === "M0") {
    if (execution_count === 0) {
      return {
        verdict: "NO_TRADES",
        declared_model: declared,
        shifted_models: [],
        execution_count,
        canon: "§Model 0 (no-trade day)",
      };
    }
    const executed = uniqueSorted(input.executedModels);
    // Any executed model other than M0 is a shift; if all executions
    // happen to be tagged M0 (nonsense but shape-valid), still SHIFT
    // because M0 semantically excludes execution.
    return {
      verdict: "SHIFTED",
      declared_model: declared,
      shifted_models: executed.length > 0 ? executed : ["M0"],
      execution_count,
      canon: "§Model 0 (no-trade day) — any execution violates the declaration",
    };
  }

  // Declared M1 or M2.
  if (execution_count === 0) {
    return {
      verdict: "NO_TRADES",
      declared_model: declared,
      shifted_models: [],
      execution_count,
      canon: "§1 plan waiting — declared model, no qualified setup appeared",
    };
  }

  const executed = uniqueSorted(input.executedModels);
  const shifted = executed.filter((m) => m !== declared);
  if (shifted.length === 0) {
    return {
      verdict: "HELD",
      declared_model: declared,
      shifted_models: [],
      execution_count,
      canon: "§1 model commitment held",
    };
  }
  return {
    verdict: "SHIFTED",
    declared_model: declared,
    shifted_models: shifted,
    execution_count,
    canon: "§1 hindsight strategy hop — executed models diverged from declaration",
  };
}
