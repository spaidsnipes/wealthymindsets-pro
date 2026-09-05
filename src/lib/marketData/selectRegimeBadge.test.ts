/**
 * State matrix for the REGIME chip. All three defects observed live 2026-09-05
 * are reproduced here as named cases, not paraphrased.
 */

import { describe, it, expect } from "vitest";
import { selectRegimeBadge, selectRegimePeriodLabel } from "./selectRegimeBadge";

const SAT = new Date("2026-09-05T19:59:00Z"); // Saturday — session proven closed
const TUE = new Date("2026-09-08T18:00:00Z"); // Tuesday — closure NOT established

/** A change backed by a real reference close, for cases testing other axes. */
const backed = (pct: number) => ({ change: pct * 10, changePct: pct });

describe("missing data yields no regime", () => {
  it("does not classify when changePct is absent", () => {
    // THE DEFECT: `Number.isFinite(x) ? x : 0` turned "no quote" into 0, which
    // fell into the SIDE band. A fabricated market state out of pure silence.
    for (const absent of [undefined, null, NaN, Infinity, -Infinity, "0", "-0.34"]) {
      const view = selectRegimeBadge({ change: -3.4, changePct: absent, symbol: "GC1!", at: SAT });
      expect(view.displayable, `changePct=${String(absent)}`).toBe(false);
    }
  });

  it("does not classify when the absolute change is absent", () => {
    // Symmetric to the above. Both numbers are evidence; one alone is not.
    for (const absent of [undefined, null, NaN, Infinity, -Infinity, "0"]) {
      const view = selectRegimeBadge({ change: absent, changePct: -0.34, symbol: "GC1!", at: SAT });
      expect(view.displayable, `change=${String(absent)}`).toBe(false);
    }
  });

  it("never reports SIDE for an unverified change", () => {
    const view = selectRegimeBadge({ change: undefined, changePct: undefined, symbol: "GC1!", at: SAT });
    expect(JSON.stringify(view)).not.toContain("SIDE");
  });

  /**
   * READ OFF THE LIVE SITE 2026-09-05, AFTER THE FIRST FIX SHIPPED. /charts:
   *
   *   REGIME  SIDE  +0.00% last session
   *   4,476.60  — (change unavailable)      ← one row below, same screen
   *
   * The version of this file that shipped with the first fix asserted the
   * OPPOSITE of the case below, under the heading "a real zero IS displayable —
   * flat is a fact, missing is not". That reasoning is sound in the abstract
   * and wrong for this ticker shape: useWebSocket.flush() leaves change and
   * changePct at their initial 0 until prevCloseRef holds a real prior close,
   * so the zero-pair IS the absence sentinel. A finiteness check cannot see it.
   *
   * selectTickerChangeDisplay already owned this exact question and already
   * documented that four of five sites got it wrong the same way. This one made
   * five. The regime selector now delegates instead of re-deriving.
   */
  it("withholds the zero-pair — that is 'no reference close', not 'flat'", () => {
    const view = selectRegimeBadge({ change: 0, changePct: 0, symbol: "GC1!", at: SAT });
    expect(view.displayable).toBe(false);
    expect(JSON.stringify(view)).not.toContain("SIDE");
  });

  it("a genuinely flat percent with a real move in the absolute is kept", () => {
    // Proves the guard keys on the PAIR, not on changePct alone — otherwise it
    // would be a blanket "zero is never displayable" rule, which would drop
    // real data on any instrument whose rounded percent lands on 0.00.
    expect(selectRegimeBadge({ change: 0.004, changePct: 0, symbol: "GC1!", at: TUE }))
      .toMatchObject({ displayable: true, regime: "SIDE", changePct: 0 });
  });
});

describe("regime bands mirror the Markov state model", () => {
  const cases: ReadonlyArray<readonly [number, string]> = [
    [5, "BULL"], [1.51, "BULL"], [1.5, "SIDE"],
    [-1.5, "SIDE"], [-1.51, "BEAR"], [-9, "BEAR"],
  ];

  for (const [pct, regime] of cases) {
    it(`${pct}% -> ${regime}`, () => {
      const view = selectRegimeBadge({ ...backed(pct), symbol: "GC1!", at: TUE });
      expect(view).toMatchObject({ displayable: true, regime });
    });
  }

  it("boundaries are exclusive, so 1.5 is not yet BULL", () => {
    // Pinned because a > / >= slip silently reclassifies the market.
    expect(selectRegimeBadge({ ...backed(1.5), symbol: "X", at: TUE })).toMatchObject({ regime: "SIDE" });
    expect(selectRegimeBadge({ ...backed(-1.5), symbol: "X", at: TUE })).toMatchObject({ regime: "SIDE" });
  });
});

describe("'today' is a liveness claim and must be earned", () => {
  it("says 'last session' on a Saturday — the exact live observation", () => {
    // Screenshot 2026-09-05: "REGIME SIDE -0.34% today" with GC1! closed.
    const view = selectRegimeBadge({ ...backed(-0.34), symbol: "GC1!", at: SAT });
    expect(view).toMatchObject({ displayable: true, periodLabel: "last session" });
  });

  it("says 'today' when closure is not established", () => {
    expect(selectRegimePeriodLabel("GC1!", TUE)).toBe("today");
  });

  it("emits no period word before mount, so the label only sharpens", () => {
    // null at === the server render and first client render. Claiming either
    // word there is a coin flip that can require a retraction on settle.
    expect(selectRegimePeriodLabel("GC1!", null)).toBeNull();
    expect(selectRegimeBadge({ ...backed(-0.34), symbol: "GC1!", at: null }))
      .toMatchObject({ displayable: true, periodLabel: null });
  });

  it("still says 'today' for crypto on a Saturday — it never closed", () => {
    // Continuous markets have no session to close. Labelling BTC's Saturday
    // move "last session" would be the same overreach pointed the other way.
    expect(selectRegimePeriodLabel("BTC", SAT)).toBe("today");
  });
});
