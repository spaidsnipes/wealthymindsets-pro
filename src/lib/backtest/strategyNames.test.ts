import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { BACKTEST_STRATEGIES, backtestStrategyDisplay, backtestStrategyName } from "./strategyNames";
import { runRealBacktest } from "./engine";

describe("backtest strategy names — shown by id through the one owner", () => {
  it("ids are unchanged; today's names are the corrected ones", () => {
    expect(BACKTEST_STRATEGIES.map(s => s.id)).toEqual(["clc", "vwap", "wyckoff", "momentum"]);
    expect(backtestStrategyName("wyckoff")).toBe("Range Sweep & Reclaim");
    expect(backtestStrategyName("nope")).toBeNull();
  });

  it("a result stamped with an OLD label shows today's name + (renamed); a current one shows the name alone", () => {
    expect(backtestStrategyDisplay("wyckoff", "Wyckoff Spring / UTAD")).toBe("Range Sweep & Reclaim (renamed)");
    expect(backtestStrategyDisplay("vwap", "VWAP Deviation Fade")).toBe("Rolling-VWAP Deviation Fade (renamed)");
    expect(backtestStrategyDisplay("momentum", "20-Bar Range Break")).toBe("20-Bar Range Break");
    expect(backtestStrategyDisplay("momentum", null)).toBe("20-Bar Range Break");
    // Unknown id: the stamped label, never a guessed name.
    expect(backtestStrategyDisplay("retired-x", "Old Thing")).toBe("Old Thing");
    expect(backtestStrategyDisplay(null, null)).toBe("unnamed strategy");
  });

  it("a run records the id it ran under; the page names results by that id, not the current selection", () => {
    const bars = Array.from({ length: 80 }, (_, i) => ({ time: 1_790_000_000 + i * 300, open: 100 + i * 0.1, high: 101 + i * 0.1, low: 99 + i * 0.1, close: 100.5 + i * 0.1, volume: 1000 + (i % 7) * 300 }));
    const r = runRealBacktest(bars, "SPY", "momentum", "Breakout Momentum");
    expect(r.meta.strategyId).toBe("momentum");
    if (r.trades.length) expect(backtestStrategyDisplay(r.meta.strategyId, r.trades[0].signal)).toBe("20-Bar Range Break (renamed)");
    const page = readFileSync(path.resolve(__dirname, "../../app/backtesting/page.tsx"), "utf8");
    expect(page.length).toBeGreaterThan(1000);
    expect(page).toContain("const STRATEGIES = BACKTEST_STRATEGIES;");
    expect(page).toContain("backtestStrategyDisplay(result.meta.strategyId, result.trades[0]?.signal ?? null)");
    expect(page).not.toMatch(/\{symbol\} · \{tf\} · \{strategy\.label\}/);
  });
});
