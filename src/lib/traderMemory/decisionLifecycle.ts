/**
 * BIRTH, LIFE, DEATH — and the long list of things that are none of the three.
 *
 * Source: SUPPORT — DECISION_ID Lifecycle + CanonicalBar + Connected Gates
 * (2026-09-18), §1–§2. It extends `decisionIdentity.ts` and does not replace
 * it — the canon is explicit: "Name/extend the existing Decision type. Do not
 * invent Decision2." The mint, the nominal id, the child-id guard and the
 * survival list all still live there. What was missing is the CLASSIFIER.
 *
 * ── THE THREE IDENTITIES ─────────────────────────────────────────────────────
 *
 *   CAMERA             symbol + timeframe + viewport + drawings
 *   CANONICAL MARKET   bars, session, objects, fidelity
 *   DECISION_ID        one stance and its capital children
 *
 * "If any of those four grow their own price, their own past, or their own ID,
 * the organism is cut."
 *
 * Almost everything a trader does in a session touches the CAMERA. Changing
 * symbol, opening an overlay, zooming, landing on a heat cell, asking Spaidbot,
 * peeking at a lesson, closing a laptop — all camera, none of them a stance.
 * The danger is not that someone will deliberately mint on a zoom. It is that
 * minting is a one-line call and a camera event is the most convenient place to
 * put it, and nothing in the codebase said no.
 *
 * ── WHY A CLOSED EVENT LIST RATHER THAN A PREDICATE ──────────────────────────
 *
 * `shouldMint(someEvent)` returning false by default would be a guard that
 * passes for every event nobody thought of — which is the empty-scan defect in
 * another costume. Here the union is closed and the switch is exhaustive, so a
 * NEW event does not get a silent default: it fails to compile until someone
 * files it under BIRTH, CAMERA or CLOSURE. Filing it is the review.
 *
 * ── THE ASYMMETRY THAT IS THE WHOLE POINT ────────────────────────────────────
 *
 * The canon lists what must not mint, and separately lists what must not close.
 * They are different lists and neither is the other's complement:
 *
 *   BROKER_SESSION_DROPPED  must not close — "that is a joint, not a decision"
 *   NEW_THESIS_DECLARED     closes, and is the only closure the human performs
 *   FLATTENED_WITH_RECEIPT  closes, and only WITH the receipt written
 *
 * A decision does not die because the trader looked away, and it does not die
 * because the broker's socket did. It dies when the capital event is over and
 * written down, or when the human says they are thinking about something else.
 */

import type { DecisionBirthCause, DecisionIdentity } from "./decisionIdentity";

/* ── THE EVENT UNIVERSE, CLOSED ────────────────────────────────────────────── */

/**
 * Every event this house currently knows how to have an opinion about.
 *
 * Adding a member is a deliberate act with a compile error attached, which is
 * the design. The list is long because the canon's list is long, and the long
 * half is the half nobody would have written down unprompted.
 */
export type DecisionLifecycleEvent =
  // ── Births. A stance, written by or for the human. ──
  | "PERMISSION_GRANTED"
  | "EXPLICIT_INTENT"
  | "RECORDED_WAIT"
  | "MANUAL_MODE_ENTERED"
  // ── Camera and observation. Neither mints nor closes. ──
  | "SYMBOL_CHANGED"
  | "TIMEFRAME_CHANGED"
  | "OVERLAY_OPENED"
  | "SEMANTIC_ZOOM"
  | "HEAT_CELL_LANDED"
  | "SPAIDBOT_QUESTION"
  | "ACADEMY_PEEK"
  | "VAULT_RESTORED"
  | "TOOL_TOGGLED"
  | "SHOW_OPPOSING"
  | "BROKER_SESSION_DROPPED"
  | "DEVICE_HANDOFF"
  | "RECEIPT_OPENED"
  // ── Closures. ──
  | "FLATTENED_WITH_RECEIPT"
  | "NEW_THESIS_DECLARED";

export type LifecycleVerdict = "BIRTH" | "CAMERA" | "CLOSURE";

/**
 * The classifier. Exhaustive by construction — there is no `default:` branch,
 * so a new event member is a type error rather than a silent CAMERA.
 */
export function classifyLifecycleEvent(event: DecisionLifecycleEvent): LifecycleVerdict {
  switch (event) {
    case "PERMISSION_GRANTED":
    case "EXPLICIT_INTENT":
    case "RECORDED_WAIT":
    case "MANUAL_MODE_ENTERED":
      return "BIRTH";

    case "SYMBOL_CHANGED":
    case "TIMEFRAME_CHANGED":
    case "OVERLAY_OPENED":
    case "SEMANTIC_ZOOM":
    case "HEAT_CELL_LANDED":
    case "SPAIDBOT_QUESTION":
    case "ACADEMY_PEEK":
    // The Vault restores the CAMERA. It does not invent a decision — a trader
    // who closed a laptop and opened it again has not taken a new stance.
    case "VAULT_RESTORED":
    case "TOOL_TOGGLED":
    // Flipping WAIT to SHOW OPPOSING is the trader looking harder at the same
    // thesis. Closing the decision there would punish the one behaviour the
    // house most wants.
    case "SHOW_OPPOSING":
    // "That is a joint, not a new decision." The broker's socket is not the
    // trader's mind.
    case "BROKER_SESSION_DROPPED":
    case "DEVICE_HANDOFF":
    case "RECEIPT_OPENED":
      return "CAMERA";

    case "FLATTENED_WITH_RECEIPT":
    case "NEW_THESIS_DECLARED":
      return "CLOSURE";
  }
}

