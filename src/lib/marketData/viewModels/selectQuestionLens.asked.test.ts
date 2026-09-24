import { describe, expect, it } from "vitest";

import selectQuestionLens, { QUESTION_CHOICES } from "./selectQuestionLens";
import type { AbsorptionAnatomyVM, AnatomyBar } from "@/lib/marketData/selectAbsorptionAnatomy";
import type { ExhaustionVM } from "./selectExhaustion";

// A bar with an explicit close; range 1 so the median range is 1.
const b = (i: number, low: number, close: number, effortNorm = 0.5): AnatomyBar => ({
  time: i * 60, open: low + 0.5, high: low + 1, low, close, effort: effortNorm * 100, effortNorm, delta: null,
  displacement: 0.5, displacementNorm: 0.5, absorbing: false,
});
const anatomy = (bars: AnatomyBar[]) => ({
  basis: "VOLUME", measured: true, bars, zones: [], windowBars: bars.length,
  effortConcentration: null, effortQualifyingBars: 0, zoneQualificationPossible: true, effortSpreadNote: null,
} as AbsorptionAnatomyVM);
const noEx: ExhaustionVM = { version: 1, measured: true, basis: "VOLUME", reason: "MEASURED", marks: [], latestPush: null };
const ask = (bars: AnatomyBar[], pivots: { time: number; price: number; kind: "HIGH" | "LOW" }[], choice: "CONTINUATION" | "TRAP" | "HOLD", ex: ExhaustionVM = noEx) =>
  selectQuestionLens({ absorption: anatomy(bars), exhaustion: ex, livingPoc: null, pivots, choice });

// An up-leg from a swing low at 100: +1 per bar for 10 bars.
const upLeg = Array.from({ length: 11 }, (_, i) => b(i, 100 + i, 100.5 + i, 0.6));

describe("the chooser offers exactly the canon's questions", () => {
  it("Auto plus six asked questions, no more", () => {
    expect(QUESTION_CHOICES.map(c => c.id)).toEqual(["AUTO", "ABSORPTION", "EXHAUSTION", "CONTINUATION", "TRAP", "HOLD", "WHAT_CHANGED"]);
  });
});

describe("refusal — the lens never invents a level or a move to make a question answerable", () => {
  it("no confirmed swings → refused with the reason", () => {
    for (const c of ["CONTINUATION", "TRAP", "HOLD"] as const) {
      const v = ask(upLeg, [], c);
      expect(v.active).toBe(false);
      expect(v.choice).toBe(c);
      expect(v.refusal).toMatch(/no confirmed swings/);
    }
  });
  it("asked Absorbed? with no zone → refused, not silently swapped for another question", () => {
    const v = selectQuestionLens({ absorption: anatomy(upLeg), exhaustion: noEx, livingPoc: null, pivots: [], choice: "ABSORPTION" });
    expect(v.active).toBe(false);
    expect(v.refusal).toMatch(/no absorption zone/);
  });
});

