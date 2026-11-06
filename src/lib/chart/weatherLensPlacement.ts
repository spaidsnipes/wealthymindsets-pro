/**
 * THE HAND-PLACED LOUPE REMEMBERS WHERE IT WAS PUT (Liquidity Weather lens,
 * shift 1106). The lens could already be dragged — mouse on the ring or the
 * glass, a finger on the ring, the DRAG LENS chip, arrow keys — but every
 * reload, timeframe switch or toggle threw the placement away, and the arrow
 * keys could walk it off the glass.
 *
 * WHAT IS STORED is the MARKET point, never pixels: the bar the centre sat on
 * (its open time), the fraction of a bar past it, the price, and the loupe's
 * radii. Pixels change with every zoom and every device; a time + price is the
 * same candle on a phone, an iPad and the desk, and survives a timeframe
 * switch (the same instant lands inside the new timeframe's bar).
 *
 * PER SYMBOL. "Return lens to live" (button, double-click, Escape) forgets it.
 * Storage may be blocked (private window): every read/write is guarded and the
 * lens then simply starts live — never an error.
 *
 * PURE except the injected Storage.
 */

export const WEATHER_LENS_PLACEMENT_KEY = "wm_weatherLensPlacement_v1";
/** Oldest placements beyond this many symbols are dropped. */
export const WEATHER_LENS_PLACEMENT_MAX = 40;

export interface WeatherAperture {
  readonly logical: number;
  readonly price: number;
  readonly rx: number;
  readonly ry: number;
}

export interface WeatherLensPlacement {
  /** Open time (unix s) of the bar the centre sat on. */
  readonly time: number;
  /** How far past that bar's centre, in bars (0 ≤ offset < 1). */
  readonly offset: number;
  readonly price: number;
  readonly rx: number;
  readonly ry: number;
  /** The timeframe it was placed on — the offset is only honoured on the same one. */
  readonly timeframe: string;
  readonly savedAt: number;
}

type Bar = { readonly time: number | string };
type Store = Pick<Storage, "getItem" | "setItem">;

const finite = (...xs: number[]) => xs.every(Number.isFinite);

/** The bar index whose open is at or before `t` (−1 before the first). */
function barAtOrBefore(bars: readonly Bar[], t: number): number {
  let lo = 0, hi = bars.length - 1, at = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (Number(bars[mid].time) <= t) { at = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return at;
}

export function placementFromAperture(a: WeatherAperture, bars: readonly Bar[], timeframe: string, now = Date.now()): WeatherLensPlacement | null {
  if (!bars.length || !finite(a.logical, a.price, a.rx, a.ry) || a.rx <= 0 || a.ry <= 0) return null;
  const i = Math.max(0, Math.min(bars.length - 1, Math.floor(a.logical)));
  const offset = Math.max(0, Math.min(0.999, a.logical - i));
  const time = Number(bars[i].time);
  if (!Number.isFinite(time)) return null;
  return { time, offset, price: a.price, rx: a.rx, ry: a.ry, timeframe, savedAt: now };
}

/**
 * The stored market point → this chart's aperture, or null when the bars that
 * hold it are not loaded (older than the first bar, or newer than the last).
 */
export function apertureFromPlacement(p: WeatherLensPlacement, bars: readonly Bar[], timeframe: string): WeatherAperture | null {
  if (!bars.length || !finite(p.time, p.price, p.rx, p.ry, p.offset)) return null;
  const first = Number(bars[0].time);
  if (p.time < first) return null;
  const i = barAtOrBefore(bars, p.time);
  if (i < 0) return null;
  // A placement past the newest loaded bar is a future the chart does not hold.
  if (i === bars.length - 1 && p.timeframe === timeframe && p.time > Number(bars[i].time)) return null;
  const offset = p.timeframe === timeframe ? p.offset : 0;
  return { logical: i + offset, price: p.price, rx: p.rx, ry: p.ry };
}

function readAll(store: Store | null | undefined): Record<string, WeatherLensPlacement> {
  if (!store) return {};
  try {
    const raw = store.getItem(WEATHER_LENS_PLACEMENT_KEY);
    if (!raw) return {};
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, WeatherLensPlacement> : {};
  } catch { return {}; }
}

function writeAll(store: Store | null | undefined, all: Record<string, WeatherLensPlacement>): boolean {
  if (!store) return false;
  try { store.setItem(WEATHER_LENS_PLACEMENT_KEY, JSON.stringify(all)); return true; } catch { return false; }
}

const valid = (p: unknown): p is WeatherLensPlacement => {
  const q = p as WeatherLensPlacement | null;
  return !!q && typeof q === "object" && finite(q.time, q.offset, q.price, q.rx, q.ry) && q.rx > 0 && q.ry > 0 && typeof q.timeframe === "string";
};

export function readWeatherLensPlacement(store: Store | null | undefined, symbol: string): WeatherLensPlacement | null {
  const p = readAll(store)[symbol];
  return valid(p) ? p : null;
}

export function writeWeatherLensPlacement(store: Store | null | undefined, symbol: string, p: WeatherLensPlacement): boolean {
  const all = readAll(store);
  all[symbol] = p;
  const keys = Object.keys(all).filter(k => valid(all[k])).sort((a, b) => (all[b].savedAt ?? 0) - (all[a].savedAt ?? 0));
  const kept: Record<string, WeatherLensPlacement> = {};
  for (const k of keys.slice(0, WEATHER_LENS_PLACEMENT_MAX)) kept[k] = all[k];
  return writeAll(store, kept);
}

export function clearWeatherLensPlacement(store: Store | null | undefined, symbol: string): boolean {
  const all = readAll(store);
  if (!(symbol in all)) return true;
  delete all[symbol];
  return writeAll(store, all);
}

/** The browser's storage, or null when the page may not touch it. */
export function lensStore(): Store | null {
  try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; }
}
