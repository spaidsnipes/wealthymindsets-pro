import { selectChartCloseLabel } from "../marketData/selectChartCloseLabel";

/**
 * TWO NUMBERS FOR ONE INSTRUMENT ON ONE SCREEN, BOTH WEARING THE LETTER "C".
 *
 * ── MEASURED LIVE ─────────────────────────────────────────────────────
 * 2026-09-17, https://wealthymindsetspro.com/charts, NQ1! 30m, ONE viewport,
 * read out of the DOM. Left panel, the Data Window:
 *
 *   heading "DATA WINDOW"
 *   O 29490.50   H 29575.50   L 29481.00   C 29558.25   V 24,105
 *   — every cell's `title` was the empty string.
 *
 * At the same instant, the OHLC strip six rows above it:
 *
 *   O 29700.25   H 29702.00   L 29696.50   C 29698.25   V 39
 *
 * and the header price, 29698.25, "Last price this header received from the
 * live quote provider".
 *
 * C 29558.25 and C 29698.25. One instrument, one instant, one hundred and
 * forty points apart, both labelled `C`. That is canon Weakness #1 — moat #1 —
 * stated as plainly as the product will ever state it. `V 24,105` against
 * `V 39` is the same defect in the volume row.
 *
 * ── THE PANEL WAS ALREADY HOLDING THE ANSWER ──────────────────────────
 * Neither number is wrong. The Data Window reports the bar under the CROSSHAIR;
 * the strip reports the bar at the right edge. What was missing is the only
 * thing that makes them stop competing: WHICH BAR. And `dataWindow.time` was
 * captured into state at the crosshair handler and then never rendered — the
 * scope existed and was dropped on the floor between the store and the pixel.
 *
 * So the heading stops being the furniture-word "DATA WINDOW" and becomes the
 * bar's identity. A reading that names its own bar cannot be mistaken for a
 * reading about a different one.
 *
 * ── AND `C` STILL HAS TO EARN THE WORD ────────────────────────────────
 * The crosshair can rest on the bar that is still forming, where `C` is the
 * same provenance overclaim `selectChartCloseLabel` was written to kill one
 * panel over: "this bar ended here", about a bar that ended nowhere. This owner
 * does not re-decide that question — it COMPOSES that selector. A second
 * opinion about whether a bar has closed is a second owner of the same truth,
 * and it would agree with the first only until someone edited one of them.
 *
 * ── WHAT IS NOT CLAIMED ───────────────────────────────────────────────
 * `isLatestBar` is REQUIRED, not inferred. This module is handed one bar; it
 * cannot see the series, and a module that guessed "probably the latest" would
 * be manufacturing the exact certainty the panel lacked in the first place.
 */

export interface DataWindowCell {
  /** The glyph in the left column. Unchanged except for C, which may read NOW. */
  readonly label: string;
  /** Hover text. Names the quantity in full AND the bar it belongs to. */
  readonly title: string;
}

export interface DataWindowBarScope {
  /** Replaces the furniture-word heading. Names the bar. */
  readonly heading: string;
  /** One line under the heading: which bar this is relative to the latest. */
  readonly subheading: string;
  /** Accessible name for the whole panel — the scope must not be hover-only. */
  readonly spoken: string;
  /** True when the crosshair bar is NOT the newest bar in the series. */
  readonly historical: boolean;
  readonly open: DataWindowCell;
  readonly high: DataWindowCell;
  readonly low: DataWindowCell;
  readonly close: DataWindowCell;
  readonly volume: DataWindowCell;
}

/**
 * Bar timestamps are SECONDS (the `OHLCVBar.time` / lightweight-charts
 * convention). `timeZone` is threaded through so tests are deterministic;
 * production passes nothing and gets the trader's own clock.
 */
function fmtBarTime(
  barOpenedAtSeconds: number | null | undefined,
  timeZone?: string,
): string | null {
  if (typeof barOpenedAtSeconds !== "number") return null;
  if (!Number.isFinite(barOpenedAtSeconds) || barOpenedAtSeconds <= 0) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    }).format(new Date(barOpenedAtSeconds * 1000));
  } catch {
    return null;
  }
}

/**
 * Pure. Every argument the verdict depends on is passed in — no `Date.now()`,
 * no series lookup — so the panel's scope is as testable as its numbers.
 */
export function dataWindowBarScope(
  barOpenedAtSeconds: number | null | undefined,
  timeframe: string | null | undefined,
  isLatestBar: boolean,
  nowMs?: number | null,
  timeZone?: string,
): DataWindowBarScope {
  const tf = (typeof timeframe === "string" ? timeframe.trim() : "") || "";
  const when = fmtBarTime(barOpenedAtSeconds, timeZone);
  const closeWord = selectChartCloseLabel(barOpenedAtSeconds, timeframe, nowMs);

  // The bar's name, used in every cell's hover so no cell can be read loose
  // from its bar. When the clock or the timestamp is missing we say so rather
  // than quietly emitting a heading that looks scoped and is not.
  const barName = when
    ? `${tf ? `${tf} bar` : "bar"} beginning ${when}`
    : `${tf ? `${tf} bar` : "bar"} at an unknown time`;

  const heading = when
    ? `${tf ? `${tf.toUpperCase()} BAR` : "BAR"} · ${when}`
    : tf
      ? `${tf.toUpperCase()} BAR · TIME UNKNOWN`
      : "BAR · TIME UNKNOWN";

  const historical = !isLatestBar;

  // Three genuinely different readings, and the panel must not blur them:
  // a historical bar, the newest bar still forming, and the newest bar closed.
  const subheading = historical
    ? "Bar under your cursor — NOT the latest bar"
    : closeWord.forming
      ? "Latest bar — still forming"
      : "Latest bar — closed";

  const scopeSentence = historical
    ? `These are the values of the ${barName}, which the cursor is resting on. ` +
      `They are NOT the latest price and will not match the header.`
    : closeWord.forming
      ? `These are the values of the ${barName}, which is the latest bar and has ` +
        `not closed yet.`
      : `These are the values of the ${barName}, which is the latest bar and has closed.`;

  // `note` exists because the first shipped version of this file read, LIVE:
  //
  //   "Volume — contracts, shares or coins traded, never currency of the
  //    30m bar beginning Sep 14, 00:00."
  //
  // The unit qualifier ran straight into the bar clause and produced "never
  // currency OF THE 30m bar" — which scopes the currency refusal to one bar,
  // saying something the module never meant and does not believe. Same lesson
  // as `selectEvidenceDeltaChip`'s denominator: A QUALIFIER IS AS
  // LOAD-BEARING AS THE NUMBER, and it has to survive the sentence it lands
  // in. Anything that is not a noun phrase now gets its own sentence, AFTER
  // the bar has been named.
  const cell = (label: string, quantity: string, note?: string): DataWindowCell => ({
    label,
    title:
      `${quantity} of the ${barName}.` +
      (note ? ` ${note}` : "") +
      ` ${scopeSentence}`,
  });

  return {
    heading,
    subheading,
    spoken: `Data window. ${subheading}. ${scopeSentence}`,
    historical,
    open: cell("O", "Open — the first traded price"),
    high: cell("H", "High — the highest traded price"),
    low: cell("L", "Low — the lowest traded price"),
    // Composed, never re-decided. `C` is a provenance claim, not an
    // abbreviation, and selectChartCloseLabel is the owner of that claim.
    close: {
      label: closeWord.label,
      title: `${closeWord.title} ${scopeSentence}`,
    },
    volume: cell(
      "V",
      "Volume — the quantity traded",
      "Measured in contracts, shares or coins; never currency.",
    ),
  };
}
