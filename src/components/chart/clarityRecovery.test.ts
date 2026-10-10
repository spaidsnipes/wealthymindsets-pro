import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// The recovery behaviour itself (retry on a rejecting series, restore after a
// sustained empty run, never on one frame) is tested on its owner:
// src/lib/chart/clarityInkOwner.test.ts. Here: MainChart still calls it.
const source = readFileSync("src/components/chart/MainChart.tsx", "utf8");

describe("Clarity price sovereignty after a successful paint", () => {
  it("restores native ink through the one ink owner, from LIVE settings", () => {
    expect(source.length).toBeGreaterThan(100000);
    expect(source).toContain("const restoreNativeAfterClarityLoss = () => clarityInkRef.current!.restore(srs, chartSettingsRef.current);");
  });
  it("invokes recovery when the painter faults, and hands every frame's count to the owner", () => {
    expect(source).toContain('catch (err) { restoreNativeAfterClarityLoss(); layerFault("CLARITY_CANDLE", err); }');
    expect(source).toContain("clarityInkRef.current!.afterFrame(srs, chartSettingsRef.current, drawnC, bsC.length);");
  });
  it("re-applying the trader's candle colours goes through the owner, which keeps a painting Clarity hidden (2026-10-10)", () => {
    const at = source.indexOf("// Update candle colors — skip for types that manage their own colors");
    const block = source.slice(at, source.indexOf("candleType === \"hollow\"", at));
    expect(at).toBeGreaterThan(-1);
    expect(block).toContain("clarityInkRef.current!.applySettings(candleRef.current, chartSettings, clarityOnRef.current);");
  });
});
