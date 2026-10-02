import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
// Serving EURUSD 5m, 2026-10-01: ten silence lines over the candles.
describe("silence lines fold instead of walling the market", () => {
  it("shows a few on a backing, folds the rest into one line", () => {
    expect(MC).toContain("const SILENCE_ROWS_SHOWN = shortPane ? 2 : 3;");
    expect(MC).toContain("if (silenceTaken >= SILENCE_ROWS_SHOWN) { silenceFolded++; return -1000; }");
    expect(MC).toContain("MORE SENSE${silenceFolded === 1 ? \"\" : \"S\"} SILENT HERE — TOOLS › ACTIVE SAYS WHY");
  });
});
