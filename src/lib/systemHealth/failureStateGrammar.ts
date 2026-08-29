/**
 * failureStateGrammar — canon §Failure + Recovery Grammar
 * (ATH SYSTEMS CLARITY + WIRING CONSTITUTION, 2026-08-28).
 *
 * Canon verbatim (§6):
 *   "Company systems should not communicate failure through vague
 *    colors, generic 'error' states, or language that forces the user
 *    to diagnose infrastructure. Use domain-appropriate explicit states
 *    such as NORMAL / DEGRADED / BLOCKED / UNAVAILABLE / RECOVERING /
 *    UNKNOWN rather than inventing confidence theater. Normal
 *    inactivity is not failure."
 *
 *   "LAW: FAILURE MUST BE VISIBLE, CONTAINED, EXPLAINABLE, AND
 *    RECOVERABLE."
 *
 * Every material degraded state must be able to answer seven questions:
 *   1. WHAT IS AFFECTED?
 *   2. WHAT STILL WORKS?
 *   3. WHY DID IT CHANGE?
 *   4. WHAT WAS THE LAST KNOWN-GOOD STATE?
 *   5. WHAT IS THE USER/TEAM IMPACT?
 *   6. WHAT IS THE NEXT SAFE ACTION?
 *   7. WHAT CONDITION MEANS RECOVERED?
 *
 * This module owns the vocabulary + a structured envelope for a
 * FailureStateReport carrying those seven answers. Every subsystem
 * that reports health should emit a FailureStateReport of one of the
 * six canon states — not a color, not a stringly-typed "error".
 *
 * Companion to canonicalFidelityLabels (which owns market-fidelity
 * chip text). This module owns SUBSYSTEM HEALTH grammar — different
 * concern, same canon-locked pattern.
 */

/**
 * The six canon-approved states, verbatim from the 2026-08-28
 * constitution. Order is deliberate: healthiest → hardest wall →
 * unknown at the tail. The type is a string-literal union so TS can
 * catch any freeform health string that tries to sneak through.
 */
export const CANONICAL_FAILURE_STATES = [
  "NORMAL",
  "DEGRADED",
  "BLOCKED",
  "UNAVAILABLE",
  "RECOVERING",
  "UNKNOWN",
] as const;

export type CanonicalFailureState = (typeof CANONICAL_FAILURE_STATES)[number];

/**
 * Predicate — is this a canon-approved state?
 * Callers should never emit a health verdict that isn't one of these six.
 */
export function isCanonicalFailureState(s: string): s is CanonicalFailureState {
  return (CANONICAL_FAILURE_STATES as readonly string[]).includes(s);
}

/**
 * FailureStateReport — the structured payload every subsystem that
 * reports health should emit. Every field maps to one of the canon
 * seven questions the grammar demands.
 *
 * A NORMAL report may leave most narrative fields undefined (canon:
 * normal inactivity is not failure). DEGRADED / BLOCKED / UNAVAILABLE
 * / RECOVERING reports SHOULD populate every narrative field so the
 * human never has to diagnose infrastructure.
 */
export interface FailureStateReport {
  /** The canon state verdict. */
  state: CanonicalFailureState;

  /** Q1: WHAT IS AFFECTED? — the capability, surface, or job impaired. */
  affected?: string;

  /** Q2: WHAT STILL WORKS? — the capabilities that remain available. */
  stillWorks?: string;

  /** Q3: WHY DID IT CHANGE? — the observed cause, not a blame. */
  reason?: string;

  /** Q4: WHAT WAS THE LAST KNOWN-GOOD STATE? — ISO timestamp + description. */
  lastKnownGood?: {
    readonly atIso?: string;
    readonly detail?: string;
  };

  /** Q5: WHAT IS THE USER/TEAM IMPACT? — the human-facing consequence. */
  userImpact?: string;

  /** Q6: WHAT IS THE NEXT SAFE ACTION? — one concrete recommendation. */
  nextSafeAction?: string;

  /** Q7: WHAT CONDITION MEANS RECOVERED? — the observable exit condition. */
  recoveredWhen?: string;
}

/**
 * Convenience constructor for the healthiest state. Canon: "Normal
 * inactivity is not failure" — a NORMAL report may leave every
 * narrative field undefined. Passing only the state keeps the
 * envelope shape consistent for downstream consumers.
 */
export function normal(): FailureStateReport {
  return { state: "NORMAL" };
}

/**
 * Convenience constructor for a fully-unknown state — used when a
 * subsystem hasn't yet reported. Canon-honest: unknown ≠ ok.
 */
export function unknown(reason?: string): FailureStateReport {
  return { state: "UNKNOWN", reason };
}

/**
 * Assert-a-report guard for callers that want to prove they only ever
 * emit a canon-shaped report. Throws when the report violates the
 * grammar (currently: any non-NORMAL/UNKNOWN state must supply at
 * least `affected` + `nextSafeAction` — canon: failure must be
 * "visible, contained, explainable, and recoverable").
 *
 * The throw is by design a Sentinel gate — dev-time cost, prod-time
 * safety. Consumers may catch and downgrade to UNKNOWN if they can't
 * satisfy the grammar rather than silently emit a hollow DEGRADED.
 */
export function assertFailureStateReport(r: FailureStateReport): void {
  if (!isCanonicalFailureState(r.state)) {
    throw new Error(
      `FailureStateReport.state is not canonical: ${String(r.state)}`,
    );
  }
  const requiresNarrative = r.state === "DEGRADED" || r.state === "BLOCKED" ||
    r.state === "UNAVAILABLE" || r.state === "RECOVERING";
  if (requiresNarrative) {
    if (!r.affected || r.affected.length === 0) {
      throw new Error(
        `FailureStateReport(${r.state}) requires \`affected\` — canon: failure must be visible`,
      );
    }
    if (!r.nextSafeAction || r.nextSafeAction.length === 0) {
      throw new Error(
        `FailureStateReport(${r.state}) requires \`nextSafeAction\` — canon: failure must be recoverable`,
      );
    }
  }
}
