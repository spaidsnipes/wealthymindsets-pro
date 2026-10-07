/**
 * A futures price is in index POINTS (or the contract's own quote unit), not
 * dollars: serving /scanner 2026-10-07 printed NQ1! as "$31,396.00" — a
 * dollar sign on a number that is not a dollar amount (one NQ point is $20).
 * The sign is dropped for futures; every other row keeps its text verbatim.
 * PURE.
 */
import { classifySymbol } from "@/lib/marketData/symbolAssetClass";

export function scannerPriceText(symbol: string, text: string): string {
  return classifySymbol(symbol) === "FUTURES" ? text.replace(/^\$/, "") : text;
}
