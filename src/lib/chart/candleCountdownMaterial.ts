/**
 * Material law for the price-attached candle countdown.
 *
 * FL-06 treats the desktop chart as one continuous instrument: the countdown
 * may keep its clock ring, price connector and live-close flash, but it must
 * not become another filled card floating over the market. Narrow layouts keep
 * the pill because the fill is what preserves legibility over a compressed
 * chart.
 *
 * Invalid measurements fail safe to the pill. The canvas supplies a finite
 * width in production, but an unknown width must never silently opt into the
 * desktop treatment.
 */
export const COUNTDOWN_DIRECT_INSTRUMENT_MIN_WIDTH = 960;

export function candleCountdownUsesPillShell(chartWidth: number): boolean {
  return !Number.isFinite(chartWidth) || chartWidth < COUNTDOWN_DIRECT_INSTRUMENT_MIN_WIDTH;
}
