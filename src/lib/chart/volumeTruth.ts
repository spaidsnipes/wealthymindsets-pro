/**
 * VOLUME TRUTH — is the feed's `volume` field a count of anything?
 *
 * MEASURED ON SERVING (2026-09-26 05:01 CDT, desktop, /charts?symbol=EURUSD
 * &tf=15m): the volume pane showed "Vol 1" and a full-height green volume bar
 * at the live edge. Spot FX trades over the counter across many dealers; there
 * is no centralised traded volume. Yahoo ships `volume: 0` on every EURUSD bar
 * (measured the same morning on /api/yahoo?sym=EURUSD&type=candles), the live
 * fold carried a 1, and the histogram scaled that 1 to the full pane — a
 * placeholder drawn as if it were the busiest bar of the week (GP12 §82: no
 * fake numbers).
 *
 * Two ways the field is not a count:
 *   NO_CENTRAL_VOLUME   the instrument's class has none (spot FX, spot metals)
 *   PLACEHOLDER_VOLUME  whatever the class, every bar the feed sent carries 0
 *                       or 1 — a flag, not a quantity (a cash index, a feed
 *                       with no size field). Needs a real sample to say so.
 *
 * When either holds, nothing may draw or print the field as volume: the
 * histogram is empty, the footer/legend name the silence, and volume-weighted
 * layers are handed zero-volume bars so their own NO_VOLUME silences engage
 * instead of building a profile out of one placeholder unit.
 *
 * PURE. DETERMINISTIC.
 */

import { forexPairCodes } from "@/lib/marketData/canonicalIdentity";
import { classifySymbol } from "@/lib/marketData/symbolAssetClass";
import { spotMetalFutures } from "@/lib/yahooSymbol";

/** Fewer bars than this cannot prove a feed only ever sends placeholders. */
export const PLACEHOLDER_MIN_BARS = 20;

export type VolumeSilenceReason = "NO_CENTRAL_VOLUME" | "PLACEHOLDER_VOLUME";

export type VolumeTruth =
  | { readonly real: true }
  | {
      readonly real: false;
      readonly reason: VolumeSilenceReason;
      /** The named silence the footer / legend prints. */
      readonly text: string;
      /** A cell-sized form (Data Window). */
      readonly short: string;
      /** Why — carried on title / aria-label. */
      readonly title: string;
    };

const REAL: VolumeTruth = { real: true };

const noCentral = (noun: "spot FX" | "spot metals"): VolumeTruth => ({
  real: false,
  reason: "NO_CENTRAL_VOLUME",
  text: `NO CENTRAL VOLUME · ${noun}`,
  short: "no central vol",
  title:
    `${noun === "spot FX" ? "Spot FX" : "Spot metals"} trade over the counter across many dealers — ` +
    "there is no centralised traded volume. The feed's volume field is a placeholder, so no volume " +
    "bar is drawn and no volume-weighted layer is read from it.",
});

const PLACEHOLDER: VolumeTruth = {
  real: false,
  reason: "PLACEHOLDER_VOLUME",
  text: "NO VOLUME REPORTED · feed placeholder",
  short: "not reported",
  title:
    "Every bar this feed sent carries a volume of 0 or 1 — a placeholder, not a count. No volume " +
    "bar is drawn and no volume-weighted layer is read from it.",
};

/** Does this instrument's class have no centralised volume? */
export function hasNoCentralVolume(symbol: string): "spot FX" | "spot metals" | null {
  const s = (symbol ?? "").trim().toUpperCase();
  if (!s) return null;
  if (spotMetalFutures(s)) return "spot metals";
  const cls = classifySymbol(s);
  if (cls === "FOREX") return "spot FX";
  if (cls === "UNKNOWN" && forexPairCodes(s) !== null) return "spot FX";
  return null;
}

export function volumeTruthFor(
  symbol: string,
  bars: readonly { readonly volume: number }[] | null | undefined,
): VolumeTruth {
  const noun = hasNoCentralVolume(symbol);
  if (noun) return noCentral(noun);
  const bs = bars ?? [];
  if (bs.length < PLACEHOLDER_MIN_BARS) return REAL;
  for (const b of bs) {
    const v = b?.volume;
    if (Number.isFinite(v) && v !== 0 && v !== 1) return REAL;
  }
  return PLACEHOLDER;
}

/**
 * The bars a VOLUME-WEIGHTED layer may read: the same array when the volume is
 * real, otherwise the same bars carrying no volume — so each layer's own
 * NO_VOLUME silence speaks instead of a profile built from placeholder units.
 * Prices are untouched.
 */
export function volumeBearingBars<T extends { readonly volume: number }>(
  symbol: string,
  bars: readonly T[],
): readonly T[] {
  if (volumeTruthFor(symbol, bars).real) return bars;
  return bars.map(b => ({ ...b, volume: 0 }));
}
