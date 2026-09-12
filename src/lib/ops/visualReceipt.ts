/**
 * visualReceipt — what makes a "the human saw it work" claim admissible.
 *
 * ── Where this law comes from ────────────────────────────────────────────────
 *
 * ATH — CURRENT COMMAND CENTER — 2026-09-11 activates the NO-ESCAPE VISUAL
 * VERIFICATION BREAKER. Its closing instruction is addressed to this
 * repository, by name:
 *
 *   "A write-capable WM contractor must encode an owner-derived Sentinel so the
 *    repo cannot claim Guest-Ready/Human-Proven GREEN without a current VISUAL
 *    RECEIPT and must FAILURE-PROVE that Sentinel by intentionally removing the
 *    fallback/receipt path once."
 *
 * The law lives in Drive. Drive cannot run. This module is the executable owner
 * of that law inside the repo, so that guards DERIVE the field list and the
 * forbidden-substitute list from here instead of each retyping their own copy —
 * Garden gate G2, "exactly one owner; consumers derive/import, never retype."
 *
 * That matters more than usual here. A retyped copy of an evidence standard is
 * a standard that silently weakens: the day the canon adds a required field,
 * every hand-typed checker keeps passing documents that are now incomplete, and
 * passing is exactly the answer that stops anyone looking.
 *
 * ── The failure this exists to catch ─────────────────────────────────────────
 *
 * Not lying. Substitution. A shift runs `vitest` green, runs `tsc --noEmit`
 * green, reads the DOM, confirms the API returns 200 — and writes GREEN against
 * a breaker whose acceptance criterion was that a person SAW the thing work.
 * Every input was true. The conclusion was not supported by any of them.
 *
 * The canon names the four ways it happens, and this module encodes them as
 * `VisualFailureClass` so a verdict can say WHICH one occurred rather than just
 * refusing.
 *
 * ── What this module deliberately does NOT do ────────────────────────────────
 *
 * It does not take screenshots and it does not decide whether a scene looked
 * right. It decides whether a CLAIM is admissible — whether the evidence
 * offered is of the kind the acceptance criterion demanded. Judging the pixels
 * is a human's job; refusing to accept a typecheck in their place is a
 * machine's.
 */

/**
 * The receipt contract, verbatim from the canon's VISUAL RECEIPT CONTRACT.
 *
 * Order is the canon's order. Optional fields are marked because the canon
 * marks them ("when applicable"), not because they were inconvenient.
 */
export const VISUAL_RECEIPT_FIELDS = [
  "SCENE_ID",
  "CURRENT_SHA",
  "ROUTE",
  "VIEWPORT",
  "ACTION",
  "EXPECTED_VISIBLE_BEHAVIOR",
  "OBSERVED_VISIBLE_BEHAVIOR",
  "VISUAL_PROOF_METHOD",
  "OBSERVED_AT",
  "VISIBLE_ERRORS",
  "BREAKER_STATE",
] as const;

export type VisualReceiptField = (typeof VISUAL_RECEIPT_FIELDS)[number];

/** Required "when applicable" only — absence is not by itself inadmissible. */
export const CONDITIONAL_RECEIPT_FIELDS = ["RECOVERY_RESULT"] as const;

/**
 * The mandatory fallback ladder, in the canon's order.
 *
 * The ladder is the whole point of the law: rung 1 being unavailable is not a
 * waiver, it is an instruction to try rung 2. `HUMAN_PROOF_REQUIRED` is the
 * bottom rung and is explicitly YELLOW — a legal place to stop, never GREEN.
 */
export const PROOF_LADDER = [
  "BROWSER_INTEGRATION",
  "COMPUTER_USE_SCREEN_VIEW",
  "FRESH_SCREENSHOT_OR_RECORDING",
  "HUMAN_PROOF_REQUIRED",
] as const;

export type VisualProofMethod = (typeof PROOF_LADDER)[number];

/** The only rung that is not itself admissible proof. */
export const NON_PROVING_RUNG: VisualProofMethod = "HUMAN_PROOF_REQUIRED";

/**
 * Evidence that may SUPPORT a repair but may never STAND IN for a visual
 * receipt. Straight from the canon's FORBIDDEN SHORTCUTS.
 *
 * Every item on this list is something this repository is good at producing,
 * which is precisely why the list is needed. The temptation is never to offer
 * no evidence; it is to offer a great deal of the wrong kind.
 */
export const FORBIDDEN_SUBSTITUTES = [
  "typecheck",
  "unit tests",
  "integration tests",
  "build success",
  "API success",
  "source inspection",
  "DOM inspection",
  "server logs",
  "commit prose",
  "stale screenshot",
] as const;

export type ForbiddenSubstitute = (typeof FORBIDDEN_SUBSTITUTES)[number];

export type VisualFailureClass =
  /** Supporting evidence presented as equivalent to required human proof. */
  | "PROOF_SUBSTITUTION"
  /** Preferred tool unavailable and the builder skipped the next legal rung. */
  | "TOOL_ESCAPE"
  /** A pre-change image or recording reused as current proof. */
  | "STALE_VISUAL"
  /** GREEN asserted with no current admissible visual receipt at all. */
  | "FALSE_VISUAL_GREEN";

/** The canon's breaker states. UNKNOWN is never silently promoted. */
export type BreakerState = "GREEN" | "YELLOW" | "RED" | "UNKNOWN" | "SEALED";

