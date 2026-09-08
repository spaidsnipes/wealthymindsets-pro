/**
 * TWO CALLERS ASKING THE SAME QUESTION AT THE SAME MOMENT MUST JOIN ONE ANSWER.
 *
 * MEASURED, /charts 2026-09-08, 13-second window across a real client-side
 * route re-mount (/education -> /charts, so the mount path was exercised and
 * not merely the steady state), `window.fetch` wrapped with stack capture:
 *
 *   symbol   TickerTape.fetchTapeQuotes   useWebSocket.doRestFetch
 *   RTY1!              2                            0
 *   NQ1!               2                            6
 *   ES1!               2                            6
 *   YM1!               2                            6
 *   AMZN               0                           18   (+2 MainChart)
 *
 * RTY1! is the control. It is carried by ONE surface, and it shows exactly the
 * two requests a 10-second poll owes over 13 seconds — mount plus one round.
 * Nothing is wrong with the schedule.
 *
 * NQ1! through `doRestFetch` landed at t = 279, 283, 384, 388, 6322, 12183 ms.
 * The 4ms-apart PAIRS are the whole finding. Nothing schedules work 4ms apart.
 * That is two live subscriptions for the same symbol, each running its own
 * round, neither able to see the other.
 *
 * ROOT CAUSE: the in-flight guard shipped in 6e2c817 is PER HOOK INSTANCE. It
 * correctly stops one instance from racing itself and cannot, even in
 * principle, stop two instances from racing each other. Above the instance
 * there was no owner of request identity at all.
 *
 * THIS IS NOT A NEW ABSTRACTION. The CANDLE path has had precisely this
 * discipline for some time — see `YahooCandleConsumer.request()`, which keys a
 * Map by request identity and deletes its own entry in a `finally`. The quote
 * path simply never adopted it. This module is that same pattern, given the
 * name the quote path needs, so the two paths can be read against each other.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO:
 *
 *   - It does not CACHE. A settled answer is forgotten immediately. Joining is
 *     only ever offered for the milliseconds a request is genuinely open, so a
 *     caller can never be handed an observation that was already history when
 *     it asked. Freshness stays where it belongs — with tapeQuoteFreshness.ts
 *     and each provider's own `observedAt`.
 *   - It does not make two DIFFERENT questions one. The key is the identity of
 *     the question; callers asking about different symbols never meet.
 *   - It does not dedupe across tabs. Cross-tab quote dedupe is a separate,
 *     still-open problem and this module must not be mistaken for it.
 *   - It does not swallow failures. A joiner sees exactly the rejection the
 *     originator saw, which is the same outcome it would have reached alone.
 */

import { InFlightRounds, normalizeRoundKey } from "./inFlightRounds";

/**
 * The mechanism lives in inFlightRounds.ts. It was extracted there when the
 * provider-tick path became the second consumer — the abstraction is earned by
 * a real second caller, not anticipated. This module keeps the QUOTE
 * measurement above, and the instance the quote callers share.
 */
export const quoteRequestCoalescer = new InFlightRounds();

/**
 * The identity of a quote question is its symbol, case- and whitespace-
 * insensitive. "nq1!" and " NQ1! " are the same question and must join.
 */
export const normalizeQuoteKey = normalizeRoundKey;

/** Join the open round for this symbol, or start one. */
export function coalesceQuoteRequest<T>(key: string, start: () => Promise<T>): Promise<T> {
  return quoteRequestCoalescer.run(key, start);
}
