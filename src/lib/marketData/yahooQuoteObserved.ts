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

/**
 * WHY the observation was refused, in the endpoint's own words.
 *
 * MEASURED FAILURE this exists for: `/api/yahoo?sym=NQ1!&type=quote` answers
 * in ~200ms with `price: 29565.25`, `volume: 88329` and
 *
 *   observation.resolution = "UNKNOWN"
 *   observation.reasons[0] = "No live traded price in the pre/post-aware
 *     intraday series; a day/meta close must not be presented as a live
 *     observation."
 *
 * The gate above correctly refuses that price. But it returns a BOOLEAN, so
 * every caller then had exactly one word left for two different facts: "no
 * answer yet" and "answered, and WM declined to certify it". The ticker tape
 * printed `quote pending` for both — for NQ1! ES1! RTY1! YM1! GC1! CL1!,
 * six of the thirteen default rows, permanently, while a request completed
 * successfully every ten seconds.
 *
 * §8: a designed refusal must not wear a transient state's vocabulary. The
 * endpoint already computed the reason; the only defect was that the reason
 * was thrown away one line into the client. This carries it.
 *
 * Returns `null` when the response IS observed, and — deliberately — also
 * when there is no response at all. A thrown fetch, a non-object body, a
 * timeout: those are genuinely "no answer", and calling them a refusal would
 * invent a decision WM never made. Refusal means WM looked and said no.
 */
export function yahooQuoteRefusal(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;
  const obs = (response as { observation?: { resolution?: string; reasons?: unknown } }).observation;
  if (!obs || typeof obs.resolution !== "string") return null;
  if (obs.resolution === "RESOLVED") return null;
  const reasons = Array.isArray(obs.reasons)
    ? obs.reasons.filter((r): r is string => typeof r === "string" && r.trim().length > 0)
    : [];
  // Never fabricate a reason. If the endpoint refused without saying why, say
  // that it refused without saying why.
  return reasons[0] ?? `Quote resolution ${obs.resolution}; no reason supplied.`;
}
