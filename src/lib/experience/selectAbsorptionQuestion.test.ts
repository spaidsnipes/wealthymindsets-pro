import { describe, it, expect } from "vitest";
import { selectAbsorptionQuestion } from "./selectAbsorptionQuestion";
import type { AbsorptionAnatomyViewVM } from "../marketData/viewModels/selectAbsorptionAnatomyView";

/**
 * The four states are the whole point of this selector. A banner that reads the
 * same over a measured zone, over a measured absence, and over a window that
 * CANNOT ANSWER is decoration at the largest type size on the canvas — so each
 * state gets its own test, and the pairs that must NOT collapse into each other
 * are asserted as pairs.
 */

function vmOf(over: Partial<AbsorptionAnatomyViewVM>): AbsorptionAnatomyViewVM {
  return {
    version: "wm.absorption-anatomy-view.v1",
    basis: "SIGNED_DELTA",
    measured: true,
    windowBars: 30,
    bars: [],
    zones: [],
    focusZone: null,
    aggression: {
      buyInitiated: null,
      sellInitiated: null,
      buyShare: null,
      sellShare: null,
      netDelta: null,
      deltaSeries: [],
      totalVolume: null,
    },
    checklist: [],
    conviction: { strength: null, ratio: null, unbounded: false, ladderFill: null },
    reason: "reason line",
    zoneQualificationPossible: true,
    effortSpreadNote: null,
    ...over,
  } as AbsorptionAnatomyViewVM;
}

const zone = { priceLo: 101, priceHi: 104 } as AbsorptionAnatomyViewVM["focusZone"];

describe("selectAbsorptionQuestion", () => {
  it("renders the unmeasured state as UNRESOLVED and asks nothing about a level it has not seen", () => {
    const out = selectAbsorptionQuestion(vmOf({ measured: false }));
    expect(out.focus.basis).toBe("ABSORPTION_UNMEASURED");
    expect(out.focus.unresolved).toBe(true);
    expect(out.question).toBe("Is effort being absorbed at this level?");
  });

  it("treats a null VM exactly as an unmeasured one — a surface with nothing in hand must not throw", () => {
    expect(selectAbsorptionQuestion(null).focus.basis).toBe("ABSORPTION_UNMEASURED");
    expect(selectAbsorptionQuestion(undefined).focus.unresolved).toBe(true);
  });

  it("names the real price band when a zone was measured", () => {
    const out = selectAbsorptionQuestion(vmOf({ focusZone: zone }));
    expect(out.focus.basis).toBe("ABSORPTION_ZONE");
    expect(out.focus.unresolved).toBe(false);
    expect(out.question).toContain("between 101 and 104");
    expect(out.focus.focus).toBe("Absorption of effort at 101–104");
  });

  it("carries the counter-clause so the banner is not an endorsement of the zone it just found", () => {
    // "Is it absorbed?" invites a yes. The trader's actual exposure is the
    // other branch, and it must be in the sentence.
    expect(selectAbsorptionQuestion(vmOf({ focusZone: zone })).question).toContain(
      "or is price about to follow it?",
    );
  });

  it("does NOT collapse a measured absence into the unresolved look — the window answered", () => {
    const out = selectAbsorptionQuestion(vmOf({ focusZone: null, zoneQualificationPossible: true }));
    expect(out.focus.basis).toBe("ABSORPTION_ABSENT");
    expect(out.focus.unresolved).toBe(false);
    expect(out.focus.focus).toBe("Absorption of effort across the last 30 bars");
  });

  it("DOES go unresolved when the window was incapable of producing a zone", () => {
    // This is the case a naive surface reports as "no absorption", turning
    // arithmetic into an observation about the market. The two must differ.
    const cannot = selectAbsorptionQuestion(
      vmOf({ focusZone: null, zoneQualificationPossible: false, effortSpreadNote: "85% of effort in one print" }),
    );
    const found = selectAbsorptionQuestion(vmOf({ focusZone: null, zoneQualificationPossible: true }));
    expect(cannot.focus.basis).toBe("ABSORPTION_UNANSWERABLE");
    expect(cannot.focus.unresolved).toBe(true);
    expect(cannot.focus.focus).not.toBe(found.focus.focus);
  });

  it("names the seller only when the window was FULLY signed and the seller dominates", () => {
    const out = selectAbsorptionQuestion(
      vmOf({ focusZone: zone, aggression: { ...vmOf({}).aggression, buyShare: 0.3, sellShare: 0.7 } }),
    );
    expect(out.question).toContain("seller effort");
    expect(out.focus.focus).toContain("seller effort");
  });

  it("names the buyer on the mirror case", () => {
    const out = selectAbsorptionQuestion(
      vmOf({ focusZone: zone, aggression: { ...vmOf({}).aggression, buyShare: 0.8, sellShare: 0.2 } }),
    );
    expect(out.question).toContain("buyer effort");
  });

  it("REFUSES to name a side on an unsigned window — the rail is null and no actor may be invented", () => {
    // The aggression rail is deliberately null unless EVERY bar carried a side.
    // Naming an aggressor the feed never stated would put a fabricated actor in
    // the largest sentence on the canvas.
    const out = selectAbsorptionQuestion(vmOf({ focusZone: zone }));
    expect(out.question).not.toMatch(/seller|buyer/);
    expect(out.question).toContain("Is effort being absorbed");
  });

  it("REFUSES to name a side on a near coin-flip, even when fully signed", () => {
    const out = selectAbsorptionQuestion(
      vmOf({ focusZone: zone, aggression: { ...vmOf({}).aggression, buyShare: 0.52, sellShare: 0.48 } }),
    );
    expect(out.question).not.toMatch(/seller|buyer/);
  });

  it("keeps the focus a SUBJECT, never the finding the reason line already owns", () => {
    // `QuestionFocusVM.focus` is contractually a noun phrase and never a claim.
    // The first draft returned "No absorption zone in the last 30 bars", which
    // is both a claim and a duplicate of `vm.reason` on the same surface.
    for (const vm of [
      vmOf({ focusZone: zone }),
      vmOf({ focusZone: null, zoneQualificationPossible: true }),
      vmOf({ focusZone: null, zoneQualificationPossible: false }),
      vmOf({ measured: false }),
    ]) {
      expect(selectAbsorptionQuestion(vm).focus.focus).toMatch(/^Absorption of /);
    }
  });

  it("is pure — the same VM compiles the same banner twice", () => {
    const vm = vmOf({ focusZone: zone });
    expect(selectAbsorptionQuestion(vm)).toEqual(selectAbsorptionQuestion(vm));
  });
});
