/**
 * THE EFFORT MARK'S LAWS.
 *
 * The one this file exists for: a ratio has no price, and nothing in this
 * module may put one on the axis.
 */

import { describe, expect, it } from "vitest";

import {
  MARKED_SHAPES,
  selectEffortMark,
  type EffortMarkBar,
} from "./effortMarkGeometry";
import type {
  EffortResultShape,
  EffortVsResultVM,
} from "@/lib/marketData/viewModels/selectEffortVsResult";

const vm = (
  shape: EffortResultShape,
  state: "READ" | "UNREAD" = "READ",
): EffortVsResultVM =>
  ({
    version: 1,
    state,
    shape,
    headline: "h",
    rows: [],
    effort: "HIGH",
    result: "WEAK",
    effortRatio: 2.4,
    resultRatio: 0.3,
    cohortSize: 40,
    lookbackNote: "n",
    limitNote: "l",
  }) as unknown as EffortVsResultVM;

const BAR: EffortMarkBar = { time: 1700, open: 10, close: 12, high: 13, low: 9 };
const DOWN: EffortMarkBar = { time: 1700, open: 12, close: 10, high: 13, low: 9 };

describe("A RATIO HAS NO PRICE", () => {
  it("SPENDS ONLY PRICES THE BAR ITSELF REACHED", () => {
    // The guarded failure: effortRatio 2.4 and resultRatio 0.3 both map onto a
    // price axis without complaint, and each such mapping is a level the house
    // invented and then drew as though the market had put it there.
    for (const bar of [BAR, DOWN]) {
      const v = selectEffortMark(vm("HIGH_EFFORT_WEAK_RESULT"), bar);
      expect(v.drawn).toBe(true);
      if (!v.drawn) return;
      expect([bar.high, bar.low]).toContain(v.mark.price);
    }
  });

  it("REFUSES RATHER THAN FALLING BACK TO AN INVENTED LEVEL", () => {
    // No close, no midpoint, no last-known. A bar with no extreme has no
    // lawful home for this mark and the mark does not get drawn.
    const v = selectEffortMark(vm("HIGH_EFFORT_WEAK_RESULT"), {
      time: 1700, open: 10, close: 12, high: null, low: 9,
    });
    expect(v.drawn).toBe(false);
    expect(v.reason).toBe("NO_BAR_EXTREME");
  });

  it("anchors on the bar's own open time, not on an index", () => {
    const v = selectEffortMark(vm("LOW_EFFORT_STRONG_RESULT"), BAR);
    expect(v.drawn && v.mark.time).toBe(1700);
  });

  it("refuses a bar with no anchor time", () => {
    expect(selectEffortMark(vm("HIGH_EFFORT_WEAK_RESULT"), { ...BAR, time: null }).reason)
      .toBe("NO_ANCHOR_TIME");
  });
});

describe("H1 — an unread bar gets no glyph", () => {
  it("DRAWS NOTHING FOR A READING THAT WAS NEVER MADE", () => {
    // A mark meaning "read, and unremarkable" placed on an UNREAD bar is
    // absence rendered as a value — the cardinal defect.
    const v = selectEffortMark(vm("UNREAD", "UNREAD"), BAR);
    expect(v.drawn).toBe(false);
    expect(v.reason).toBe("UNREAD");
  });

  it("distinguishes never-asked from asked-and-ordinary in the reason", () => {
    expect(selectEffortMark(null, BAR).reason).toBe("NO_READING");
    expect(selectEffortMark(vm("PROPORTIONATE"), BAR).reason).toBe("ORDINARY:PROPORTIONATE");
    expect(selectEffortMark(vm("UNREMARKABLE"), BAR).reason).toBe("ORDINARY:UNREMARKABLE");
  });

  it("carries a reason in EVERY state, drawn or not", () => {
    // A layer that goes quiet without explaining itself is indistinguishable
    // from a layer that broke.
    const cases = [
      selectEffortMark(null, BAR),
      selectEffortMark(vm("HIGH_EFFORT_WEAK_RESULT"), null),
      selectEffortMark(vm("PROPORTIONATE"), BAR),
      selectEffortMark(vm("HIGH_EFFORT_WEAK_RESULT"), BAR),
    ];
    for (const c of cases) expect(c.reason.length).toBeGreaterThan(0);
  });
});

