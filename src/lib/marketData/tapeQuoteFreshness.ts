/**
 * HOW OLD IS THE NUMBER ON THE TAPE?
 *
 * OBSERVED, /command-deck 2026-09-08: every `/api/yahoo` and `/api/finnhub`
 * request was made to hard-fail for 39 seconds — 309 rejected requests, zero
 * answers. The rail kept rendering byte-identical prices, each still wearing a
 * live-quote badge. Nothing on the surface said the feeds had died, because
 * nothing on the surface knew WHEN any price had been observed.
 *
 * Two mechanisms combined to produce that:
 *
 *   1. The tape's quote record carried a price, a change and a source — and no
 *      time. `live: true` was derived from `price > 0`, i.e. from a number
 *      EXISTING, never from it being RECENT.
 *   2. A round in which every provider fails produces no answers and no
 *      refusals, and the fetch loop treats that as "nothing to do" and returns.
 *      So total feed death is the one failure mode that changes nothing on
 *      screen. It is also the one that matters most.
 *
 * This module is the single owner of the question "may this observation still
 * be presented as current?". It holds no I/O and no React so the rule can be
 * tested directly rather than inferred from a rendered rail.
 */

/**
 * The tape's staleness boundary.
 *
 * Not a new number: the tape's own hydration path already refuses a cached
 * price older than 30s (`wAge < 30_000`) before seeding state from it. Having
 * one rule for "too old to adopt" and a different one — or none — for "too old
 * to keep showing" is how a price becomes trustworthy purely by having already
 * been on screen. Both paths now read this constant.
 *
 * It is also three poll intervals wide (the rail refetches every 10s), so a
 * single dropped round cannot flicker a healthy tape into STALE.
 */
export const TAPE_QUOTE_FRESH_MS = 30_000;

export type TapeQuoteFreshness =
  /** No provider has answered for this symbol. There is no age to report. */
  | { readonly kind: "UNOBSERVED" }
  /** Observed recently enough to still be presented as the current price. */
  | { readonly kind: "FRESH"; readonly ageMs: number }
  /** Observed, but too long ago to keep asserting. The age is the evidence. */
  | { readonly kind: "STALE"; readonly ageMs: number };

/**
 * Classify one observation against the wall clock.
 *
 * `observedAt` is when a provider ANSWERED, not when the row was rendered.
 * A missing or unreadable stamp returns UNOBSERVED rather than defaulting to
 * fresh: an observation whose time WM cannot state is not one WM may certify,
 * and the caller renders it as having no price at all.
 *
 * A stamp in the future is clock skew between the browser and whatever wrote
 * it, not evidence of freshness. Its age clamps to 0 — skew must never let a
 * quote outrank a correctly stamped one, but neither should a few milliseconds
 * of drift throw an otherwise good tape into STALE.
 */
export function selectTapeQuoteFreshness(
  observedAt: number | null | undefined,
  now: number,
  freshMs: number = TAPE_QUOTE_FRESH_MS,
): TapeQuoteFreshness {
  if (typeof observedAt !== "number" || !Number.isFinite(observedAt)) {
    return { kind: "UNOBSERVED" };
  }
  if (!Number.isFinite(now)) return { kind: "UNOBSERVED" };
  const ageMs = Math.max(0, now - observedAt);
  return ageMs > freshMs ? { kind: "STALE", ageMs } : { kind: "FRESH", ageMs };
}

/**
 * How the rail says the age out loud.
 *
 * Seconds under a minute, then whole minutes — a trader glancing at the rail
 * needs to know the order of magnitude of the gap, not its milliseconds. The
 * value is always rounded DOWN so the label can never overstate how recent an
 * observation was; "stale 59s" for a 59.9s-old price is the safe direction.
 */
export function formatQuoteAge(ageMs: number): string {
  const seconds = Math.max(0, Math.floor(ageMs / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}
