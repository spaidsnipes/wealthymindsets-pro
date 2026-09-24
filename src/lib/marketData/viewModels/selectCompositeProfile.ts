/**
 * COMPOSITE PROFILE — the settled value of the COMPLETED sessions.
 * P-110 organism #9.
 *
 * Child: COMPOSITE PROFILE. Parent family: F09 Profiles. Class: CHART
 * LANGUAGE. House surface: /charts, one lane in the right-edge profile stack.
 * Plate: WM_H_P110_PROFILE_ORGANISM ("9 · COMPOSITE · Aggregated profile set").
 *
 * ── HOW IT DIFFERS FROM ITS NEIGHBOURS ─────────────────────────────────────
 *
 * Fixed Range VP = every loaded bar, including today's still-developing
 * auction. Living = the live profile. Composite = ONLY the sessions that have
 * finished: the multi-day value the market already agreed on, which today's
 * auction is either accepting or leaving. Keeping today OUT is the whole
 * point; a composite that includes the developing session is a Fixed Range VP
 * with a different name.
 *
 * Sessions come from the ONE splitter the profile family shares
 * (`sessionsByGap`). On a 24/7 feed there is only one session and nothing is
 * complete, so the composite refuses by name rather than cutting at a clock.
 *
 * PURE. DETERMINISTIC. No React, no canvas, no IO, no clock.
 */

import { computeProfileFromBars, chooseTickSize, type ProfileQuality } from "@/lib/vpEngine";
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import { sessionsByGap } from "./sessionsByGap";

export const COMPOSITE_PROFILE_VERSION = 1;
export const MAX_COMPOSITE_SESSIONS = 5;
export const COMPOSITE_TARGET_ROWS = 80;

export type CompositeReason = "DRAWN" | "NO_BARS" | "NO_COMPLETED_SESSION" | "NO_VOLUME";

export interface CompositeRow {
  readonly price: number;
  readonly share: number;
  readonly insideValueArea: boolean;
  readonly isPoc: boolean;
}

export interface CompositeProfileVM {
  readonly version: number;
  readonly drawn: boolean;
  readonly reason: CompositeReason;
  readonly sessions: number;
  readonly bars: number;
  readonly rows: readonly CompositeRow[];
  readonly poc: number | null;
  readonly vah: number | null;
  readonly val: number | null;
  readonly quality: ProfileQuality | null;
  /** Time of the last bar included — the end of the last completed session. */
  readonly asOf: number | null;
}

const none = (reason: Exclude<CompositeReason, "DRAWN">): CompositeProfileVM => ({
  version: COMPOSITE_PROFILE_VERSION, drawn: false, reason, sessions: 0, bars: 0,
  rows: [], poc: null, vah: null, val: null, quality: null, asOf: null,
});

export function selectCompositeProfile(
  input: readonly LegacyOhlcvTuple[] | null | undefined,
): CompositeProfileVM {
  const bars = (input ?? [])
    .filter(b => Number.isFinite(b.time) && Number.isFinite(b.high) && Number.isFinite(b.low) && b.high >= b.low)
    .slice()
    .sort((a, b) => a.time - b.time);
  if (bars.length === 0) return none("NO_BARS");

  const sessionOf = sessionsByGap(bars.map(b => b.time));
  const current = sessionOf[sessionOf.length - 1];
  if (current === 0) return none("NO_COMPLETED_SESSION");

  const firstKept = Math.max(0, current - MAX_COMPOSITE_SESSIONS);
  const kept = bars.filter((_, i) => sessionOf[i] < current && sessionOf[i] >= firstKept);
  if (!kept.some(b => b.volume > 0)) return none("NO_VOLUME");

  let hi = -Infinity;
  let lo = Infinity;
  for (const b of kept) { if (b.high > hi) hi = b.high; if (b.low < lo) lo = b.low; }
  const range = hi - lo;
  const snap = computeProfileFromBars(kept, {
    tickSize: chooseTickSize(range > 0 ? range : Math.abs(hi) || 1, COMPOSITE_TARGET_ROWS),
  });
  if (snap.rows.length === 0 || !(snap.totalVolume > 0)) return none("NO_VOLUME");

  let heaviest = 0;
  for (const r of snap.rows) if (r.total > heaviest) heaviest = r.total;

  return {
    version: COMPOSITE_PROFILE_VERSION,
    drawn: true,
    reason: "DRAWN",
    sessions: current - firstKept,
    bars: kept.length,
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
    asOf: kept[kept.length - 1].time,
  };
}

export default selectCompositeProfile;
