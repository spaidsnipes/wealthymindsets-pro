/**
 * MAY THIS FINNHUB CRYPTO ANSWER STAND IN FOR THE SYMBOL THE TRADER NAMED?
 *
 * ── THE DEFECT THIS OPENS THE DOOR FOR ──────────────────────────────────────
 *
 * MEASURED on the serving host, 2026-09-20, BTCUSDT · 5m:
 *
 *     /api/finnhub?sym=BTCUSDT&type=quote
 *       → { price: 81608, providerSymbol: "BINANCE:BTCUSDT", source: "finnhub" }
 *
 * and, at that same minute, the right rail of /charts read
 *
 *     BTCUSDT · 5m · PRICE UNKNOWN
 *
 * One half of the product printed UNKNOWN about a number the other half was
 * serving. The cause is structural, in `fetchRealQuoteUncoalesced`
 * (src/hooks/useWebSocket.ts): the crypto branch asks Coinbase, then FALLS PAST
 * the whole `if (isEquityLane)` block — which is where the Finnhub leg lives,
 * additionally gated by `if (!isCrypto)` — and lands on a final Yahoo fallback
 * that 404s for USDT pairs. Finnhub is unreachable for a crypto quote, and
 * Finnhub is the exact lane that answers.
 *
 * ── WHY OPENING THAT DOOR NEEDS A GATE ──────────────────────────────────────
 *
 * Finnhub's free crypto tier is Binance, which quotes in USDT. `toFinnhubSym`
 * therefore resolves EVERY crypto request to `BINANCE:{BASE}USDT`:
 *
 *     BTCUSDT → BINANCE:BTCUSDT     the same market. Nothing substituted.
 *     BTC     → BINANCE:BTCUSDT     no quote currency was named, so none
 *                                   was contradicted.
 *     BTCUSD  → BINANCE:BTCUSDT     A REAL SUBSTITUTION. The trader named
 *                                   dollars and would be shown tether.
 *
 * USDT tracks the dollar; it is not the dollar, and the gap is exactly the
 * thing that moves when it matters. Printing a tether price under a USD label
 * is a LIVING-PIXEL violation of the cheapest kind: the label and the number
 * have different owners and neither is wrong on its own.
 *
 * This product already refuses this class once, deliberately, one module over —
 * `toFinnhubSym` returns null for venue-pinned rows ("BTC.COINBASE") because
 * "answering a Coinbase request with a Binance price is a venue substitution".
 * The quote-currency substitution is the same move in a different axis, and it
 * gets the same answer: refuse, OUT LOUD, naming both currencies. A refusal a
 * trader can read beats a number they cannot check.
 *
 * ── WHAT THIS MODULE REFUSES TO DO ──────────────────────────────────────────
 *
 * It does not fetch, and it does not decide the chain order. It reads two
 * strings the caller already has — what was ASKED and what the route SAID it
 * fetched — and returns a verdict. The base is asked of `cryptoBaseTicker`,
 * the module that already owns "is this crypto and what is its base", rather
 * than re-derived from a second hand-written list free to disagree with it.
 * That is Canon Weakness #1 — two owners, one pixel.
 *
 * It does not guess when the route says nothing. A response with no
 * `providerSymbol` is UNDISCLOSED, not assumed-exact — assuming exactness is
 * how the substitution would ship silently anyway.
 *
 * PURE. DETERMINISTIC. No React, no IO, no clock.
 */

import { cryptoBaseTicker } from "@/lib/marketData/canonicalIdentity";

export const CRYPTO_QUOTE_SUBSTITUTION_VERSION =
  "wm.crypto-quote-substitution.v1" as const;

export type CryptoQuoteVerdict =
  /** Asked and answered in the same market. Usable as-is. */
  | { readonly kind: "EXACT"; readonly providerSymbol: string }
  /** The request named no quote currency, so none was contradicted. */
  | { readonly kind: "UNNAMED"; readonly providerSymbol: string; readonly quotedIn: string }
  /** The request named one currency and the venue quotes another. */
  | { readonly kind: "SUBSTITUTED"; readonly providerSymbol: string; readonly reason: string }
  /** The route did not say what it fetched, or said something unreadable. */
  | { readonly kind: "UNDISCLOSED"; readonly reason: string };

