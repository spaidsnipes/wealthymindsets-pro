/**
 * healthDimensions — the executable owner of the Garden Pass's
 * HEALTH-DIMENSION SENTINEL (ATH — FULL GARDEN PASS, 2026-09-11).
 *
 * Canon verbatim, from the FIRST SENTINEL SET:
 *
 *   "4. Health-dimension Sentinel: AVAILABLE / ENTITLED / FRESH /
 *    AUTHORIZED / EXECUTABLE / RECOVERABLE may not collapse into one
 *    green flag."
 *
 * And the G8 PLANT:
 *
 *   "forbid boolean connected/healthy when dimensions disagree."
 *
 * And the WM Pro next cultivation move, P0:
 *
 *   "provider health matrix must separate CONNECTED / ENTITLED / FRESH
 *    / EXECUTABLE / RECOVERABLE."
 *
 * WHY THIS EXISTS AT ALL — the empirical case, measured and written
 * down in the same Garden Pass, not inferred here:
 *
 *   - Longbridge answers a TSLA underlying quote AND answers option
 *     chain discovery, but returns error 301604 "no quote access" for
 *     the option quote. AVAILABLE is true; ENTITLED is false.
 *   - Alpaca INDICATIVE returns fresh bid/ask while Alpaca OPRA is an
 *     explicit subscription denial. Same vendor, opposite entitlement.
 *   - TSLA same-day contracts return null IV/Greeks while 2026-09-18
 *     contracts return them. Same provider, same entitlement, different
 *     freshness/completeness.
 *
 * A single boolean cannot say any of those three things. The canon's
 * word for saying them with one green anyway is FALSE_RIPENESS:
 * "Availability, entitlement, freshness, execution, and recovery are
 * collapsed into one green badge."
 *
 * WHAT THIS MODULE IS DELIBERATELY NOT
 *
 * The canon's own constraint on this work, verbatim:
 *
 *   "The coding team should not build a new Garden engine, service,
 *    store, dashboard or second truth brain. Implement a thin fitness
 *    layer that derives from existing owners and emits receipts."
 *
 * So there is no store, no clock, no I/O, no provider list, and no new
 * health vocabulary here. The STATE vocabulary is IMPORTED from
 * `@/lib/systemHealth/failureStateGrammar`, which already owns it
 * (Garden gate G2: exactly one canonical owner; consumers derive, they
 * do not retype). This module adds exactly one thing that owner does
 * not have: the six DIMENSIONS a state can be reported ABOUT, and a
 * verdict function that refuses to let six readings become one green.
 *
 * A dimension is a QUESTION. A state is an ANSWER. `failureStateGrammar`
 * owns the answers. This owns the questions, and the rule that you may
 * not answer six of them with one word.
 *
 * DIRECTION OF THE VERDICT — it can only ever REFUSE a green, never
 * manufacture one. `assessHealthDimensions` returns `greenAdmissible:
 * true` only when all six dimensions were read and all six read NORMAL.
 * Everything else names which dimension dissented, by name, so the
 * human reads a sentence instead of a colour.
 *
 * PURE / DETERMINISTIC — no clock, no I/O, no secrets.
 */

import {
  CANONICAL_FAILURE_STATES,
  type CanonicalFailureState,
} from "@/lib/systemHealth/failureStateGrammar";

/**
 * The six dimensions, verbatim and in the canon's own order.
 *
 * The Garden Pass names this set twice with a one-word difference —
 * the Sentinel list says AVAILABLE, the WM Pro cultivation line says
 * CONNECTED. AVAILABLE is used here because it is the wording of the
 * Sentinel itself, and because CONNECTED is already a narrower claim
 * this repo makes elsewhere (`executionConnectivity` distinguishes
 * configured-but-unproven from actually-connected). Reusing that word
 * for the whole dimension would have quietly renamed an existing
 * owner's concept, which is the stale-restatement defect in miniature.
 */
export const HEALTH_DIMENSIONS = [
  "AVAILABLE",
  "ENTITLED",
  "FRESH",
  "AUTHORIZED",
  "EXECUTABLE",
  "RECOVERABLE",
] as const;

export type HealthDimension = (typeof HEALTH_DIMENSIONS)[number];

/**
 * What each dimension actually asks, in the words a human would use.
 *
 * These are here so a surface never has to invent its own gloss — an
 * invented gloss is how "ENTITLED" silently becomes "connected" on one
 * screen and "subscribed" on another.
 */
export const DIMENSION_QUESTION: Readonly<Record<HealthDimension, string>> = {
  AVAILABLE: "Did the provider answer at all?",
  ENTITLED: "Is this account permitted to receive THIS field, on THIS instrument?",
  FRESH: "Is the answer recent enough for the decision being made on it?",
  AUTHORIZED: "Is this actor permitted to take this action?",
  EXECUTABLE: "Has execution capability been proven, not merely configured?",
  RECOVERABLE: "If this broke mid-flight, can the true state be re-established?",
};

