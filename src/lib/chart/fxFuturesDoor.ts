/**
 * SPOT FX → ITS LIVE CME FUTURE (serving EURUSD 15m, 2026-10-01 22:35 CDT).
 *
 * Spot FX has no central volume and no realtime source is connected, so a
 * forex trader's chart read DELAYED with every volume sense silent — while
 * tastytrade streamed 6E1! live with real traded volume, liquidity pools and
 * order flow. This names that market as a DOOR, never a substitute: the
 * future is a different instrument (carry basis; 6J is quoted JPY/USD, the
 * inverse of USDJPY), so it is opened, not painted under the spot name.
 *
 * Only catalogued contracts. PURE.
 */
const DOORS: Readonly<Record<string, { readonly futures: string; readonly note: string }>> = {
  EURUSD: { futures: "6E1!", note: "CME euro future" },
  GBPUSD: { futures: "6B1!", note: "CME pound future" },
  USDJPY: { futures: "6J1!", note: "CME yen future · quoted JPY/USD (inverse)" },
};

export function fxFuturesDoor(symbol: string): { readonly futures: string; readonly note: string } | null {
  const k = (symbol ?? "").trim().toUpperCase().replace(/[-/=X]/g, "").replace(/^(...)(...)$/, "$1$2");
  return DOORS[k] ?? null;
}
