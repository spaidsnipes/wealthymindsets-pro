/**
 * SCANNER SIGNAL WORDS SAY WHAT THE LADDER MEASURED (night shift 2026-10-07).
 *
 * The ladder (`lib/scannerSignalEvidence.ts`) reads exactly three numbers per
 * row: percent change since the reference close, volume ÷ average volume, and
 * RSI. It never measures a breakout level, a VWAP, a Fibonacci retracement, a
 * supply zone or a gap. The old words did: "Breakout ↑", "VWAP Reclaim",
 * "Fib Bounce", "Supply Reject" and the old gap label each claimed a structure the scan
 * cannot see. Each word now names its own threshold, and the thresholds here
 * are proven equal to the ladder's by `signalLabels.test.ts`.
 *
 * Signals the ladder never emits (dark pool, Wyckoff, CVD divergence, options
 * flow, earnings) keep a plain name — no scanned row can carry them today.
 */
import type { Signal } from "@/lib/scannerSignalEvidence";

export const SIGNAL_LABEL: Readonly<Record<Signal, string>> = {
  "breakout-bull":  "Up 3%+ · 3× vol",
  "breakout-bear":  "Down 3%+ · 3× vol",
  "momentum-long":  "Up 1.5%+ · 2× vol",
  "momentum-short": "Down 1.5%+ · 2× vol",
  "volume-surge":   "Volume 5×+",
  "fib-bounce":     "RSI under 35",
  "supply-reject":  "RSI over 70",
  "vwap-reclaim":   "Up 0.5%+",
  // "Range · no trigger" wrapped to two lines in the 112px signal column at
  // 390 (serving 944ffd4, 2026-10-07 22:2x CDT); the measured fact is "no trigger".
  "gap-fill":       "No trigger",
  "dark-pool":      "Dark Pool Print",
  "wyckoff-accum":  "Wyckoff Accum.",
  "wyckoff-dist":   "Wyckoff Dist.",
  "cvd-div-bull":   "CVD Divergence ↑",
  "cvd-div-bear":   "CVD Divergence ↓",
  "options-flow":   "Options Flow",
  "earnings-play":  "Earnings",
};

/** Preset tabs, named by what they gather — no trade direction is recommended. */
export const PRESET_LABEL = {
  hot: "🔥 Up + volume",
  volume: "⚡ Volume 5×+",
  reclaim: "🎯 Mild up · RSI low",
  short: "🩸 Down movers",
  range: "↩ Range · RSI extremes",
  all: "📋 All",
} as const;