/**
 * Severity rank over the IMPORTED state vocabulary.
 *
 * Built as a map keyed by the owner's own union so adding a seventh
 * canonical state upstream is a TYPE error here rather than a silent
 * `undefined` rank that would sort as the healthiest thing in the list.
 * A companion test also loops `CANONICAL_FAILURE_STATES` to prove every
 * member has a rank, because a type error is only caught if someone
 * runs `tsc`.
 *
 * UNKNOWN ranks BELOW the proven failures deliberately. It is not the
 * worst outcome — it is the absence of an outcome, and conflating "I
 * could not look" with "I looked and it is broken" is its own defect.
 */
const SEVERITY: Readonly<Record<CanonicalFailureState, number>> = {
  NORMAL: 0,
  UNKNOWN: 1,
  RECOVERING: 2,
  DEGRADED: 3,
  BLOCKED: 4,
  UNAVAILABLE: 5,
};

/**
 * What was actually read. PARTIAL BY CONSTRUCTION — a caller that has
 * only measured three dimensions must be able to say so, because the
 * alternative is inventing NORMAL for the three it did not look at,
 * which is precisely the failure this module exists to catch.
 */
export type DimensionReadings = Partial<Record<HealthDimension, CanonicalFailureState>>;

/**
 * FALSE_RIPENESS  — a dimension was READ and dissented. Proven wrong.
 * UNREAD_DIMENSION — a dimension was never read, or read UNKNOWN.
 *                    Unproven, which is not the same as wrong, and is
 *                    given its own name so the two are not conflated in
 *                    the receipt a human ends up reading.
 */
export type DimensionFailureClass = "FALSE_RIPENESS" | "UNREAD_DIMENSION";

export interface DimensionDissent {
  readonly dimension: HealthDimension;
  readonly state: CanonicalFailureState;
}

export interface DimensionVerdict {
  /** True ONLY when all six were read and all six read NORMAL. */
  readonly greenAdmissible: boolean;
  /** The most severe state across every dimension that WAS read. */
  readonly worst: CanonicalFailureState;
  readonly failureClass: DimensionFailureClass | null;
  /** Dimensions never supplied, plus those supplied as UNKNOWN. */
  readonly unread: readonly HealthDimension[];
  /** Dimensions read as something other than NORMAL or UNKNOWN. */
  readonly dissenting: readonly DimensionDissent[];
  /** A sentence naming the dimensions, for the receipt. */
  readonly reason: string;
}

/**
 * Judge a set of dimension readings.
 *
 * Class order is deliberate and is the opposite of the order the fields
 * are listed in. A PROVEN dissent outranks an unread dimension, because
 * "ENTITLED is BLOCKED" is a fact and "RECOVERABLE was never measured"
 * is only a gap. Both are always reported in full; `failureClass` names
 * the stronger of the two so a caller that renders one line renders the
 * more important one.
 */
export function assessHealthDimensions(readings: DimensionReadings): DimensionVerdict {
  const unread: HealthDimension[] = [];
  const dissenting: DimensionDissent[] = [];
  let worst: CanonicalFailureState = "NORMAL";

  for (const dimension of HEALTH_DIMENSIONS) {
    const state = readings[dimension];
    if (state === undefined || state === "UNKNOWN") {
      unread.push(dimension);
    } else if (state !== "NORMAL") {
      dissenting.push({ dimension, state });
    }
    const seen = state ?? "UNKNOWN";
    if (SEVERITY[seen] > SEVERITY[worst]) worst = seen;
  }

  if (dissenting.length > 0) {
    const named = dissenting.map((d) => `${d.dimension} is ${d.state}`).join("; ");
    const gap = unread.length > 0 ? ` Also never measured: ${unread.join(", ")}.` : "";
    return {
      greenAdmissible: false,
      worst,
      failureClass: "FALSE_RIPENESS",
      unread,
      dissenting,
      reason: `Not healthy — ${named}.${gap}`,
    };
  }

  if (unread.length > 0) {
    return {
      greenAdmissible: false,
      worst,
      failureClass: "UNREAD_DIMENSION",
      unread,
      dissenting,
      reason:
        `Not provably healthy — ${unread.join(", ")} ` +
        `${unread.length === 1 ? "was" : "were"} never measured, so a single ` +
        `green would be claiming something nobody looked at.`,
    };
  }

  return {
    greenAdmissible: true,
    worst: "NORMAL",
    failureClass: null,
    unread,
    dissenting,
    reason: "All six health dimensions were measured and all six read NORMAL.",
  };
}

/**
 * The G8 PLANT itself: "forbid boolean connected/healthy when
 * dimensions disagree."
 *
 * A surface that wants to render one boolean passes the boolean it
 * WANTS to render plus the readings behind it. The return can only ever
 * be the same boolean or `false` — never an upgrade. A caller cannot use
 * this to manufacture a green it had not already claimed, which is the
 * only property that makes it safe to put in front of a badge.
 */
export function refuseBooleanHealth(
  claimedHealthy: boolean,
  readings: DimensionReadings,
): { readonly healthy: boolean; readonly verdict: DimensionVerdict } {
  const verdict = assessHealthDimensions(readings);
  return { healthy: claimedHealthy && verdict.greenAdmissible, verdict };
}

export default assessHealthDimensions;
