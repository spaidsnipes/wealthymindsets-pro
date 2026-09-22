export type InitialChartRange = "fit" | "latest";

/** Keep an ordinary session in view without crushing deep intraday history. */
export function initialChartRange({
  synthetic,
  intraday,
  intervalSec,
  barCount,
  barSpacing,
  viewportWidth,
}: {
  synthetic: boolean;
  intraday: boolean;
  intervalSec: number;
  barCount: number;
  barSpacing: number;
  viewportWidth: number;
}): InitialChartRange {
  if (synthetic) return "fit";
  if (!intraday) return "latest";

  // A complete one-minute RTH session is roughly 390 bars. Preserve the
  // session-wide opening view even when its natural slots exceed the pane.
  if (intervalSec <= 60 && barCount <= 400) return "fit";

  // Longer feeds (especially futures) can contain thousands of intraday bars.
  // Fitting all of them makes price and its attached readings illegible.
  return viewportWidth > 0 && barCount * barSpacing <= viewportWidth
    ? "fit"
    : "latest";
}