describe("NOT ON EVERY BAR", () => {
  it("PAINTS ONLY THE TWO NOTABLE CORNERS", () => {
    // A glyph on all five shapes teaches a trader in a week that it means "a
    // bar happened" — which destroys the two shapes that mean something.
    const all: EffortResultShape[] = [
      "HIGH_EFFORT_WEAK_RESULT", "LOW_EFFORT_STRONG_RESULT",
      "PROPORTIONATE", "UNREMARKABLE", "UNREAD",
    ];
    const drawn = all.filter(s => selectEffortMark(vm(s), BAR).drawn);
    expect(drawn).toEqual([...MARKED_SHAPES]);
  });
});

describe("the side is geometry, not a claim about intention", () => {
  it("takes the far end of the travel the bar ACTUALLY MADE", () => {
    const u = selectEffortMark(vm("HIGH_EFFORT_WEAK_RESULT"), BAR);
    expect(u.drawn && u.mark.side).toBe("ABOVE");
    expect(u.drawn && u.mark.price).toBe(13);
    const d = selectEffortMark(vm("HIGH_EFFORT_WEAK_RESULT"), DOWN);
    expect(d.drawn && d.mark.side).toBe("BELOW");
    expect(d.drawn && d.mark.price).toBe(9);
  });

  it("gives a doji the stated tie-break rather than discarding it", () => {
    // Refusing open===close would throw away the single most characteristic
    // bar of the corner this mark exists to catch.
    const v = selectEffortMark(vm("HIGH_EFFORT_WEAK_RESULT"), { ...BAR, open: 11, close: 11 });
    expect(v.drawn && v.mark.side).toBe("ABOVE");
  });

  it("does not let the SHAPE choose the side — only the bar's own travel does", () => {
    const a = selectEffortMark(vm("HIGH_EFFORT_WEAK_RESULT"), BAR);
    const b = selectEffortMark(vm("LOW_EFFORT_STRONG_RESULT"), BAR);
    expect(a.drawn && a.mark.side).toBe(b.drawn && b.mark.side);
  });
});

describe("§9 — the mark says what was observed, and grades nothing", () => {
  it("SPENDS NO COLOUR AND NO GRADE WORD", () => {
    for (const s of MARKED_SHAPES) {
      const v = selectEffortMark(vm(s), BAR);
      expect(v.drawn).toBe(true);
      if (!v.drawn) continue;
      expect(v.mark.label).not.toMatch(/high|low|weak|strong|good|bad|bull|bear|#|rgb/i);
    }
  });

  it("names the two corners differently — one glyph for both would be a grade", () => {
    const a = selectEffortMark(vm("HIGH_EFFORT_WEAK_RESULT"), BAR);
    const b = selectEffortMark(vm("LOW_EFFORT_STRONG_RESULT"), BAR);
    expect(a.drawn && a.mark.label).not.toBe(b.drawn && b.mark.label);
  });

  it("emits no ratio, no percentage and no score", () => {
    const v = selectEffortMark(vm("HIGH_EFFORT_WEAK_RESULT"), BAR);
    expect(v.drawn).toBe(true);
    if (!v.drawn) return;
    expect(Object.keys(v.mark).sort()).toEqual(["label", "price", "shape", "side", "time"]);
    expect(JSON.stringify(v.mark)).not.toMatch(/2\.4|0\.3|%/);
  });
});

describe("the module ships no permission", () => {
  it("exports nothing that reads as a verdict on whether to act", async () => {
    const mod = await import("./effortMarkGeometry");
    for (const key of Object.keys(mod as Record<string, unknown>)) {
      expect(key, key).not.toMatch(/canProceed|isGo|allow|permit|shouldTrade|signal|entry/i);
    }
  });
});
