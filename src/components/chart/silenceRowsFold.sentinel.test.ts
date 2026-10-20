import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
// Serving EURUSD 5m, 2026-10-01: ten silence lines over the candles.
describe("silence lines fold instead of walling the market", () => {
  it("shows a few on a backing, folds the rest into one line", () => {
    expect(MC).toContain("const SILENCE_ROWS_SHOWN = shortPane ? 2 : 3;");
    expect(MC).toContain("if (silenceTaken >= SILENCE_ROWS_SHOWN) { silenceFolded++; return -1000; }");
    // 2026-10-20: the summary is the short chip at every width, and a pure silence folds into it before taking a row.
    expect(MC).toContain("`${silenceFolded} SILENT — TOOLS ›`");
    expect(MC).toContain("if (words && PURE_SILENCE.test(words.toUpperCase())) { silenceFolded++; return -1000; }");
  });
});
