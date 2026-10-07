/**
 * ONE quote-token request per moment in the browser. The live stream and the
 * print-history reader each fetched /api/broker/tastytrade/quote-token on
 * their own — four requests on one chart load (2026-10-03). Callers share the
 * in-flight request and a short-lived answer; `forget()` drops it when a
 * socket says the token was refused.
 */
export interface QuoteTokenAnswer {
  readonly status: number;
  readonly body: { state?: string; token?: string; dxlinkUrl?: string; reason?: string; error?: string } | null;
}

const TTL_MS = 5 * 60_000;
let memo: { at: number; answer: QuoteTokenAnswer } | null = null;
let inFlight: Promise<QuoteTokenAnswer> | null = null;
/**
 * Bumped by every forget. A request that was already in flight when the
 * account changed (sign-out, a member connecting their own tastytrade) answers
 * for the PREVIOUS identity: it may still reach the caller that asked, but it
 * is never remembered for the next one — on a shared device that was a 5-minute
 * window for the next person to ride the last member's live stream token.
 */
let epoch = 0;

export function fetchQuoteToken(signal?: AbortSignal): Promise<QuoteTokenAnswer> {
  if (memo && Date.now() - memo.at < TTL_MS) return Promise.resolve(memo.answer);
  if (!inFlight) {
    const asked = epoch;
    const request: Promise<QuoteTokenAnswer> = fetch("/api/broker/tastytrade/quote-token", { cache: "no-store" })
      .then(async r => ({ status: r.status, body: await r.json().catch(() => null) }))
      .then(answer => {
        // Only a usable token is remembered; a refusal is asked again next time.
        if (asked === epoch && answer.status === 200 && answer.body?.state === "OK") memo = { at: Date.now(), answer };
        return answer;
      })
      .finally(() => { if (inFlight === request) inFlight = null; });
    inFlight = request;
  }
  const shared = inFlight;
  if (!signal) return shared;
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    shared.then(resolve, reject);
  });
}

export function forgetQuoteToken(): void {
  memo = null;
  inFlight = null;
  epoch += 1;
}
