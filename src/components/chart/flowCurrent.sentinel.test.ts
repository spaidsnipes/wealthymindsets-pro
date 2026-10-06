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
    // Its own switch first (Garden 18 §XXI: it painted unswitched), then the permission table.
    expect(block).toContain('if (!flowCurrentOnRef.current || !att.paints("flowCurrent")) {');
    expect(permissionAt("flowCurrent", "FAR")).toBe("QUIET");
    expect(block, "FAR changes the representation (pooled buckets), not the visibility").toContain("QUIET:POOLED");
  });
  it("reads only sided prints per bar — buy = ask, sell = bid — and names the silence", () => {
    expect(block).toContain("for (const v of lv.values()) { buy += v.ask; sell += v.bid; }");
    expect(block).toContain('canvas.dataset.flowCurrent = "NO_SIDED_TAPE";');
    expect(block).not.toMatch(/close\s*>=?\s*.*open/);
  });
  it("fills tapeless bars only from the provider's own per-bar bid / ask volume (2026-10-05)", () => {
    // Prints first; the candle's sides only where a bar has no prints — and the
    // receipt counts each source, so the glass never hides which one spoke.
    expect(block).toContain("if (buy + sell <= 0) {\n              const cs = sidedC.get(Number(b.time));");
    expect(block).toContain("|TAPE:${fromTape}|CANDLE_SIDES:${fromCandle}");
  });
  it("moves only in LIVE", () => {
    expect(block).toContain("const tt = motionOnRef.current ? performance.now() / 1000 : 0;");
  });
});
