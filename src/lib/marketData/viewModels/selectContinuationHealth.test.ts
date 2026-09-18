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

/**
 * The two confirmed pivots Asset 17 draws as `KEY LEVELS`. Present on a
 * SEPARATE fixture on purpose: the default `structureOf` carries null swings,
 * and if the swing-bearing case shared that default every assertion below would
 * pass against an empty array without exercising a line of the branch.
 */
const SWINGS = {
  lastSwingHigh: { time: 1_700_000_000, price: 143.5 },
  lastSwingLow: { time: 1_699_900_000, price: 126 },
} as const;

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

  it("states no lag when no direction was stated AND no pivot is on screen", () => {
    // Both halves of that sentence matter. This fixture carries null swings, so
    // the reading makes no pivot-resting claim at all and there is nothing to
    // warn about. The moment a level IS carried the note comes back — asserted
    // directly below, because that is the case a reader would assume is covered
    // by this one.
    const out = selectContinuationHealth({
      structure: structureOf({ bias: "RANGE" }),
      regime: regimeOf("BALANCE"),
    });
    expect(out.levels).toEqual([]);
    expect(out.confirmationLagNote).toBeNull();
  });

  it("CARRIES THE LAG on a ROTATING reading that prints levels — a level IS a pivot", () => {
    // A rotating range is defined by exactly the two pivots being printed. Were
    // the note dropped here, the repo's most lag-sensitive numbers would sit on
    // screen with their disclosure removed.
    const out = selectContinuationHealth({
      structure: structureOf({ bias: "RANGE", ...SWINGS }),
      regime: regimeOf("BALANCE"),
    });
    expect(out.health).toBe("ROTATING");
    expect(out.levels).toHaveLength(2);
    expect(out.confirmationLagNote).toBe(LAG);
  });

  it("carries the confirmed pivots as LEVELS, with the owner that confirmed them", () => {
    const out = selectContinuationHealth({
      structure: structureOf({ bias: "HIGHER_HIGHS", ...SWINGS }),
      regime: regimeOf("TREND"),
    });
    expect(out.health).toBe("COHERENT");
    expect(out.levels).toEqual([
      {
        label: "Last confirmed swing high",
        price: 143.5,
        time: 1_700_000_000,
        owner: "selectMarketStructure",
      },
      {
        label: "Last confirmed swing low",
        price: 126,
        time: 1_699_900_000,
        owner: "selectMarketStructure",
      },
    ]);
  });

  it("REFUSES the mockup's words — a pivot is not resistance or support", () => {
    // Asset 17 labels this block `KEY LEVELS · Resistance / Support`. Both words
    // are forward-looking claims: they say price WILL struggle at a number, and
    // nothing in this repo owns that. What IS owned is narrower and observed.
    const out = selectContinuationHealth({
      structure: structureOf({ bias: "HIGHER_HIGHS", ...SWINGS }),
      regime: regimeOf("TREND"),
    });
    const rendered = JSON.stringify(out);
    expect(rendered).not.toMatch(/resistance/i);
    expect(rendered).not.toMatch(/support/i);
  });

  it("KEEPS THE LEVELS when the verdict could not be reached but the pivots were", () => {
    // The regime is short; the structure is not. This is the exact live TSLA
    // state observed 2026-09-18. Withholding a fact THIS owner measured because
    // a DIFFERENT owner is silent would be a refusal nothing asked for.
    const out = selectContinuationHealth({
      structure: structureOf({ ...SWINGS }),
      regime: regimeOf("UNKNOWN", { reason: "Neither dimension has verified evidence." }),
    });
    expect(out.health).toBe("UNREADABLE");
    expect(out.measured).toBe(false);
    expect(out.levels).toHaveLength(2);
    expect(out.confirmationLagNote).toBe(LAG);
  });

  it("states NO levels when there is no structure owner to have confirmed one", () => {
    const out = selectContinuationHealth({ structure: null, regime: null });
    expect(out.levels).toEqual([]);
    expect(out.confirmationLagNote).toBeNull();
  });

  it("carries only the pivot that exists — one confirmed side is not two", () => {
    const out = selectContinuationHealth({
      structure: structureOf({ bias: "HIGHER_HIGHS", lastSwingHigh: SWINGS.lastSwingHigh }),
      regime: regimeOf("TREND"),
    });
    expect(out.levels.map((l) => l.label)).toEqual(["Last confirmed swing high"]);
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
