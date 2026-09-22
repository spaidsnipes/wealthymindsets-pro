/**
 * THE CAMERA MUST NOT MOVE WHEN THE ROOM DOES.
 *
 * ── The defect this exists to prevent ────────────────────────────────────────
 *
 * The instrument view is being rebuilt so the candle chart takes ~70% of the
 * floor, and the right-hand equipment panel REFLOWS the chart into a narrower
 * column instead of overlaying it. That means a trader can change the chart's
 * pixel width by opening Tools.
 *
 * lightweight-charts 5.2.0 does NOT hold the visible bars across a width
 * change. Read its own `TimeScale._internal_setWidth` (dist, line ~6097): with
 * `lockVisibleTimeRangeOnResize: false` — which is what this chart ships — the
 * bar spacing is kept and the visible span is recomputed from the new width, so
 * the LEFT edge of the trader's view slides. With the flag `true` it instead
 * rescales bar spacing. Either way the picture the trader was reading changes
 * underneath them at the exact moment they reached for a tool. On a market
 * surface that is not a cosmetic jump; it is the surface lying about which
 * stretch of price action is being studied.
 *
 * ── Why LOGICAL range and not time range ─────────────────────────────────────
 *
 * `getVisibleRange()` speaks in timestamps, and timestamps do not survive a
 * width change cleanly — the scale re-derives which bars land where, and a
 * time-keyed restore has to round back onto bar boundaries. The logical range
 * is fractional BAR INDICES, which is the same currency the time scale itself
 * uses internally (`_internal_setVisibleRange` takes a bar-index range and
 * derives bar spacing as `width / count`). Restoring in the scale's own
 * currency is exact.
 *
 * ── Why this decision is a PURE FUNCTION and not an `if` inside the component ─
 *
 * There are at least six ways a restore can be dishonest, and every one of them
 * is arithmetic the library will silently swallow. `setVisibleLogicalRange` does
 * not reject a range it cannot honour — it clamps (`_private__correctBarSpacing`
 * at ~6526, `_private__correctOffset` at ~6574) and leaves you with a view that
 * is NOT the one you asked for, with no error and no return value. A component
 * that called the setter and moved on would report "camera preserved" while
 * showing something else. So the clamps are modelled here, in the open, where
 * they can be tested — and when the requested camera cannot be honoured, this
 * module says STAND DOWN rather than emitting a range that would be quietly
 * bent into a different one.
 *
 * Standing down is not a failure mode that hides. It means: do not call the
 * setter at all, leave the library's own resize result on screen, and tell the
 * caller in words why the camera could not be held. A bent restore and an
 * un-restored chart look identical to the eye; only one of them is honest about
 * what happened.
 *
 * ── WHAT IS NOT CLAIMED ──────────────────────────────────────────────────────
 *
 * This module does not observe anything. It is handed a before-picture and an
 * after-width and returns a plan. It cannot tell whether the plan was applied,
 * whether it landed, or whether the library re-fitted afterwards. That is the
 * keeper's job (`chartCameraKeeper.ts`), and the keeper MEASURES the result by
 * reading the range back rather than assuming the setter won.
 */

/** Fractional bar indices, exactly as `ITimeScaleApi.getVisibleLogicalRange()` returns. */
export interface ChartLogicalRange {
  readonly from: number;
  readonly to: number;
}

/**
 * `Constants.MinVisibleBarsCount` in lightweight-charts 5.2.0 — the number of
 * bars the time scale refuses to let you scroll off the pane entirely. It is a
 * private constant with no accessor, so it is restated here WITH its provenance
 * rather than silently duplicated: if a future version changes it, the
 * `scrolled-past-*` verdicts below become conservative, never wrong-and-quiet.
 */
export const LWC_MIN_VISIBLE_BARS = 2;

