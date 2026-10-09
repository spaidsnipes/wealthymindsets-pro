/** §24 — "entered too early?" and "avoided valid situations?", answered as facts with their n; a comparison or share only at ≥ 20. */
import { describe, expect, it } from "vitest";

import type { FvgInteraction, FvgLedger, FvgObject } from "@/lib/marketData/fvg/fvgEngine";
import { journalFixture } from "./journalProofFixture";
import { compareFvgTakenVsUntaken, type TakenFvgTrade } from "./planFvgCounterfactual";

const T0 = Date.parse("2026-10-07T14:30:00Z"), M = 60_000;
const inter = (ep: number, at: number, r: string) => ({ episode: ep, startAt: at, endAt: at + M, response: r, displacementAtr: 1, displacementComplete: true }) as unknown as FvgInteraction;
const ledger = (n: number, responseOf: (i: number) => string = i => (i % 2 ? "REJECTED" : "ACCEPTED")) =>
  ({ timeframe: "5m", objects: Array.from({ length: n }, (_, i) => ({ objectId: `O${i}`, interactions: [inter(1, T0 + i * M, responseOf(i))] }) as unknown as FvgObject) }) as unknown as FvgLedger;
const t = (i: number, interaction: TakenFvgTrade["interaction"], r: number | null): TakenFvgTrade => ({ objectId: `O${i}`, interaction, interactionsSoFar: 1, decisionAtMs: T0, realizedR: r, followedPlan: null });
const VERDICT = /\b(too early|too late|missed|should have|mistake|impatien\w*|fear\w*|chas\w+|valid setup|you avoided)\b/i;

describe("§24 · entered before the touch, beside during a touch", () => {
  it("below 20 on either side: counts and INSUFFICIENT — never a comparison", () => {
    const taken = [...Array.from({ length: 19 }, (_, i) => t(i, "BEFORE_ANY_TOUCH", 1)), ...Array.from({ length: 25 }, (_, i) => t(100 + i, "DURING_FIRST_INTERACTION", -0.5))];
    const c = compareFvgTakenVsUntaken([ledger(10)], taken).timing;
    expect(c).toMatchObject({ state: "INSUFFICIENT EVIDENCE", beforeTouch: { decisions: 19, withR: 19 }, duringTouch: { decisions: 25, withR: 25 } });
    expect(c.sentence).toBe("You entered before the gap was touched on 19 of 44 gap decisions, and during a touch on 25. INSUFFICIENT EVIDENCE to compare their results: 19 and 25 with a recorded R (20 each side needed).");
  });
  it("20 each side with a recorded R: MEASURED, both means with their n", () => {
    const taken = [...Array.from({ length: 20 }, (_, i) => t(i, "BEFORE_ANY_TOUCH", i % 2 ? 1 : -1)), ...Array.from({ length: 20 }, (_, i) => t(100 + i, i % 3 ? "DURING_FIRST_INTERACTION" : "DURING_LATER_INTERACTION", 0.5))];
    const c = compareFvgTakenVsUntaken([ledger(10)], taken).timing;
    expect(c.state).toBe("MEASURED");
    expect(c.sentence).toBe("Entered before the gap was touched: mean 0R over 20. Entered during a touch: mean 0.5R over 20. Descriptive only.");
  });
  it("a decision without a recorded R counts as a decision, not as a result; between-touch decisions are on neither side", () => {
    const c = compareFvgTakenVsUntaken([ledger(4)], [t(0, "BEFORE_ANY_TOUCH", null), t(1, "BEFORE_ANY_TOUCH", 2), t(2, "AFTER_FIRST_INTERACTION", 1), t(3, "DURING_FIRST_INTERACTION", Number.NaN)]).timing;
    expect(c.beforeTouch).toEqual({ decisions: 2, withR: 1, meanR: 2 });
    expect(c.duringTouch).toEqual({ decisions: 1, withR: 0, meanR: null });
  });
});

