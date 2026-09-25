/**
 * DATA GAPS — canon plate "Fidelity Five, Not A Rainbow" (WM_NewMockup_136):
 * where no bar arrived inside a session, the chart marks the hole instead of
 * letting two candles sit side by side as if they were consecutive.
 *
 * ── WHICH HOLES MAY BE MARKED ────────────────────────────────────────────────
 *
 * Only a hole INSIDE one session, and the spacing of bar times cannot tell a
 * hole from a close. On 1D equity bars a Fri→Mon weekend is exactly 3× the
 * weekday step and a mid-week holiday 2×; on 1h CME bars the 17:00–18:00 ET
 * halt is 2×. Any factor small enough to catch a dropped bar also catches the
 * market being shut, and any factor large enough to skip the close also skips
 * a real outage. So the session is never inferred from the gap. It is read
 * from what the bars themselves say:
 *
 *   • the instrument is continuous (24×7) — there is no session to close, so
 *     every hole is inside the one session, whatever its length; or
 *   • both neighbours carry the SAME KNOWN `sessionId` on their canonical
 *     identity. `SESSION_UNKNOWN` never matches, not even itself: two bars that
 *     do not know their session cannot be said to share one.
 *
 * An equity or futures chart whose ingress mints `SESSION_UNKNOWN` therefore
 * marks nothing and says why (`NO_SESSION_IDENTITY`), rather than guessing.
 *
 * ── WHAT THE MARK MAY SAY ────────────────────────────────────────────────────
 *
 * "NO BAR", never "missing" or "dropped". The candle feeds behind this chart
 * (Coinbase, Alpaca, the tick aggregator) emit no bar for an interval in which
 * nothing traded, so an empty interval is either a quiet market or a feed that
 * fell silent, and nothing on the bar says which. The count of empty intervals
 * is measured; the cause is withheld.
 *
 * PURE. DETERMINISTIC.
 */
import { isSessionKnown, type CanonicalBarIdentity, type LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import { medianInterval } from "./sessionsByGap";

export const DATA_GAPS_VERSION = 2;
export const GAP_FACTOR = 1.5;
export const MAX_GAPS = 12;

export interface DataGap {
  /** Last bar before the hole, and first bar after it. */
  readonly fromTime: number;
  readonly toTime: number;
  readonly fromClose: number;
  readonly toOpen: number;
  /** Whole bar intervals inside the hole in which no bar arrived. */
  readonly emptyIntervals: number;
  /** The words the glass prints at the hole. */
  readonly label: string;
}

export interface DataGapsVM {
  readonly version: number;
  readonly reason: "MEASURED" | "TOO_FEW_BARS" | "NO_SESSION_IDENTITY";
  readonly interval: number;
  readonly gaps: readonly DataGap[];
}

export interface DataGapsInput {
  readonly bars: readonly Pick<LegacyOhlcvTuple, "time" | "open" | "close">[] | null | undefined;
  /** The canonical identity sidecar; only `asOf` (ms) and `sessionId` are read. */
  readonly identities?: readonly Pick<CanonicalBarIdentity, "asOf" | "sessionId">[] | null;
  /** The instrument trades around the clock, so the window is one session. */
  readonly continuous: boolean;
}

export function dataGapLabel(emptyIntervals: number): string {
  return `NO BAR · ${emptyIntervals} ${emptyIntervals === 1 ? "interval" : "intervals"}`;
}

export function selectDataGaps(input: DataGapsInput): DataGapsVM {
  const sorted = (input.bars ?? [])
    .map(b => ({ time: Number(b.time), open: b.open, close: b.close }))
    .filter(b => Number.isFinite(b.time))
    .sort((a, z) => a.time - z.time);
  if (sorted.length < 3) return { version: DATA_GAPS_VERSION, reason: "TOO_FEW_BARS", interval: 0, gaps: [] };
  const step = medianInterval(sorted.map(b => b.time));

  // Renderer bar time is epoch SECONDS; identity asOf is epoch MILLISECONDS.
  const sessionAt = new Map<number, string>();
  for (const id of input.identities ?? []) {
    if (isSessionKnown(id.sessionId)) sessionAt.set(Math.floor(id.asOf / 1000), id.sessionId);
  }
  if (!input.continuous && sessionAt.size === 0) {
    return { version: DATA_GAPS_VERSION, reason: "NO_SESSION_IDENTITY", interval: step, gaps: [] };
  }
  const sameSession = (a: number, b: number) => {
    if (input.continuous) return true;
    const s = sessionAt.get(a);
    return s !== undefined && s === sessionAt.get(b);
  };

  const gaps: DataGap[] = [];
  if (step > 0) {
    for (let i = 1; i < sorted.length; i++) {
      const dt = sorted[i].time - sorted[i - 1].time;
      if (dt <= step * GAP_FACTOR || !sameSession(sorted[i - 1].time, sorted[i].time)) continue;
      const emptyIntervals = Math.max(1, Math.round(dt / step) - 1);
      gaps.push({
        fromTime: sorted[i - 1].time, toTime: sorted[i].time,
        fromClose: sorted[i - 1].close, toOpen: sorted[i].open,
        emptyIntervals, label: dataGapLabel(emptyIntervals),
      });
    }
  }
  return { version: DATA_GAPS_VERSION, reason: "MEASURED", interval: step, gaps: gaps.slice(-MAX_GAPS) };
}
