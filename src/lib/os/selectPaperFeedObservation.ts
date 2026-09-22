import {
  SESSION_TOKEN_CLOSED,
  SESSION_TOKEN_CONTINUOUS,
} from "@/lib/marketData/canonicalIdentity";
import type { FeedObservation } from "@/lib/os/osChrome";
import type { PaperQuoteReadiness } from "@/lib/marketData/viewModels/selectPaperQuoteReadiness";

/**
 * WHAT /paper HAS ACTUALLY OBSERVED, IN THE VOCABULARY THE FRAME GRADES.
 *
 * ── THE DEFECT, MEASURED LIVE ──────────────────────────────────────────────
 *
 * wealthymindsetspro.com/paper, 2026-09-17, production:
 *
 *   masthead  FEED UNKNOWN
 *   footer    SOURCE UNKNOWN
 *   body      $29,738.00   ← a real Yahoo quote, on screen, at that moment
 *
 * The room polls `/api/yahoo` on mount and every 20s, compiles a
 * `PaperQuoteReadiness` per symbol, gates its Order Ticket on it, and prints
 * the price. It knew everything the frame was asking for. It simply never
 * published, and `usePublishOsStanding`'s default for a silent room is `null`
 * — "has not spoken" — which the frame correctly renders as an open question.
 *
 * Correct default, wrong room. This is the fifth instance of the same family:
 * A FALSE STATEMENT OF IGNORANCE. It is not a safe failure. It sends a trader
 * to diagnose a pipeline that is working, while the price they are about to
 * trade against sits unlabelled.
 *
 * ── WHY A PURE SELECTOR AND NOT AN INLINE OBJECT LITERAL ───────────────────
 *
 * Every field below is a judgement with a wrong answer available, and three of
 * them are wrong in the *flattering* direction if written carelessly. An
 * object literal buried 700 lines into a 2500-line page component is where
 * such judgements go to stop being reviewed. Here they are named, and the
 * tests beside this file pin each one.
 *
 * ── WHY `connected` IS `null` AND NOT `true` ───────────────────────────────
 *
 * /paper has no socket. It polls. There is no transport whose up/down state
 * this room can report, and `null` is the field's documented word for exactly
 * that. Writing `true` because a fetch resolved would assert a live connection
 * the room does not hold; writing `false` because one rejected would slander
 * the provider over a single timeout. `compileFeedStanding` reads
 * `connected !== false`, so `null` costs nothing — it declines a question
 * rather than guessing at it.
 *
 * ── WHY `barsPresent` IS `false` AND NOT `readiness != null` ───────────────
 *
 * `barsPresent` means OHLCV history is ON SCREEN. /paper draws no candles. It
 * is a book, a ticket and a blotter. Reporting bars here would let the frame
 * fall back to a BARS-only reading and print an established provenance for a
 * pipe this room does not run — which is the same overclaim in the opposite
 * direction from the one being cured.
 */
export interface PaperFeedObservationInput {
  /**
   * The readiness of the ACTIVE symbol — the room's current selection.
   *
   * Not an aggregate across `UNIVERSE`. `quotePresent` is documented as "a
   * real price was received for THIS selection", and a max-across-16-symbols
   * rollup would light the badge for an instrument the trader is not looking
   * at. The one number the masthead sits above is the active one.
   */
  readonly readiness: PaperQuoteReadiness | null | undefined;
  /**
   * `selectCanonicalSessionToken(...).token` for the active symbol — the one
   * writer for session truth in this codebase. Passed as its compiled token
   * rather than recomputed here so /paper's masthead can never disagree with
   * /paper's own session chip.
   */
  readonly sessionToken: string;
}

/**
 * Session, translated from the canonical token into the frame's tri-state.
 *
 * `SESSION ?` becomes `null` and NOT `false`. "No exchange calendar" is not
 * "closed" — rounding it down would have the badge assert a shut market at
 * 11am on a Tuesday, which is the precise inversion `selectCanonicalSessionToken`
 * was written to stop.
 */
function sessionOpenFromToken(token: string): boolean | null {
  if (token === SESSION_TOKEN_CONTINUOUS) return true;
  if (token === SESSION_TOKEN_CLOSED) return false;
  return null;
}

export function selectPaperFeedObservation(
  input: PaperFeedObservationInput,
): FeedObservation {
  const r = input.readiness ?? null;

  // BOTH halves required, and this is the load-bearing line of the file.
  //
  // A price with no observation timestamp cannot be aged, and an observation
  // timestamp with no price is a round-trip that returned nothing. Either one
  // alone is a provider that answered without observing, which is the exact
  // case `compileFeedStanding` refuses to grade. Naming "yahoo" on that
  // evidence would manufacture the observation the badge then certifies.
  const observed =
    r != null &&
    typeof r.price === "number" &&
    Number.isFinite(r.price) &&
    r.price > 0 &&
    typeof r.observedAt === "number" &&
    Number.isFinite(r.observedAt);

  return {
    // The provider is named only once it has actually answered. Before that
    // the honest report is that nobody has — and FEED UNKNOWN is then the
    // TRUE reading, which is why this fix does not simply always say "yahoo".
    source: observed ? "yahoo" : null,
    quotePresent: observed,
    lastObservedAtMs: observed ? r!.observedAt : null,
    connected: null,
    sessionOpen: sessionOpenFromToken(input.sessionToken),
    barsPresent: false,
    // /paper carries no companion camera. It has no replay engine, no replay
    // control and no bars to walk — the same reason `barsPresent` is a flat
    // `false` above rather than a derived value. A room that CAN replay must
    // hand up its own live flag; this one has no such state to misreport.
    replayEngaged: false,
  };
}
