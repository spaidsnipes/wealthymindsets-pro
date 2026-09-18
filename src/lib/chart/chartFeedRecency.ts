/**
 * `LAST 07:23 PM` — THE SAME NUMBER MEANS "PERFECTLY FRESH" OR "ELEVEN MINUTES
 * DEAD", AND THE PRODUCT DOES NOT SAY WHICH.
 *
 * ── MEASURED LIVE ─────────────────────────────────────────────────────
 * 2026-09-17, https://wealthymindsetspro.com/charts, NQ1! 30m, read out of
 * the DOM in ONE pass:
 *
 *   visible glyph   : "LAST 07:23 PM"
 *   wrapper title   : "Candles: delayed · session RTH · last bar 07:23 PM
 *                      · no real-time candle claim"
 *   countdown       : "25m 04s" of a 30-minute interval
 *   wall clock then : 7:34:56 PM
 *
 * ── DEFECT ONE: THE WORD NAMES NO VERB ────────────────────────────────
 * `07:23 PM` is `candles[last].time`. Throughout this codebase that field is
 * the instant a bar OPENED — `dataWindowBarScope` renders it as "bar
 * beginning", and the countdown's arithmetic (`floor(now/sec)*sec`) is built
 * on the same convention.
 *
 * "LAST", in the freshness slot of a trading screen, is read as "the most
 * recent thing that happened". An OPENING time is the opposite end of the
 * bar from that. The hover does not rescue it: "last bar 07:23 PM" supplies
 * no verb either — opened at, closed at, or last updated at are three
 * different claims and the product picks none of them.
 *
 * ── DEFECT TWO, WHICH IS THE LOAD-BEARING ONE ─────────────────────────
 * Even read correctly, a bar-open time cannot answer the question this slot
 * exists to answer. Suppose the newest bar opened twelve minutes ago:
 *
 *   on a 30m chart — that bar is the one CURRENTLY FORMING. Nothing is
 *                    wrong. The feed is exactly where it should be.
 *   on a 1m chart  — the screen is ELEVEN BARS BEHIND. The tape is dead.
 *
 * SAME NUMBER. OPPOSITE VERDICTS. An absolute timestamp is not a staleness
 * reading and cannot be converted into one by the trader squinting at it,
 * because the conversion needs the interval — which lives somewhere else on
 * the screen — and a subtraction against a wall clock that is not rendered
 * here at all. The product holds every ingredient and hands over none of the
 * meaning.
 *
 * So this owner reports AGE IN BARS, not age in minutes: the same
 * dimensionless-over-absolute rule the rest of this chart already follows,
 * for the same reason — a threshold in seconds is a different claim on every
 * timeframe, and would have to be re-tuned per timeframe forever.
 *
 * ── WHAT IS NOT WITHHELD ──────────────────────────────────────────────
 * §35 PROTECTED TRUTH: the absolute timestamp is ALWAYS rendered when it
 * exists. Replacing a clock with a verdict would trade one blindness for
 * another. The timestamp keeps its place; what is ADDED is the verb that
 * says what it is, and the verdict the trader was being asked to compute.
 *
 * ── WHAT IS NOT CLAIMED ───────────────────────────────────────────────
 * This module never says the feed is healthy. `candleDataStatus` owns that
 * verdict and renders it in the same badge. "The newest bar is the forming
 * one" is a statement about ARITHMETIC — where this bar sits relative to the
 * clock — not a certification that ticks are arriving. A module that said
 * "LIVE" from a timestamp alone would be manufacturing a second, weaker
 * opinion about the exact thing the badge beside it already decides.
 */

export type FeedRecencyKind =
  /** The newest bar is the one the clock says should be forming right now. */
  | "CURRENT_BAR"
  /** At least one whole bar should have opened since, and none did. */
  | "BARS_BEHIND"
  /** No timestamp, no interval, or a bar stamped in the future. */
  | "UNKNOWN";

