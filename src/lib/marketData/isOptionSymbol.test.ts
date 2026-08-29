/**
 * isOptionSymbol — OCC-form option-symbol detector tests.
 */

import { describe, it, expect } from "vitest";
import { isOptionSymbol } from "./isOptionSymbol";

describe("isOptionSymbol — canon OCC form", () => {
  it("returns false for null / undefined / empty", () => {
    expect(isOptionSymbol(null)).toBe(false);
    expect(isOptionSymbol(undefined)).toBe(false);
    expect(isOptionSymbol("")).toBe(false);
    expect(isOptionSymbol("   ")).toBe(false);
  });

  it("returns true for canonical OCC symbols", () => {
    expect(isOptionSymbol("AAPL240119C00185000")).toBe(true); // AAPL Call
    expect(isOptionSymbol("SPY240119P00450000")).toBe(true);  // SPY Put
    expect(isOptionSymbol("A241220C00050000")).toBe(true);    // 1-char root
    expect(isOptionSymbol("GOOGL240119C00185000")).toBe(true); // 5-char root
  });

  it("normalizes lowercase input to uppercase and matches", () => {
    expect(isOptionSymbol("aapl240119c00185000")).toBe(true);
  });

  it("trims whitespace before matching", () => {
    expect(isOptionSymbol("  AAPL240119C00185000  ")).toBe(true);
  });

  it("returns false for plain equity / futures / crypto tickers", () => {
    expect(isOptionSymbol("AAPL")).toBe(false);
    expect(isOptionSymbol("NQ1!")).toBe(false);
    expect(isOptionSymbol("BTC")).toBe(false);
    expect(isOptionSymbol("BTC-USD")).toBe(false);
    expect(isOptionSymbol("BRK.A")).toBe(false);
  });

  it("returns false for near-miss shapes (wrong strike length, missing C/P)", () => {
    expect(isOptionSymbol("AAPL240119C0018500")).toBe(false);   // 7-digit strike
    expect(isOptionSymbol("AAPL240119X00185000")).toBe(false);  // bad type char
    expect(isOptionSymbol("AAPL2401C00185000")).toBe(false);    // 4-digit date
    expect(isOptionSymbol("240119C00185000")).toBe(false);      // missing root
  });

  it("rejects roots longer than 6 characters", () => {
    expect(isOptionSymbol("TOOLONG240119C00185000")).toBe(false);
  });
});
