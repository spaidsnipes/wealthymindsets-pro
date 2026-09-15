/**
 * Truth-lock for the queue assumption behind a paper limit fill.
 *
 * Canon weakness #9 PAPER-FILL OVERCONFIDENCE. /paper's fill loop books a full
 * fill the instant an observed price satisfies a limit — including when the
 * price merely EQUALS it. A real order fills at the touch only with queue
 * priority, and the quote pipeline behind /paper carries no depth and no tape,
 * so queue position is not estimated badly: there is no input for it.
 *
 * These assertions are mostly refusals to grade, and one refusal to reassure.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  selectFillQueueBasis,
  describeFillQueueBasis,
  type FillQueueBasisInput,
} from "./paperFillQueueBasis";
import { selectOrderFill } from "./paperTrade";

const buyLimit = (limitPx?: number): FillQueueBasisInput =>
  ({ side: "buy", type: "limit", limitPx });
const sellLimit = (limitPx?: number): FillQueueBasisInput =>
  ({ side: "sell", type: "limit", limitPx });

describe("selectFillQueueBasis", () => {
  it("THE FIX: a buy filled at exactly its limit assumed queue priority", () => {
    expect(selectFillQueueBasis(buyLimit(100), 100)).toBe("at-the-touch");
  });

  it("THE FIX: a sell filled at exactly its limit assumed queue priority", () => {
    expect(selectFillQueueBasis(sellLimit(100), 100)).toBe("at-the-touch");
  });

  it("calls a buy that traded THROUGH its level marketable", () => {
    // The market went to 98 on a 100 bid. A real resting order fills here by
    // construction — no queue assumption is needed.
    expect(selectFillQueueBasis(buyLimit(100), 98)).toBe("marketable");
  });

  it("calls a sell that traded THROUGH its level marketable", () => {
    expect(selectFillQueueBasis(sellLimit(100), 102)).toBe("marketable");
  });

  it("grades stop-limit orders too — they carry a limit leg", () => {
    expect(
      selectFillQueueBasis({ side: "buy", type: "stop-limit", limitPx: 100 }, 100),
    ).toBe("at-the-touch");
    expect(
      selectFillQueueBasis({ side: "buy", type: "stop-limit", limitPx: 100 }, 99),
    ).toBe("marketable");
  });

  it("asks nothing of order types that have no limit level", () => {
    expect(selectFillQueueBasis({ side: "buy", type: "market" }, 100)).toBe("unconditioned");
    expect(selectFillQueueBasis({ side: "buy", type: "stop", stopPx: 100 } as FillQueueBasisInput, 100))
      .toBe("unconditioned");
  });

  describe("refuses to grade rather than inventing a grade", () => {
    it.each([
      ["an unrecorded limit level", undefined],
      ["a null limit level", null],
      ["a NaN limit level", Number.NaN],
    ])("returns unconditioned given %s", (_label, limit) => {
      expect(
        selectFillQueueBasis({ side: "buy", type: "limit", limitPx: limit as number }, 100),
      ).toBe("unconditioned");
    });

    it.each([
      ["a NaN fill price", Number.NaN],
      ["an infinite fill price", Number.POSITIVE_INFINITY],
    ])("returns unconditioned given %s", (_label, px) => {
      expect(selectFillQueueBasis(buyLimit(100), px as number)).toBe("unconditioned");
    });

    it("refuses a fill on the wrong side of its own limit", () => {
      // A buy booked ABOVE its limit is a contradiction. Grading it
      // "marketable" would read as reassurance about an impossible fill.
      expect(selectFillQueueBasis(buyLimit(100), 101)).toBe("unconditioned");
      expect(selectFillQueueBasis(sellLimit(100), 99)).toBe("unconditioned");
    });
  });

  it("uses strict equality — no invented tolerance band around the level", () => {
    // A tick either printed at the level or it did not. Any "within N" window
    // would be a modelling parameter chosen here with no observation behind it.
    expect(selectFillQueueBasis(buyLimit(100), 99.99)).toBe("marketable");
    expect(selectFillQueueBasis(buyLimit(100), 100)).toBe("at-the-touch");
  });
});

describe("describeFillQueueBasis", () => {
  it("names queue priority and names why it is unknowable here", () => {
    const s = describeFillQueueBasis("at-the-touch");
    expect(s).toMatch(/queue priority/i);
    expect(s).toMatch(/touched/i);
    // The reason must be the ABSENCE OF INPUT, not a modelling shortfall.
    expect(s).toMatch(/no depth|no tape|depth (and|or) tape/i);
  });

  it("says nothing about the cases this selector does not own", () => {
    // Silence is the absence of THIS caveat, never an all-clear — a market
    // order still books at the last observed price with no slippage.
    expect(describeFillQueueBasis("marketable")).toBeNull();
    expect(describeFillQueueBasis("unconditioned")).toBeNull();
  });
});

describe("selectOrderFill carries the basis alongside the price", () => {
  it("grades a limit fill at the touch", () => {
    const out = selectOrderFill({ side: "buy", type: "limit", limitPx: 100 }, 100);
    expect(out).toEqual({ fillPx: 100, queueBasis: "at-the-touch" });
  });

  it("grades a limit fill that traded through", () => {
    const out = selectOrderFill({ side: "buy", type: "limit", limitPx: 100 }, 98);
    expect(out).toEqual({ fillPx: 98, queueBasis: "marketable" });
  });

  it("still records the OBSERVED price, never the level", () => {
    // The pre-existing invariant must survive the new field.
    expect(selectOrderFill({ side: "sell", type: "limit", limitPx: 100 }, 103)?.fillPx).toBe(103);
  });

  it("leaves a market fill ungraded", () => {
    expect(selectOrderFill({ side: "buy", type: "market" }, 100)).toEqual({
      fillPx: 100,
      queueBasis: "unconditioned",
    });
  });
});

/**
 * SOURCE-TEXT SENTINEL.
 *
 * The overclaim is an ABSENCE on a rendered surface — a filled row with no
 * caveat. No type can guard a missing paragraph, so the guard reads the source.
 */
describe("/paper's order blotter discloses the queue assumption", () => {
  const PAPER_PAGE = readFileSync(
    resolve(__dirname, "../app/paper/page.tsx"),
    "utf8",
  );

  it("imports the grader", () => {
    expect(
      PAPER_PAGE,
      "a filled limit order must be graded against its own level, not rendered bare",
    ).toMatch(/selectFillQueueBasis/);
  });

  it("renders the note in the order rows", () => {
    expect(
      PAPER_PAGE,
      "the grading is worthless if no row shows it",
    ).toMatch(/<FillQueueBasisNote /);
  });
});
