/**
 * A SECONDS CHART ON SPOT FX HAS NO HISTORY TO SHOW (serving EURUSD 5s,
 * 2026-10-02 05:45 ET): the refusal note listed the vendors asked and stopped
 * there, leaving the trader on an empty canvas. No forex source WM reads keeps
 * seconds bars; history starts at one minute. This names that as a door to
 * the shortest timeframe that has history — never a substitute painted under
 * the seconds label. PURE.
 */
import { classifySymbol } from "@/lib/marketData/symbolAssetClass";

export interface TimeframeDoor { readonly timeframe: string; readonly words: string }

export function historyTimeframeDoor(symbol: string, timeframe: string | null | undefined): TimeframeDoor | null {
  if (!/^\d+s$/i.test((timeframe ?? "").trim())) return null;
  if (classifySymbol(symbol) !== "FOREX") return null;
  return { timeframe: "1m", words: "Spot FX history starts at one minute — no forex source keeps seconds bars." };
}
