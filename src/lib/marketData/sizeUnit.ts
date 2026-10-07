/**
 * THE SIZE UNIT — what one unit of a print's size IS, by asset class.
 *
 * Big-trade Inspect printed "15.0757 ×29 · 8.58 bought · 6.50 sold" with no
 * unit (sheriff sweep 2026-10-07): a trader cannot tell 15 coins from 15
 * contracts. One owner answers, from the canonical asset class:
 *   futures / futures options → "contracts" (one: "contract")
 *   equities / ETFs           → "shares"    (one: "share")
 *   equity options            → "contracts"
 *   crypto                    → the base coin's ticker ("BTC")
 *   spot FX / unknown         → null — no unit is claimed
 * PURE.
 */
import { canonicalAssetClass, cryptoBaseTicker } from "./canonicalIdentity";

export function sizeUnitFor(symbol: string, size?: number): string | null {
  if (!symbol) return null;
  const cls = canonicalAssetClass(symbol);
  const one = size != null && Math.abs(size) === 1;
  if (cls === "futures" || cls === "options") return one ? "contract" : "contracts";
  if (cls === "equity" || cls === "etf") return one ? "share" : "shares";
  if (cls === "crypto") return cryptoBaseTicker(symbol);
  return null;
}
