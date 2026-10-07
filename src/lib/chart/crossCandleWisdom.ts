/**
 * CROSS-CANDLE WISDOM — Garden 19 §17, PURE.
 *
 * At most ONE quiet line, and only when the evidence object that proves it
 * exists on this camera. Every line carries its provenance (which owner, which
 * bars, which numbers) for Inspect; the glass shows the words only.
 *
 * Sources — each an existing owner, never a new reading:
 *   · Delta Keel (barDeltaKeel.readKeels)        → "SELL/BUY AGGRESSION FAILED TO DISPLACE"
 *   · Effort → Response (effortResponseField)    → "EFFORT INCREASING — RESPONSE WEAKENING"
 *   · Value Migration (selectValueMigration)     → "VALUE MIGRATING HIGHER / LOWER"
 *
 * Priority is recency of the phenomenon: a failure on the last finished bars
 * outranks a multi-bar divergence, which outranks a session's value drift.
 * No evidence object → null. Silence is data.
 */

import type { Keel } from "@/lib/chart/barDeltaKeel";
import type { EffortResponseBar } from "@/lib/chart/effortResponseField";

export type WisdomKind = "FAILED_AGGRESSION" | "EFFORT_UP_RESPONSE_DOWN" | "VALUE_MIGRATION";

export interface WisdomLine {
  readonly kind: WisdomKind;
  readonly text: string;
  /** Inspect provenance: owner · bars · numbers. Never painted on default glass. */
  readonly provenance: string;
  /** The bar the line is about (its newest evidence bar). */
  readonly time: number;
}

/** How many of the newest finished keels a failure may be found in. */
export const FAILURE_LOOKBACK = 3;
/** Effort / response trend window, in finished bars. */
export const TREND_BARS = 5;
/** Value travel, in ATR, that counts as migration. */
export const VALUE_MIN_ATR = 0.5;

const slope = (ys: readonly number[]): number => {
  const n = ys.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2, my = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (i - mx) * (ys[i] - my); den += (i - mx) ** 2; }
  return den > 0 ? num / den : 0;
};

export interface WisdomInput {
  /** Finished keels in view, chronological (newest last). */
  readonly keels?: readonly Keel[] | null;
  /** The newest finished bar's time — failures older than the lookback are history, not news. */
  readonly newestClosedTime?: number | null;
  readonly barSec?: number;
  /** Effort → response bars in view, chronological. */
  readonly field?: readonly EffortResponseBar[] | null;
  /** Value migration's latest-session POC travel (price) and the ATR to judge it by. */
  readonly valueTravel?: { readonly travel: number; readonly atr: number; readonly time: number } | null;
}

export function readCrossCandleWisdom(input: WisdomInput): WisdomLine | null {
  const keels = input.keels ?? [];
  const newest = input.newestClosedTime ?? null;
  const barSec = input.barSec && input.barSec > 0 ? input.barSec : 60;
  if (keels.length && newest != null) {
    for (let i = keels.length - 1; i >= 0; i--) {
      const k = keels[i];
      if (newest - k.time > (FAILURE_LOOKBACK - 1) * barSec) break;
      if (!k.failed) continue;
      const side = k.ratio < 0 ? "SELL" : "BUY";
      return {
        kind: "FAILED_AGGRESSION",
        text: `${side} AGGRESSION FAILED TO DISPLACE`,
        provenance: `Delta Keel · ${k.basis === "TAPE" ? "captured signed prints" : "provider bar sides"} · bar ${k.time} · delta ${k.delta} · ${(Math.abs(k.ratio) * 100).toFixed(0)}% of sided volume, price did not move its way`,
        time: k.time,
      };
    }
  }
  const f = input.field ?? [];
  if (f.length >= TREND_BARS) {
    const w = f.slice(-TREND_BARS);
    // Consecutive bars only: a gap in the sequence is not a trend.
    const contiguous = w.every((b, i) => i === 0 || b.time - w[i - 1].time <= barSec * 1.5);
    const se = slope(w.map(b => b.effort)), sr = slope(w.map(b => b.efficiency));
    if (contiguous && se > 0.15 && sr < -0.1 && w[w.length - 1].effort >= 1) {
      return {
        kind: "EFFORT_UP_RESPONSE_DOWN",
        text: "EFFORT INCREASING — RESPONSE WEAKENING",
        provenance: `Effort → Response · last ${TREND_BARS} finished bars · effort ${w.map(b => b.effort.toFixed(2)).join("→")}× median · response per effort ${w.map(b => b.efficiency.toFixed(2)).join("→")}`,
        time: w[w.length - 1].time,
      };
    }
  }
  const v = input.valueTravel;
  if (v && v.atr > 0 && Math.abs(v.travel) >= VALUE_MIN_ATR * v.atr) {
    return {
      kind: "VALUE_MIGRATION",
      text: `VALUE MIGRATING ${v.travel > 0 ? "HIGHER" : "LOWER"}`,
      provenance: `Value Migration · latest session POC travel ${v.travel > 0 ? "+" : ""}${v.travel} (${(v.travel / v.atr).toFixed(2)} ATR) · candle-estimated value`,
      time: v.time,
    };
  }
  return null;
}
