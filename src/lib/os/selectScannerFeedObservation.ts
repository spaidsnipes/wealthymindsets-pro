import type { FeedObservation } from "@/lib/os/osChrome";

/**
 * WHAT /scanner HAS ACTUALLY OBSERVED, IN THE VOCABULARY THE FRAME GRADES.
 *
 * ── THE DEFECT, MEASURED LIVE ──────────────────────────────────────────────
 *
 * wealthymindsetspro.com/scanner, 2026-09-17, production:
 *
 *   masthead  FEED UNKNOWN
 *   footer    SOURCE UNKNOWN
 *   body      "Scanner · 30 delayed-quote signals · 25▲ 5▼"
 *
 * The room counted thirty observations in its own headline and reported none
 * of them upward. This is the same family as /paper, /lounge and /shop: A
 * FALSE STATEMENT OF IGNORANCE — not a safe failure, because it sends a
 * trader to diagnose a pipeline that is working.
 *
 * ── WHY `lastObservedAtMs` IS NOT `quoteReceivedAt` ────────────────────────
 *
 * The obvious wiring is the newest `receivedAt` across the table. It is wrong.
 * `receivedAt` comes from `/api/yahoo`'s `ts`, and that route documents the
 * field in its own source: "`ts` is transport/response time only — NOT
 * observation chronology." Publishing transport time as an observation epoch
 * would commit, inside the cure, the exact substitution the cure exists to
 * stop. The row now carries the provider's real `observedAt` separately, and
 * only that may be read here.
 *
 * ── WHY `sessionOpen` IS `null` ────────────────────────────────────────────
 *
 * A thirty-symbol scan spans instruments with different calendars. There is no
 * single session for the badge to report, and the masthead names no symbol, so
 * asserting one would be a claim about an instrument the reader cannot see.
 * `null` is the field's documented word for "this surface cannot answer".
 *
 * ── WHY `connected` IS `null` AND `barsPresent` IS `false` ─────────────────
 *
 * /scanner polls REST on an interval and renders a table. It holds no socket
 * whose up/down state it could report, and it draws no OHLCV history. Claiming
 * either would be the same overclaim in the opposite direction.
 */
export interface ScannerFeedObservationRow {
  /** The PROVIDER'S observation epoch-ms for this row, or null if none. */
  readonly quoteObservedAt: number | null;
}

export interface ScannerFeedObservationInput {
  readonly results: ReadonlyArray<ScannerFeedObservationRow> | null | undefined;
}

export function selectScannerFeedObservation(
  input: ScannerFeedObservationInput,
): FeedObservation {
  let newest: number | null = null;

  for (const row of input.results ?? []) {
    const at = row?.quoteObservedAt;
    // A non-finite or non-positive epoch is not an observation. Zero is the
    // scanner's own "never received" sentinel for its transport clock, and it
    // must not become an observation dated 1970 that the frame then ages.
    if (typeof at !== "number" || !Number.isFinite(at) || at <= 0) continue;
    if (newest === null || at > newest) newest = at;
  }

  const observed = newest !== null;

  return {
    // Named only once a provider has actually answered. Before the first round
    // resolves, FEED UNKNOWN is the TRUE reading — which is why this fix is not
    // "always say yahoo".
    source: observed ? "yahoo" : null,
    quotePresent: observed,
    lastObservedAtMs: newest,
    connected: null,
    sessionOpen: null,
    barsPresent: false,
  };
}