/** `BINANCE:BTCUSDT` → { venue: "BINANCE", pair: "BTCUSDT" }; null if not that shape. */
function splitProviderSymbol(
  providerSymbol: string,
): { venue: string; pair: string } | null {
  const m = /^([A-Z0-9_.-]+):([A-Z0-9]+)$/.exec(providerSymbol.trim().toUpperCase());
  return m ? { venue: m[1], pair: m[2] } : null;
}

/**
 * Compare the symbol the trader named against the instrument the route says it
 * actually fetched.
 *
 * `providerSymbol` is whatever `/api/finnhub` returned in that field —
 * `unknown`, because it arrives from a network body and a caller that had to
 * narrow it first would be tempted to default it.
 */
export function judgeCryptoQuoteSubstitution(
  requested: string,
  providerSymbol: unknown,
): CryptoQuoteVerdict {
  if (typeof providerSymbol !== "string" || !providerSymbol.trim()) {
    return {
      kind: "UNDISCLOSED",
      reason:
        "the quote provider did not say which market this price came from, " +
        "so WM cannot confirm it is the one you asked for.",
    };
  }
  const provider = providerSymbol.trim().toUpperCase();
  const asked = requested.trim().toUpperCase();

  const split = splitProviderSymbol(provider);
  if (!split) {
    return {
      kind: "UNDISCLOSED",
      reason: `the quote provider named "${provider}", which WM cannot read as a venue and pair.`,
    };
  }

  const base = cryptoBaseTicker(asked);
  if (!base) {
    return {
      kind: "UNDISCLOSED",
      reason: `"${asked}" is not carried here as a crypto pair, so its quote currency cannot be compared.`,
    };
  }

  if (!split.pair.startsWith(base)) {
    // Not a currency question at all — a different coin. Naming it is the only
    // useful thing this module can do with it.
    return {
      kind: "SUBSTITUTED",
      providerSymbol: provider,
      reason:
        `you asked for ${base}, and the quote provider answered from ` +
        `${provider}, which is a different instrument.`,
    };
  }

  const venueQuote = split.pair.slice(base.length);
  // What the REQUEST named after its base: "BTCUSDT" → "USDT", "BTC/USD" →
  // "USD", "BTC" → "". Normalised the SAME way `cryptoBaseTicker` normalises
  // before matching — trailing venue dropped, separators removed — so the two
  // halves of this comparison cannot disagree about what the string is. A
  // venue row ("BTC.COINBASE") names no quote currency; its venue is a
  // different objection, already refused upstream by `toFinnhubSym`.
  const askedCompact = asked.replace(/\.[A-Z0-9]+$/, "").replace(/[^A-Z0-9]/g, "");
  const namedQuote = askedCompact.startsWith(base)
    ? askedCompact.slice(base.length)
    : "";

  if (!namedQuote) {
    return { kind: "UNNAMED", providerSymbol: provider, quotedIn: venueQuote };
  }
  if (namedQuote === venueQuote) {
    return { kind: "EXACT", providerSymbol: provider };
  }
  return {
    kind: "SUBSTITUTED",
    providerSymbol: provider,
    reason:
      `you asked for ${base} priced in ${namedQuote}, and the only crypto quote ` +
      `available here is ${provider} — priced in ${venueQuote}. ` +
      `WM does not print a ${venueQuote} price under a ${namedQuote} label.`,
  };
}

/**
 * May this answer be shown as the price of the symbol the trader named?
 *
 * TRUE for EXACT and UNNAMED only. UNDISCLOSED is deliberately NOT usable:
 * "the provider did not say" and "the provider said it matches" are different
 * facts, and treating the first as the second is how the substitution would
 * ship silently.
 */
export function cryptoQuoteMayStandIn(v: CryptoQuoteVerdict): boolean {
  return v.kind === "EXACT" || v.kind === "UNNAMED";
}

export default judgeCryptoQuoteSubstitution;
