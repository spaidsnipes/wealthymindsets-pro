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
 *   • the bars carry no session, but the instrument's MARKET CLOCK does —
 *     `sessionWindow`'s published definition for its class (US equity RTH or
 *     ETH per the chart's own mode, the Globex day, the CBOT grain and CME
 *     livestock hours, the FX day). Both neighbours must fall in the same
 *     clock session, and only the empty intervals that are themselves INSIDE
 *     that session are counted: a hole that spans only a scheduled break
 *     (wheat's 08:45–09:30 ET pause) counts zero and is not marked.
 *
 * WHY THE CLOCK IS NOT A GUESS (2026-09-25). Measured on serving, every
 * non-crypto market — AAPL, SPY, ES1!, CL1!, GC1!, NQ1!, USDJPY — read
 * `NO_SESSION_IDENTITY`: Yahoo, Alpaca and Finnhub ingress honestly mint
 * `SESSION_UNKNOWN`, so no in-session hole was ever marked on any of them.
 * The rule above forbids INFERRING a session from bar spacing; a published
 * exchange clock is not an inference, it is the definition the Session
 * Profile already draws by. It cannot manufacture a false hole at a close:
 * a weekend, overnight, holiday or early close puts the two neighbours in
 * DIFFERENT clock sessions (or in none), and only a same-session pair is
 * ever marked. What it cannot know — a mid-session exchange halt — is a real
 * interval in which no bar arrived, which is exactly what "NO BAR" says.
 *
 * Only a chart with neither (daily bars, where each bar IS a session and a
 * missing weekday cannot be told from a holiday without a calendar; or an
 * unclassifiable symbol) marks nothing and says why (`NO_SESSION_IDENTITY`).
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
import { sessionKeyOf, type SessionWindow } from "@/lib/marketData/sessionWindow";
import { medianInterval } from "./sessionsByGap";

export const DATA_GAPS_VERSION = 3;
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
  /**
   * Where "the same session" was read from — the receipt's answer to "why
   * may this chart mark holes at all". `null` when it may not.
   */
  readonly sessionSource: "CONTINUOUS" | "BAR_IDENTITY" | "MARKET_CLOCK" | null;
}

export interface DataGapsInput {
  readonly bars: readonly Pick<LegacyOhlcvTuple, "time" | "open" | "close">[] | null | undefined;
  /** The canonical identity sidecar; only `asOf` (ms) and `sessionId` are read. */
  readonly identities?: readonly Pick<CanonicalBarIdentity, "asOf" | "sessionId">[] | null;
  /** The instrument trades around the clock, so the window is one session. */
  readonly continuous: boolean;
  /**
   * The instrument's published session clock (`sessionWindowFor`), used for
   * bars whose identity does not know its session. A daily window or the
   * continuous ET day is not a venue session and is never used.
   */
  readonly sessionClock?: SessionWindow | null;
}

/** Longest hole whose in-session intervals are counted one by one. */
const MAX_COUNTED_INTERVALS = 5_000;

export function dataGapLabel(emptyIntervals: number): string {
  return `NO BAR · ${emptyIntervals} ${emptyIntervals === 1 ? "interval" : "intervals"}`;
}

export function selectDataGaps(input: DataGapsInput): DataGapsVM {
  const sorted = (input.bars ?? [])
    .map(b => ({ time: Number(b.time), open: b.open, close: b.close }))
    .filter(b => Number.isFinite(b.time))
    .sort((a, z) => a.time - z.time);
  if (sorted.length < 3) return { version: DATA_GAPS_VERSION, reason: "TOO_FEW_BARS", interval: 0, gaps: [], sessionSource: null };
  const step = medianInterval(sorted.map(b => b.time));

  // Renderer bar time is epoch SECONDS; identity asOf is epoch MILLISECONDS.
  const sessionAt = new Map<number, string>();
  for (const id of input.identities ?? []) {
    if (isSessionKnown(id.sessionId)) sessionAt.set(Math.floor(id.asOf / 1000), id.sessionId);
  }
  const clock = input.sessionClock
    && input.sessionClock.kind !== "DAILY_WINDOW"
    && input.sessionClock.kind !== "CONTINUOUS_ET_DAY"
    ? input.sessionClock : null;
  const sessionSource: DataGapsVM["sessionSource"] =
    input.continuous ? "CONTINUOUS" : sessionAt.size > 0 ? "BAR_IDENTITY" : clock ? "MARKET_CLOCK" : null;
  if (sessionSource === null) {
    return { version: DATA_GAPS_VERSION, reason: "NO_SESSION_IDENTITY", interval: step, gaps: [], sessionSource };
  }
  // A bar's own known session wins; the market clock answers only for bars
  // that do not know theirs. The CLOCK: prefix keeps the two namespaces from
  // ever comparing equal, so a mixed pair is never called one session.
  // Resolved lazily — only for the few pairs spaced wide enough to be a hole.
  const clockKey = (t: number): string | null => {
    if (!clock) return null;
    const k = sessionKeyOf(t, clock);
    return k === null ? null : `CLOCK:${k}`;
  };
  const sessionOf = (t: number): string | null => sessionAt.get(t) ?? clockKey(t);

  const gaps: DataGap[] = [];
  if (step > 0) {
    for (let i = 1; i < sorted.length; i++) {
      const dt = sorted[i].time - sorted[i - 1].time;
      if (dt <= step * GAP_FACTOR) continue;
      let emptyIntervals = Math.max(1, Math.round(dt / step) - 1);
      if (!input.continuous) {
        const from = sorted[i - 1].time;
        const s = sessionOf(from);
        if (s === null || s !== sessionOf(sorted[i].time)) continue;
        // Both ends on the market clock: count only the empty intervals that
        // are themselves inside that session. A hole made only of a scheduled
        // break is no hole.
        if (s.startsWith("CLOCK:") && emptyIntervals <= MAX_COUNTED_INTERVALS) {
          let inSession = 0;
          for (let k = 1; k <= emptyIntervals; k++) {
            if (clockKey(from + k * step) === s) inSession++;
          }
          if (inSession === 0) continue;
          emptyIntervals = inSession;
        }
      }
      gaps.push({
        fromTime: sorted[i - 1].time, toTime: sorted[i].time,
        fromClose: sorted[i - 1].close, toOpen: sorted[i].open,
        emptyIntervals, label: dataGapLabel(emptyIntervals),
      });
    }
  }
  return { version: DATA_GAPS_VERSION, reason: "MEASURED", interval: step, gaps: gaps.slice(-MAX_GAPS), sessionSource };
}
