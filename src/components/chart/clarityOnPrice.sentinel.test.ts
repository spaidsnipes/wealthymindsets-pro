/**
 * F05B ON PRICE — the selected candle's anatomy is painted on the candle from
 * the ONE clarity owner, and its pressure split reads only sided prints.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
const at = MC.indexOf("F05B · THE CANDLE'S ANATOMY ON PRICE");
const block = at > 0 ? MC.slice(at, MC.indexOf("CANDLE TIMER — countdown pinned", at)) : "";

describe("F05B clarity on price", () => {
  it("exists, asks the permission table as a selected item, reads the one clarity owner", () => {
    expect(block.length).toBeGreaterThan(500);
    expect(block).toContain('att.paints("anatomyCards", { selectedItem: true })');
    expect(block).toContain("selectClarityAnatomy({");
  });
  it("pressure split comes only from sided prints — never candle colour", () => {
    expect(block).toContain("tickAccRef.current.get(Number(barA.time))");
    expect(block).toContain("PRESSURE · UNREAD — no sided prints for this bar");
    expect(block).not.toMatch(/close\s*>\s*open.*BUY|isGreen|bullCandle/);
  });
  it("an old bar's split falls back ONLY to the provider's own bar sides, and says so", () => {
    expect(block).toContain("const csA = candleSidedRef.current.get(Number(barA.time));");
    expect(block).toContain('splitSrc = "bar sides (provider)"');
  });
});
