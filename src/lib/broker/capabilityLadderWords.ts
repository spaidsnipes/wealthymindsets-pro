/**
 * THE CAPABILITY LADDER IN TRADER WORDS (2026-10-09).
 *
 * The Connect drawer's first glass was made of the ladder's own codes
 * ("Proven through DEPLOYED_SECRET_PRESENT. First unmeasured joint:
 * HUMAN_PROVEN …") and of env-var names. Those are the operator's working
 * vocabulary; they stay, behind an owner-only "Operator details" disclosure.
 * The first glass says the same VERDICT in words a trader reads — no stage
 * code, no env-var name, no repo path — and claims nothing the verdict does not.
 *
 * PURE. Reads the one verdict owner (selectFirstBrokenJoint); adds no judgement.
 */
import type { CapabilityStage, JointVerdict } from "./selectFirstBrokenJoint";

/** What having passed each rung means, as a plain phrase. */
export const STAGE_TRADER_WORDS: Readonly<Record<CapabilityStage, string>> = {
  CONFIGURED: "built into WM Pro",
  DEPLOYED_SECRET_PRESENT: "set up on WM Pro's server",
  AUTHENTICATED: "signed in to the provider",
  ENTITLED: "permitted by the account",
  AVAILABLE: "answering",
  FRESH: "current",
  NORMALIZED: "readable by WM Pro",
  UI_PROJECTED: "shown on a WM Pro screen",
  EXECUTABLE: "able to place orders",
  RECONCILABLE: "checkable against the broker's own record",
  RECOVERABLE: "recoverable after an interruption",
  HUMAN_PROVEN: "confirmed by a person from start to finish",
};

export interface CapabilityLadderWords {
  readonly headline: string;
  readonly detail: string;
  readonly tone: "PROVEN" | "BROKEN" | "UNMEASURED";
}

export function capabilityLadderWords(verdict: Pick<JointVerdict, "verdictClass" | "firstBrokenJoint" | "firstUnmeasuredJoint" | "provenThrough">): CapabilityLadderWords {
  const reached = verdict.provenThrough ? `So far it is ${STAGE_TRADER_WORDS[verdict.provenThrough]}.` : "Nothing about it is proven yet.";
  if (verdict.verdictClass === "PROVEN_THROUGH") {
    return { tone: "PROVEN", headline: "This connection is proven end to end", detail: "Every step that applies to it was checked and passed." };
  }
  if (verdict.verdictClass === "BROKEN_JOINT") {
    const step = verdict.firstBrokenJoint ? STAGE_TRADER_WORDS[verdict.firstBrokenJoint] : "the next step";
    return {
      tone: "BROKEN",
      headline: "This connection is not working yet",
      detail: `${reached} The step that did not pass: being ${step}. Nothing after it can be relied on until it does.`,
    };
  }
  const step = verdict.firstUnmeasuredJoint ? STAGE_TRADER_WORDS[verdict.firstUnmeasuredJoint] : "the next step";
  return {
    tone: "UNMEASURED",
    headline: "This connection is not fully checked yet",
    detail: `${reached} Not yet checked: whether it is ${step}. That is a missing check, not a fault.`,
  };
}

/** Words a first glass must never carry: env-var-shaped names, ladder codes, repo paths. */
export const OPERATOR_VOCABULARY = /\b[A-Z][A-Z0-9]{2,}_[A-Z0-9_]{2,}\b|\bhost secrets?\b|README|services\//;
