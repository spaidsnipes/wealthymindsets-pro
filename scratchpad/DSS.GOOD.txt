/**
 * deckSceneSignals — the honest adapter from what /command-deck actually knows
 * to what `compileScene` needs.
 *
 * ── Why this file exists at all ──────────────────────────────────────────────
 *
 * `compileScene` is pure and total: hand it ten signals and it names the scene.
 * The dangerous part is not the compiler, it is the wiring. It would be trivial
 * to hand it `position: "FLAT", positionConfidence: "CONFIRMED"` because those
 * are the tidy defaults, and the compiler would dutifully answer DONE — a
 * screen that says "nothing is exposed, the day is answered" about a book WM
 * has never read.
 *
 * §14.1 is explicit: FLAT is a FINDING, never a default. §H19 is explicit: do
 * not add vocabulary with no producer behind it. So this adapter refuses to
 * invent. Every signal it cannot source from a real owner is reported as
 * UNOBSERVED, and it emits a provenance record so the surface can SHOW which
 * inputs were real. A scene compiled from three real signals and seven guesses
 * must never look like a scene compiled from ten real ones.
 *
 * ── What /command-deck genuinely owns today ──────────────────────────────────
 *
 * OBSERVED  — session (canonical identity), right-of-way (permission compiler).
 * UNOBSERVED — the entire capital column. The deck has no broker panel; it does
 *              not read a book, an order, or a fill. That is not a defect to
 *              paper over, it is the current truth of this route.
 *
 * PURE — no React, no I/O, no clock.
 */

import type { RightOfWay } from "../marketData/viewModels/decisionPermissionCompiler";
import type { SceneSignals } from "./compileScene";

/** Where a signal came from. `UNOBSERVED` is a first-class answer, not a failure. */
export type SignalProvenance = "OBSERVED" | "UNOBSERVED";

/** The named signal groups a surface discloses. Keep this list honest. */
export type SignalGroup = "SESSION" | "DECISION" | "POSITION" | "ORDERS" | "LINK";

export const SIGNAL_GROUPS: readonly SignalGroup[] = [
  "SESSION",
  "DECISION",
  "POSITION",
  "ORDERS",
  "LINK",
] as const;

export interface DeckSceneInput {
  /**
   * The PRESENTED session token, from `selectCanonicalSessionToken` (or the
   * `.value` of `selectCanonicalSessionPresentation`) — CLOSED / 24X7 /
   * "SESSION ?" / a genuinely-established running session.
   *
   * NOT `identity.session`. That field is a STORE KEY: `canonicalSession()`
   * returns "RTH" for every non-crypto instrument on every day of the week,
   * including Saturday. Feeding it here makes `sessionOpen` permanently `true`,
   * which makes compileScene's CLOSED branch unreachable on this route — and,
   * worse, marks SESSION as OBSERVED in the provenance record below, so the
   * one mechanism built to expose a guess counts the guess as a real signal.
   * /command-deck did exactly this until the day this comment was written.
   */
  readonly session: string | null | undefined;
  /** The compiled right-of-way verdict, if the Decision owner produced one. */
  readonly rightOfWay: RightOfWay | null | undefined;
}

export interface DeckSceneSignals {
  readonly signals: SceneSignals;
  readonly provenance: Readonly<Record<SignalGroup, SignalProvenance>>;
  /** Count of signal groups backed by a real owner. Surfaces show `observed / total`. */
  readonly observedCount: number;
  readonly totalCount: number;
}

/**
 * Map the PRESENTED session token to the compiler's tri-state.
 *
 * UNKNOWN, "SESSION ?" and unrecognised values all map to `null` — "not yet
 * known" — never to `true`. §8 forbids implying a live session that has not
 * been established. They are deliberately handled by the final fall-through
 * rather than by a named branch, so a token this function has never heard of
 * is treated with the same humility as one it has.
 *
 * "24X7" maps to `true` because a continuous market's session genuinely IS
 * open and that fact IS established — it has no close to miss. Before this,
 * 24X7 fell through to `null`, so the deck reported crypto's session as
 * UNOBSERVED while reporting a Saturday equity's as OBSERVED: the two halves
 * of one mapper wrong in opposite directions, withholding an established fact
 * on one branch and inventing one on the other.
 */
export function sessionOpenFrom(session: string | null | undefined): boolean | null {
  if (typeof session !== "string") return null;
  const s = session.trim().toUpperCase();
  if (s === "CLOSED") return false;
  if (s === "24X7") return true;
  if (s === "RTH" || s === "ETH" || s === "OVERNIGHT" || s === "PREMARKET" || s === "AFTERHOURS") {
    return true;
  }
  return null;
}

/**
 * `RightOfWay` includes "UNKNOWN", which is NOT a decision. The compiler treats
 * an unknown right-of-way as "the Decision owner has not spoken", which is
 * exactly `null`. Collapsing them here keeps the compiler from having to know
 * about the string "UNKNOWN".
 */
export function rightOfWayFrom(value: RightOfWay | null | undefined): RightOfWay | null {
  if (value === null || value === undefined) return null;
  if (value === "UNKNOWN") return null;
  return value;
}

/**
 * Build the scene signals /command-deck can honestly support.
 *
 * The capital column is hard-coded to its UNOBSERVED shape on purpose, and the
 * provenance record says so. When a broker-aware surface adopts the compiler it
 * must supply those from `selectPositionTruth` and the execution owner — NOT by
 * relaxing the constants below.
 */
export function deckSceneSignals(input: DeckSceneInput): DeckSceneSignals {
  const sessionOpen = sessionOpenFrom(input.session);
  const rightOfWay = rightOfWayFrom(input.rightOfWay);

  const signals: SceneSignals = {
    // ── UNOBSERVED capital column ────────────────────────────────────────────
    // The deck has not read a book. "POSITION UNCONFIRMED" + "UNOBSERVED" is
    // the truthful pair; it is what `selectPositionTruth` itself produces when
    // nothing has been observed. Never substitute FLAT/CONFIRMED here.
    position: "POSITION UNCONFIRMED",
    positionConfidence: "UNOBSERVED",
    intentInFlight: false,
    exposureIncreasingWorkingOrders: 0,
    linkVerified: null,
    composingIntent: false,
    hadCapitalEvent: false,
    receiptWritten: false,

    // ── OBSERVED columns ─────────────────────────────────────────────────────
    sessionOpen,
    rightOfWay,
  };

  const provenance: Record<SignalGroup, SignalProvenance> = {
    SESSION: sessionOpen === null ? "UNOBSERVED" : "OBSERVED",
    DECISION: rightOfWay === null ? "UNOBSERVED" : "OBSERVED",
    POSITION: "UNOBSERVED",
    ORDERS: "UNOBSERVED",
    LINK: "UNOBSERVED",
  };

  let observedCount = 0;
  for (const group of SIGNAL_GROUPS) {
    if (provenance[group] === "OBSERVED") observedCount++;
  }

  return {
    signals,
    provenance,
    observedCount,
    totalCount: SIGNAL_GROUPS.length,
  };
}

export default deckSceneSignals;
