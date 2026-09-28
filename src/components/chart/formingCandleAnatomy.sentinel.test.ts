/**
 * THE CANDLE PARTICIPATES — five-hour order (2026-09-27). The forming candle's
 * anatomy is read ONLY from its own real prints (a bounded ring fed by
 * recentTicks, reset per market), asks the ONE permission table, and moves
 * only in LIVE. No prints → nothing drawn, receipt names why.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { permissionAt } from "@/lib/marketData/viewModels/selectSemanticPermission";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
const at = MC.indexOf("THE CANDLE PARTICIPATES — FORMING-CANDLE ANATOMY");
const block = at > 0 ? MC.slice(at, MC.indexOf("CANDLE TIMER — countdown pinned", at)) : "";

describe("forming-candle anatomy", () => {
  it("exists and asks the permission table (QUIET tempo form at FAR, speaks at MID/NEAR)", () => {
    expect(block.length).toBeGreaterThan(0);
    expect(block).toContain('if (!att.paints("formingCandle")) {');
    expect(permissionAt("formingCandle", "FAR")).toBe("QUIET");
    expect(permissionAt("formingCandle", "MID")).toBe("SPEAK");
  });
  it("reads only this bar's real prints; the ring is fed from recentTicks trades and reset per market", () => {
    expect(block).toContain("formingPrintsRef.current.filter(q => q.t >= barStartMs)");
    expect(MC).toContain("if (!tk.trade || !Number.isFinite(tk.price) || !Number.isFinite(tk.time) || tk.time <= lastT) continue;");
    expect(MC).toContain("useEffect(() => { formingPrintsRef.current = []; formingLastTRef.current = 0; }, [symbol, timeframe]);");
  });
  it("tempo is this bar's own rate vs its last 3s; breathing only in LIVE; no prints → a named silence", () => {
    expect(block).toContain("const recent = prints.filter(q => q.t >= t1 - 3000).length / 3;");
    expect(block).toContain("const breathe = motionOnRef.current ?");
    expect(block).toContain("canvas.dataset.formingCandle = `NO_PRINTS:${prints.length}`;");
  });
});

describe("one event, many senses — a big print registers on the forming candle", () => {
  it("asks the SAME big-trade judge the discs ask (no second threshold) and reports BIG:n", () => {
    expect(block).toContain("getRealBigTradeLevels(lbF");
    expect(block).toContain("|BIG:${bigHere.length}");
    expect(block).not.toMatch(/bigThreshold|BIG_PRINT_MIN|sizeThreshold/);
  });
});

describe("tempo is honest on a truncated ring", () => {
  it("the baseline rate covers only the span the ring still holds", () => {
    expect(block).toContain("const spanStart = Math.max(barStartMs, t0);");
    expect(block).toContain("(t1 - spanStart) / 1000");
  });
});
