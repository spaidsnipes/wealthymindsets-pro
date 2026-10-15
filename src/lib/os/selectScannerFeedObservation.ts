import type { FeedObservation } from "@/lib/os/osChrome";
import { sessionOpenFromToken } from "@/lib/os/selectPaperFeedObservation";

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
  /**
   * The canonical session token of each market the scan covers (one per class is enough).
   * LIVE ONLY (2026-10-15): the rows are streamed, so a quiet scan means either every market
   * is shut or the stream stalled — and only the calendar can tell those apart.
   */
  readonly sessionTokens?: readonly string[];
}

/** Open when any scanned market is open; closed only when every one is proven closed. */
export function scanSessionOpen(tokens: readonly string[] | undefined): boolean | null {
  if (!tokens?.length) return null;
  const opens = tokens.map(sessionOpenFromToken);
  if (opens.some(o => o === true)) return true;
  return opens.every(o => o === false) ? false : null;
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
    // LIVE ONLY (2026-10-12): every scanned row is priced from the tastytrade stream.
    source: observed ? "tastytrade" : null,
    quotePresent: observed,
    lastObservedAtMs: newest,
    connected: null,
    sessionOpen: scanSessionOpen(input.sessionTokens),
    barsPresent: false,
    // No companion camera. The scanner ranks a live list; it has no replay
    // engine, and nothing here can point the room at the past.
    replayEngaged: false,
  };
}