export interface VisualClaim {
  /** The state the author wants to record. */
  claimedState: BreakerState;
  /** Which rung of the ladder actually produced the evidence, if any. */
  proofMethod: VisualProofMethod | null;
  /** Receipt fields the author actually supplied. */
  fieldsPresent: readonly string[];
  /** Kinds of evidence offered in place of a visual receipt. */
  substitutesOffered?: readonly string[];
  /**
   * True when the offered image/recording predates the change it is being used
   * to prove. The canon calls this STALE_VISUAL and treats it as its own class
   * rather than as a missing receipt, because the author DID look — at the
   * wrong moment.
   */
  evidencePredatesChange?: boolean;
}

export interface VisualVerdict {
  /** The state the claim is actually entitled to. */
  state: BreakerState;
  admissible: boolean;
  failureClass: VisualFailureClass | null;
  /** Receipt fields the canon requires that the claim did not supply. */
  missingFields: readonly VisualReceiptField[];
  /** Plain sentence naming what is wrong and what would fix it. */
  reason: string;
}

function missingFrom(fieldsPresent: readonly string[]): VisualReceiptField[] {
  const have = new Set(fieldsPresent.map((f) => f.trim().toUpperCase()));
  return VISUAL_RECEIPT_FIELDS.filter((f) => !have.has(f));
}

/**
 * Decide what a human-use / guest-readiness claim is actually entitled to.
 *
 * The asymmetry is deliberate and matches the canon: this can only ever REFUSE
 * a GREEN. It never upgrades a claim. An author who writes YELLOW with a full
 * receipt keeps their YELLOW — being more cautious than the evidence requires
 * is not a defect, and a machine that "corrected" it upward would be inventing
 * confidence nobody asked for.
 */
export function assessVisualClaim(claim: VisualClaim): VisualVerdict {
  const missingFields = missingFrom(claim.fieldsPresent);

  // Anything short of a GREEN claim is the author already conceding the point.
  // The canon's concern is green, not honest yellow.
  if (claim.claimedState !== "GREEN") {
    return {
      state: claim.claimedState,
      admissible: true,
      failureClass: null,
      missingFields,
      reason: `Claim is ${claim.claimedState}, not GREEN. The visual breaker constrains GREEN; a non-green state is a legal resting place for an unproven scene.`,
    };
  }

  const substitutes = claim.substitutesOffered ?? [];

  // Order matters below. A claim can be wrong in several ways at once, and the
  // verdict should name the MOST specific one — the class that tells the author
  // what to actually do differently, not merely that something is absent.

  if (claim.evidencePredatesChange === true) {
    return {
      state: "YELLOW",
      admissible: false,
      failureClass: "STALE_VISUAL",
      missingFields,
      reason:
        "The visual evidence predates the change it is offered to prove. A scene observed before the edit cannot show the edit. Re-observe the route on the current build.",
    };
  }

  if (claim.proofMethod === null) {
    // No rung reached at all. If supporting evidence was offered in its place,
    // that is substitution specifically — a more useful thing to be told than
    // "receipt missing", because the author believed they had proved it.
    if (substitutes.length > 0) {
      return {
        state: "YELLOW",
        admissible: false,
        failureClass: "PROOF_SUBSTITUTION",
        missingFields,
        reason: `${substitutes.join(", ")} may support this repair but cannot stand in for seeing the scene. Climb the ladder: ${PROOF_LADDER.slice(0, 3).join(" → ")}.`,
      };
    }
    return {
      state: "YELLOW",
      admissible: false,
      failureClass: "FALSE_VISUAL_GREEN",
      missingFields,
      reason:
        "GREEN claimed with no visual receipt of any kind. A human-use breaker stays YELLOW until a current scene observation exists.",
    };
  }

  if (claim.proofMethod === NON_PROVING_RUNG) {
    // The author reached the bottom rung. That is an honest landing place, but
    // it is the one rung that proves nothing, so it cannot carry a GREEN.
    return {
      state: "YELLOW",
      admissible: false,
      failureClass: "TOOL_ESCAPE",
      missingFields,
      reason:
        "HUMAN_PROOF_REQUIRED is the bottom of the ladder, not a proof method. The canon fixes this state at YELLOW with an owner and a green exit criterion — it may not be recorded as GREEN.",
    };
  }

  if (missingFields.length > 0) {
    return {
      state: "YELLOW",
      admissible: false,
      failureClass: "FALSE_VISUAL_GREEN",
      missingFields,
      reason: `A scene was observed but the receipt is incomplete: missing ${missingFields.join(", ")}. An unrecorded observation cannot be re-checked later, which is the whole reason the contract lists fields.`,
    };
  }

  return {
    state: "GREEN",
    admissible: true,
    failureClass: null,
    missingFields: [],
    reason: `Current scene observed via ${claim.proofMethod} with a complete receipt.`,
  };
}

/**
 * True when a piece of offered evidence is on the forbidden-substitute list.
 *
 * Exported so callers test membership against the owner's list rather than
 * re-deciding for themselves what counts as a shortcut.
 */
export function isForbiddenSubstitute(evidence: string): boolean {
  // Both sides are folded. The list is written in the canon's own casing
  // ("API success"), so comparing a lowered input against a raw entry silently
  // misses exactly the entries the canon capitalised — which the table-driven
  // test caught on the first run.
  const e = evidence.trim().toLowerCase();
  return FORBIDDEN_SUBSTITUTES.some((f) => {
    const k = f.toLowerCase();
    return e === k || e.includes(k);
  });
}
