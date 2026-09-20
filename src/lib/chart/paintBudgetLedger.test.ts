import { describe, expect, it } from "vitest";

import { PROFILE_OVERLAY_FRAME_MS, STANDARD_OVERLAY_FRAME_MS } from "@/lib/chartOverlayGovernor";

import {
  budgetMet,
  emptyPaintLedger,
  meanPaintMs,
  paintLedgerReceipt,
  PAINT_LEDGER_WINDOW_DRAWS,
  recordPaint,
  recordSkip,
  withPaintBudget,
} from "./paintBudgetLedger";

/** Fold a run of paint durations into a ledger, in order. */
const paints = (budget: number, ...ms: number[]) =>
  ms.reduce(recordPaint, emptyPaintLedger(budget));

describe("B-801 · the allocation is the one the governor actually declares", () => {
  it("measures against the governor's own constants, not a second copy", () => {
    // If this file hard-coded 33 and the governor later moved to 16, the
    // receipt would keep reporting MET against a budget nobody was using —
    // the "one number, two owners" bug in its purest form.
    expect(emptyPaintLedger(STANDARD_OVERLAY_FRAME_MS).budgetMs).toBe(33);
    expect(emptyPaintLedger(PROFILE_OVERLAY_FRAME_MS).budgetMs).toBe(50);
  });

  it("refuses to treat a nonsense allocation as a budget", () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(emptyPaintLedger(bad).budgetMs).toBe(0);
    }
  });

  it("re-bases when the allocation changes, and only then", () => {
    // Toggling a Volume Profile moves 33ms → 50ms. Accumulating across that
    // boundary would produce a mean measured against two contracts and an
    // over-budget count that silently changed definition halfway through.
    const at33 = paints(33, 10, 40);
    expect(at33.overBudgetDraws).toBe(1);

    const at50 = withPaintBudget(at33, 50);
    expect(at50.drawn, "a new contract starts a new measurement").toBe(0);
    expect(at50.overBudgetDraws).toBe(0);
    expect(at50.budgetMs).toBe(50);

    // Same budget must not discard hard-won measurement.
    expect(withPaintBudget(at33, 33)).toBe(at33);
  });
});

describe("B-801 · waste is a declared line item", () => {
  it("counts a paint that costs more than its whole frame", () => {
    // The governor cannot know this. It decides BEFORE the paint; this is
    // only knowable after. A 60ms paint cannot hold a 50ms cadence however
    // correct the pacing arithmetic is.
    const l = paints(50, 10, 20, 60, 5);
    expect(l.drawn).toBe(4);
    expect(l.overBudgetDraws).toBe(1);
    expect(budgetMet(l)).toBe(false);
    expect(paintLedgerReceipt(l).paintBudgetMet).toBe("EXCEEDED");
  });

  it("does not count a paint that exactly spends its allocation", () => {
    // Spending the budget is not exceeding it. An off-by-one here would
    // report a permanently EXCEEDED overlay that is in fact on contract.
    expect(paints(33, 33).overBudgetDraws).toBe(0);
    expect(paints(33, 33.1).overBudgetDraws).toBe(1);
  });

  it("keeps the worst frame, which the mean is designed to hide", () => {
    const l = paints(33, 1, 1, 1, 1, 90);
    expect(meanPaintMs(l)).toBeCloseTo(18.8, 1);
    expect(l.longestDrawMs, "a 90ms stall is the whole story here").toBe(90);
    expect(paintLedgerReceipt(l).paintLongestMs).toBe("90");
  });
});

describe("B-801 · an unmeasured budget is never reported as met", () => {
  it("answers UNMEASURED before the first paint", () => {
    // Reporting MET here is the exact false green this module removes.
    const fresh = emptyPaintLedger(33);
    expect(budgetMet(fresh)).toBeNull();
    expect(meanPaintMs(fresh)).toBeNull();
    expect(paintLedgerReceipt(fresh).paintBudgetMet).toBe("UNMEASURED");
    expect(paintLedgerReceipt(fresh).paintMeanMs).toBeUndefined();
  });

  it("answers UNMEASURED when there is no allocation to measure against", () => {
    expect(budgetMet(paints(0, 10, 20))).toBeNull();
    expect(paints(0, 10, 20).overBudgetDraws).toBe(0);
  });

  it("scores an unmeasurable paint as nothing, not as free", () => {
    // performance.now() differences can go non-finite across a clock
    // adjustment. A NaN folded into the total would poison every later mean
    // with no visible cause.
    const base = paints(33, 10);
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -5]) {
      const after = recordPaint(base, bad);
      expect(after, `a duration of ${bad} must not be recorded`).toBe(base);
    }
    expect(meanPaintMs(base)).toBe(10);
  });
});

