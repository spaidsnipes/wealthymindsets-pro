/**
 * THE PRICE LEGEND ENDS WHERE THE PRICE AXIS BEGINS.
 *
 * Found on the glass 2026-09-26, local /charts TSLA 15m at 1600x900 (Garden
 * 16 §70 collision): the legend band over the candle pane ran `left: 0;
 * right: 0` — across the price-axis column too. Its right-hand group printed
 * "MARKET CLOSED · LAST BAR OPENED 07:45 PM" ending at x 1284 while the axis
 * column began at x 1268, so the words shared 16px with the axis's top label
 * ("390.00"), and the fullscreen glyph (x 1301–1312) sat inside the column.
 *
 * The axis width is the chart's own number — `chart.priceScale("right")
 * .width()` — so the band is inset by exactly that plus a small gap, and its
 * right group ends left of the column. Words that no longer fit wrap inside
 * the band; they never overprint the axis.
 *
 * PURE: the axis width in, the band's right inset out.
 */

/** Clear space kept between the legend's last word and the axis column. */
export const PRICE_LEGEND_AXIS_GAP_PX = 6;

/**
 * The legend band's CSS `right`. Zero when the chart reports no right price
 * scale (hidden, or not laid out yet): there is no column to keep clear of.
 */
export function priceLegendRightInset(axisWidthPx: number | null | undefined): number {
  if (typeof axisWidthPx !== "number" || !Number.isFinite(axisWidthPx) || axisWidthPx <= 0) return 0;
  return Math.ceil(axisWidthPx) + PRICE_LEGEND_AXIS_GAP_PX;
}

/**
 * Whether a legend whose right edge sits at `legendRightPx` (pane-relative)
 * shares pixels with the price-axis column of a pane `paneWidthPx` wide.
 */
export function legendOverprintsPriceAxis(
  legendRightPx: number,
  paneWidthPx: number,
  axisWidthPx: number | null | undefined,
): boolean {
  if (typeof axisWidthPx !== "number" || !Number.isFinite(axisWidthPx) || axisWidthPx <= 0) return false;
  return legendRightPx > paneWidthPx - axisWidthPx;
}

/**
 * The slice of the chart this binding reads. Structural, so a test can hand
 * it a stub whose right scale is 60px wide.
 */
export interface PriceLegendInsetChart {
  priceScale(id: "right"): { width(): number };
  timeScale(): {
    subscribeSizeChange?: (h: () => void) => void;
    unsubscribeSizeChange?: (h: () => void) => void;
  } | null | undefined;
}

/**
 * THE BINDING THE LEGEND BAND LIVES BY (Garden 16 §65, 2026-09-26). Pulled
 * out of MainChart's effect so what the setter RECEIVES is tested, not only
 * what `priceLegendRightInset` would return if anyone called it: reads the
 * axis width now and on every time-scale size change, hands the setter the
 * inset as an updater that keeps the old value when nothing moved (no
 * re-render), and returns the cleanup.
 */
export function bindPriceLegendInset(
  chart: PriceLegendInsetChart,
  setInset: (update: (prev: number) => number) => void,
): () => void {
  const read = () => {
    let w = 0;
    try { w = chart.priceScale("right").width(); } catch { /* no right scale */ }
    const next = priceLegendRightInset(w);
    setInset(prev => (prev === next ? prev : next));
  };
  read();
  let ts: ReturnType<PriceLegendInsetChart["timeScale"]> = null;
  try { ts = chart.timeScale(); ts?.subscribeSizeChange?.(read); } catch { ts = null; }
  return () => { try { ts?.unsubscribeSizeChange?.(read); } catch { /* chart already removed */ } };
}
