import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readTapeSide, tapeSideLeans, TAPE_SIDE_SHARE_PCT } from "./tapeSideVerdict";

const PANEL = readFileSync(new URL("../../components/smart-money/SmartMoneyPanel.tsx", import.meta.url), "utf8");

describe("one tape-side verdict (sheriff 2026-10-08, Smart Money panel)", () => {
  it("541 vs 537 is BALANCED — not 'buyers dominate'", () => {
    const v = readTapeSide(541, 537, true);
    expect(v.side).toBe("BALANCED");
    expect(tapeSideLeans(v)).toBeNull();
    expect(v.words).toContain(`Neither side took ${TAPE_SIDE_SHARE_PCT}%`);
  });

  it("names a side only at the one threshold", () => {
    expect(readTapeSide(55, 45, true).side).toBe("BUYERS");
    expect(readTapeSide(45, 55, true).side).toBe("SELLERS");
    expect(readTapeSide(54, 46, true).side).toBe("BALANCED");
  });

  it("no signed tape is NO_TAPE, never BALANCED", () => {
    expect(readTapeSide(10, 5, false).side).toBe("NO_TAPE");
    expect(readTapeSide(0, 0, true).side).toBe("NO_TAPE");
  });

  it("the panel decides sides only through the owner, and speaks no advice, prediction or score", () => {
    expect(PANEL).toContain("readTapeSide(flow.askVol, flow.bidVol, flow.hasFlow)");
    expect(PANEL).not.toMatch(/buyPct\s*>=\s*(55|65)|sellPct\s*>=\s*(55|65)/);
    for (const banned of [
      "Possible reversal", "trust the muscle", "Keep the stop tight", "the green side is winning",
      "Dead even", "Confluence Score", "est. from price", "dominate the tape", "LONG\"", "context near",
    ]) expect(PANEL, banned).not.toContain(banned);
  });
});