describe("§24 · the settled touches the trader did not trade, on his own days", () => {
  it("fewer than 20: the counts, and INSUFFICIENT for a share", () => {
    const c = compareFvgTakenVsUntaken([ledger(12)], [t(0, "DURING_FIRST_INTERACTION", 1), t(1, "DURING_FIRST_INTERACTION", 1)]).untraded;
    expect(c).toMatchObject({ n: 10, rejected: 5, accepted: 5, tradedThrough: 0, state: "INSUFFICIENT EVIDENCE" });
    expect(c.sentence).toBe("On the days you traded gaps, 10 touches you did not trade have settled (rejected 5, accepted 5, traded through 0). INSUFFICIENT EVIDENCE for a share — 10 of 20.");
  });
  it("20 or more: MEASURED with the share — and it says a touch left is not a trade missed", () => {
    const c = compareFvgTakenVsUntaken([ledger(42, i => (i % 4 === 0 ? "TRADED_THROUGH" : i % 2 ? "REJECTED" : "ACCEPTED"))], [t(0, "DURING_FIRST_INTERACTION", 1), t(1, "DURING_FIRST_INTERACTION", 1)]).untraded;
    expect(c.state).toBe("MEASURED");
    expect(c.n).toBe(40);
    expect(c.sentence).toMatch(/^On the days you traded gaps, 40 touches you did not trade have settled: the territory rejected on \d+ \(\d+%\), was accepted on \d+ and traded through on \d+\. Descriptive only — a touch you left is not a trade you missed\.$/);
    expect(c.rejected + c.accepted + c.tradedThrough).toBe(40);
  });
  it("the counts ADD UP: touches that settled with no answer are said (found on serving 16f363a: 4 + 2 + 8 of 26 left 12 unexplained)", () => {
    const c = compareFvgTakenVsUntaken([ledger(42, i => (i % 4 === 0 ? "NONE" : i % 2 ? "REJECTED" : "ACCEPTED"))], [t(0, "DURING_FIRST_INTERACTION", 1), t(1, "DURING_FIRST_INTERACTION", 1)]).untraded;
    expect(c.rejected + c.accepted + c.tradedThrough + c.noAnswer).toBe(c.n);
    expect(c.noAnswer).toBeGreaterThan(0);
    expect(c.sentence).toMatch(/traded through on 0 and gave no answer on \d+\. Descriptive only/);
    const small = compareFvgTakenVsUntaken([ledger(8, i => (i % 2 ? "NONE" : "REJECTED"))], [t(0, "DURING_FIRST_INTERACTION", 1)]).untraded;
    expect(small.sentence).toMatch(/\(rejected \d+, accepted 0, traded through 0, no answer \d+\)/);
    expect(small.rejected + small.noAnswer).toBe(small.n);
    // The fixture too.
    const fx = journalFixture().counterfactual.untraded;
    expect(fx.rejected + fx.accepted + fx.tradedThrough + fx.noAnswer).toBe(fx.n);
  });
  it("OPEN interactions, the traded touches themselves, and other days are not counted", () => {
    const l = ledger(6, i => (i === 5 ? "OPEN" : "REJECTED"));
    (l.objects as unknown as { interactions: FvgInteraction[] }[])[4].interactions[0] = inter(1, T0 + 3 * 86_400_000, "REJECTED");   // another day
    const c = compareFvgTakenVsUntaken([l], [t(0, "DURING_FIRST_INTERACTION", 1)]).untraded;
    expect(c.n).toBe(3);                                                     // O1, O2, O3 — not O0 (traded), O4 (other day), O5 (open)
  });
  it("no gap decision or no ledger: said as not read, never as zero", () => {
    expect(compareFvgTakenVsUntaken([ledger(30)], []).untraded.sentence).toBe("Touches you did not trade: not read (no gap decision, or no ledger loaded).");
    expect(compareFvgTakenVsUntaken([], [t(0, "DURING_FIRST_INTERACTION", 1)]).untraded.sentence).toBe("Touches you did not trade: not read (no gap decision, or no ledger loaded).");
  });
});

describe("facts, not verdicts", () => {
  it("no sentence calls an entry early or a touch a miss", () => {
    const f = journalFixture();
    const cs = [
      f.counterfactual,
      compareFvgTakenVsUntaken([ledger(60)], [...Array.from({ length: 20 }, (_, i) => t(i, "BEFORE_ANY_TOUCH", 1)), ...Array.from({ length: 20 }, (_, i) => t(30 + i, "DURING_FIRST_INTERACTION", 1))]),
      compareFvgTakenVsUntaken([ledger(5)], [t(0, "BEFORE_ANY_TOUCH", 1)]),
    ];
    const text = cs.flatMap(c => [c.timing.sentence, c.untraded.sentence]).join(" ");
    expect(text.length).toBeGreaterThan(400);
    expect(text.replace(/a touch you left is not a trade you missed/g, "")).not.toMatch(VERDICT);
  });
  it("the fixture's comparison carries both, with its real counts", () => {
    const c = journalFixture().counterfactual;
    expect(c.timing.beforeTouch.decisions + c.timing.duringTouch.decisions).toBeLessThanOrEqual(24);
    expect(c.untraded.n).toBe(c.market.reduce((s, m) => s + m.untaken.n, 0));
  });
});
