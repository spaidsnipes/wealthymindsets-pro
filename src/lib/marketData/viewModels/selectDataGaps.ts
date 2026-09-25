/**
 * DATA GAPS — canon plate "Fidelity Five, Not A Rainbow" (WM_NewMockup_136):
 * where the feed dropped bars, the chart says "‑ ‑ GAP ‑" at the hole instead
 * of letting two candles sit side by side as if nothing were missing.
 *
 * A gap is a hole INSIDE a session: consecutive bars further apart than
 * GAP_FACTOR × the median interval but not so far apart that the family's one
 * session splitter (sessionsByGap) calls it a session break. Session breaks
 * are the market closing, not the feed failing, and are never marked here.
 */
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import { medianInterval, SESSION_GAP_FACTOR } from "./sessionsByGap";

export const DATA_GAPS_VERSION = 1;
export const GAP_FACTOR = 1.5;
export const MAX_GAPS = 12;

export interface DataGap {
  /** Last bar before the hole, and first bar after it. */
  readonly fromTime: number;
  readonly toTime: number;
  readonly fromClose: number;
  readonly toOpen: number;
  /** Bars the feed should have delivered inside the hole. */
  readonly missing: number;
}

export interface DataGapsVM {
  readonly version: number;
  readonly reason: "MEASURED" | "TOO_FEW_BARS";
  readonly interval: number;
  readonly gaps: readonly DataGap[];
}

export function selectDataGaps(bars: readonly Pick<LegacyOhlcvTuple, "time" | "open" | "close">[] | null | undefined): DataGapsVM {
  const sorted = [...(bars ?? [])].filter(b => Number.isFinite(b.time)).sort((a, z) => a.time - z.time);
  if (sorted.length < 3) return { version: DATA_GAPS_VERSION, reason: "TOO_FEW_BARS", interval: 0, gaps: [] };
  const step = medianInterval(sorted.map(b => b.time));
  const gaps: DataGap[] = [];
  if (step > 0) {
    for (let i = 1; i < sorted.length; i++) {
      const dt = sorted[i].time - sorted[i - 1].time;
      if (dt > step * GAP_FACTOR && dt <= step * SESSION_GAP_FACTOR) {
        gaps.push({
          fromTime: sorted[i - 1].time, toTime: sorted[i].time,
          fromClose: sorted[i - 1].close, toOpen: sorted[i].open,
          missing: Math.max(1, Math.round(dt / step) - 1),
        });
      }
    }
  }
  return { version: DATA_GAPS_VERSION, reason: "MEASURED", interval: step, gaps: gaps.slice(-MAX_GAPS) };
}
