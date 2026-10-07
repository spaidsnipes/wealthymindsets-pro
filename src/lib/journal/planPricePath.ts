/**
 * THE PRICE PATH OVER A HOLD — Garden 19 §24/§26. PURE.
 *
 * Review compares the plan with the price path only between the trade's own
 * fill times (from the capture / broker readback), on the contract's own
 * 1-minute bars from the candle owner (tastytrade / dxFeed). This file names
 * the window and turns the candle owner's bars into the classifier's path;
 * the loader (planPricePathLoader) asks the stream.
 */

import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import type { PricePath, TradeActuals } from "./planVsActual";

export const PATH_BAR_MS = 60_000;
/** Minutes after the exit kept so the plan-alone reference can look past the exit. */
export const PATH_AFTER_EXIT_MIN = 120;
/** dxFeed answers from `fromTime` to now; older holds would pull months of minutes. */
export const PATH_MAX_AGE_DAYS = 30;

export interface PathWindow { readonly fromMs: number; readonly toMs: number }

/** The window to load, or a reason it cannot be named (never a guessed time). */
export function pathWindowFor(a: TradeActuals | null, nowMs: number): { ok: true; window: PathWindow } | { ok: false; reason: string } {
  const entryAt = a?.entry?.atMs ?? null;
  const exitTimes = (a?.exits ?? []).map(e => e.atMs);
  if (entryAt == null) return { ok: false, reason: "the entry fill time was not reported" };
  if (!exitTimes.length || exitTimes.some(t => t == null)) return { ok: false, reason: "an exit fill time was not reported" };
  if (nowMs - entryAt > PATH_MAX_AGE_DAYS * 86_400_000) return { ok: false, reason: `the trade is older than ${PATH_MAX_AGE_DAYS} days` };
  const exitAt = Math.max(...(exitTimes as number[]));
  const fromMs = Math.floor(entryAt / PATH_BAR_MS) * PATH_BAR_MS;
  return { ok: true, window: { fromMs, toMs: Math.min(nowMs, exitAt + PATH_AFTER_EXIT_MIN * 60_000) } };
}

/** The candle owner's bars (time in seconds) inside the window → the classifier's path. */
export function pricePathFromBars(bars: readonly LegacyOhlcvTuple[], w: PathWindow, source: string): PricePath | null {
  const inside = bars
    .filter(b => [b.high, b.low, b.close].every(Number.isFinite) && b.time * 1000 + PATH_BAR_MS > w.fromMs && b.time * 1000 <= w.toMs)
    .map(b => ({ t: b.time * 1000, h: b.high, l: b.low, c: b.close }))
    .sort((x, y) => x.t - y.t);
  return inside.length ? { bars: inside, barMs: PATH_BAR_MS, source } : null;
}
