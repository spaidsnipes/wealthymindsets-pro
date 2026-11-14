/**
 * THE DELAYED CHART DOOR (Founder 2026-11-12, direct: "when people log in they see no candles — every signed-in member
 * must ALWAYS see candles, delayed when no broker is connected, clearly labelled DELAYED, and the live feed once they
 * connect a broker"). An amendment to the 2026-10-12 live-only order, for CHART HISTORY only:
 *   · asked only after every live door (the venue's own candles, then tastytrade) answered nothing;
 *   · the chart that draws these bars shows a DELAYED badge (MainChart `chart-delayed-badge`) for as long as it does;
 *   · nothing else reads it: quotes, tape, order tickets and every reading that needs live prints stay live-only.
 * The bars come from the server's public-history proxy (/api/yahoo), ~15 minutes behind for US futures and stocks.
 */
import type { LegacyOhlcvTuple } from "./canonicalBar";

export const DELAYED_CHART_SOURCE = "YAHOO_DELAYED" as const;

/**
 * The delayed public history has no SECONDS bars (the proxy answers 400 for 15s/30s): those sizes are not asked, and
 * the chart says so with the way out (pick 1m or higher, or connect a broker) instead of "no delayed bar source".
 */
export function delayedDoorServes(timeframe: string): boolean {
  return !/^\d+s$/i.test(timeframe.trim());
}
export const DELAYED_SECONDS_RULE = "delayed public bars start at 1 minute — pick 1m or higher for delayed candles, or connect a broker in Settings › Brokers for live seconds bars.";

export async function fetchDelayedChartBars<T>(
  symbol: string, timeframe: string, count: number, parse: (json: unknown, count: number) => T | null, signal?: AbortSignal,
): Promise<T | null> {
  if (!delayedDoorServes(timeframe)) return null;
  try {
    const r = await fetch(`/api/yahoo?sym=${encodeURIComponent(symbol)}&type=candles&tf=${encodeURIComponent(timeframe)}&bars=${count}`, { cache: "no-store", signal });
    if (!r.ok) return null;
    return parse(await r.json(), count);
  } catch { return null; }
}

export type { LegacyOhlcvTuple };
