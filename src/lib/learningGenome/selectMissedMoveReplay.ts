/**
 * selectMissedMoveReplay — canon §11 MFE CLOCK / MISSED-MOVE REPLAY
 * (Top-Down Process amendment 2026-08-25 §11 — LAB).
 *
 * Canon verbatim:
 *   "For every predeclared model/location, preserve:
 *    - first qualified timestamp if any
 *    - whether it occurred inside the user's Availability Contract
 *    - Available R then
 *    - underlying MFE/MAE afterward
 *    - contract MFE/MAE where data supports it"
 *
 * Deterministic classifier for missed-move situations. Given a
 * declared setup plan and the qualifying event that happened during
 * the session, this selector produces a canonically-labeled outcome
 * the trader can review post-session without hindsight rewriting.
 *
 * A "missed move" per canon has several honest sub-categories, not
 * a single "you should have traded":
 *
 *   NEVER_QUALIFIED         — the plan waited; nothing satisfied it
 *   MISSED_OUTSIDE_WINDOW   — a qualifying event happened OUTSIDE
 *                             the trader's Availability Contract
 *                             (canon: legitimate NO TRADE)
 *   MISSED_INSIDE_WINDOW    — a qualifying event happened INSIDE
 *                             the availability window but the trader
 *                             did not execute (canon: this is the
 *                             one honest missed-move that deserves
 *                             review)
 *   EXECUTED                — the trader took the setup
 *
 * Rejection guarantees:
 *  - Never labels a NEVER_QUALIFIED session as "missed" (canon: no
 *    qualifying event = plan waited, not opportunity missed)
 *  - Availability window is honored; missing outside declared window
 *    is a TRAINING opportunity, not a failure (canon §2)
 *  - executed=true always wins the verdict regardless of window
 */

export interface MissedMoveInput {
  /** The trader declared a plan? (If false, nothing to miss.) */
  planDeclared: boolean;
  /**
   * First timestamp during the session when the setup was fully
   * qualified per the plan (all evidence present). Undefined = never.
   */
  firstQualifiedAtMs?: number;
  /** Availability windows [start, end) — empty = undeclared. */
  availabilityWindows: readonly { startMs: number; endMs: number }[];
  /** Did the trader take a position on this setup? */
  executed: boolean;
  /**
   * Underlying MFE from the qualified moment forward, in R multiples
   * (positive = favorable). Undefined when not measurable.
   */
  postQualifiedMfeR?: number;
  postQualifiedMaeR?: number;
}

export type MissedMoveVerdict =
  | "NO_PLAN"
  | "NEVER_QUALIFIED"
  | "MISSED_OUTSIDE_WINDOW"
  | "MISSED_INSIDE_WINDOW"
  | "EXECUTED";

export interface MissedMoveResult {
  verdict: MissedMoveVerdict;
  qualified_at_ms: number | undefined;
  inside_availability: boolean | undefined;
  post_qualified_mfe_r: number | undefined;
  post_qualified_mae_r: number | undefined;
  canon: string;
}

function isInsideAnyWindow(
  atMs: number,
  windows: readonly { startMs: number; endMs: number }[],
): boolean {
  for (const w of windows) {
    if (atMs >= w.startMs && atMs < w.endMs) return true;
  }
  return false;
}

export function selectMissedMoveReplay(
  input: MissedMoveInput,
): MissedMoveResult {
  const baseFields = {
    qualified_at_ms: input.firstQualifiedAtMs,
    inside_availability:
      typeof input.firstQualifiedAtMs === "number" && input.availabilityWindows.length > 0
        ? isInsideAnyWindow(input.firstQualifiedAtMs, input.availabilityWindows)
        : undefined,
    post_qualified_mfe_r: input.postQualifiedMfeR,
    post_qualified_mae_r: input.postQualifiedMaeR,
  };

  if (!input.planDeclared) {
    return {
      verdict: "NO_PLAN",
      ...baseFields,
      canon: "§1 no plan declared — nothing to replay",
    };
  }

  if (typeof input.firstQualifiedAtMs !== "number") {
    return {
      verdict: "NEVER_QUALIFIED",
      ...baseFields,
      canon: "§1 plan waited — no qualifying event",
    };
  }

  if (input.executed) {
    return {
      verdict: "EXECUTED",
      ...baseFields,
      canon: "§Executed — trade taken on qualified setup",
    };
  }

  // Qualified but not executed. Availability decides which honest
  // missed-move category applies.
  const inside = baseFields.inside_availability;
  if (inside === true) {
    return {
      verdict: "MISSED_INSIDE_WINDOW",
      ...baseFields,
      canon: "§11 missed while available — honest review candidate",
    };
  }
  if (inside === false) {
    return {
      verdict: "MISSED_OUTSIDE_WINDOW",
      ...baseFields,
      canon: "§2 outside declared availability — training opportunity, not a failure",
    };
  }
  // No availability declared → cannot classify; default to inside-window
  // (canon: absence of declaration is not permission to trade 24h).
  return {
    verdict: "MISSED_INSIDE_WINDOW",
    ...baseFields,
    canon: "§11 missed while no window declared — treat as inside for review",
  };
}
