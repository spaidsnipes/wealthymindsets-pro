/**
 * quoteSourceNamesProvider — does this `source` string actually NAME someone
 * the trader could check the number against?
 *
 * ── WHY THIS IS ITS OWN MODULE ────────────────────────────────────────
 * MEASURED on the serving host 2026-09-20: the /charts right rail rendered
 *
 *     BTCUSDT · 5m · 81781.82 LAST QUOTE · unavailable
 *
 * `unavailable` is not a vendor. It is `useWebSocket`'s sentinel — the initial
 * value of `MarketState["source"]` — meaning this product DECLINED to certify
 * the quote's provenance. (Concretely: Finnhub returned no observation time,
 * `finnhubQuoteObservedAt` returned null, and the quote-apply site at
 * useWebSocket.ts deliberately left `source` at its initial value rather than
 * promote it to the vendor name.)
 *
 * Rendering that sentinel after "LAST QUOTE ·" turns a deliberate refusal to
 * vouch into a citation. That is the drawer-filed receipt INVERTED: the
 * disclosure does reach the glass, and it says the opposite of what the
 * product knows.
 *
 * The first fix for that lived inline inside `formatSpinePrice`. Then the
 * chart HEADER turned out to have the same question to ask about the same
 * field, and a second inline copy would have been two owners of one rule —
 * the exact shape that lets a sentinel list drift until one surface refuses a
 * string the other one prints. So the rule lives here, once, and both surfaces
 * ask it.
 *
 * ── WHAT THIS DOES NOT DECIDE ─────────────────────────────────────────
 * Nothing here judges whether a named provider is GOOD, CURRENT, or
 * ENTITLED. "finnhub" passes this gate the same as any other vendor string.
 * The only question answered is whether the trader has been given a name to
 * check against, or a placeholder wearing one.
 *
 * PURE — no clock, no I/O, no React.
 */

export const QUOTE_SOURCE_NAMES_PROVIDER_VERSION =
  "wm.quote-source-names-provider.v1" as const;

/**
 * Placeholders that occupy the `source` slot without naming anyone.
 *
 * `unavailable` is the measured one and the reason this exists. The others are
 * the shapes an absence conventionally takes when it passes through a string
 * field; they are listed so that a future writer choosing any of them cannot
 * accidentally manufacture a citation.
 */
const NON_PROVIDERS: ReadonlySet<string> = new Set([
  "unavailable",
  "unknown",
  "none",
  "null",
  "undefined",
  "n/a",
  "na",
  "-",
  "—",
  "?",
]);

export function quoteSourceNamesProvider(source: unknown): boolean {
  if (typeof source !== "string") return false;
  const s = source.trim();
  if (s === "") return false;
  return !NON_PROVIDERS.has(s.toLowerCase());
}

export default quoteSourceNamesProvider;