describe("B-801 · the three skip reasons stay distinct", () => {
  it("counts each reason separately", () => {
    // The governor refuses to collapse them and explains why. Collapsing
    // them here would undo that at the reporting layer.
    let l = emptyPaintLedger(33);
    l = recordSkip(l, "BUDGET");
    l = recordSkip(l, "BUDGET");
    l = recordSkip(l, "HIDDEN");
    l = recordSkip(l, "BAD_CLOCK");
    expect(l.skippedByBudget).toBe(2);
    expect(l.skippedByHidden).toBe(1);
    expect(l.skippedByBadClock).toBe(1);
    expect(l.drawn, "a skip is not a paint").toBe(0);
  });

  it("stamps the exceptional reasons only when they happened", () => {
    // A steady `data-paint-skipped-hidden="0"` on every chart trains a reader
    // to ignore the attribute on the one occasion it is not zero.
    const ordinary = recordSkip(paints(33, 5), "BUDGET");
    const r = paintLedgerReceipt(ordinary);
    expect(r.paintSkippedBudget).toBe("1");
    expect(r.paintSkippedHidden).toBeUndefined();
    expect(r.paintSkippedBadClock).toBeUndefined();

    const frozen = recordSkip(recordSkip(paints(33, 5), "BAD_CLOCK"), "HIDDEN");
    const f = paintLedgerReceipt(frozen);
    expect(f.paintSkippedHidden).toBe("1");
    expect(f.paintSkippedBadClock, "a frozen overlay must not read as pacing").toBe("1");
  });
});

describe("B-801 · the receipt describes the paint happening now", () => {
  it("rolls the window over so a closed market cannot dominate the mean", () => {
    let l = emptyPaintLedger(33);
    for (let i = 0; i < PAINT_LEDGER_WINDOW_DRAWS; i += 1) l = recordPaint(l, 30);
    expect(l.drawn).toBe(PAINT_LEDGER_WINDOW_DRAWS);
    expect(l.windowsCompleted).toBe(0);

    l = recordPaint(l, 4);
    expect(l.drawn, "the window restarted").toBe(1);
    expect(l.windowsCompleted).toBe(1);
    expect(meanPaintMs(l), "the last six hours no longer speak").toBe(4);
    expect(l.longestDrawMs).toBe(4);
    expect(paintLedgerReceipt(l).paintWindows).toBe("1");
  });

  it("carries the allocation across a rollover", () => {
    let l = emptyPaintLedger(50);
    for (let i = 0; i <= PAINT_LEDGER_WINDOW_DRAWS; i += 1) l = recordPaint(l, 10);
    expect(l.budgetMs).toBe(50);
  });

  it("publishes tenths of a millisecond, not timer noise", () => {
    // Finer than a tenth is noise from the timer itself, and publishing
    // noise as precision is its own small overclaim.
    const r = paintLedgerReceipt(paints(33, 12.34567));
    expect(r.paintMeanMs).toBe("12.3");
    expect(r.paintLongestMs).toBe("12.3");
  });

  it("names every field a reader needs to audit the budget unaided", () => {
    const r = paintLedgerReceipt(paints(33, 10, 40));
    expect(r).toMatchObject({
      paintBudgetMs: "33",
      paintDrawn: "2",
      paintSkippedBudget: "0",
      paintOverBudget: "1",
      paintBudgetMet: "EXCEEDED",
      paintMeanMs: "25",
      paintLongestMs: "40",
    });
  });
});

describe("B-801 · the ledger never mutates what it was handed", () => {
  it("returns new ledgers rather than editing the old one", () => {
    // The renderer keeps this in a ref across frames. An in-place mutation
    // would make every past reading retroactively wrong.
    const before = paints(33, 10);
    const snapshot = { ...before };
    recordPaint(before, 20);
    recordSkip(before, "HIDDEN");
    withPaintBudget(before, 50);
    expect(before).toEqual(snapshot);
  });
});