describe("CONTINUATION — is the move still healthy?", () => {
  it("a steady up-leg with effort held pays every item", () => {
    const v = selectQuestionLens({ absorption: anatomy(upLeg), exhaustion: noEx, livingPoc: null, pivots: [{ time: 0, price: 100, kind: "LOW" }],
      choice: "CONTINUATION", continuation: { health: "COHERENT", reason: "structure and regime agree" } });
    expect(v.kind).toBe("CONTINUATION");
    expect(v.question).toBe("Is the up-move from 100.00 still healthy?");
    expect(v.debt.map(d => d.label)).toEqual(["STRUCTURE + REGIME AGREE", "NEW EXTREME", "EFFORT SUPPORTS", "PULLBACK SHALLOW", "NO EXHAUSTION"]);
    expect(v.openDebt).toBe(0);
    expect(v.bandLow).toBe(100);
    expect(v.bandHigh).toBe(111);
  });
  it("a deep pullback, fading effort and an exhaustion mark leave debt", () => {
    const fading = [...upLeg.slice(0, 8), ...[8, 9, 10, 11, 12, 13].map(i => b(i, 103, 103.2, 0.1))];
    const ex: ExhaustionVM = { ...noEx, marks: [{ direction: "UP", time: 420, price: 108, pushBars: 4, aggressionLevel: 0.5, extension: 2, followThrough: 0, energyTransfer: 1 } as never] };
    const v = ask(fading, [{ time: 0, price: 100, kind: "LOW" }], "CONTINUATION", ex);
    const by = Object.fromEntries(v.debt.map(d => [d.label, d.paid]));
    expect(by["NEW EXTREME"]).toBe(false);
    expect(by["EFFORT SUPPORTS"]).toBe(false);
    expect(by["PULLBACK SHALLOW"]).toBe(false);
    expect(by["NO EXHAUSTION"]).toBe(false);
    expect(v.posture).toBe("WAIT · LET THE MARKET PAY");
  });
  it("a leg under 2 median ranges is refused, not asked", () => {
    const flat = Array.from({ length: 8 }, (_, i) => b(i, 100, 100.5));
    const v = ask(flat, [{ time: 0, price: 100, kind: "LOW" }], "CONTINUATION");
    expect(v.active).toBe(false);
    expect(v.refusal).toMatch(/no directional move/);
  });
});

describe("Continuing? never mints a second continuation verdict", () => {
  it("the owner's verdict is item one, verbatim; a CONTESTED owner leaves it unpaid", () => {
    const v = selectQuestionLens({ absorption: anatomy(upLeg), exhaustion: noEx, livingPoc: null, pivots: [{ time: 0, price: 100, kind: "LOW" }],
      choice: "CONTINUATION", continuation: { health: "CONTESTED", reason: "structure says HIGHER_HIGHS; regime says BALANCE" } });
    expect(v.debt[0]).toEqual({ label: "STRUCTURE + REGIME AGREE", paid: false, evidence: "CONTESTED · structure says HIGHER_HIGHS; regime says BALANCE" });
  });
  it("no owner reading → stated as not read, never assumed", () => {
    const v = ask(upLeg, [{ time: 0, price: 100, kind: "LOW" }], "CONTINUATION");
    expect(v.debt[0].paid).toBe(false);
    expect(v.debt[0].evidence).toBe("continuation owner not read on this camera");
  });
});

describe("TRAP — was the break a trap?", () => {
  const pre = Array.from({ length: 6 }, (_, i) => b(i, 100, 100.5, 0.4)); // high 101
  const high = { time: 120, price: 101, kind: "HIGH" as const };
  it("a poke above the swing high that closes back inside and fades pays the trap items", () => {
    const bars = [...pre, b(6, 100.6, 101.2, 0.9), b(7, 100, 100.4, 0.3), b(8, 99.8, 100.2, 0.2), b(9, 99.6, 100, 0.2)];
    const v = ask(bars, [high], "TRAP");
    expect(v.question).toBe("Was the break of the swing high 101.00 a trap?");
    expect(v.openDebt).toBe(0);
    expect(v.bandLow).toBe(101);
  });
  it("an accepted break (closes beyond, extends) leaves the trap unpaid", () => {
    const bars = [...pre, b(6, 100.8, 101.5, 0.6), b(7, 101.2, 102, 0.7), b(8, 102, 102.8, 0.8), b(9, 102.6, 103.4, 0.8)];
    const v = ask(bars, [high], "TRAP");
    const by = Object.fromEntries(v.debt.map(d => [d.label, d.paid]));
    expect(by["CLOSE BACK INSIDE"]).toBe(false);
    expect(by["NO ACCEPTANCE"]).toBe(false);
    expect(by["FOLLOW-THROUGH FAILED"]).toBe(false);
    expect(by["EFFORT FADED"]).toBe(false);
  });
  it("no swing traded through → refused", () => {
    const v = ask(pre, [high], "TRAP");
    expect(v.active).toBe(false);
    expect(v.refusal).toMatch(/no confirmed swing was traded through/);
  });
});

