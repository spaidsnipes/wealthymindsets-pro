/**
 * `15:01` SITTING TWO INCHES FROM `LAST 07:04 PM`. ONE IS A DURATION. ONE IS A CLOCK.
 *
 * ── MEASURED LIVE ─────────────────────────────────────────────────────
 * 2026-09-17, https://wealthymindsetspro.com/charts, NQ1! 30m, read out of
 * the DOM. The right end of the chart's top strip, as ONE string:
 *
 *   "...O 29699.50 H 29701.75 L 29699.50 NOW 29699.75 V 4  15:12  LAST 07:04 PM"
 *
 * `15:12` had no `title`, no `aria-label`, and no unit. Its only sibling was
 * `LAST 07:04 PM` — an actual wall-clock time. On a trading screen, `HH:MM`
 * with a colon in it IS a clock; `15:12` reads as 3:12 PM to every trader who
 * has ever looked at a time axis, and the time axis is directly below it.
 *
 * It is not a clock. It is `barEnd - now` — the seconds left in the bar that
 * is currently forming. Canon Weakness #1 in its general form: A NUMBER
 * WEARING ANOTHER QUANTITY'S CLOTHES. The cure is the same one the rest of
 * this chart already uses — THE UNIT TRAVELS WITH THE READING. `15m 01s`
 * cannot be read as 3:01 PM. `15:01` always can.
 *
 * ── THE SECOND CLAIM, WHICH IS THE LOAD-BEARING ONE ───────────────────
 * The arithmetic is `Math.floor(now / sec) * sec + sec - now`. It consults
 * the wall clock and the timeframe, and NOTHING ELSE. It never asks whether
 * the bars on the screen are still arriving.
 *
 * So on a stale or delayed feed the strip counts confidently down to zero —
 * and at zero, nothing happens, because the candle the trader is watching is
 * not the candle the clock is describing. The countdown was never a statement
 * about wall-clock time; a trader reads it as "time until the bar I am
 * looking at completes", and that reading is false the moment the tape stops.
 *
 * THE EVIDENCE WAS ALREADY IN THE ROOM, ONE ELEMENT AWAY. The data-truth
 * strip immediately to its right had already compiled `candleDataStatus(...)`
 * and was already rendering LIVE / DELAYED / STALE / HISTORICAL. The
 * countdown simply never asked it. This owner does not re-derive that
 * verdict — `feedLive` is REQUIRED and threaded in from that same call, so
 * the countdown can never disagree with the badge beside it.
 *
 * ── WHAT IS NOT WITHHELD ──────────────────────────────────────────────
 * §35 PROTECTED TRUTH: the remaining time is ALWAYS rendered. Blanking the
 * countdown on a degraded feed would trade an overclaim for a blindness,
 * which is the same family of defect. What changes is the SENTENCE around
 * it: on a live feed the number is about the bar you are watching; on a
 * degraded feed the number is about the clock only, and says so.
 */

import type { CandleDataStatus } from "../priceSource";

export type BarCountdownKind =
  /** Tape is flowing: the number is the bar on screen. */
  | "LIVE_BAR"
  /** Clock is running but the screen's bar is not tracking it. */
  | "CLOCK_ONLY"
  /** The interval or the remainder is not a number WM can stand behind. */
  | "UNKNOWN"
  /**
   * The market is PROVEN closed: no bar is forming, so there is nothing to
   * count down to. Measured on serving, Friday 23:39 ET, NQ1! 1h: "0h 20m 51s"
   * ticked beside "MARKET CLOSED" toward a bar due Sunday evening.
   */
  | "MARKET_CLOSED";

export interface BarCountdown {
  /** The visible glyph. NEVER a bare `HH:MM` — the unit travels with it. */
  readonly glyph: string;
  readonly kind: BarCountdownKind;
  /** Hover text. Names the quantity, the bar, and — when degraded — why. */
  readonly title: string;
  /** Accessible name, so the countdown is not a hover-only reading. */
  readonly spoken: string;
  /** The final seconds of a LIVE bar. False on every degraded reading. */
  readonly closing: boolean;
}

/** The last few seconds of a forming bar, where a trader's attention matters. */
export const CLOSING_WINDOW_SECONDS = 5;

