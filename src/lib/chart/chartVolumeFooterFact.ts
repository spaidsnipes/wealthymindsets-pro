/**
 * THE VOLUME FIGURE THAT SHARES THE FOOTER BAND WITH THE TIMEFRAME CHIP.
 *
 * CANON. Frame F24 of the Visual Systems Execution Canon was opened and LOOKED
 * AT at 1440 on 2026-09-21, side by side with this build. Its candle pane has
 * exactly two things below the time axis, in one clear footer strip:
 *
 *     Vol 68.92M                        [ 1D ]
 *     ^ bottom-left                     ^ bottom-centre
 *
 * The chip half of that strip shipped in `TimeframeGlassChip.tsx`, which
 * RESERVED `TIMEFRAME_FOOTER_H` = 34px of pane floor so the chart could not
 * draw over the axis. That reservation bought a full-pane-width band and then
 * used only the middle of it. F24 uses the left of it too. This is the left.
 *
 * WHY IT IS A MOVE AND NOT AN ADDITION. The figure already exists on the glass
 * — it is the `V 1,234` cell at the end of the floating O/H/L/C price legend in
 * the pane's top-left. F24's legend carries O H L C and the change, and NO
 * volume; the volume is downstairs. Rendering it in both places would be two
 * owners of one number, which is precisely the failure mode that made the
 * `NO FEED` pill appear twice on this chart in two different DOM nodes. So
 * exactly one of the two renders it, chosen by one boolean, and that boolean is
 * the same condition that decides whether the band exists at all.
 *
 * THE DEFECT THIS FILE EXISTS TO AVOID, found before shipping rather than after.
 * The obvious implementation is to reuse `formatVolumeMagnitude` from
 * `stockInfoSessionFacts.ts`. Its last line is:
 *
 *     return (n / 1e3).toFixed(0) + "K";
 *
 * That function was written for DAILY EQUITY TURNOVER, where the sub-1000 case
 * is unreachable. This band renders the LATEST BAR on any timeframe, and a 5m
 * NQ bar routinely trades 57 contracts. `formatVolumeMagnitude(57)` returns
 * `"0K"` — a manufactured zero, printed with the confident air of a measurement,
 * on the primary trading surface. It would have read as "no volume traded" when
 * 57 contracts did. The magnitude rule is therefore composed only ABOVE its
 * valid domain, and below 1000 the count is printed exactly, because at that
 * size the exact count is both shorter and true.
 *
 * PURE — no clock, no I/O, no React. `barScopeTitle` is passed in rather than
 * recomputed so this figure and the Data Window can never disagree about which
 * bar they are describing: `dataWindowBarScope` remains the single owner of
 * that sentence.
 */

import { formatVolumeMagnitude } from "@/lib/chart/stockInfoSessionFacts";

export type ChartVolumeFooterState =
  /** WM has a usable quantity for the bar. */
  | "OBSERVED"
  /** WM has the bar; the bar did not carry a usable volume. */
  | "NOT_REPORTED";

export interface ChartVolumeFooterFact {
  /** What the band prints. Never a bare glyph, never an empty string. */
  readonly text: string;
  readonly state: ChartVolumeFooterState;
  /** Carried on `title` and `aria-label` — names the bar and the unit. */
  readonly title: string;
}

/**
 * Format a bar's traded quantity for a 34px band.
 *
 * Exported separately from the fact so the magnitude boundaries are directly
 * testable, and so the sub-1000 rule above has a name to be asserted against.
 */
export function formatBarVolume(n: number): string {
  // Below the magnitude rule's valid domain: print the count. `1e3` is the
  // exact threshold at which `formatVolumeMagnitude`'s "K" branch starts
  // telling the truth, so this is a seam, not an overlap.
  if (n < 1e3) return String(n);
  return formatVolumeMagnitude(n);
}

/**
 * @param volume  the latest bar's traded quantity, as the feed reported it
 * @param barScopeTitle  `dataWindowBarScope(...).volume.title` — the sentence
 *   that names WHICH bar this is and what the unit means. Passed in, never
 *   re-derived here.
 */
export function chartVolumeFooterFact(
  volume: unknown,
  barScopeTitle: string,
): ChartVolumeFooterFact {
  // A bar can legitimately trade zero, so zero is OBSERVED and prints as `0`.
  // What is not usable is a non-number, a NaN, an infinity, or a negative
  // quantity — none of those is a count of anything, and rendering `NaN` or
  // `-1` beside the word "Vol" would be the band asserting a measurement it
  // does not have.
  const usable =
    typeof volume === "number" && Number.isFinite(volume) && volume >= 0;

  if (!usable) {
    return {
      state: "NOT_REPORTED",
      // Says what happened, not what is absent. "—" would leave the trader to
      // guess between "no trades" and "no data", which are opposite readings.
      text: "Vol not reported",
      title: `This bar did not carry a traded quantity. ${barScopeTitle}`,
    };
  }

  return {
    state: "OBSERVED",
    text: `Vol ${formatBarVolume(volume)}`,
    title: barScopeTitle,
  };
}