export type CameraStandDownReason =
  /** No usable "before" picture — nothing to preserve. */
  | "no-prior-camera"
  /** The resize did not change the width (height-only, or a no-op). */
  | "width-unchanged"
  /** A width of zero or a non-finite number. Nothing can be computed from it. */
  | "width-unmeasurable"
  /** Bars were added or removed while the width changed; indices no longer mean the same bars. */
  | "series-changed"
  /** The series is too short for the scale to hold any camera at all. */
  | "series-too-short"
  /** Holding the same bars would need bar spacing BELOW `minBarSpacing`; the scale would clamp. */
  | "wider-than-the-scale-allows"
  /** Holding the same bars would need bar spacing ABOVE `maxBarSpacing`; the scale would clamp. */
  | "tighter-than-the-scale-allows"
  /** The view sits further into the past than the scale permits at the new width. */
  | "scrolled-past-the-first-bar"
  /** The view sits further into the future than the scale permits at the new width. */
  | "scrolled-past-the-last-bar";

export interface CameraRestorePlan {
  readonly action: "restore";
  /** Pass this straight to `timeScale().setVisibleLogicalRange()`. */
  readonly range: ChartLogicalRange;
  /**
   * The bar spacing the scale will derive from this range at the new width
   * (`width / count`, per `_internal_setVisibleRange`). Reported so a caller can
   * show the trader that the SAME bars are now drawn narrower — which is the
   * honest consequence of preserving the camera into a smaller column.
   */
  readonly barSpacing: number;
}

export interface CameraStandDownPlan {
  readonly action: "stand-down";
  readonly reason: CameraStandDownReason;
  /** Plain words. Safe to surface to a human; never blames the trader. */
  readonly spoken: string;
}

export type CameraResizePlan = CameraRestorePlan | CameraStandDownPlan;

