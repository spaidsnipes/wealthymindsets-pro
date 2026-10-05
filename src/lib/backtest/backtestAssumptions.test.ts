import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BACKTEST_ASSUMPTIONS } from "./engine";

describe("a backtest declares its fills and costs (super order §7)", () => {
  it("names next-bar entry, gap fills and the absence of costs", () => {
    expect(BACKTEST_ASSUMPTIONS).toMatch(/NEXT bar's open/);
    expect(BACKTEST_ASSUMPTIONS).toMatch(/gapped beyond/);
    expect(BACKTEST_ASSUMPTIONS).toMatch(/No commissions, fees or slippage/);
  });
  it("a stop that a bar opened beyond fills at that open, never at the stop", () => {
    const src = readFileSync(path.resolve(__dirname, "engine.ts"), "utf8");
    expect(src).toMatch(/bj\.open < stop \? bj\.open : stop/);
    expect(src).toMatch(/bj\.open > stop \? bj\.open : stop/);
  });
  it("every result carries the assumptions to the page", () => {
    expect(readFileSync(path.resolve(__dirname, "../../app/backtesting/page.tsx"), "utf8")).toContain("result.meta.assumptions");
  });
});
