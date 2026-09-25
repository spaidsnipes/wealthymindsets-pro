/**
 * The compiler between a stacked-imbalance reading and the price it is about.
 *
 * Every assertion here is a decision that would otherwise have been made inside
 * a `requestAnimationFrame` callback in `MainChart.tsx`, where nothing can be
 * asserted and a wrong branch shows up as a band in the wrong place on someone
 * else's screen a week later.
 */

import { describe, expect, it } from "vitest";
import {
  selectStackedImbalanceGlass,
  STACK_GLASS_VERSION,
} from "./selectStackedImbalanceGlass";
import {
  STACKED_IMBALANCE_VERSION,
  type StackedImbalanceVM,
  type StackVerdict,
} from "./selectStackedImbalance";
import type { AggressorProvenance } from "../selectAggressorFlow";

function vm(over: Partial<StackedImbalanceVM> = {}): StackedImbalanceVM {
  return {
    version: STACKED_IMBALANCE_VERSION,
    verdict: "DEFENDED",
    direction: "BUY",
    levels: [
      { price: 431.2, dominantVolume: 900, opposingVolume: 200, ratio: 450, oneSided: false },
      { price: 431.3, dominantVolume: 800, opposingVolume: 150, ratio: 533, oneSided: false },
      { price: 431.4, dominantVolume: 700, opposingVolume: 0, ratio: 300, oneSided: true },
    ],
    stackLow: 431.2,
    stackHigh: 431.4,
    tickSize: 0.1,
    formationPrints: 120,
    responsePrints: 80,
    retestedTo: 431.25,
    beyondInSpreads: -0.4,
    spread: 0.05,
    provenance: "PROVIDER" as AggressorProvenance,
    requiresDisclosure: true,
    detail: "fixture",
    ...over,
  } as StackedImbalanceVM;
}

describe("nothing is drawn unless there is a level to draw it at", () => {
  it("a null reading is UNMEASURED, not a crash and not an empty band", () => {
    // The chart room computes this reading unconditionally, so on a chart with
    // no tape at all the glass is handed nothing. That is the same fact to a
    // canvas as an unreadable tape: nothing to place.
    const g = selectStackedImbalanceGlass(null);
    expect(g.drawn).toBe(false);
    expect(g.reason).toBe("UNMEASURED");
    expect(g.priceLow).toBeNull();
    expect(g.priceHigh).toBeNull();
    expect(g.levels).toEqual([]);
  });

  it("UNMEASURED and NO_STACK stay TELLABLE APART, because they are different facts", () => {
    // "The tape could not be read" and "it was read and there is nothing there"
    // collapse into the same blank pixel. They must not collapse into the same
    // value, or a caller that wants to say the first has nothing to say it
    // with.
    expect(selectStackedImbalanceGlass(vm({ verdict: "UNMEASURED" })).reason).toBe("UNMEASURED");
    expect(selectStackedImbalanceGlass(vm({ verdict: "NO_STACK" })).reason).toBe("NO_STACK");
  });

  it("a verdict with no extent does not get an extent invented for it", () => {
    // A stack verdict with a null stackLow is a contradiction inside the
    // upstream engine, not a market state. The temptation is to derive the band
    // from `levels` — which would paint a confident band over a reading that
    // has already gone wrong somewhere, and hide the bug behind a picture.
    const g = selectStackedImbalanceGlass(vm({ stackLow: null }));
    expect(g.drawn).toBe(false);
    expect(g.priceLow).toBeNull();
  });

  it("a verdict with no levels does not draw a band from the extent alone", () => {
    const g = selectStackedImbalanceGlass(vm({ levels: [] }));
    expect(g.drawn).toBe(false);
  });
});

