/**
 * BACKTEST STRATEGY NAMES — the ONE owner of what each strategy id is called
 * (night shift 2026-10-07: the names were corrected to say what
 * engine.ts signalAt() actually tests). Strategy ids never change; names may.
 *
 * A result carries the id it ran under (`BTResult.meta.strategyId`) and the
 * label its trades were stamped with (`BTTrade.signal`). Past results are shown
 * by ID through this owner; when the stamped label differs from today's name
 * the display adds "(renamed)" — the record is never rewritten (no migration).
 *
 * PURE.
 */

export interface BacktestStrategy {
  readonly id: string;
  readonly label: string;
  readonly desc: string;
}

// Each name and line says what lib/backtest/engine.ts signalAt() actually tests.
// "VWAP" there is a ROLLING 20-bar VWAP (not the session VWAP), and the old
// "Wyckoff … Phase C" detected no Wyckoff phase — it is a 20-bar range sweep
// that closes back inside.
export const BACKTEST_STRATEGIES: readonly BacktestStrategy[] = [
  { id: "clc",        label: "CLC Rule — OHLCV",           desc: "Fast EMA above/below slow + close within 0.5 ATR of the fast EMA + bar volume 1.1× its 20-bar average" },
  { id: "vwap",       label: "Rolling-VWAP Deviation Fade", desc: "Fade a close more than 2σ from the 20-bar rolling VWAP (not the session VWAP)" },
  { id: "wyckoff",    label: "Range Sweep & Reclaim",      desc: "Wick beyond the 20-bar high/low that closes back inside (spring / upthrust style — no Wyckoff phase is detected)" },
  { id: "momentum",   label: "20-Bar Range Break",         desc: "Close beyond the 20-bar high/low on volume 1.4× its 20-bar average" },
];

/** Today's name for a strategy id, or null when the id is unknown. */
export function backtestStrategyName(id: string | null | undefined): string | null {
  return BACKTEST_STRATEGIES.find(s => s.id === id)?.label ?? null;
}

/**
 * How a past result names its strategy: today's name by id; "(renamed)" when
 * the label stamped on the result differs; the stamped label alone when the id
 * is unknown (never a guessed name).
 */
export function backtestStrategyDisplay(id: string | null | undefined, storedLabel?: string | null): string {
  const now = backtestStrategyName(id);
  const stored = storedLabel?.trim() || null;
  if (!now) return stored ?? "unnamed strategy";
  return stored && stored !== now ? `${now} (renamed)` : now;
}