function fin(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * The whole point of this function: no output may be parseable as a clock
 * time. Sub-minute intervals already read `12s`; everything above gets an
 * explicit `m` and `h`, never a colon.
 */
function glyphFor(remaining: number, intervalSeconds: number): string {
  const r = Math.max(0, Math.ceil(remaining));
  if (intervalSeconds < 60) return `${r}s`;
  const s = r % 60;
  if (intervalSeconds < 3600) {
    return `${Math.floor(r / 60)}m ${String(s).padStart(2, "0")}s`;
  }
  return (
    `${Math.floor(r / 3600)}h ` +
    `${String(Math.floor((r % 3600) / 60)).padStart(2, "0")}m ` +
    `${String(s).padStart(2, "0")}s`
  );
}

/** "30m" from 1800, "1h" from 3600 — for naming the bar in prose. */
function intervalName(intervalSeconds: number): string {
  if (intervalSeconds < 60) return `${intervalSeconds}-second`;
  if (intervalSeconds < 3600) return `${Math.round(intervalSeconds / 60)}-minute`;
  if (intervalSeconds < 86_400) return `${Math.round(intervalSeconds / 3600)}-hour`;
  return `${Math.round(intervalSeconds / 86_400)}-day`;
}

/**
 * Pure. `feedLive` is REQUIRED and must be threaded from the same
 * {@link CandleDataStatus} the badge beside the countdown renders — this
 * module owns the WORDING of the remaining time, never the verdict about
 * whether the tape is flowing.
 *
 * `feedLabel` is the badge's own visible label (e.g. "DELAYED",
 * "HISTORICAL ONLY"); it is quoted back so the hover points at the reading
 * already on screen instead of inventing a second name for it.
 */
export function chartBarCountdown(
  remainingSeconds: number | null | undefined,
  intervalSeconds: number | null | undefined,
  feedLive: boolean,
  feedLabel?: string | null,
  /** True ONLY on `provenSessionClosure(...) === false` — never inferred here. */
  sessionProvenClosed = false,
): BarCountdown {
  if (sessionProvenClosed) {
    return {
      kind: "MARKET_CLOSED",
      glyph: "CLOSED",
      closing: false,
      title:
        "The market is closed on its own published hours, so no bar is forming " +
        "and there is no close to count down to. The countdown returns when the " +
        "session does.",
      spoken: "Market closed; no bar is forming",
    };
  }
  const interval = fin(intervalSeconds);
  const remaining = fin(remainingSeconds);

  // A countdown with no interval is not "zero seconds left" — it is no
  // reading at all, and the two must not wear the same glyph.
  if (interval == null || interval <= 0 || remaining == null || remaining < 0) {
    return {
      kind: "UNKNOWN",
      glyph: "—",
      closing: false,
      title:
        "Time remaining in the forming bar is UNKNOWN: WM does not have a " +
        "bar interval it can stand behind, so it will not count down to a " +
        "close it cannot locate.",
      spoken: "Bar close countdown unavailable",
    };
  }

  const glyph = glyphFor(remaining, interval);
  const bar = `${intervalName(interval)} bar`;

  if (!feedLive) {
    const badge = (typeof feedLabel === "string" ? feedLabel.trim() : "") || "not live";
    return {
      kind: "CLOCK_ONLY",
      glyph,
      // A degraded feed has no "moment of truth" to flash for. Highlighting
      // the last seconds would be an urgency claim about a bar that is not
      // arriving.
      closing: false,
      title:
        `${glyph} of wall-clock time is left in the current ${bar} interval. ` +
        `This is a statement about the CLOCK ONLY — the candle feed is ` +
        `"${badge}", so the bar drawn on this chart is not tracking that ` +
        `interval and will not complete when this reaches zero.`,
      spoken:
        `${glyph} left in the ${bar} interval by the clock. The candle feed is ` +
        `${badge}, so the bar on screen is not tracking it.`,
    };
  }

  const closing = remaining > 0 && remaining <= CLOSING_WINDOW_SECONDS;
  return {
    kind: "LIVE_BAR",
    glyph,
    closing,
    title:
      `${glyph} until the ${bar} now forming on this chart closes. This is a ` +
      `DURATION, not a time of day. Live ticks are flowing, so this bar is ` +
      `tracking the interval.`,
    spoken: `${glyph} until the ${bar} closes`,
  };
}
