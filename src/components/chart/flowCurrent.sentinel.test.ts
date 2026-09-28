/**
 * "GIVE FLOW DIRECTION" — five-hour order (2026-09-27). The Flow Current is
 * read only from SIDED prints (tickAccRef ask = buy aggression, bid = sell),
 * never from candle colour; asks the permission table; drifts only in LIVE.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { permissionAt } from "@/lib/marketData/viewModels/selectSemanticPermission";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
const at = MC.indexOf("FLOW CURRENT — ");
const block = at > 0 ? MC.slice(at, MC.indexOf("CANDLE TIMER — countdown pinned", at)) : "";

describe("flow current", () => {
  it("exists and asks the permission table", () => {
    expect(block.length).toBeGreaterThan(0);
    expect(block).toContain('if (!att.paints("flowCurrent")) {');
    expect(permissionAt("flowCurrent", "FAR")).toBe("QUIET");
    expect(block, "FAR changes the representation (pooled buckets), not the visibility").toContain("QUIET:POOLED");
  });
  it("reads only sided prints per bar — buy = ask, sell = bid — and names the silence", () => {
    expect(block).toContain("for (const v of lv.values()) { buy += v.ask; sell += v.bid; }");
    expect(block).toContain('canvas.dataset.flowCurrent = "NO_SIDED_TAPE";');
    expect(block).not.toMatch(/close\s*>=?\s*.*open/);
  });
  it("moves only in LIVE", () => {
    expect(block).toContain("const tt = motionOnRef.current ? performance.now() / 1000 : 0;");
  });
});