export interface FeedRecency {
  /** Visible glyph. Always names the VERB, never a bare `LAST hh:mm`. */
  readonly glyph: string;
  readonly kind: FeedRecencyKind;
  /** Hover text. Names the quantity, the convention, and the verdict. */
  readonly title: string;
  /** Accessible name — the verdict must not be hover-only. */
  readonly spoken: string;
  /**
   * Whole bars that should have opened since the newest one did. `0` while
   * the newest bar is the forming bar. `null` when unknown — never `0` as a
   * stand-in for "we could not tell", which is the same overclaim in a
   * number's clothes.
   */
  readonly barsBehind: number | null;
}

function fin(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Bar timestamps are SECONDS. `timeZone` is threaded so tests are deterministic. */
function fmtClock(seconds: number, timeZone?: string): string | null {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone,
    }).format(new Date(seconds * 1000));
  } catch {
    return null;
  }
}

const UNKNOWN = (why: string): FeedRecency => ({
  kind: "UNKNOWN",
  glyph: "NEWEST BAR — TIME UNKNOWN",
  barsBehind: null,
  title:
    `WM cannot say how far behind this chart is: ${why} So it will not ` +
    `render a freshness reading it cannot support, and it will not pass off ` +
    `a timestamp as one.`,
  spoken: "Newest bar time unknown",
});

/**
 * Pure. Every input the verdict depends on is passed in — no `Date.now()`,
 * no series lookup.
 *
 * `barOpenedAtSeconds` is `candles[last].time`: the instant the NEWEST bar
 * OPENED, per this codebase's convention throughout.
 */
export function chartFeedRecency(
  barOpenedAtSeconds: number | null | undefined,
  intervalSeconds: number | null | undefined,
  nowMs: number | null | undefined,
  timeZone?: string,
): FeedRecency {
  const opened = fin(barOpenedAtSeconds);
  const interval = fin(intervalSeconds);
  const now = fin(nowMs);

  if (opened == null || opened <= 0) return UNKNOWN("no bar timestamp has arrived.");
  if (interval == null || interval <= 0) {
    return UNKNOWN("it has no bar interval to measure the gap against.");
  }
  if (now == null || now <= 0) return UNKNOWN("it has no clock to measure against.");

  const clock = fmtClock(opened, timeZone);
  if (clock == null) return UNKNOWN("the bar timestamp could not be read as a time.");

  const ageSeconds = now / 1000 - opened;

  // A bar stamped in the future is not "zero bars behind" — it is a record WM
  // does not understand, and saying "current" about it would be a guess
  // wearing a verdict's clothes.
  if (ageSeconds < 0) {
    return UNKNOWN(
      `the newest bar is stamped ${clock}, which is in the future against ` +
        `this clock.`,
    );
  }

  const barsBehind = Math.floor(ageSeconds / interval);

  if (barsBehind === 0) {
    return {
      kind: "CURRENT_BAR",
      glyph: `BAR OPENED ${clock} · FORMING`,
      barsBehind: 0,
      title:
        `The newest bar on this chart OPENED at ${clock}. That is an OPENING ` +
        `time, not a last-update time. Less than one full interval has ` +
        `elapsed since, so this bar is the one the clock says should be ` +
        `forming right now and the chart is not behind. This is arithmetic ` +
        `about the bar's position only — whether ticks are actually arriving ` +
        `is the feed badge's claim, not this reading's.`,
      spoken: `Newest bar opened ${clock} and is the bar currently forming.`,
    };
  }

  const plural = barsBehind === 1 ? "BAR" : "BARS";
  return {
    kind: "BARS_BEHIND",
    glyph: `BAR OPENED ${clock} · ${barsBehind} ${plural} BEHIND`,
    barsBehind,
    title:
      `The newest bar on this chart OPENED at ${clock}. That is an OPENING ` +
      `time, not a last-update time. ${barsBehind} whole ` +
      `${barsBehind === 1 ? "bar" : "bars"} should have opened since then and ` +
      `${barsBehind === 1 ? "has" : "have"} not, so what you are looking at is ` +
      `BEHIND the clock by that much. Bars, not minutes: the same gap is ` +
      `normal on one timeframe and dead on another, so minutes alone would ` +
      `not tell you which this is.`,
    spoken:
      `Newest bar opened ${clock}. This chart is ${barsBehind} ` +
      `${barsBehind === 1 ? "bar" : "bars"} behind.`,
  };
}
