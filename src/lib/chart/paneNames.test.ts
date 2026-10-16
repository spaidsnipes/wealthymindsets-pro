import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PANE_INDICATORS, paneTitle, paneValueText } from "./paneNames";

describe("plate 29 · every pane names itself", () => {
  it("names a pane from the indicators that are on", () => {
    expect(paneTitle("rsi", new Set(["RSI"]))).toBe("RSI");
    expect(paneTitle("macd", new Set(["MACD"]))).toBe("MACD");
    expect(paneTitle("unknown", new Set())).toBe("UNKNOWN");
  });
  it("prints the corner value plainly", () => {
    expect(paneValueText(46.6234)).toBe("46.62");
    expect(paneValueText(29417)).toBe("29,417");
    expect(paneValueText(-1591.2)).toBe("−1,591");
    expect(paneValueText(NaN)).toBeNull();
  });
  it("SENTINEL: every pane id MainChart opens has a row in the table", () => {
    const src = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
    const ids = new Set([...src.matchAll(/(?:setupScale|paneFor)\("([a-zA-Z0-9_]+)"/g)].map(m => m[1]));
    expect(ids.size).toBeGreaterThan(20);
    const missing = [...ids].filter(id => !(id in PANE_INDICATORS));
    expect(missing).toEqual([]);
  });
});
