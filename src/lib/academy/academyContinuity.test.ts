import { describe, expect, it } from "vitest";
import { learnHref, returnLabel, safeChartsReturn } from "./academyContinuity";

describe("academy continuity — market → lesson → back to the same market", () => {
  it("links to a real lesson and carries the chart path back", () => {
    const h = learnHref("ANATOMY", "/charts?symbol=TSLA&tf=5m");
    expect(h).toBe("/education?lesson=sm-1&from=%2Fcharts%3Fsymbol%3DTSLA%26tf%3D5m");
    expect(returnLabel("/charts?symbol=NQ1!&tf=5m")).toBe("NQ1! 5m");
  });
  it("the way back is only ever a /charts path (no open redirect)", () => {
    expect(safeChartsReturn("https://evil.example/charts")).toBeNull();
    expect(safeChartsReturn("//evil.example")).toBeNull();
    expect(safeChartsReturn("/charts?symbol=TSLA&tf=5m")).toBe("/charts?symbol=TSLA&tf=5m");
    expect(safeChartsReturn("/journal")).toBeNull();
  });
});

describe("learn → return from another room keeps the market (hallway audit 2026-10-04)", () => {
  it("a Command Deck visit returns to the market room on the same symbol and timeframe", () => {
    const href = learnHref("ANATOMY", "/command-deck?symbol=NQ1!&tf=5m");
    const from = new URL(href, "https://wm.test").searchParams.get("from");
    expect(from).toBe("/charts?symbol=NQ1%21&tf=5m");
    expect(safeChartsReturn(from)).toBe(from);
  });
  it("a symbol with a slash survives encoded; garbage does not", () => {
    const from = new URL(learnHref("PRINT", "/command-deck?symbol=BTC/USD"), "https://wm.test").searchParams.get("from");
    expect(from).toBe("/charts?symbol=BTC%2FUSD");
    expect(new URL(learnHref("PRINT", "/command-deck?symbol=<script>"), "https://wm.test").searchParams.get("from")).toBe("/charts");
  });
});