/** Does this event mint a DECISION_ID? */
export function mintsDecision(event: DecisionLifecycleEvent): boolean {
  return classifyLifecycleEvent(event) === "BIRTH";
}

/** Does this event close one? */
export function closesDecision(event: DecisionLifecycleEvent): boolean {
  return classifyLifecycleEvent(event) === "CLOSURE";
}

/**
 * The birth cause for a birth event, and null for everything else.
 *
 * Returning null rather than a default cause matters: a caller that asks
 * "what caused this birth?" about a zoom must get nothing back, not
 * `EXPLICIT_INTENT` because that was the most plausible member of the union.
 */
export function birthCauseOf(event: DecisionLifecycleEvent): DecisionBirthCause | null {
  switch (event) {
    case "PERMISSION_GRANTED":
      return "PERMISSION_GRANTED";
    case "EXPLICIT_INTENT":
      return "EXPLICIT_INTENT";
    case "RECORDED_WAIT":
      return "RECORDED_WAIT";
    case "MANUAL_MODE_ENTERED":
      return "MANUAL_MODE_ENTERED";
    default:
      return null;
  }
}

/* ── RECON PRECEDENCE ──────────────────────────────────────────────────────── */

/**
 * "`reconVersion` is monotonic per DECISION_ID. Newest packet does not
 * automatically win. Newest authoritative transition wins."
 *
 * Two different orderings, and conflating them is a real bug with real money
 * attached. Packets arrive out of order across a reconnect; a stale packet
 * carrying an old version must not be allowed to walk a decision backwards
 * from FILLED to ACK merely because it landed last.
 */
export interface ReconPacket {
  readonly decisionId: string;
  /** Monotonic per decision. The authority ordering — not arrival order. */
  readonly reconVersion: number;
  /** When the packet reached us. Explicitly NOT the tiebreaker. */
  readonly receivedAt: number;
}

export type ReconAdmission =
  | { readonly admitted: true; readonly packet: ReconPacket }
  | { readonly admitted: false; readonly reason: string };

/**
 * Admit an incoming packet against the current one.
 *
 * Refuses rather than throws, and names the refusal, because a swallowed
 * exception here looks exactly like a packet that never arrived.
 */
export function admitReconPacket(
  current: ReconPacket | null,
  incoming: ReconPacket,
): ReconAdmission {
  if (!Number.isFinite(incoming.reconVersion)) {
    return { admitted: false, reason: "reconVersion is not a finite version — it cannot be ordered." };
  }

  // A packet about a different decision is not a later version of this one.
  // Without this check, a cross-decision packet with a high version would
  // silently become this decision's newest truth.
  if (current && current.decisionId !== incoming.decisionId) {
    return {
      admitted: false,
      reason:
        "Packet belongs to a different DECISION_ID. Recon ordering is per decision; "
        + "comparing versions across decisions compares two unrelated clocks.",
    };
  }

  if (!current) return { admitted: true, packet: incoming };

  // The law, stated as the comparison. Strictly greater: an equal version is
  // not a newer transition, it is the same transition arriving twice, and
  // admitting it again is the double-count family this house keeps finding.
  if (incoming.reconVersion > current.reconVersion) {
    return { admitted: true, packet: incoming };
  }

  return {
    admitted: false,
    reason:
      `reconVersion ${incoming.reconVersion} does not supersede ${current.reconVersion}. `
      + "Newest packet does not win; newest authoritative transition does.",
  };
}

/* ── SHADOW ────────────────────────────────────────────────────────────────── */

/**
 * "Shadow cannot become live. Live gets a new DECISION_ID. Pointer only."
 *
 * The temptation is obvious and the cost is invisible: a shadow decision that
 * "worked" gets promoted, and now the book contains a live trade whose entire
 * pre-capital history was recorded under different rules. The lineage survives
 * as `originShadowDecisionId` — which `decisionIdentity.ts` already lists among
 * the six child kinds, and which is a POINTER rather than an inheritance.
 */
export interface ShadowPromotion {
  readonly liveIdentity: DecisionIdentity;
  readonly originShadowDecisionId: string;
}

export type PromotionVerdict =
  | { readonly ok: true; readonly promotion: ShadowPromotion }
  | { readonly ok: false; readonly reason: string };

export function promoteShadow(
  shadowDecisionId: string,
  freshlyMintedLive: DecisionIdentity,
): PromotionVerdict {
  if (shadowDecisionId.trim() === "") {
    return { ok: false, reason: "An empty shadow id is not a lineage — there is nothing to point at." };
  }
  // Identity theft, caught at the one place it would be committed.
  if (shadowDecisionId.trim() === freshlyMintedLive.decisionId) {
    return {
      ok: false,
      reason:
        "The live decision carries the shadow's id. Shadow cannot become live — "
        + "live gets a NEW DECISION_ID and the shadow survives as a pointer.",
    };
  }
  return {
    ok: true,
    promotion: { liveIdentity: freshlyMintedLive, originShadowDecisionId: shadowDecisionId.trim() },
  };
}
