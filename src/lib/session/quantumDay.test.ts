import { describe, expect, it } from "vitest";
import { readQuantumDay } from "./quantumDay";
import { chainReading, readBeliefDay } from "./beliefChain";

const t = (date: string, pnl: number, setup = "", q = "UNRESOLVED", r?: number) => ({ date, pnl, setup, processQuality: q, plannedRDollars: r });

describe("readQuantumDay", () => {
  it("says what's missing instead of inventing a baseline", () => {
    expect(readQuantumDay([t("2026-11-10", 50)]).known).toBe(false);
  });
  it("quantifies, qualifies and finds the 20%", () => {
    const r = readQuantumDay([
      t("2026-11-10", 300, "ORB", "FOLLOWED_PLAN", 45), t("2026-11-10", -80, "chase", "BROKE_RULES"),
      t("2026-11-11", 200, "orb", "FOLLOWED_PLAN", 45), t("2026-11-11", 40, "vwap"), t("2026-11-12", -120, "chase", "BROKE_RULES"),
    ]);
    if (!r.known) throw new Error("known");
    expect(r.window).toMatchObject({ days: 3, trades: 5 });
    expect(r.quantify.winRate).toBeCloseTo(0.6);
    expect(r.simplify.core.map(l => l.setup)).toEqual(["ORB"]);
    expect(r.simplify.coreShare).toBeCloseTo(500 / 540);
    expect(r.simplify.cut[0]).toMatchObject({ setup: "CHASE", net: -200 });
    expect(r.qualify.netFollowed).toBe(500);
    expect(r.qualify.netBroke).toBe(-200);
  });
});

describe("belief chain", () => {
  it("asks for a replacement thought only when a link is on the worry side", () => {
    expect(chainReading({ fact: "", links: { feeling: "DARK" }, replacement: "", atMs: null }).needsReplacement).toBe(true);
    expect(chainReading({ fact: "", links: { feeling: "LIGHT" }, replacement: "", atMs: null }).words).toMatch(/Anticipation/);
  });
  it("starts every market day fresh", () => {
    expect(readBeliefDay({ day: "2026-11-11", pre: { fact: "x" } }, "2026-11-12").pre.fact).toBe("");
  });
});
