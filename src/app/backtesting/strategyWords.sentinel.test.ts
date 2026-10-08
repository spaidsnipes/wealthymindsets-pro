import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Night shift 2026-10-07: a strategy's name and line say what signalAt() tests. */
describe("backtest strategy words match the engine", () => {
  const page = readFileSync("src/app/backtesting/page.tsx", "utf8");
  const engine = readFileSync("src/lib/backtest/engine.ts", "utf8");
  it("the rolling VWAP is called rolling, and Wyckoff phases are not claimed", () => {
    expect(engine).toMatch(/Rolling VWAP/);
    expect(page).toContain("Rolling-VWAP Deviation Fade");
    expect(page).not.toMatch(/Phase C accumulation/);
    expect(page).toContain("no Wyckoff phase is detected");
  });
  it("the thresholds named in the words are the engine's", () => {
    expect(engine).toContain("b.volume > avgVol * 1.4");
    expect(page).toContain("1.4× its 20-bar average");
    expect(engine).toContain("ind.atr[i] * 0.5");
    expect(page).toContain("within 0.5 ATR");
    expect(engine).toContain("if (dev > 2)");
    expect(page).toContain("more than 2σ");
  });
});
