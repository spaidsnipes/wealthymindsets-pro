/**
 * ONE OPEN ROUND PER IDENTITY.
 *
 * The mechanism only. It carries no opinion about what a "round" is — the
 * modules that own a domain (quotes, provider ticks) hold the measurement that
 * justified coalescing that domain, and each keeps its own instance so two
 * domains can never accidentally answer each other's question.
 *
 * This was extracted from quoteRequestCoalescer.ts when the SECOND consumer
 * arrived, not in anticipation of one. The pattern itself is older still — see
 * YahooCandleConsumer.request(), which has keyed candle requests by identity
 * for some time. Quotes and provider ticks are the paths that never adopted it.
 *
 * WHAT IT DELIBERATELY DOES NOT DO:
 *   - It does not CACHE. A settled round is forgotten immediately, so a caller
 *     can never be handed an observation that was already history when it
 *     asked. Joining is offered only for the milliseconds a round is genuinely
 *     open.
 *   - It does not merge different identities.
 *   - It does not dedupe across tabs.
 *   - It does not swallow failures. A joiner sees exactly the rejection the
 *     originator saw — the same outcome it would have reached alone.
 */
export class InFlightRounds {
  private readonly open = new Map<string, Promise<unknown>>();

  /**
   * Run `start` under `key`, or join the round already open under it.
   *
   * An EMPTY key is not an identity. A caller that cannot say what it is
   * asking about must not be joined to anyone — it runs alone, uncoalesced.
   * The alternative is that every anonymous request collapses into one shared
   * answer, which is a correctness bug wearing a performance fix's clothes.
   */
  run<T>(key: string, start: () => Promise<T>): Promise<T> {
    const id = normalizeRoundKey(key);
    if (!id) return start();

    const existing = this.open.get(id) as Promise<T> | undefined;
    if (existing) return existing;

    // `start()` may throw SYNCHRONOUSLY. If it does, nothing was ever open, so
    // nothing may be registered — otherwise the map would hold a key that no
    // `finally` will ever clear and that identity would be permanently
    // unreachable.
    let pending: Promise<T>;
    try {
      pending = start();
    } catch (err) {
      return Promise.reject(err);
    }

    // Delete only if the entry is still OURS.
    //
    // RECORDED HONESTLY: mutation M43 replaced this with an unconditional
    // delete and every test still passed. That survival is correct — `run()`
    // has no overwrite path (a later caller JOINS an existing entry rather than
    // replacing it), so a straggler can never find a newer entry to evict. This
    // is defence-in-depth against a future overwrite, not a currently reachable
    // invariant, and no test can honestly claim to prove it.
    const tracked = pending.finally(() => {
      if (this.open.get(id) === tracked) this.open.delete(id);
    });
    this.open.set(id, tracked);
    return tracked;
  }

  /** Diagnostic seam. Whether a round is open for this key right now. */
  isInFlight(key: string): boolean {
    const id = normalizeRoundKey(key);
    return id ? this.open.has(id) : false;
  }

  /** Diagnostic seam. How many distinct rounds are open right now. */
  inFlightCount(): number {
    return this.open.size;
  }
}

/**
 * Identity is case- and whitespace-insensitive, because every key in this
 * codebase is built from a symbol and " nq1! " is the same question as "NQ1!".
 * A non-string has no identity at all and is refused rather than coerced —
 * `String(42)` would INVENT the identity "42".
 */
export function normalizeRoundKey(key: string): string {
  return typeof key === "string" ? key.trim().toUpperCase() : "";
}