describe("THE PRICES REACH THE GLASS — the entire reason this module exists", () => {
  it("carries the band extent and EVERY level price through", () => {
    const g = selectStackedImbalanceGlass(vm());
    expect(g.drawn).toBe(true);
    expect(g.priceLow).toBe(431.2);
    expect(g.priceHigh).toBe(431.4);
    expect(g.levels.map((l) => l.price)).toEqual([431.2, 431.3, 431.4]);
  });

  it("normalises an inverted extent rather than handing the canvas a negative height", () => {
    const g = selectStackedImbalanceGlass(vm({ stackLow: 431.4, stackHigh: 431.2 }));
    expect(g.priceLow).toBe(431.2);
    expect(g.priceHigh).toBe(431.4);
  });

  it("speaks ratios through formatImbalanceRatio and nowhere else", () => {
    // That module is the one owner of this vocabulary, including the rule that
    // a one-sided level is "one-sided" and never a number — a lot against zero
    // is a level nobody traded, not infinite conviction.
    const g = selectStackedImbalanceGlass(vm());
    expect(g.levels[0]!.ratioLabel).toBe("450:100");
    expect(g.levels[2]!.ratioLabel).toBe("one-sided");
    expect(g.levels[2]!.oneSided).toBe(true);
  });

  it("carries FL-06 ②'s glass tag from the same owner — ×4.5, and a word for one-sided", () => {
    const g = selectStackedImbalanceGlass(vm());
    expect(g.levels[0]!.multipleLabel).toBe("×4.5");
    expect(g.levels[2]!.multipleLabel).toBe("1-SIDED");
  });

  it("passes the retest price through, so DEFENDED can show HOW CLOSE it came", () => {
    // A level that held with room to spare and a level that nearly went are the
    // same word and very different information.
    expect(selectStackedImbalanceGlass(vm()).retestPrice).toBe(431.25);
    expect(selectStackedImbalanceGlass(vm({ retestedTo: null })).retestPrice).toBeNull();
  });
});

describe("§9 — the verdict is carried by EDGE, and no channel carries a grade", () => {
  const styles: Array<[StackVerdict, string]> = [
    ["DEFENDED", "SOLID"],
    ["BROKEN", "DASHED"],
    ["UNTESTED", "DOTTED"],
  ];

  it.each(styles)("%s is drawn %s", (verdict, style) => {
    expect(selectStackedImbalanceGlass(vm({ verdict })).edgeStyle).toBe(style);
  });

  it("the three verdicts are told apart, so shape is doing real work", () => {
    const seen = new Set(
      (["DEFENDED", "BROKEN", "UNTESTED"] as const).map(
        (v) => selectStackedImbalanceGlass(vm({ verdict: v })).edgeStyle,
      ),
    );
    expect(seen.size).toBe(3);
  });

  it("emits NO COLOUR AT ALL — the canvas cannot be told to grade with hue", () => {
    // Not merely "not green". If this VM never carries a colour field, no
    // future edit to the paint code can reintroduce a green/red verdict pair
    // without first widening this type, which is exactly the friction wanted.
    const g = selectStackedImbalanceGlass(vm());
    const keys = Object.keys(g);
    expect(keys.filter((k) => /colou?r|hue|fill|stroke/i.test(k))).toEqual([]);
    expect(JSON.stringify(g)).not.toMatch(/#[0-9a-f]{3,6}|rgba?\(/i);
  });
});

describe("the label is a whole sentence, because the glass has no footnotes", () => {
  it("names the ROLE the stack plays, not the side that built it", () => {
    // "BUY" printed on a chart is one glance from being read as an
    // instruction. What the trader needs is where it sits relative to price.
    expect(selectStackedImbalanceGlass(vm({ direction: "BUY" })).label).toContain("SUPPORT");
    expect(selectStackedImbalanceGlass(vm({ direction: "SELL" })).label).toContain("SUPPLY");
  });

  it("states the verdict and the level count in the words themselves", () => {
    const g = selectStackedImbalanceGlass(vm({ verdict: "BROKEN" }));
    expect(g.label).toContain("BROKEN");
    expect(g.label).toContain("3 LVL");
  });

  it("CARRIES THE AGGRESSOR DISCLOSURE ONTO THE CHART, not into a drawer", () => {
    // `selectStackedImbalance` sets `requiresDisclosure: true` and calls it
    // non-negotiable: a diagonal imbalance is a claim about who the aggressor
    // was. On a tape where the side is reconstructed by tick rule, the band is
    // downstream of a guess and must say so where it is drawn.
    const inferred = selectStackedImbalanceGlass(vm({ provenance: "INFERRED" }));
    expect(inferred.inferredSides).toBe(true);
    expect(inferred.label).toContain("SIDES INFERRED");

    const mixed = selectStackedImbalanceGlass(vm({ provenance: "MIXED" }));
    expect(mixed.inferredSides).toBe(true);
    expect(mixed.label).toContain("SIDES INFERRED");
  });

  it("does not cry inference when the venue actually asserted the side", () => {
    // A disclosure printed on every band is a disclosure nobody reads.
    const g = selectStackedImbalanceGlass(vm({ provenance: "PROVIDER" }));
    expect(g.inferredSides).toBe(false);
    expect(g.label).not.toContain("INFERRED");
  });
});

describe("the reading is stamped", () => {
  it("carries its own version so a stale painter is findable", () => {
    expect(selectStackedImbalanceGlass(vm()).version).toBe(STACK_GLASS_VERSION);
    expect(selectStackedImbalanceGlass(null).version).toBe(STACK_GLASS_VERSION);
  });
});