describe("HOLD — is the level holding?", () => {
  it("two separate tests of a swing low, rejected, no close below → every item paid", () => {
    const bars = [b(0, 100, 100.8), b(1, 101, 101.8), b(2, 102, 102.8), b(3, 100.1, 100.9), b(4, 101, 101.9), b(5, 102, 102.9),
      b(6, 102.5, 103), b(7, 100.2, 101), b(8, 101.5, 102.4), b(9, 102.3, 103.2)];
    const v = ask(bars, [{ time: 0, price: 100, kind: "LOW" }], "HOLD");
    expect(v.question).toBe("Is the swing low 100.00 holding?");
    expect(v.debt.map(d => d.label)).toEqual(["TESTED", "REJECTED", "NO CLOSE BEYOND", "DEFENDED TWICE"]);
    expect(v.openDebt).toBe(0);
  });
  it("a close through the level is stated, not hidden", () => {
    const bars = [b(0, 100, 100.8), b(1, 101, 101.8), b(2, 99.2, 99.5), b(3, 100.5, 101.2)];
    const v = ask(bars, [{ time: 0, price: 100, kind: "LOW" }], "HOLD");
    expect(v.debt.find(d => d.label === "NO CLOSE BEYOND")!.paid).toBe(false);
  });
});

describe("no probability, confidence or score on any asked question", () => {
  it("keys stay honest", () => {
    const v = ask(upLeg, [{ time: 0, price: 100, kind: "LOW" }], "CONTINUATION");
    expect(Object.keys(v).some(k => /prob|confidence|score/i.test(k))).toBe(false);
  });
});

describe("WHAT CHANGED? — measured differences, nothing owed", () => {
  const quiet = Array.from({ length: 20 }, (_, i) => b(i, 100, 100.5));
  it("a quiet camera: every item SAME, the prior read stands", () => {
    const v = selectQuestionLens({ absorption: anatomy(quiet), exhaustion: noEx, livingPoc: null, pivots: [{ time: 60, price: 101, kind: "HIGH" }], choice: "WHAT_CHANGED" });
    expect(v.kind).toBe("WHAT_CHANGED");
    expect(v.ledger).toBe("CHANGES");
    expect(v.openDebt).toBe(0);
    expect(v.debt.map(d => d.label)).toEqual(["NEW SWING CONFIRMED", "SWING TRADED THROUGH", "NEW ABSORPTION ZONE", "NEW EXHAUSTION MARK", "RANGE EXPANDED"]);
    expect(v.debt.every(d => !d.paid)).toBe(true);
    expect(v.posture).toBe("NOTHING MOVED · THE PRIOR READ STANDS");
  });
  it("a new swing, a break and an expansion in the window are each named", () => {
    const bars = [...quiet.slice(0, 12), ...Array.from({ length: 8 }, (_, k) => ({ ...b(12 + k, 100 + k, 101 + k), high: 102.5 + k }))];
    const v = selectQuestionLens({ absorption: anatomy(bars), exhaustion: noEx, livingPoc: null,
      pivots: [{ time: 60, price: 101, kind: "HIGH" }, { time: 14 * 60, price: 102, kind: "LOW" }], choice: "WHAT_CHANGED" });
    const by = Object.fromEntries(v.debt.map(d => [d.label, d]));
    expect(by["NEW SWING CONFIRMED"].paid).toBe(true);
    expect(by["SWING TRADED THROUGH"].paid).toBe(true);
    expect(by["SWING TRADED THROUGH"].evidence).toMatch(/high 101\.00/);
    expect(by["RANGE EXPANDED"].paid).toBe(true);
    expect(v.posture).toMatch(/^3 CHANGES/);
    expect(v.nextQuestion).toBe("Was that break a trap?");
  });
  it("too few bars to compare → refused", () => {
    const v = selectQuestionLens({ absorption: anatomy(quiet.slice(0, 10)), exhaustion: noEx, livingPoc: null, pivots: [], choice: "WHAT_CHANGED" });
    expect(v.active).toBe(false);
    expect(v.refusal).toMatch(/nothing earlier to compare/);
  });
});
