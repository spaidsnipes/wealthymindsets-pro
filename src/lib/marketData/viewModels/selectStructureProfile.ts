/**
 * STRUCTURE PROFILE — volume at price for the CURRENT LEG. P-110 organism #2.
 *
 * Child: STRUCTURE PROFILE. Parent family: F09 Profiles. Class: CHART
 * LANGUAGE. House surface: /charts main canvas, switched from the one Profiles
 * door. Plate: WM_H_P110_PROFILE_ORGANISM ("2 · STRUCTURE · Core shape &
 * balance"); Registry F.2 "anchored to actual market structure — swing".
 *
 * ── WHY ANCHOR AT A SWING ───────────────────────────────────────────────────
 *
 * A session or visible-range profile is anchored to the CLOCK or the CAMERA.
 * Neither is a market event. The leg that started at the last confirmed swing
 * is: everything since then is one auction with one direction, and its value
 * area says where that auction has been accepted. When the leg's value
 * migrates with it, the leg is healthy; when value stays behind while price
 * runs, the move is unaccepted.
 *
 * The anchor is the MORE RECENT of the last confirmed swing high and swing
 * low — the pivot the current leg began from. It is read from
 * `selectMarketStructure`, never re-derived, so the structure marks on the
 * axis and the profile's anchor cannot disagree.
 *
 * ── THE RULES ───────────────────────────────────────────────────────────────
 *
 *   1. NO CONFIRMED PIVOT, NO ANCHOR, NO PAINT. Refused by name.
 *   2. A LEG SHORTER THAN MIN_LEG_BARS IS NOT A DISTRIBUTION. Refused by name.
 *   3. QUALITY IS STATED. Built from bars, the profile is candle-estimated and
 *      says so; the canvas prints it.
 *   4. A ROW IS A PRICE. `share` is a length and never reaches the axis.
 *
 * PURE. DETERMINISTIC. No React, no canvas, no IO, no clock.
 */

import { computeProfileFromBars, chooseTickSize, type ProfileQuality } from "@/lib/vpEngine";
import type { MarketStructureVM } from "./selectMarketStructure";

export const STRUCTURE_PROFILE_VERSION = 1;
export const MIN_LEG_BARS = 6;
export const STRUCTURE_TARGET_ROWS = 60;

export interface StructureProfileBarInput {
  readonly time: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}

export type StructureProfileReason =
  | "DRAWN"
  | "NO_STRUCTURE"
  | "NO_CONFIRMED_PIVOT"
  | "LEG_TOO_SHORT"
  | "NO_VOLUME";

export interface StructureProfileRow {
  readonly price: number;
  readonly share: number;
  readonly insideValueArea: boolean;
  readonly isPoc: boolean;
}

export interface StructureProfileVM {
  readonly version: number;
  readonly drawn: boolean;
  readonly reason: StructureProfileReason;
  readonly note: string;
  /** The pivot the leg began from — a real bar time and a real price. */
  readonly anchor: { readonly kind: "HIGH" | "LOW"; readonly time: number; readonly price: number } | null;
  readonly legBars: number;
  readonly rows: readonly StructureProfileRow[];
  readonly poc: number | null;
  readonly vah: number | null;
  readonly val: number | null;
  readonly quality: ProfileQuality | null;
  readonly asOf: number | null;
}

const blank = (
  reason: Exclude<StructureProfileReason, "DRAWN">,
  note: string,
  anchor: StructureProfileVM["anchor"] = null,
  legBars = 0,
): StructureProfileVM => ({
  version: STRUCTURE_PROFILE_VERSION,
  drawn: false,
  reason,
  note,
  anchor,
  legBars,
  rows: [],
  poc: null,
  vah: null,
  val: null,
  quality: null,
  asOf: null,
});

export function selectStructureProfile(
  structure: MarketStructureVM | null | undefined,
  bars: readonly StructureProfileBarInput[] | null | undefined,
): StructureProfileVM {
  if (!structure || !structure.measured) {
    return blank("NO_STRUCTURE", "structure is not measured on this window — no leg to anchor");
  }
  const hi = structure.lastSwingHigh;
  const lo = structure.lastSwingLow;
  if (!hi && !lo) {
    return blank("NO_CONFIRMED_PIVOT", "no swing has confirmed yet — the leg has no lawful start");
  }
  const anchor =
    hi && (!lo || hi.time >= lo.time)
      ? { kind: "HIGH" as const, time: hi.time, price: hi.price }
      : { kind: "LOW" as const, time: lo!.time, price: lo!.price };

  const leg = (bars ?? []).filter(
    b => Number.isFinite(b.time) && b.time >= anchor.time &&
      Number.isFinite(b.high) && Number.isFinite(b.low) && b.high >= b.low,
  );
  if (leg.length < MIN_LEG_BARS) {
    return blank(
      "LEG_TOO_SHORT",
      `${leg.length} of ${MIN_LEG_BARS} bars since the swing — too few to profile`,
      anchor,
      leg.length,
    );
  }

  let top = -Infinity;
  let bottom = Infinity;
  let asOf = -Infinity;
  for (const b of leg) {
    if (b.high > top) top = b.high;
    if (b.low < bottom) bottom = b.low;
    if (b.time > asOf) asOf = b.time;
  }
  const range = top - bottom;
  const snap = computeProfileFromBars(
    leg.map(b => ({ time: b.time, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume })),
    { tickSize: chooseTickSize(range > 0 ? range : Math.abs(top) || 1, STRUCTURE_TARGET_ROWS) },
  );
  if (snap.rows.length === 0 || !(snap.totalVolume > 0)) {
    return blank("NO_VOLUME", "the bars since the swing carry no volume", anchor, leg.length);
  }

  let heaviest = 0;
  for (const r of snap.rows) if (r.total > heaviest) heaviest = r.total;
  const rows: StructureProfileRow[] = snap.rows.map(r => ({
    price: r.price,
    share: r.total / heaviest,
    insideValueArea: r.price >= snap.val && r.price <= snap.vah,
    isPoc: r.price === snap.poc,
  }));

  return {
    version: STRUCTURE_PROFILE_VERSION,
    drawn: true,
    reason: "DRAWN",
    note: `volume since the swing ${anchor.kind === "HIGH" ? "high" : "low"} at ${anchor.price}, ${leg.length} bars`,
    anchor,
    legBars: leg.length,
    rows,
    poc: snap.poc,
    vah: snap.vah,
    val: snap.val,
    quality: snap.quality,
    asOf,
  };
}

export default selectStructureProfile;
