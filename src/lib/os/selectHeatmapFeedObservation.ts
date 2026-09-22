import type { FeedObservation } from "@/lib/os/osChrome";

/**
 * WHAT /heatmaps HAS ACTUALLY OBSERVED, IN THE VOCABULARY THE FRAME GRADES.
 *
 * ── THE DEFECT, MEASURED LIVE ──────────────────────────────────────────────
 *
 * wealthymindsetspro.com/heatmaps, 2026-09-17, production:
 *
 *   masthead  FEED UNKNOWN
 *   footer    SOURCE UNKNOWN
 *   body      -1.37%  +2.00%  +2.49%  -0.35%  +0.82%  +0.07%  +1.65%  +4.03%
 *
 * ── WHY THIS ONE COULD NOT BE CURED BY PUBLISHING ALONE ────────────────────
 *
 * /paper and /scanner already held the evidence and merely failed to hand it
 * up. /heatmaps did not hold it. `/api/heatmap` requested the percentage and
 * nothing else, then stamped `receiveTimestamp` — a field the route itself
 * labels "Receipt chronology only. This is not a provider event timestamp."
 *
 * Wiring that receipt into `lastObservedAtMs` would have made the badge grade
 * the age of a HTTP response as the age of the market. So the route was
 * changed to ask Yahoo for `regularMarketTime`, which it carries on both
 * endpoints this page already calls. The badge now ages a real observation or
 * says it has none. There is no third option in which it guesses.
 *
 * ── WHY `quotePresent` IS NOT "ARE THERE TILES ON SCREEN" ──────────────────
 *
 * Tiles can be a retained browser snapshot from a previous session. A board
 * full of percentages with no observation epoch is precisely the state that
 * must keep reading FEED UNKNOWN, because nothing has been seen THIS round.
 * The epoch is therefore the sole witness, and the tile count is not consulted.
 *
 * ── WHY `sessionOpen` IS `null` ────────────────────────────────────────────
 *
 * The board spans an index's whole constituent list across sectors and, in
 * other views, asset classes. There is no single session, and the masthead
 * names no symbol, so asserting one would be a claim about an instrument the
 * reader cannot see.
 */
export interface HeatmapFeedObservationInput {
  /**
   * The provider's observation epoch-ms for the round on screen, or null.
   * NEVER `receivedAt` — see the header.
   */
  readonly observedAt: number | null | undefined;
}

export function selectHeatmapFeedObservation(
  input: HeatmapFeedObservationInput,
): FeedObservation {
  const at = input.observedAt;
  const observed = typeof at === "number" && Number.isFinite(at) && at > 0;

  return {
    // Named only once the provider has actually dated something. Before that,
    // FEED UNKNOWN is the TRUE reading — which is why this fix is not
    // "always say yahoo".
    source: observed ? "yahoo" : null,
    quotePresent: observed,
    lastObservedAtMs: observed ? at : null,
    // The board polls REST on a 30s/120s cadence. It holds no transport whose
    // up/down state it could report, and `null` is the field's word for that.
    connected: null,
    sessionOpen: null,
    // Percentage tiles, not OHLCV history. Reporting bars would let the frame
    // print an established provenance for a pipe this room does not run.
    barsPresent: false,
    // No companion camera. The board has no replay engine and no bars to walk
    // — the same reason `barsPresent` is flat `false` above.
    replayEngaged: false,
  };
}
