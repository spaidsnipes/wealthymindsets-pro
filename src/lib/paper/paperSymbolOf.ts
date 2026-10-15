/**
 * The chart's symbol as /paper names it, or null when paper does not trade it.
 *
 * The chart's crypto symbol is the venue pair ("BTC-USD"); paper's book is the coin ("BTC").
 * Read raw, /paper's masthead asked its readiness table for "BTC-USD", found nothing and
 * said FEED UNKNOWN · no observation yet — over a ticket quoting a live BTC price
 * (serving 2026-10-15).
 */
export function paperSymbolOf(sym: string, universe: Readonly<Record<string, unknown>>): string | null {
  const up = sym.trim().toUpperCase();
  if (up in universe) return up;
  const coin = up.replace(/[-/]?(USD|USDT|USDC)$/, "");
  return coin !== up && coin in universe ? coin : null;
}
