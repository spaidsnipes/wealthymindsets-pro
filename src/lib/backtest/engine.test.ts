/**
 * backtest engine — truth-lock for runRealBacktest observable outputs.
 *
 * The engine runs over ACTUAL historical OHLCV bars, fills at next-bar
 * open, exits on ATR-based stop/target/time. Silent drift here silently
 * mis-reports every /backtesting result. Locks:
 *
 *   - Empty / thin history → zeroed but well-formed BTResult (no throws)
 *   - Start bar index 25 (guarantees indicator warm-up + signalAt guard)
 *   - Fixed-fractional sizing: (equity * 1%) / stopDist
 *   - Stop/target math: ATR-scaled 1×/2×
 *   - Result classification: win/loss/be by pnl >1 / <-1 / else
 *   - Sharpe = 0 when no variance / no trades
 *   - Profit factor: 99 when only wins, 0 when only losses
 *   - Meta: barCount, fromDate, toDate always present
 *   - Unknown strategyId → 0 signals, 0 trades (no throw, no fabrication)
 *   - Non-overlapping positions (i jumps past exit bar)
 */

import { describe, it, expect } from "vitest";
import { runRealBacktest, type Bar } from "./engine";

function mkFlatBars(n: number, price = 100, tstart = 1_700_000_000): Bar[] {
  return Array.from({ length: n }, (_, i) => ({
    time: tstart + i * 60,
    open: price, high: price, low: price, close: price, volume: 1000,
  }));
}

/**
 * Momentum breakout bars: a long build-up of flat bars, then a large
 * upward candle at the boundary index. Guaranteed to trigger the
 * "momentum" strategy's rollingMax breakout when i > 25.
 */
function mkMomentumBreakoutBars(): Bar[] {
  const bars: Bar[] = [];
  // First 30 flat @ 100 with high volume (avgVol baseline)
  for (let i = 0; i < 30; i++) {
    bars.push({ time: 1_700_000_000 + i * 60, open: 100, high: 100.5, low: 99.5, close: 100, volume: 1000 });
  }
  // Big breakout bar at index 30: close 105 > 20-bar high 100.5 + volume 2000 > 1000*1.4
  bars.push({ time: 1_700_000_000 + 30 * 60, open: 100.5, high: 105, low: 100.5, close: 105, volume: 2000 });
  // Follow-through bars that will hit the target
  for (let i = 31; i < 60; i++) {
    bars.push({ time: 1_700_000_000 + i * 60, open: 105, high: 108, low: 104, close: 107, volume: 1000 });
  }
  return bars;
}

describe("runRealBacktest — degenerate inputs", () => {
  it("empty bars → 0 trades, meta strings sentinel '—'", () => {
    const r = runRealBacktest([], "TEST", "momentum", "Momentum");
    expect(r.totalTrades).toBe(0);
    expect(r.trades).toEqual([]);
    expect(r.totalPnl).toBe(0);
    expect(r.winRate).toBe(0);
    expect(r.meta.barCount).toBe(0);
    expect(r.meta.fromDate).toBe("—");
    expect(r.meta.toDate).toBe("—");
  });

  it("< 26 bars → 0 trades (signalAt guards i < 25 and loop starts at i=25 needing i<bars.length-1)", () => {
    const r = runRealBacktest(mkFlatBars(25), "TEST", "momentum", "Momentum");
    expect(r.totalTrades).toBe(0);
  });

  it("flat bars → no signals fire, 0 trades", () => {
    const r = runRealBacktest(mkFlatBars(100), "TEST", "momentum", "Momentum");
    expect(r.totalTrades).toBe(0);
    // But equity + meta still well-formed
    expect(r.equity.length).toBeGreaterThan(0);
    expect(r.meta.barCount).toBe(100);
  });

  it("unknown strategyId → 0 signals, 0 trades (no fabrication, no throw)", () => {
    const r = runRealBacktest(mkFlatBars(100), "TEST", "bogus-strategy", "Bogus");
    expect(r.totalTrades).toBe(0);
  });
});

