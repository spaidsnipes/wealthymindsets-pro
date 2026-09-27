import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { livingMarketReceipt, motionAllowed } from "./livingMarket";

describe("LIVING MARKET · LIVE / STILL", () => {
  it("motion is allowed only when LIVE and the OS does not ask to reduce motion", () => {
    expect(motionAllowed("LIVE", false)).toBe(true);
    expect(motionAllowed("STILL", false)).toBe(false);
    expect(motionAllowed("LIVE", true)).toBe(false);
    expect(livingMarketReceipt("LIVE", true)).toBe("STILL:REDUCED_MOTION");
    expect(livingMarketReceipt("STILL", false)).toBe("STILL");
  });
});

describe("the canvas settles the SAME objects in STILL (never removes them)", () => {
  const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
  it("every self-driven motion reads the one flag", () => {
    expect(MC).toContain("const bob = liveMotion ? Math.sin(b.phase + nowDelta / 1600) * 3 : 0;");
    expect(MC).toContain("b.x = homeX; b.y = homeY; b.vx = 0; b.vy = 0; b.r = b.baseR;");
    expect(MC).toContain("const wob = motionOnRef.current ? 1 + Math.sin(t) * 0.05 : 1;");
    expect(MC).toContain("const wob = motionOnRef.current ? 1 + Math.sin(t) * BIG_TRADE_BREATH : 1;");
    expect(MC).toContain("if (!motionOnRef.current) b.r = b.baseR; // STILL: arrives settled");
  });
  it("one control on the chart, persisted, with a canvas receipt", () => {
    expect(MC).toContain('data-testid="living-market-toggle"');
    expect(MC).toContain("writeLivingMarket(livingMarket);");
    expect(MC).toContain("ds.livingMarket = livingReceiptRef.current;");
  });
});
