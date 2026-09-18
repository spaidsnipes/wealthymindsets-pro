import { describe, it, expect } from "vitest";
import {
  selectContinuationHealth,
  CONTINUATION_REGIMES,
} from "./selectContinuationHealth";
import type { MarketStructureVM } from "./selectMarketStructure";
import type { RegimeVM, RegimeVerdict } from "./selectRegime";

/**
 * Two owners, four answers. The pairs that must NOT collapse into each other
 * are asserted as pairs, because the whole value of this compiler is that a
 * measured disagreement, a measured agreement-that-nothing-is-moving, and a
 * window that could not be read are three different sentences.
 */

const LAG = "the newest 5 bars cannot yet be a pivot — permanent";

function structureOf(over: Partial<MarketStructureVM> = {}): MarketStructureVM {
  return {
    measured: true,
    lookback: 5,
    barCount: 120,
    unconfirmedBars: 5,
    confirmationLagNote: LAG,
    swingHighs: [],
    swingLows: [],
    lastSwingHigh: null,
    lastSwingLow: null,
    bias: "HIGHER_HIGHS",
    biasNote: "the last two confirmed highs each printed higher",
    insufficientNote: null,
    ...over,
  } as MarketStructureVM;
}

function regimeOf(verdict: RegimeVerdict, over: Partial<RegimeVM> = {}): RegimeVM {
  return {
    verdict,
    resolution: "RESOLVED",
    confidence: 0.6,
    narrative: `Regime narrative for ${verdict}`,
    evidence: [],
    contradictions: [],
    capturedAt: 1_700_000_000_000,
    ...over,
  } as RegimeVM;
}

