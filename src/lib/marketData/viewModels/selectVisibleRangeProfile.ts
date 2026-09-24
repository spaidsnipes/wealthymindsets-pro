/**
 * VISIBLE RANGE PROFILE — volume by price for exactly what the camera shows.
 * P-110 organism #7.
 *
 * Child: VISIBLE RANGE PROFILE. Parent family: F09 Profiles. Class: CHART
 * LANGUAGE. House surface: /charts, one lane in the right-edge profile stack.
 * Plate: WM_H_P110_PROFILE_ORGANISM ("7 · VRP"); Registry F.7; Manifestation
 * Map F09 "must change with the market / visible range".
 *
 * ── IT IS SUPPOSED TO MOVE ─────────────────────────────────────────────────
 *
 * The Fixed Range VP was once a visible-range variant, and it was changed
 * because its levels jumped on scroll — a FIXED profile must not. This one
 * is the opposite contract, stated in its name and its label: its levels
 * describe the bars the trader is looking at, so panning or zooming CHANGES
 * them. That is the reading, not a defect. The two now coexist honestly.
 *
 * The range is inclusive of both edge bars' times. Fewer than
 * MIN_VISIBLE_BARS bars in view is not a distribution and is refused.
 *
 * PURE. DETERMINISTIC. No React, no canvas, no IO, no clock.
 */

import { computeProfileFromBars, chooseTickSize, type ProfileQuality } from "@/lib/vpEngine";
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";

export const VISIBLE_RANGE_PROFILE_VERSION = 1;
export const MIN_VISIBLE_BARS = 5;
export const VRP_TARGET_ROWS = 70;

export type VisibleRangeReason = "DRAWN" | "NO_RANGE" | "TOO_FEW_BARS_IN_VIEW" | "NO_VOLUME";

export interface VisibleRangeRow {
  readonly price: number;
  readonly share: number;
  readonly insideValueArea: boolean;
  readonly isPoc: boolean;
}

export interface VisibleRangeProfileVM {
  readonly version: number;
  readonly drawn: boolean;
  readonly reason: VisibleRangeReason;
  readonly barsInView: number;
  readonly from: number | null;
  readonly to: number | null;
  readonly rows: readonly VisibleRangeRow[];
  readonly poc: number | null;
  readonly vah: number | null;
  readonly val: number | null;
  readonly quality: ProfileQuality | null;
}

const none = (reason: Exclude<VisibleRangeReason, "DRAWN">, barsInView = 0, from: number | null = null, to: number | null = null): VisibleRangeProfileVM => ({
  version: VISIBLE_RANGE_PROFILE_VERSION, drawn: false, reason, barsInView, from, to,
  rows: [], poc: null, vah: null, val: null, quality: null,
});

export function selectVisibleRangeProfile(
  bars: readonly LegacyOhlcvTuple[] | null | undefined,
  from: number | null | undefined,
  to: number | null | undefined,
): VisibleRangeProfileVM {
  if (from == null || to == null || !Number.isFinite(from) || !Number.isFinite(to) || to < from) {
    return none("NO_RANGE");
  }
  const inView = (bars ?? []).filter(
    b => Number.isFinite(b.time) && b.time >= from && b.time <= to &&
      Number.isFinite(b.high) && Number.isFinite(b.low) && b.high >= b.low,
  );
  if (inView.length < MIN_VISIBLE_BARS) return none("TOO_FEW_BARS_IN_VIEW", inView.length, from, to);
  if (!inView.some(b => b.volume > 0)) return none("NO_VOLUME", inView.length, from, to);

  let hi = -Infinity;
  let lo = Infinity;
  for (const b of inView) { if (b.high > hi) hi = b.high; if (b.low < lo) lo = b.low; }
  const range = hi - lo;
  const snap = computeProfileFromBars(inView, {
    tickSize: chooseTickSize(range > 0 ? range : Math.abs(hi) || 1, VRP_TARGET_ROWS),
  });
  if (snap.rows.length === 0 || !(snap.totalVolume > 0)) return none("NO_VOLUME", inView.length, from, to);

  let heaviest = 0;
  for (const r of snap.rows) if (r.total > heaviest) heaviest = r.total;
  return {
    version: VISIBLE_RANGE_PROFILE_VERSION,
    drawn: true,
    reason: "DRAWN",
    barsInView: inView.length,
    from,
    to,
    rows: snap.rows.map(r => ({
      price: r.price,
      share: r.total / heaviest,
      insideValueArea: r.price >= snap.val && r.price <= snap.vah,
      isPoc: r.price === snap.poc,
    })),
    poc: snap.poc,
    vah: snap.vah,
    val: snap.val,
    quality: snap.quality,
  };
}

/**
 * ONE ENGINE, TWO ANCHORS. A profile over a time span is the same computation
 * whether the span comes from the camera (Visible Range, P-110 #7) or from a
 * box the trader dragged (Anchored Range, P-110 #8). The anchored tool calls
 * it by this name so the call site says which contract it holds.
 */
export const selectTimeRangeProfile = selectVisibleRangeProfile;

export default selectVisibleRangeProfile;
