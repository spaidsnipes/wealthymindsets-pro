import { FAR_MIN } from "@/lib/marketData/viewModels/selectSemanticZoom";
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

  // A complete one-minute RTH session is roughly 390 bars — which is FAR depth
  // (FAR_MIN 300): the room opened zoomed out, where the semantic-permission
  // table silences absorption, exhaustion, stacks, footprint and bubbles, so
  // the Smart Money tools never showed at load (Founder 2026-10-04: "nothing
  // on the chart"). The session is fitted only while that keeps the camera
  // under FAR; a longer one opens on its newest bars at the natural spacing
  // (MID, ~120 bars) and Reset View still fits the whole session.
  if (intervalSec <= 60 && barCount <= 400) return barCount < FAR_MIN ? "fit" : "latest";

  // Longer feeds (especially futures) can contain thousands of intraday bars.
  // Fitting all of them makes price and its attached readings illegible.
  return viewportWidth > 0 && barCount * barSpacing <= viewportWidth
    ? "fit"
    : "latest";
}
