/**
 * DUAL ANATOMY — the Founder body is a manifestation of canonical events only.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
const at = MC.indexOf("DUAL ANATOMY · THE FOUNDER BODY");
const block = at > 0 ? MC.slice(at, MC.indexOf("THE WM VALUE CANDLE — A CANDLE", at)) : "";

describe("dual anatomy", () => {
  it("bodies hang only on anchors collected where the absorption / exhaustion owners paint", () => {
    expect(block.length).toBeGreaterThan(500);
    const pushes = MC.match(/bodyAnchors\.push\(\{ kind: "(ABSORB|EXHAUST)"/g) ?? [];
    expect(pushes).toHaveLength(2);
    // Each push sits after its layer's permission gate.
    const exGate = MC.indexOf('if (!att.paints("exhaustion", { selectedItem: markSelected })) continue;');
    expect(MC.indexOf('bodyAnchors.push({ kind: "EXHAUST"')).toBeGreaterThan(exGate);
  });
  it("mode is a representation preference: FOUNDER/FUSION draw bodies, MARKET/OFF do not; motion only in LIVE", () => {
    expect(block).toContain('(mode === "FOUNDER" || mode === "FUSION")');
    expect(block).toContain("motionOnRef.current ?");
    expect(block).toContain("canvas.dataset.dualAnatomy");
  });
});
