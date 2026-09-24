/**
 * DEVELOPING VALUE MIGRATION — the Living Profile's movie, on the candles.
 *
 * Child: DEVELOPING VALUE MIGRATION. Parent: F09 Profiles › Living Profile
 * ("auction movie · developing POC migration · value expansion / contraction
 * / translation"). Class: CHART LANGUAGE. House surface: /charts, painted
 * across the candles it developed with. Plate: P-110 #1 LIVING ("breathing,
 * adaptive profile"); Registry F.1.
 *
 * ── WHY ────────────────────────────────────────────────────────────────────
 *
 * A histogram at the right edge is the END of the auction. It cannot say
 * whether value got there by climbing, by sitting still, or by snapping back.
 * The developing POC, VAH and VAL — recomputed after every bar from every bar
 * before it in the same session — are that history, and they are drawn at the
 * time they were true. A trader sees value migrate with price (accepted), lag
 * behind it (unaccepted), or widen and narrow (expansion / contraction).
 *
 * ── THE RULES ──────────────────────────────────────────────────────────────
 *
 *   1. NO LOOKAHEAD. The point at bar i uses bars ≤ i only. This is the whole
 *      invention; a developing value that knows the future is a repaint.
 *   2. ONE GRID that NO LATER BAR CAN MOVE. The tick comes from the first
 *      bar's price level only, and bucket edges are absolute multiples of it.
 *      Deriving the tick from the whole window's range would let a future bar
 *      re-bucket past points — a repaint by the back door. A window too wide
 *      for that grid is refused (RANGE_TOO_WIDE), never re-bucketed.
 *   3. SESSIONS RESET. A gap longer than SESSION_GAP_FACTOR × the median bar
 *      interval starts a new auction; the lines break there instead of
 *      carrying yesterday's value into today.
 *   4. QUALITY IS STATED. Built from bars, volume is spread over each bar's
 *      range (candle-estimated) and the VM says so.
 *   5. A POINT IS A TIME AND A PRICE. Nothing else reaches a coordinate.
 *
 * PURE. DETERMINISTIC. No React, no canvas, no IO, no clock.
 */

import { chooseTickSize } from "@/lib/vpEngine";
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";

export const VALUE_MIGRATION_VERSION = 1;
export const MIGRATION_TARGET_ROWS = 120;
export const MIGRATION_VALUE_AREA_PCT = 0.7;
/** A session needs this many bars before its value is worth drawing. */
export const MIN_SESSION_BARS = 3;
export const SESSION_GAP_FACTOR = 3;
/** Grid ceiling so a pathological range cannot allocate a huge array. */
export const MAX_MIGRATION_ROWS = 20_000;

export type ValueMigrationReason = "DRAWN" | "NO_BARS" | "FLAT_RANGE" | "NO_VOLUME" | "RANGE_TOO_WIDE";

export interface ValueMigrationPoint {
  /** Bar time (unix seconds) — the moment this value was true. */
  readonly time: number;
  readonly poc: number;
  readonly vah: number;
  readonly val: number;
  /** Index of the session this point belongs to; lines break between sessions. */
  readonly session: number;
}

export interface ValueMigrationVM {
  readonly version: number;
  readonly drawn: boolean;
  readonly reason: ValueMigrationReason;
  readonly points: readonly ValueMigrationPoint[];
  readonly sessions: number;
  readonly quality: "candle-estimated";
  /** Signed POC travel in the latest session, in price — a fact, not a call. */
  readonly latestPocTravel: number | null;
}

const empty = (reason: Exclude<ValueMigrationReason, "DRAWN">): ValueMigrationVM => ({
  version: VALUE_MIGRATION_VERSION,
  drawn: false,
  reason,
  points: [],
  sessions: 0,
  quality: "candle-estimated",
  latestPocTravel: null,
});

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

