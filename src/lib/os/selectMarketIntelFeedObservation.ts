import type { FeedObservation } from "@/lib/os/osChrome";

/**
 * WHAT /ai-bot (MARKET INTEL) HAS ACTUALLY OBSERVED.
 *
 * ── THE DEFECT, MEASURED LIVE ──────────────────────────────────────────────
 *
 * wealthymindsetspro.com/ai-bot, 2026-09-17, production:
 *
 *   masthead  FEED UNKNOWN
 *   footer    SOURCE UNKNOWN
 *   body      LIVE MARKET MONITOR · NQ1! · SOCKET DOWN
 *             CONNECTION  Socket down
 *             PRICE FEED  No price provider
 *
 * This room is the one the frame's silent-room default hurts most subtly. The
 * others wore FEED UNKNOWN over evidence they HELD; this one wore it over
 * evidence of ABSENCE. The masthead said "nobody has told me anything" while
 * the room said, in four labelled cells, exactly what was wrong.
 *
 * Those are different sentences. "I have not been told" sends a reader to look
 * for a broken publisher. "The socket is down" sends them to the transport.
 * The room already knew which one was true and had no way to say so.
 *
 * ── WHY THIS IS NOT "JUST PUBLISH `connected`" ─────────────────────────────
 *
 * `compileFeedStanding` still reads FEED UNKNOWN when `source` is null, and on
 * the measured day it was null, so THIS SCREEN'S masthead does not change until
 * a provider answers. That is the correct outcome and it is worth stating
 * plainly rather than dressing the atom up as a visible win it is not:
 *
 *   · with no provider  → FEED UNKNOWN, unchanged, and TRUE.
 *   · with a provider   → the frame grades a real observation instead of
 *                         claiming ignorance over a running monitor.
 *
 * The defect being closed is that the second case was UNREACHABLE. A room that
 * cannot ever report a feed is silent by construction, and the day NQ1! is
 * swapped for BTC on a live Coinbase socket, the masthead would have gone on
 * saying nothing had been seen.
 *
 * ── WHY `linkState` IS THE GATE AND `price > 0` IS NOT ─────────────────────
 *
 * The room already refuses to collapse four distinguishable situations into
 * one boolean — `classifyMonitorLink` separates a dead socket, a provider that
 * has disowned the symbol, a corrupt tick, and a symbol that simply has not
 * printed yet. Re-deriving "is there a price" here from `price > 0` would fork
 * that judgement and let the masthead disagree with the cell eleven pixels
 * below it about the same tick. So the room's own classifier is the witness,
 * and this file adds no second opinion.
 */
export interface MarketIntelFeedObservationInput {
  /**
   * `classifyMonitorLink`'s verdict. Only "OBSERVED" means a usable price
   * actually arrived for this symbol — see the header for why this is not
   * re-derived from the price.
   */
  readonly linkState: string;
  /**
   * The hook's provider name. "unavailable" is its word for "nobody answered"
   * — an ABSENT source, not a provider named unavailable — and rounding it up
   * to a name asks the badge to grade a vendor that does not exist.
   */
  readonly source: string | null | undefined;
  /** The hook's own observation epoch-ms, never a receipt or a render clock. */
  readonly lastObservedAtMs: number | null | undefined;
  /** Transport state. This room genuinely knows it, so it may report it. */
  readonly connected: boolean;
  /** Proven session closure for the active symbol, or null when unresolved. */
  readonly sessionOpen: boolean | null;
}

export function selectMarketIntelFeedObservation(
  input: MarketIntelFeedObservationInput,
): FeedObservation {
  const observed = input.linkState === "OBSERVED";
  const named =
    typeof input.source === "string" && input.source && input.source !== "unavailable"
      ? input.source
      : null;
  const at = input.lastObservedAtMs;
  const dated = typeof at === "number" && Number.isFinite(at) && at > 0 ? at : null;

  return {
    // Both conditions, not either. A provider name with no usable tick is a
    // configured vendor, not an observation; a tick with no named provider has
    // no arm for the badge to grade.
    source: observed ? named : null,
    quotePresent: observed && named !== null,
    lastObservedAtMs: observed ? dated : null,
    // Reported because the room resolves it — and `false` here is a REAL
    // reading ("socket down"), which is why this field is not null the way it
    // is for the REST rooms that hold no transport at all.
    connected: input.connected,
    sessionOpen: input.sessionOpen,
    // This monitor draws no chart. Claiming bars would let the frame print an
    // established provenance for a pipe this room does not run.
    barsPresent: false,
    // No companion camera. This monitor watches a live wire and has no replay
    // engine to point at the past.
    replayEngaged: false,
  };
}
