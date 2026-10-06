/**
 * H-101 · WHERE THE SELECTED OBJECT'S WAIT PLAQUE MAY STAND.
 *
 * Serving BTC-USD 15m, select=zone, 2026-10-06 11:41 CDT: a zone born near the
 * live edge put its pin a few bars from now; the plaque hung right of the pin,
 * was clamped back inside the container, and covered the newest candles
 * ("WAIT · 2 TO RESOLVE · ZONE 86,342.24") — the market lost to a card.
 *
 * The plaque keeps its place beside its pin when that is clear. Otherwise it
 * tries the pin's left, then below and above it (a step further out each
 * time), and takes the first spot that covers no candle (body or wick). When
 * every spot covers one, it keeps the first — the caller's old placement.
 * PURE: screen rectangles in, a rectangle out.
 */
export interface PlaqueRect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

export interface WaitPlaquePlacement {
  readonly left: number;
  readonly top: number;
  /** Which candidate won: RIGHT (the original), LEFT, BELOW, ABOVE, or BLOCKED (nothing clear; the original kept). */
  readonly mode: "RIGHT" | "LEFT" | "BELOW" | "ABOVE" | "BLOCKED";
}

const hits = (a: PlaqueRect, b: PlaqueRect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function placeWaitPlaque(
  pin: { readonly x: number; readonly y: number },
  size: { readonly w: number; readonly h: number },
  container: { readonly w: number; readonly h: number },
  candles: readonly PlaqueRect[],
): WaitPlaquePlacement {
  const clampX = (x: number) => Math.min(x, Math.max(12, container.w - size.w - 16));
  const clampY = (y: number) => Math.max(10, Math.min(y, Math.max(10, container.h - size.h - 10)));
  const right = { mode: "RIGHT" as const, x: clampX(pin.x + 16), y: Math.max(10, pin.y - 28) };
  const leftX = Math.max(12, pin.x - 16 - size.w);
  const centreX = clampX(Math.max(12, pin.x - size.w / 2));
  const cands: { mode: WaitPlaquePlacement["mode"]; x: number; y: number }[] = [
    right,
    { mode: "LEFT", x: leftX, y: clampY(pin.y - 28) },
    ...[0, 1, 2].flatMap(k => [
      { mode: "BELOW" as const, x: centreX, y: clampY(pin.y + 18 + k * (size.h + 8)) },
      { mode: "ABOVE" as const, x: centreX, y: clampY(pin.y - 18 - size.h - k * (size.h + 8)) },
    ]),
  ];
  for (const c of cands) {
    const r = { x: c.x, y: c.y, w: size.w, h: size.h };
    if (!candles.some(b => hits(r, b))) return { left: c.x, top: c.y, mode: c.mode };
  }
  return { left: right.x, top: right.y, mode: "BLOCKED" };
}