describe("selectContinuationHealth", () => {
  it("calls a directional sequence inside a supporting regime COHERENT", () => {
    const out = selectContinuationHealth({
      structure: structureOf({ bias: "HIGHER_HIGHS" }),
      regime: regimeOf("TREND"),
    });
    expect(out.health).toBe("COHERENT");
    expect(out.measured).toBe(true);
    expect(out.reason).toContain("both owners describe a market that is going somewhere");
  });

  it("does NOT collapse ROTATING into CONTESTED — two owners agreeing is not a conflict", () => {
    // A range inside a balance regime is AGREEMENT. The honest answer to
    // "is this continuation healthy" is "there is no continuation", which is a
    // finding. Reporting it as a conflict would invent a disagreement.
    const rotating = selectContinuationHealth({
      structure: structureOf({ bias: "RANGE", biasNote: "highs and lows disagree" }),
      regime: regimeOf("BALANCE"),
    });
    const contested = selectContinuationHealth({
      structure: structureOf({ bias: "HIGHER_HIGHS" }),
      regime: regimeOf("BALANCE"),
    });
    expect(rotating.health).toBe("ROTATING");
    expect(contested.health).toBe("CONTESTED");
    expect(rotating.reason).not.toBe(contested.reason);
  });

  it("calls a directional sequence inside a denying regime CONTESTED and names both sides", () => {
    const out = selectContinuationHealth({
      structure: structureOf({ bias: "LOWER_LOWS" }),
      regime: regimeOf("COMPRESSION"),
    });
    expect(out.health).toBe("CONTESTED");
    expect(out.reason).toContain("lower lows");
    expect(out.reason).toContain("compression");
  });

  it("refuses to read a TRANSITION regime either way — selectRegime already declined to", () => {
    const out = selectContinuationHealth({
      structure: structureOf({ bias: "HIGHER_HIGHS" }),
      regime: regimeOf("TRANSITION"),
    });
    expect(out.health).toBe("CONTESTED");
    expect(out.reason).toContain("neither supports nor denies");
  });

  it("goes UNREADABLE — not ROTATING — when the swing sequence was never measured", () => {
    const out = selectContinuationHealth({
      structure: structureOf({
        measured: false,
        bias: "UNCLEAR",
        insufficientNote: "Only 6 bars are loaded.",
      }),
      regime: regimeOf("TREND"),
    });
    expect(out.health).toBe("UNREADABLE");
    expect(out.measured).toBe(false);
    // The owner's own sentence, not a rephrasing.
    expect(out.reason).toBe("Only 6 bars are loaded.");
  });

  it("goes UNREADABLE when the regime is UNKNOWN, and carries the regime's own reason", () => {
    const out = selectContinuationHealth({
      structure: structureOf(),
      regime: regimeOf("UNKNOWN", { reason: "Neither dimension has verified evidence." }),
    });
    expect(out.health).toBe("UNREADABLE");
    expect(out.reason).toBe("Neither dimension has verified evidence.");
  });

  it("treats null owners exactly as unmeasured ones — a surface with nothing in hand must not throw", () => {
    expect(selectContinuationHealth({ structure: null, regime: null }).health).toBe("UNREADABLE");
    expect(selectContinuationHealth({ structure: undefined, regime: undefined }).measured).toBe(false);
  });

  it("CARRIES THE PERMANENT PIVOT LAG on every directional reading, COHERENT included", () => {
    // The lag is the reason a healthy-looking continuation can already be over.
    // A continuation surface is the single worst place to omit it.
    for (const regime of ["TREND", "EXPANSION", "BALANCE", "TRANSITION"] as const) {
      const out = selectContinuationHealth({
        structure: structureOf({ bias: "HIGHER_HIGHS" }),
        regime: regimeOf(regime),
      });
      expect(out.confirmationLagNote).toBe(LAG);
    }
  });

  it("states no lag when no direction was stated — there is no stale high to warn about", () => {
    const out = selectContinuationHealth({
      structure: structureOf({ bias: "RANGE" }),
      regime: regimeOf("BALANCE"),
    });
    expect(out.confirmationLagNote).toBeNull();
  });

  it("MINTS NO SCORE — the mockup's four percentages have no owner and must not appear", () => {
    // WM_Transformation_UI_15 shows STRUCTURE ALIGNMENT 92%, MOMENTUM
    // SUSTAINMENT 78%, VOLUME CONFIRMATION 84%, CONTINUATION HEALTH SCORE 85%.
    // None is derivable from anything in this repo. A number with no owner is a
    // confidence the trader cannot audit.
    const out = selectContinuationHealth({
      structure: structureOf(),
      regime: regimeOf("TREND"),
    });
    const rendered = JSON.stringify(out);
    expect(rendered).not.toMatch(/%/);
    expect(out).not.toHaveProperty("score");
    for (const r of out.readings) {
      expect(typeof r.value).toBe("string");
      expect(r.value).not.toMatch(/\d/);
    }
  });

  it("DISCLOSES the mockup card it did not read rather than dropping it silently", () => {
    const out = selectContinuationHealth({
      structure: structureOf(),
      regime: regimeOf("TREND"),
    });
    expect(out.unread.join(" ")).toContain("Volume confirmation");
    // Disclosed on the unreadable path too — an absent reading is still absent.
    expect(selectContinuationHealth({ structure: null, regime: null }).unread).toEqual(out.unread);
  });

  it("gives every reading an OWNER a reviewer can grep", () => {
    const out = selectContinuationHealth({
      structure: structureOf(),
      regime: regimeOf("TREND"),
    });
    expect(out.readings.map((r) => r.owner)).toEqual([
      "selectMarketStructure",
      "selectRegime",
    ]);
    // `basis` is the owner's own sentence, carried verbatim.
    expect(out.readings[0]!.basis).toBe("the last two confirmed highs each printed higher");
    expect(out.readings[1]!.basis).toBe("Regime narrative for TREND");
  });

  it("buckets EVERY regime verdict — a new verdict cannot fall through silently", () => {
    const verdicts: RegimeVerdict[] =
      ["TREND", "BALANCE", "TRANSITION", "EXPANSION", "COMPRESSION", "UNKNOWN"];
    for (const v of verdicts) {
      expect(CONTINUATION_REGIMES[v]).toBeDefined();
    }
    expect(Object.keys(CONTINUATION_REGIMES).sort()).toEqual([...verdicts].sort());
  });

  it("is pure — the same owners compile the same reading twice", () => {
    const input = { structure: structureOf(), regime: regimeOf("TREND") };
    expect(selectContinuationHealth(input)).toEqual(selectContinuationHealth(input));
  });
});