export function selectValueMigration(
  input: readonly LegacyOhlcvTuple[] | null | undefined,
): ValueMigrationVM {
  const bars = (input ?? [])
    .filter(b => Number.isFinite(b.time) && Number.isFinite(b.high) && Number.isFinite(b.low) && b.high >= b.low)
    .slice()
    .sort((a, b) => a.time - b.time);
  if (bars.length === 0) return empty("NO_BARS");

  let hi = -Infinity;
  let lo = Infinity;
  let anyVolume = false;
  for (const b of bars) {
    if (b.high > hi) hi = b.high;
    if (b.low < lo) lo = b.low;
    if (b.volume > 0) anyVolume = true;
  }
  if (!(hi - lo > 0)) return empty("FLAT_RANGE");
  if (!anyVolume) return empty("NO_VOLUME");

  // RULE 2 — the grid depends on the FIRST bar only. ~3% of its price split
  // into MIGRATION_TARGET_ROWS rows; edges are absolute multiples of the tick.
  const ref = Math.abs(bars[0].close) || Math.abs(bars[0].high) || 1;
  const tick = chooseTickSize(ref * 0.03, MIGRATION_TARGET_ROWS);
  const base = Math.floor(lo / tick + 1e-9) * tick;
  const idx = (p: number) => Math.floor((p - base) / tick + 1e-9);
  const n = idx(hi) + 1;
  if (n > MAX_MIGRATION_ROWS) return empty("RANGE_TOO_WIDE");
  // `base` only offsets the array; a price is base + i·tick, and because base
  // is itself a tick multiple the PRICE of a bucket never depends on `lo`.
  const priceAt = (i: number) => +((base + i * tick).toFixed(10));

  const gaps: number[] = [];
  for (let i = 1; i < bars.length; i++) gaps.push(bars[i].time - bars[i - 1].time);
  const step = median(gaps.filter(g => g > 0));
  const breakAfter = step > 0 ? step * SESSION_GAP_FACTOR : Infinity;

  const points: ValueMigrationPoint[] = [];
  let vol = new Float64Array(n);
  let total = 0;
  let pocIdx = -1;
  let session = 0;
  let sessionBars = 0;
  let sessionFirstPoc: number | null = null;
  let latestPocTravel: number | null = null;

  for (let k = 0; k < bars.length; k++) {
    const b = bars[k];
    if (k > 0 && b.time - bars[k - 1].time > breakAfter) {
      // RULE 3 — a new auction. Yesterday's value does not carry over.
      session++;
      vol = new Float64Array(n);
      total = 0;
      pocIdx = -1;
      sessionBars = 0;
      sessionFirstPoc = null;
    }
    sessionBars++;
    if (b.volume > 0) {
      const a = idx(b.low);
      const z = idx(b.high);
      const per = b.volume / (z - a + 1);
      for (let i = a; i <= z; i++) {
        vol[i] += per;
        // Ties keep the earlier POC: a developing POC should not flicker
        // between two equal buckets on every bar.
        if (pocIdx < 0 || vol[i] > vol[pocIdx]) pocIdx = i;
      }
      total += b.volume;
    }
    if (pocIdx < 0 || sessionBars < MIN_SESSION_BARS) continue;

    // Value area from the POC outward, busier side first, "above" on a tie —
    // the same walk as the volume engine so the two value areas agree.
    const target = MIGRATION_VALUE_AREA_PCT * total;
    let vLo = pocIdx;
    let vHi = pocIdx;
    let acc = vol[pocIdx];
    while (acc < target && (vLo > 0 || vHi < n - 1)) {
      const above = vHi < n - 1 ? vol[vHi + 1] : -1;
      const below = vLo > 0 ? vol[vLo - 1] : -1;
      if (above >= below) { vHi++; acc += vol[vHi]; } else { vLo--; acc += vol[vLo]; }
    }
    // Trim empty edges the walk may have crossed: value lives where volume is.
    while (vHi > pocIdx && vol[vHi] === 0) vHi--;
    while (vLo < pocIdx && vol[vLo] === 0) vLo++;

    const poc = priceAt(pocIdx);
    if (sessionFirstPoc === null) sessionFirstPoc = poc;
    latestPocTravel = +(poc - sessionFirstPoc).toFixed(10);
    points.push({ time: b.time, poc, vah: priceAt(vHi), val: priceAt(vLo), session });
  }

  if (points.length === 0) return empty("NO_VOLUME");
  return {
    version: VALUE_MIGRATION_VERSION,
    drawn: true,
    reason: "DRAWN",
    points,
    sessions: session + 1,
    quality: "candle-estimated",
    latestPocTravel,
  };
}

export default selectValueMigration;
