/**
 * yahooQuoteObserved — shared predicate for consumers of
 * `/api/yahoo?type=quote` responses.
 *
 * SF-D01 (Sunday-futures truth): the /api/yahoo quote endpoint returns
 * both the legacy `price` / `prevClose` fields AND a discriminated
 * `observation: { resolution: "RESOLVED" | "UNKNOWN", ... }` union. When
 * `resolution === "UNKNOWN"`, the legacy `price` field silently falls
 * back to `previousClose` — reading that as a live quote is exactly the
 * "fake-fresh" failure SF-D01 exists to prevent.
 *
 * This predicate returns TRUE only when the caller may honor the legacy
 * `price` as a real observed value.
 *
 * Fallback is deliberately PERMISSIVE (returns true) when the field is
 * absent — older cache responses, non-Yahoo endpoints, and test fixtures
 * without the observation field never regress.
 *
 * Pure, deterministic, no side effects. Extracted so
 * TickerTape / paper / scanner (and any future consumer) all consult a
 * single implementation.
 */
export function yahooQuoteObserved(response: unknown): boolean {
  if (!response || typeof response !== "object") return false;
  const obs = (response as { observation?: { resolution?: string } }).observation;
  // Absent observation field → permissive default (pre-SF-D01 behavior).
  if (!obs || typeof obs.resolution !== "string") return true;
  return obs.resolution === "RESOLVED";
}
