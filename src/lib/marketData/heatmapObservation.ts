/**
 * THE OBSERVATION EPOCH /api/heatmap NEVER ASKED FOR.
 *
 * ── THE DEFECT, MEASURED LIVE ──────────────────────────────────────────────
 *
 * wealthymindsetspro.com/heatmaps, 2026-09-17, production:
 *
 *   masthead  FEED UNKNOWN
 *   footer    SOURCE UNKNOWN
 *   body      -1.37%  +2.00%  +2.49%  -0.35%  +0.82%  +0.07%  +1.65%  +4.03%
 *
 * Eight real session moves under a badge saying nothing had been seen.
 *
 * This room could not be cured the way /paper and /scanner were, because it
 * genuinely held no observation epoch to publish. `/api/heatmap` requested
 * `fields=symbol,regularMarketChangePercent` — the number and nothing else —
 * and then stamped its own `receiveTimestamp`, correctly labelled in the route
 * as "Receipt chronology only. This is not a provider event timestamp."
 *
 * So the cure is not to publish harder. It is to ASK THE PROVIDER FOR THE ONE
 * FACT THE BADGE NEEDS. Yahoo carries `regularMarketTime` on both endpoints
 * this route already calls; it was simply never requested or read.
 *
 * ── WHY THIS REFUSES A TIMESTAMP THAT IS ALREADY IN MILLISECONDS ───────────
 *
 * Yahoo documents `regularMarketTime` as epoch SECONDS, and the tempting
 * defensive move is "if the number looks small, multiply by 1000". That is a
 * guess wearing a heuristic's clothes: it would silently absorb a provider
 * contract change and keep printing a confident age either way. A value
 * outside the plausible-seconds window is a provider we no longer understand,
 * and the honest output for that is null — which compiles to FEED UNKNOWN, a
 * true statement.
 */

/** 2001-09-09. Below this, a "seconds" epoch is not a market observation. */
const MIN_PLAUSIBLE_SECONDS = 1_000_000_000;
/** 2100-01-01. Above this — notably any millisecond value — we do not guess. */
const MAX_PLAUSIBLE_SECONDS = 4_102_444_800;

/**
 * Yahoo's epoch-SECONDS market time, converted to ms, or null.
 *
 * Null for: absent, non-numeric, non-finite, and — deliberately — for any
 * value already expressed in milliseconds. See the header.
 */
export function yahooMarketTimeToMs(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  if (raw < MIN_PLAUSIBLE_SECONDS || raw > MAX_PLAUSIBLE_SECONDS) return null;
  return Math.round(raw * 1000);
}

/**
 * The NEWEST observation across a batch, or null if the batch observed none.
 *
 * Newest and not oldest: the badge answers "when did WM last see the market",
 * and a single lagging constituent must not age the whole board. The per-tile
 * figures carry their own provenance; this is the surface-level question.
 */
export function newestObservationMs(
  candidates: ReadonlyArray<number | null | undefined>,
): number | null {
  let newest: number | null = null;
  for (const c of candidates) {
    if (typeof c !== "number" || !Number.isFinite(c) || c <= 0) continue;
    if (newest === null || c > newest) newest = c;
  }
  return newest;
}
