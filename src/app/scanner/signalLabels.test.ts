import { describe, expect, it } from "vitest";
import { classifyScan } from "@/lib/scannerSignalEvidence";
import { SIGNAL_LABEL } from "./signalLabels";

const label = (changePct: number, volRatio: number, rsi: number | null = 50) => {
  const s = classifyScan({ changePct, volRatio, rsi }).signal;
  return s ? SIGNAL_LABEL[s] : null;
};

describe("each scanner label names the threshold the ladder actually crossed (2026-10-07)", () => {
  it("move + volume labels match the ladder's numbers", () => {
    expect(label(3.2, 3.2)).toBe("Up 3%+ · 3× vol");
    expect(label(-3.2, 3.2)).toBe("Down 3%+ · 3× vol");
    expect(label(1.8, 2.2)).toBe("Up 1.5%+ · 2× vol");
    expect(label(-1.8, 2.2)).toBe("Down 1.5%+ · 2× vol");
    expect(label(0.1, 5.5)).toBe("Volume 5×+");
  });
  it("RSI-only and change-only branches say RSI / change, never Fib, supply, VWAP or gap", () => {
    expect(label(0.1, 1, 30)).toBe("RSI under 35");
    expect(label(0.1, 1, 75)).toBe("RSI over 70");
    expect(label(0.8, 1, 50)).toBe("Up 0.5%+");
    expect(label(0.1, 1, 50)).toBe("No trigger");
  });
  it("no reachable label claims a structure the ladder does not measure", () => {
    const reachable = new Set<string>();
    for (const c of [-5, -2, -0.2, 0.2, 0.7, 2, 5]) for (const v of [0.5, 2.5, 3.5, 6]) for (const r of [20, 50, 80, null]) {
      const l = label(c, v, r);
      if (l) reachable.add(l);
    }
    for (const l of reachable) expect(l, l).not.toMatch(/breakout|breakdown|vwap|fib|supply|reject|reclaim|gap|bounce|momentum/i);
  });
});
