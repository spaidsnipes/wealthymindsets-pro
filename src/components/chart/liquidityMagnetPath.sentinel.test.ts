/**
 * MAGNET & PATH — plates 25 / 62 ("pulled toward remembered pool"), 2026-10-17.
 * NQ 15m had six measured pools, every one off camera by price, and the layer drew only a silence line.
 * The nearest STANDING pool above and below price that sits off camera is now drawn at the pane's edge:
 * rings, a dashed path from the live price, one word with price · stage · distance — or held, never forced.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SRC = readFileSync("src/components/chart/MainChart.tsx", "utf8");

describe("an off-camera standing pool is drawn as a magnet, not a silence", () => {
  it("only standing pools (never consumed or pulled), the nearest on each side", () => {
    expect(SRC).toContain(".filter(o => o.sp && !o.sp.consumed && !o.sp.pulled);");
    expect(SRC).toContain("const upL = standingL.filter(o => o.pl.low > priceNowL).sort((a, b) => a.pl.low - b.pl.low)[0];");
    expect(SRC).toContain("const dnL = standingL.filter(o => o.pl.high < priceNowL).sort((a, b) => b.pl.high - a.pl.high)[0];");
  });
  it("the word asks the keep-out and is held when blocked; the receipt names each magnet", () => {
    expect(SRC).toContain("if (spotM.mode !== \"BLOCKED\") {");
    expect(SRC).toContain("magnetRx.push(`${dir}:${mid.toFixed(2)}:${o.pl.stage}:${spotM.mode}`);");
  });
  it("the silence line speaks only when no pool painted and no magnet stood", () => {
    expect(SRC).toContain("if (painted === 0 && magnetsL === 0) {");
  });
});
