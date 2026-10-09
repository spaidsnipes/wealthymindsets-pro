/**
 * priceDistanceWords — a price DISTANCE in the instrument's own unit.
 *
 * Sheriff receipts, serving 2026-10-08: every Inspect measurement was a bare
 * number — "0.28 wide" (AAPL), "4.90 wide" (GC), "137.31 wide" (BTC),
 * "0.048 wide" (USDJPY). A trader cannot tell dollars from points from pips.
 * One owner answers from the canonical asset class:
 *   spot FX            → pips ("4.8 pips"; JPY pairs use the 0.01 pip)
 *   futures            → points, plus ticks when the tick is on file
 *                        ("4.9 pts / 49 ticks")
 *   equities / ETFs    → dollars ("$0.28")
 *   crypto quoted USD  → dollars ("$137.31")
 *   anything else      → the bare number; no unit is claimed
 * PURE. No clock, no I/O.
 */
import { canonicalAssetClass, forexPairCodes } from "@/lib/marketData/canonicalIdentity";
import { fvgPipFor } from "@/lib/marketData/fvg/fvgDefinition";
import { instrumentTickFor } from "@/lib/chart/pricePrecision";

const trim = (n: number, dp: number) => {
  const s = n.toFixed(dp);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
};

export function priceDistanceWords(symbol: string | null | undefined, distance: number, dp: number, refPrice?: number | null): string {
  const d = Number.isFinite(distance) ? Math.abs(distance) : 0;
  const bare = d.toFixed(Math.max(0, Math.min(8, Math.round(dp))));
  if (!symbol) return bare;
  if (forexPairCodes(symbol) !== null || canonicalAssetClass(symbol) === "forex") {
    const pip = fvgPipFor(symbol);
    if (pip == null) return bare;
    const pips = d / pip;
    return `${trim(pips, 1)} pip${Math.abs(pips - 1) < 1e-9 ? "" : "s"}`;
  }
  const cls = canonicalAssetClass(symbol);
  if (cls === "futures") {
    const tick = instrumentTickFor(symbol, refPrice ?? null);
    const pts = `${bare} pts`;
    if (tick == null) return pts;
    const ticks = Math.round(d / tick);
    return `${pts} / ${ticks.toLocaleString("en-US")} tick${ticks === 1 ? "" : "s"}`;
  }
  if (cls === "equity" || cls === "etf") return `$${bare}`;
  if (cls === "crypto" && /(USD|USDT|USDC)$/.test(symbol.trim().toUpperCase().replace(/[-/]/g, ""))) return `$${bare}`;
  return bare;
}
