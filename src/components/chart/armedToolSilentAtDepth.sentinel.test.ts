/**
 * GARDEN 16 §46 · AN ARMED TOOL SILENCED BY DEPTH SAYS SO — 2026-09-27.
 *
 * Serving b28007a9, BTC-USD 1m (live sided tape, 9/9 ready): Smart Money ›
 * Big Trades pressed at FAR depth → `footprint: SILENT:FAR`, nothing on the
 * glass, and the door said nothing. The permission table is right (prints
 * speak from MID inward); the door now reads it back in words.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { permissionAt } from "@/lib/marketData/viewModels/selectSemanticPermission";

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");
const FC = read("src/components/chart/FootprintControls.tsx");
const MC = read("src/components/chart/MainChart.tsx");
const CD = read("src/components/chart/ChartsDashboard.tsx");

describe("armed tool silent at depth", () => {
  it("the table still silences prints at FAR and lets them speak at MID (positive control)", () => {
    expect(permissionAt("bigTrades", "FAR")).toBe("SILENT");
    expect(permissionAt("bigTrades", "MID")).toBe("SPEAK");
    expect(permissionAt("footprint", "FAR")).toBe("SILENT");
  });

  it("the door asks the ONE permission table — no private depth rule", () => {
    expect(FC).toContain('permissionAt(armed === "big-trades" ? "bigTrades" : "footprint", semanticDepth) === "SILENT"');
    expect(FC).toContain("`Armed, silent at ${silencedAt} — zoom in (fewer bars) and the prints speak`");
  });

  it("the glass publishes its measured depth on change only, and the room hands it to every order-flow door", () => {
    expect(MC).toContain("if (semanticDepthSentRef.current !== String(depthNow)) {");
    expect(CD).toContain("onSemanticDepth={setSemanticDepth}");
    expect(CD.match(/semanticDepth=\{semanticDepth\}/g) ?? []).toHaveLength(2);
  });
});
