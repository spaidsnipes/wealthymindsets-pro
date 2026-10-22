/**
 * ONLY THE TRADER'S EDIT IS STORED (Founder 2026-10-22: "the structure profile … when i tried to change the
 * colors its like the lighting went out and its dark behind the screen").
 *
 * The style popover and Chart Settings both edit the settings AS SHOWN: the trader's own settings with the
 * candle theme and, in WM Neon, the neon room laid over them. Saving that whole object stored the overlay as
 * if the trader had chosen it: one colour change in WM Neon wrote the neon field (#02060A), grid, crosshair
 * and `neon: true` into storage, so the chart stayed dark in Original too. Now only the keys the trader
 * changed reach storage, and an overlay already stored is lifted on read.
 *
 * PURE. No React, no storage.
 */

/** The WM Neon room: laid over the trader's settings while the neon display mode is on, never stored. */
export const NEON_ROOM = Object.freeze({
  background: "#02060A",
  gridColor: "rgba(47,243,255,0.07)",
  crosshairColor: "#2ff3ff",
  neon: true,
} as const);

/** The six candle channels the candle theme owns. */
export const CANDLE_PAINT_KEYS = ["candleUp", "candleDown", "wickUp", "wickDown", "borderUp", "borderDown"] as const;

type Settings = Readonly<Record<string, unknown>>;

/**
 * The trader's settings after an edit made on the shown settings: `raw` plus every key whose value in `next`
 * differs from `shown`. A candle channel the trader changed brings the other five as shown with it, because
 * the palette becomes the trader's own ("custom") and must keep looking the way it did.
 * Returns `raw` itself when nothing changed.
 */
export function traderEdit<T extends object>(raw: T, shown: T, next: T): { settings: T; candlePaintChanged: boolean } {
  const r = raw as Settings, s = shown as Settings, n = next as Settings;
  const patch: Record<string, unknown> = {};
  for (const k of new Set([...Object.keys(s), ...Object.keys(n)])) if (n[k] !== s[k]) patch[k] = n[k];
  const candlePaintChanged = CANDLE_PAINT_KEYS.some(k => k in patch);
  if (candlePaintChanged) for (const k of CANDLE_PAINT_KEYS) patch[k] = n[k];
  if (Object.keys(patch).length === 0) return { settings: raw, candlePaintChanged };
  return { settings: { ...r, ...patch } as T, candlePaintChanged };
}

/** Stored settings with any stored WM Neon room lifted off (the display mode lays it back on when it is on). */
export function liftNeonRoom<T extends object>(stored: T): T {
  const st = stored as Settings;
  const keys = (Object.keys(NEON_ROOM) as (keyof typeof NEON_ROOM)[]).filter(k => st[k] === NEON_ROOM[k]);
  if (keys.length === 0) return stored;
  const out: Record<string, unknown> = { ...st };
  for (const k of keys) delete out[k];
  return out as T;
}
