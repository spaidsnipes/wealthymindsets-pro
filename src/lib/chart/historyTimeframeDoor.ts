/**
 * A SECONDS CHART ON SPOT FX HAS NO HISTORY TO SHOW (serving EURUSD 5s,
 * 2026-10-02 05:45 ET): the refusal note listed the vendors asked and stopped
 * there, leaving the trader on an empty canvas. No forex source WM reads keeps
 * seconds bars; history starts at one minute. This names that as a door to
 * the shortest timeframe with real candles — never a substitute painted under
 * the seconds label. PURE.
 */
import { classifySymbol } from "@/lib/marketData/symbolAssetClass";

export interface TimeframeDoor { readonly timeframe: string; readonly words: string }

export function historyTimeframeDoor(symbol: string, timeframe: string | null | undefined): TimeframeDoor | null {
  if (!/^\d+s$/i.test((timeframe ?? "").trim())) return null;
  const cls = classifySymbol(symbol);
  // A cash index is computed, not traded, and its history comes from one
  // minute up (serving SPX 5s, 2026-10-02 06:55 ET: four vendors, no bars).
  if (cls === "INDEX") return { timeframe: "1m", words: "Cash index history starts at one minute — no source keeps seconds bars for a computed index." };
  if (cls !== "FOREX") return null;
  // 1m spot FX is quote samples (no high/low published at that size — the
  // chart's own 1m note says so), so the door opens the first REAL candles.
  return { timeframe: "5m", words: "No forex source keeps seconds bars; spot FX candles with a real high and low start at 5m." };
}