export interface CameraResizeInput {
  /** The visible logical range read BEFORE the library applied the new width. */
  readonly priorRange: ChartLogicalRange | null | undefined;
  /** The width the time scale was last settled at, in CSS pixels. */
  readonly priorWidth: number;
  /** The width the container has just become, in CSS pixels. */
  readonly nextWidth: number;
  /** Bar count at capture time. */
  readonly priorBarCount: number;
  /** Bar count now. */
  readonly nextBarCount: number;
  /** `timeScale().options().minBarSpacing`. */
  readonly minBarSpacing: number;
  /**
   * `timeScale().options().maxBarSpacing`. Zero or absent means "unset", and
   * the library then uses half the pane width (`_private__maxBarSpacing`).
   */
  readonly maxBarSpacing?: number | null;
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function standDown(reason: CameraStandDownReason, spoken: string): CameraStandDownPlan {
  return { action: "stand-down", reason, spoken };
}

/**
 * Pure. Given the camera before a width change and the width after it, decide
 * the range to restore — or refuse, in words.
 *
 * Order of the checks is deliberate: the cheapest and most common no-ops first
 * (height-only resizes fire constantly), then the honesty gates, so a refusal
 * always carries the MOST specific reason that applies rather than the first
 * one that happened to be tested.
 */
export function planCameraRestore(input: CameraResizeInput): CameraResizePlan {
  const { priorWidth, nextWidth, priorBarCount, nextBarCount } = input;

  if (!isFiniteNumber(priorWidth) || !isFiniteNumber(nextWidth) || priorWidth <= 0 || nextWidth <= 0) {
    return standDown(
      "width-unmeasurable",
      "The chart had no measurable width before or after this change, so there was no camera to carry across.",
    );
  }

  if (priorWidth === nextWidth) {
    return standDown(
      "width-unchanged",
      "The chart's width did not change, so the visible bars were never at risk.",
    );
  }

  const prior = input.priorRange;
  if (
    prior == null ||
    !isFiniteNumber(prior.from) ||
    !isFiniteNumber(prior.to) ||
    prior.to <= prior.from
  ) {
    return standDown(
      "no-prior-camera",
      "The chart had no visible range recorded before the width changed, so there was nothing to restore.",
    );
  }

  if (!isFiniteNumber(priorBarCount) || !isFiniteNumber(nextBarCount) || priorBarCount !== nextBarCount) {
    return standDown(
      "series-changed",
      "Bars arrived or were replaced while the chart was resizing. Bar positions no longer mean the same bars, " +
        "so restoring the old view would have shown a different stretch of the market than the one it claimed.",
    );
  }

  const minVisible = Math.min(LWC_MIN_VISIBLE_BARS, nextBarCount);
  if (nextBarCount < LWC_MIN_VISIBLE_BARS) {
    return standDown(
      "series-too-short",
      "There are not enough bars loaded for the chart to hold a stable view across a resize.",
    );
  }

  // `_internal_setVisibleRange` derives bar spacing from RangeImpl._internal_count(),
  // which is right - left + 1 — a range covering indices 10..20 occupies eleven
  // slots, not ten. Getting this off by one silently mis-predicts every clamp
  // below, so it is spelled out rather than inlined.
  const slots = prior.to - prior.from + 1;
  const neededBarSpacing = nextWidth / slots;

  const minBarSpacing = isFiniteNumber(input.minBarSpacing) && input.minBarSpacing > 0
    ? input.minBarSpacing
    : 0;
  const maxBarSpacing = isFiniteNumber(input.maxBarSpacing) && (input.maxBarSpacing ?? 0) > 0
    ? (input.maxBarSpacing as number)
    : nextWidth * 0.5;

  if (minBarSpacing > 0 && neededBarSpacing < minBarSpacing) {
    return standDown(
      "wider-than-the-scale-allows",
      "Keeping the same bars in the narrower chart would squeeze them tighter than this chart permits, " +
        "so the chart kept its own zoom instead of pretending to hold your view.",
    );
  }

  if (neededBarSpacing > maxBarSpacing) {
    return standDown(
      "tighter-than-the-scale-allows",
      "Keeping the same bars in the wider chart would stretch them further than this chart permits, " +
        "so the chart kept its own zoom instead of pretending to hold your view.",
    );
  }

  // Offset clamps, from `_private__minRightOffset` / `_private__maxRightOffset`.
  // Logical index 0 is the first loaded bar and `nextBarCount - 1` is the base
  // (last) bar, so rightOffset is simply how far `to` sits past the last bar.
  const baseIndex = nextBarCount - 1;
  const rightOffset = prior.to - baseIndex;
  const minRightOffset = 0 - baseIndex - 1 + minVisible;
  const maxRightOffset = slots - minVisible;

  if (rightOffset < minRightOffset) {
    return standDown(
      "scrolled-past-the-first-bar",
      "Your view sat further back in history than the chart can reach at this width, " +
        "so it was not re-pointed there. What you see is the chart's own range, not a trimmed copy of your old one.",
    );
  }

  if (rightOffset > maxRightOffset) {
    return standDown(
      "scrolled-past-the-last-bar",
      "Your view sat further past the most recent bar than the chart can reach at this width, " +
        "so it was not re-pointed there. What you see is the chart's own range, not a trimmed copy of your old one.",
    );
  }

  return {
    action: "restore",
    range: { from: prior.from, to: prior.to },
    barSpacing: neededBarSpacing,
  };
}

/**
 * Did the restore actually land?
 *
 * This is the whole reason the keeper reads the range BACK instead of trusting
 * the setter. `setVisibleLogicalRange` only queues a time-scale invalidation
 * (`_internal_setTargetLogicalRange` → `_private__invalidate`), which the widget
 * applies on a later animation frame — so an immediate read returns the OLD
 * value and a naive "assert right after set" check would be green-by-accident
 * forever.
 *
 * Tolerance is in bar indices. A restore is only "landed" if the same bars are
 * on screen to well within a single bar.
 */
export function cameraRestoreLanded(
  requested: ChartLogicalRange,
  achieved: ChartLogicalRange | null | undefined,
  toleranceBars = 0.01,
): boolean {
  if (achieved == null) return false;
  if (!isFiniteNumber(achieved.from) || !isFiniteNumber(achieved.to)) return false;
  return (
    Math.abs(achieved.from - requested.from) <= toleranceBars &&
    Math.abs(achieved.to - requested.to) <= toleranceBars
  );
}
