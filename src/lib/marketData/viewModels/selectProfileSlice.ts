/**
 * THE SELECTED PROFILE SLICE — what Inspect may say about one bucket.
 *
 * Child: LIVING PROFILE · SLICE INSPECT (H-601 "Living Profile + Passport":
 * "selected slice opens lawful Inspect"). Parent: F09 Profiles › Living
 * Profile. Class: INSPECTOR. House surface: the ONE chart Inspect ticket —
 * not a Profile page, not a drawer.
 *
 * The trader clicks a histogram bar. This resolves the click's PRICE to the
 * bucket the compiler actually published and says only what the compiler
 * measured about it: its price, its width relative to POC, whether it sits in
 * value, its distance from POC, and the fidelity of the whole profile. It
 * never invents a bucket: a click between buckets, or on an untraded price,
 * resolves to nothing and says so.
 *
 * PURE. DETERMINISTIC. No React, no canvas, no IO, no clock.
 */

import type { LivingProfileGlass } from "./selectLivingProfileGlass";

export type ProfileSliceMiss = "NO_PROFILE" | "NO_TRADED_BUCKET_AT_PRICE";

export interface SelectedProfileSlice {
  readonly found: true;
  /** Bucket LOW edge — the price the compiler published. */
  readonly price: number;
  /** Bucket HIGH edge (exclusive): the next bucket's low, or price + step. */
  readonly priceHigh: number;
  /** volume ÷ POC bucket volume, in [0,1]. */
  readonly shareOfPoc: number;
  readonly isPoc: boolean;
  readonly insideValueArea: boolean;
  /** "ABOVE_VALUE" | "IN_VALUE" | "BELOW_VALUE" — location, not a side. */
  readonly location: "ABOVE_VALUE" | "IN_VALUE" | "BELOW_VALUE";
  /** price − POC, in price units; null when POC is unknown. */
  readonly distanceFromPoc: number | null;
  readonly estimated: boolean;
  readonly nodesWithheld: string | null;
  readonly node: "HVN" | "LVN" | null;
}

export type ProfileSliceResult =
  | SelectedProfileSlice
  | { readonly found: false; readonly miss: ProfileSliceMiss };

export function selectProfileSlice(
  glass: LivingProfileGlass | null | undefined,
  clickPrice: number | null | undefined,
): ProfileSliceResult {
  if (!glass || !glass.drawn || glass.bars.length === 0) return { found: false, miss: "NO_PROFILE" };
  if (clickPrice == null || !Number.isFinite(clickPrice)) {
    return { found: false, miss: "NO_TRADED_BUCKET_AT_PRICE" };
  }

  const bars = [...glass.bars].sort((a, b) => a.price - b.price);
  // The grid step, from the compiler's own consecutive bucket prices.
  let step = Infinity;
  for (let i = 1; i < bars.length; i++) {
    const d = bars[i].price - bars[i - 1].price;
    if (d > 0 && d < step) step = d;
  }
  if (!Number.isFinite(step)) step = 0;

  // The bucket whose [low, low + step) contains the click. Untraded buckets
  // are absent from `bars`, so a click on one finds nothing — correctly.
  const eps = step * 1e-6;
  const hit = bars.find(b => clickPrice >= b.price - eps && clickPrice < b.price + step - eps)
    ?? (step === 0 ? bars.find(b => Math.abs(b.price - clickPrice) < 1e-9) : undefined);
  if (!hit) return { found: false, miss: "NO_TRADED_BUCKET_AT_PRICE" };

  const location =
    glass.vah != null && hit.price > glass.vah ? "ABOVE_VALUE"
      : glass.val != null && hit.price < glass.val ? "BELOW_VALUE"
        : "IN_VALUE";

  return {
    found: true,
    price: hit.price,
    priceHigh: +(hit.price + step).toFixed(10),
    shareOfPoc: hit.share,
    isPoc: hit.isPoc,
    insideValueArea: hit.insideValueArea,
    location,
    distanceFromPoc: glass.poc != null ? +(hit.price - glass.poc).toFixed(10) : null,
    estimated: glass.estimated,
    nodesWithheld: glass.nodesWithheld,
    node: hit.node,
  };
}

export default selectProfileSlice;
