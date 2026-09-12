/**
 * The single owner of "what does a failed Finnhub HTTP status MEAN".
 *
 * ── The measured failure (production, 2026-09-11) ───────────────────────────
 *
 * Two routes proxy the same Finnhub quote endpoint. Within one second of each
 * other, against the same upstream 429, they said:
 *
 *   /api/finnhub  → 429 {"edge":"RATE LIMITED",
 *                        "error":"Finnhub RATE LIMITED (HTTP 429)"}
 *   /api/market   → 500 {"price":null,
 *                        "error":"SyntaxError: Unexpected token '<',
 *                                 \"<html>\\r\\n<h\"... is not valid JSON"}
 *
 * `/api/market` never checked `res.ok`. Finnhub answers a throttle with an
 * HTML error page, `res.json()` threw on the `<html>`, and the catch returned
 * `String(err)` as the user-facing truth. A trader — or a consumer deciding
 * whether to degrade — was told the data layer had a PARSING bug, at HTTP 500,
 * when the real and entirely recoverable state was "we asked too fast."
 *
 * A leaked SyntaxError is worse than an unhelpful error: it points the reader
 * at the wrong subsystem. Nobody debugging a JSON parse error goes and looks
 * at their request rate.
 *
 * ── Why it lives in its own module ──────────────────────────────────────────
 *
 * This vocabulary was already correct — it just lived as a private function
 * inside `/api/finnhub/route.ts`, unreachable by the sibling that needed it.
 * The second route could only have gotten it by retyping it, and a retyped
 * vocabulary drifts: the day someone adds a status here, the copy elsewhere
 * keeps answering the old way and nothing notices.
 *
 * These strings are consumer-facing contract. `RATE LIMITED` is a state the
 * provider-wire receipts already render. Renaming one is a breaking change to
 * every surface that degrades on it — change them here or nowhere.
 */

/**
 * Classify a NON-OK Finnhub HTTP status into an honest edge.
 *
 * Never returns a generic 500-shaped answer for a knowable state, and never
 * returns anything resembling "delayed by entitlement" — that is a claim about
 * a data licence, and no HTTP status is evidence for it.
 */
export function classifyFinnhubStatus(status: number): string {
  if (status === 401) return "AUTH BLOCKED";  // Finnhub rejected the API token (invalid/expired)
  if (status === 403) return "FORBIDDEN";     // token lacks access to this resource / plan
  if (status === 429) return "RATE LIMITED";  // Finnhub free-tier throttle
  if (status === 404) return "NOT FOUND";     // symbol / endpoint not found upstream
  if (status >= 500) return "PROVIDER ERROR"; // Finnhub-side failure
  return "UPSTREAM ERROR";
}

/** The message shape both routes emit, so one upstream state reads identically. */
export function finnhubUpstreamMessage(status: number): string {
  return `Finnhub ${classifyFinnhubStatus(status)} (HTTP ${status})`;
}
