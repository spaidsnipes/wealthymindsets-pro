/**
 * selectOptionTradability — H4, "STOCK SESSION IS NOT OPTION SESSION."
 *
 * §24 OWNER: A. MARKET TRUTH. This shipped one atom earlier inside
 * expressionCard.ts, which was an owner violation: whether a contract's venue
 * is open is a fact about the MARKET, not about how WM chooses to express a
 * position. Keeping it in the card also meant any surface wanting the fact had
 * to import the whole expression object. It lives here now, beside the
 * CanonicalSession vocabulary it speaks, and the card composes it — exactly the
 * way the card already composes protectionState and responseEnvelope.
 *
 * THE DEFECT THIS OWNS:
 * A quote having a role does not make it actionable. The underlying can be
 * printing in EXTENDED while the contract's own market is shut, and a BID
 * carried over from the close is a memory, not an offer. Canon: "If
 * optionTradableNow is NO: do not pretend GET ME IN NOW is available. Say
 * OPTION SESSION CLOSED or OPTION NOT TRADABLE NOW."
 *
 * Two separate questions, never merged:
 *   WHAT IS IT WORTH  → premium + quote role
 *   CAN I ACT         → this module
 *
 * PURE — no I/O, no clock. The caller supplies the sessions.
 */

import type { CanonicalSession } from "./canonicalIdentity";

/** H4 — three-valued on purpose. "not YES" is not the same as "NO". */
export type OptionTradability = "YES" | "NO" | "UNKNOWN";

/** A session WM was told about, or the honest absence of one. */
export type DeclaredSession = CanonicalSession | "UNKNOWN";

export interface OptionTradabilityVerdict {
  /** The stock's session. Informational — it does NOT decide the contract. */
  readonly underlyingSession: DeclaredSession;
  /** The contract's own session. This is what decides tradability. */
  readonly optionSession: DeclaredSession;
  readonly optionTradableNow: OptionTradability;
  /**
   * True when the two markets are in genuinely different states. This is the
   * H4 headline made queryable, and the same shape the XTSLA amendment needs:
   * one underlying, two venues, two clocks, never one blended sentence.
   */
  readonly sessionsDiverged: boolean;
  /** Canon sentence for the surface. null ONLY when the contract is tradable. */
  readonly note: string | null;
}

function declared(s: CanonicalSession | null | undefined): DeclaredSession {
  return s == null ? "UNKNOWN" : s;
}

/**
 * The ONLY input that may grant tradability is the OPTION's own session. The
 * underlying's session is carried for the divergence sentence and never votes.
 *
 * EXTENDED and OVERNIGHT resolve to NO rather than UNKNOWN. That is a
 * deliberate fail-closed reading of the P0 contract shape (H3: one single-leg
 * US equity option): the contract's continuous market is the regular session,
 * and WM has no venue evidence that this specific contract is quotable outside
 * it. If a provider later proves per-contract extended quoting, this is the one
 * function that changes — not eleven screens.
 */
export function selectOptionTradability(
  underlying: CanonicalSession | null | undefined,
  option: CanonicalSession | null | undefined,
): OptionTradabilityVerdict {
  const underlyingSession = declared(underlying);
  const optionSession = declared(option);
  const sessionsDiverged =
    underlyingSession !== "UNKNOWN" &&
    optionSession !== "UNKNOWN" &&
    underlyingSession !== optionSession;

  let optionTradableNow: OptionTradability;
  let note: string | null;

  switch (optionSession) {
    case "RTH":
    case "24X7":
      optionTradableNow = "YES";
      note = null;
      break;
    case "CLOSED":
      optionTradableNow = "NO";
      note = "OPTION SESSION CLOSED — this contract is not tradable now.";
      break;
    case "EXTENDED":
    case "OVERNIGHT":
      optionTradableNow = "NO";
      note = `OPTION NOT TRADABLE NOW — the contract market is ${optionSession}.`;
      break;
    default:
      optionTradableNow = "UNKNOWN";
      note = "OPTION SESSION UNKNOWN — WM cannot confirm this contract is tradable now.";
      break;
  }

  // The divergence sentence is APPENDED, never substituted: a trader about to
  // act needs the verdict first and the reason second. `sessionsDiverged`
  // already guarantees both sessions are named, so neither reads "UNKNOWN".
  if (note !== null && sessionsDiverged) {
    note = `${note} The stock is in ${underlyingSession} — that is a different market from this contract.`;
  }

  return { underlyingSession, optionSession, optionTradableNow, sessionsDiverged, note };
}
