/** Representation only: a grabbed aperture never changes candle coordinates. */
export function constrainWeatherLens(
  x: number, y: number, rx: number, ry: number,
  width: number, bottom: number, top: number,
): { x: number; y: number } {
  const mx = Math.min(rx + 20, width / 2);
  const my = Math.min(ry + 24, Math.max(0, bottom - top) / 2);
  return {
    x: Math.max(mx, Math.min(width - mx, x)),
    y: Math.max(top + my, Math.min(bottom - my, y)),
  };
}

/** The observed candles within the lens's horizontal aperture, never padded. */
export function weatherLensBarSpan(center: number, radius: number, spacing: number, count: number) {
  if (![center, radius, spacing, count].every(Number.isFinite) || spacing <= 0 || count <= 0)
    return { from: 0, to: 0 };
  return {
    from: Math.max(0, Math.min(count, Math.ceil(center - radius / spacing))),
    to: Math.max(0, Math.min(count, Math.floor(center + radius / spacing) + 1)),
  };
}

/** Only the physical brass bezel grabs; candle/object clicks inside pass through. */
export function isWeatherLensBezel(x: number, y: number, lens: { cx: number; cy: number; rx: number; ry: number }) {
  if (lens.rx <= 0 || lens.ry <= 0) return false;
  const distance = Math.hypot((x - lens.cx) / lens.rx, (y - lens.cy) / lens.ry);
  const tolerance = 20 / Math.min(lens.rx, lens.ry);
  return distance >= 1 - tolerance && distance <= 1 + tolerance;
}

/** A selected unmeasured sample is still the selection; never borrow live evidence. */
export function weatherInspectReading<T>(
  sample: { symbol: string; timeframe: string; vm: T } | null,
  live: T, symbol: string, timeframe: string, enabled: boolean,
): T {
  return enabled && sample?.symbol === symbol && sample.timeframe === timeframe ? sample.vm : live;
}

/**
 * Inside the glass (Founder, 2026-10-02: "dragged up and down along the
 * candles … like putting a magnifying glass wherever you want"). A press here
 * becomes a lens drag only after it MOVES (LENS_DRAG_SLOP px); a still press
 * stays the candle click it always was.
 */
export const LENS_DRAG_SLOP = 5;
export function isInsideWeatherLens(x: number, y: number, lens: { cx: number; cy: number; rx: number; ry: number }) {
  if (lens.rx <= 0 || lens.ry <= 0) return false;
  return Math.hypot((x - lens.cx) / lens.rx, (y - lens.cy) / lens.ry) < 1;
}
