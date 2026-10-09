/**
 * THE BAR ROUTE'S FAILURE STATUS (2026-10-09).
 *
 * Measured on serving 0dd1130 / 16f363a: `/api/yahoo?sym=SIVB&type=candles`
 * answered HTTP 500 `{"error":"Error: Yahoo HTTP 404"}`. The upstream had said
 * "no such instrument" — a fact about the SYMBOL — and the route reported it as
 * a fault of OURS. A 500 tells monitors the server broke and tells callers to
 * retry; neither is true.
 *
 * When the upstream itself answered 404 or 400, the route answers 404. Every
 * other failure (a 5xx upstream, a timeout, a parse error, a bug) stays 500.
 * The body is unchanged, so the readers that word the refusal for the trader
 * (`fvgBarSource.upstreamSaysMissing` → "No 5m bars could be read for …") say
 * exactly what they said before.
 *
 * PURE.
 */
export function yahooFailureStatus(err: unknown): 404 | 500 {
  const text = err instanceof Error ? err.message : String(err ?? "");
  return /\bYahoo HTTP (404|400)\b/.test(text) ? 404 : 500;
}
