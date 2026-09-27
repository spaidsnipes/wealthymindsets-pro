/**
 * H-201 · A GHOST THE PANE CANNOT HOLD IS SAID AT THE EDGE, NOT CUT SILENTLY.
 *
 * Found beside canon H-201 in the Founder's Chrome (serving BTC 1h, 1440,
 * 2026-09-27): the receipt read memoryGhostClipped=TOP:10/20 and the glass
 * showed half a ghost with no sign the rest existed. The camera stays on NOW
 * (no rescale for context); the edge names the continuation instead.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");

describe("Memory Ghost clipping is visible", () => {
  it("names the continuation at the top and bottom edges, words gated by speaks()", () => {
    expect(MC).toContain('if (bracket && (clipTop || clipBot) && att.speaks("memoryGhost")) {');
    expect(MC).toContain("▲ ghost continues above · ${clipTop} of ${colYs.length}");
    expect(MC).toContain("▼ ghost continues below · ${clipBot} of ${colYs.length}");
  });
  it("never rescales the camera to fit the ghost", () => {
    const at = MC.indexOf("CLIPPED IS SAID, NOT SILENT");
    const block = MC.slice(at, at + 1800);
    expect(block).not.toMatch(/applyOptions|setVisibleRange|autoscaleInfoProvider|fitContent/);
  });
});
