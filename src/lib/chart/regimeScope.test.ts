import { describe, expect, it } from "vitest";
import selectRegimeLighting from "@/lib/marketData/viewModels/selectRegimeLighting";
import { scopeRegimeLighting } from "./regimeScope";

// Serving NQ1! 5m, 2026-10-06 08:43 CDT: the glass said "REGIME · COMPRESSION ·
// channel capped" while Market Breathing said "EXPANDED · ATR 1.83×".
describe("F15A × F14 — one camera, named scopes, contradictions named", () => {
  it("tape COMPRESSION against EXPANDED bars is a named contradiction on the title, not two silent claims", () => {
    const s = scopeRegimeLighting(selectRegimeLighting({ verdict: "COMPRESSION" }), { state: "EXPANDED", atrRatio: 1.83 }, "5m")!;
    expect(s.state).toBe("CONTRADICTION");
    expect(s.vm.title).toBe("TAPE COMPRESSION ≠ 5m BARS EXPANDED (ATR 1.83×) · UNRESOLVED");
    expect(s.vm.scope).toBe("CONTRADICTION:COMPRESSION/EXPANDED");
    // The owner's light is untouched: nothing is averaged or re-derived.
    expect(s.vm.breaker).toBe("RANGE");
    expect(s.vm.fixtures).toEqual(selectRegimeLighting({ verdict: "COMPRESSION" }).fixtures);
  });

  it("EXPANSION against COMPRESSED bars is the mirror contradiction", () => {
    const s = scopeRegimeLighting(selectRegimeLighting({ verdict: "EXPANSION" }), { state: "COMPRESSED", atrRatio: 0.6 }, "15m")!;
    expect(s.receipt).toBe("CONTRADICTION:EXPANSION/COMPRESSED");
  });

  it("when they do not contradict, the word still names its scope (TAPE)", () => {
    const agree = scopeRegimeLighting(selectRegimeLighting({ verdict: "COMPRESSION" }), { state: "COMPRESSED", atrRatio: 0.6 }, "5m")!;
    expect(agree.vm.title).toBe("TAPE REGIME · COMPRESSION · channel capped");
    const normal = scopeRegimeLighting(selectRegimeLighting({ verdict: "COMPRESSION" }), { state: "NORMAL", atrRatio: 1 }, "5m")!;
    expect(normal.state).toBe("SCOPED");
    const trend = scopeRegimeLighting(selectRegimeLighting({ verdict: "TREND" }), { state: "EXPANDED", atrRatio: 1.8 }, "5m")!;
    expect(trend.vm.title).toBe("TAPE REGIME · TREND · magnets dim");
    expect(trend.state).toBe("SCOPED");
  });

  it("bars too few to breathe: scoped, and the receipt says the bars were not read", () => {
    const s = scopeRegimeLighting(selectRegimeLighting({ verdict: "BALANCE" }), null, "5m")!;
    expect(s.receipt).toBe("BARS_UNREAD");
    expect(s.vm.title).toBe("TAPE REGIME · RANGE · channel capped");
  });

  it("no verdict, no title: nothing invented", () => {
    expect(scopeRegimeLighting(null, null, "5m")).toBeNull();
    const u = scopeRegimeLighting(selectRegimeLighting(null), { state: "EXPANDED", atrRatio: 2 }, "5m")!;
    expect(u.vm.title).toBeNull();
    expect(u.state).toBe("NO_VERDICT");
  });
});
