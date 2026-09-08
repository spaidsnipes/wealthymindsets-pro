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

/**
 * A coalescer instance. Exported as a class so tests get a clean one rather
 * than reaching into module state through a reset hatch — the same seam
 * `YahooCandleConsumer` offers.
 */
export class QuoteRequestCoalescer {
  private readonly inFlight = new Map<string, Promise<unknown>>();

  /**
   * Run `start` under `key`, or join the round already running under it.
   *
   * An EMPTY key is not an identity. A caller that cannot say what it is
   * asking about must not be joined to anyone — it runs alone, uncoalesced.
   * The alternative is that every anonymous request collapses into one shared
   * answer, which is a correctness bug wearing a performance fix's clothes.
   */
  run<T>(key: string, start: () => Promise<T>): Promise<T> {
    const id = normalizeQuoteKey(key);
    if (!id) return start();

    const existing = this.inFlight.get(id) as Promise<T> | undefined;
    if (existing) return existing;

    // `start()` may throw SYNCHRONOUSLY. If it does, nothing was ever in
    // flight, so nothing may be registered — otherwise the map would hold a
    // key that no `finally` will ever clear and that symbol would be
    // permanently unfetchable.
    let pending: Promise<T>;
    try {
      pending = start();
    } catch (err) {
      return Promise.reject(err);
    }

    // Delete only if the entry is still OURS. A slow round that settles after
    // its key was already reclaimed by a newer round must not evict the newer
    // round's entry — that would silently disable coalescing for that symbol.
    const tracked = pending.finally(() => {
      if (this.inFlight.get(id) === tracked) this.inFlight.delete(id);
    });
    this.inFlight.set(id, tracked);
    return tracked;
  }

  /** Diagnostic seam. Whether a round is open for this key right now. */
  isInFlight(key: string): boolean {
    const id = normalizeQuoteKey(key);
    return id ? this.inFlight.has(id) : false;
  }

  /** Diagnostic seam. How many distinct rounds are open right now. */
  inFlightCount(): number {
    return this.inFlight.size;
  }
}

/**
 * The identity of a quote question is its symbol, case- and whitespace-
 * insensitive. "nq1!" and " NQ1! " are the same question and must join.
 */
export function normalizeQuoteKey(key: string): string {
  return typeof key === "string" ? key.trim().toUpperCase() : "";
}

/** The one coalescer the app's quote callers share. */
export const quoteRequestCoalescer = new QuoteRequestCoalescer();

/** Convenience wrapper over the shared instance. */
export function coalesceQuoteRequest<T>(key: string, start: () => Promise<T>): Promise<T> {
  return quoteRequestCoalescer.run(key, start);
}
