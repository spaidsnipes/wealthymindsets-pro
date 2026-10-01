import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");

// Plate 72 (F05A) shows the candle's reading ON the glass at rest. A
// hover-only readout left the Founder unable to tell what Clarity is
// (Garden 18 §XXX, serving TSLA 15m beside the plate, 2026-10-01).
describe("Clarity Candle reads itself at rest", () => {
  it("with no hover the readout pins to the newest CLOSED bar", () => {
    expect(MC).toContain("const pinned = hoverI < 0;");
    expect(MC).toContain("const hi = pinned ? bsC.length - 2 : hoverI;");
    expect(MC).toContain('calloutFor = `${pinned ? "PINNED" : "HOVER"}:${hb.time}`;');
  });
});