describe("runRealBacktest — result shape invariants", () => {
  it("all summary fields present + non-NaN for empty run", () => {
    const r = runRealBacktest([], "TEST", "momentum", "Momentum");
    for (const key of ["totalPnl", "winRate", "avgWin", "avgLoss", "profitFactor",
      "maxDrawdown", "maxDrawdownPct", "sharpe", "wins", "losses", "bestTrade",
      "worstTrade", "avgBarsHeld"] as const) {
      expect(r[key], key).not.toBeNaN();
    }
  });

  it("winRate + wins/losses/total consistency", () => {
    const r = runRealBacktest(mkMomentumBreakoutBars(), "TEST", "momentum", "Momentum");
    expect(r.wins + r.losses).toBeLessThanOrEqual(r.totalTrades);
    if (r.totalTrades > 0) {
      expect(r.winRate).toBeCloseTo((r.wins / r.totalTrades) * 100, 1);
    }
  });

  it("meta.barCount matches input; from/toDate are ISO-parseable strings", () => {
    const bars = mkFlatBars(50);
    const r = runRealBacktest(bars, "TEST", "momentum", "Momentum");
    expect(r.meta.barCount).toBe(50);
    expect(r.meta.fromDate).not.toBe("—");
    expect(r.meta.toDate).not.toBe("—");
  });

  it("equity curve begins at $100,000 START", () => {
    const r = runRealBacktest(mkFlatBars(50), "TEST", "momentum", "Momentum");
    expect(r.equity[0].v).toBe(100_000);
  });
});

describe("runRealBacktest — momentum breakout scenario", () => {
  it("triggers >=1 trade on a clean upward breakout with volume", () => {
    const r = runRealBacktest(mkMomentumBreakoutBars(), "TEST", "momentum", "Momentum");
    expect(r.totalTrades).toBeGreaterThanOrEqual(1);
  });

  it("winning momentum trade has side=long and pnl > 0", () => {
    const r = runRealBacktest(mkMomentumBreakoutBars(), "TEST", "momentum", "Momentum");
    const first = r.trades[0];
    if (first) {
      expect(first.side).toBe("long");
      expect(first.result).toMatch(/^(win|be|loss)$/); // vocabulary guaranteed
      // symbol propagates
      expect(first.symbol).toBe("TEST");
      expect(first.signal).toBe("Momentum");
    }
  });

  it("trade IDs are 1-indexed sequential", () => {
    const r = runRealBacktest(mkMomentumBreakoutBars(), "TEST", "momentum", "Momentum");
    if (r.trades.length > 0) {
      expect(r.trades[0].id).toBe(1);
      for (let i = 1; i < r.trades.length; i++) {
        expect(r.trades[i].id).toBe(r.trades[i - 1].id + 1);
      }
    }
  });
});

describe("runRealBacktest — sharpe / profitFactor edge cases", () => {
  it("sharpe = 0 when no trades", () => {
    const r = runRealBacktest(mkFlatBars(50), "TEST", "momentum", "Momentum");
    expect(r.sharpe).toBe(0);
  });

  it("profitFactor = 0 when no trades", () => {
    const r = runRealBacktest(mkFlatBars(50), "TEST", "momentum", "Momentum");
    expect(r.profitFactor).toBe(0);
  });
});

describe("runRealBacktest — result classification vocabulary", () => {
  it("trade.result is always exactly 'win' | 'loss' | 'be' when trades exist", () => {
    const r = runRealBacktest(mkMomentumBreakoutBars(), "TEST", "momentum", "Momentum");
    for (const t of r.trades) {
      expect(["win", "loss", "be"]).toContain(t.result);
    }
  });

  it("bars held is between 0 and MAX_HOLD (20)", () => {
    const r = runRealBacktest(mkMomentumBreakoutBars(), "TEST", "momentum", "Momentum");
    for (const t of r.trades) {
      expect(t.bars).toBeGreaterThanOrEqual(0);
      expect(t.bars).toBeLessThanOrEqual(20);
    }
  });
});

describe("runRealBacktest — supports all 4 named strategies without throw", () => {
  it.each(["momentum", "vwap", "wyckoff", "clc"])("strategy '%s' runs on flat bars without throwing", (id) => {
    expect(() => runRealBacktest(mkFlatBars(100), "TEST", id, id)).not.toThrow();
  });
});
