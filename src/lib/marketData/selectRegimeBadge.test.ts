/**
 * State matrix for the REGIME chip. Both defects observed live 2026-09-05 are
 * reproduced here as named cases, not paraphrased.
 */

import { describe, it, expect } from "vitest";
import { selectRegimeBadge, selectRegimePeriodLabel } from "./selectRegimeBadge";

const SAT = new Date("2026-09-05T19:59:00Z"); // Saturday — session proven closed
const TUE = new Date("2026-09-08T18:00:00Z"); // Tuesday — closure NOT established

describe("missing data yields no regime", () => {
  it("does not classify when changePct is absent", () => {
    // THE DEFECT: `Number.isFinite(x) ? x : 0` turned "no quote" into 0, which
    // fell into the SIDE band. A fabricated market state out of pure silence.
    for (const absent of [undefined, null, NaN, Infinity, -Infinity, "0", "-0.34"]) {
      const view = selectRegimeBadge({ changePct: absent, symbol: "GC1!", at: SAT });
      expect(view.displayable, `changePct=${String(absent)}`).toBe(false);
    }
  });

  it("never reports SIDE for an unverified change", () => {
    const view = selectRegimeBadge({ changePct: undefined, symbol: "GC1!", at: SAT });
    expect(JSON.stringify(view)).not.toContain("SIDE");
  });

  it("a real zero IS displayable — flat is a fact, missing is not", () => {
    // The guard must distinguish "the market did not move" from "we do not
    // know". Collapsing them is the bug in the other direction.
    const view = selectRegimeBadge({ changePct: 0, symbol: "GC1!", at: SAT });
    expect(view).toMatchObject({ displayable: true, regime: "SIDE", changePct: 0 });
  });
});

describe("regime bands mirror the Markov state model", () => {
  const cases: ReadonlyArray<readonly [number, string]> = [
    [5, "BULL"], [1.51, "BULL"], [1.5, "SIDE"], [0, "SIDE"],
    [-1.5, "SIDE"], [-1.51, "BEAR"], [-9, "BEAR"],
  ];

  for (const [pct, regime] of cases) {
    it(`${pct}% -> ${regime}`, () => {
      const view = selectRegimeBadge({ changePct: pct, symbol: "GC1!", at: TUE });
      expect(view).toMatchObject({ displayable: true, regime });
    });
  }

  it("boundaries are exclusive, so 1.5 is not yet BULL", () => {
    // Pinned because a > / >= slip silently reclassifies the market.
    expect(selectRegimeBadge({ changePct: 1.5, symbol: "X", at: TUE })).toMatchObject({ regime: "SIDE" });
    expect(selectRegimeBadge({ changePct: -1.5, symbol: "X", at: TUE })).toMatchObject({ regime: "SIDE" });
  });
});

describe("'today' is a liveness claim and must be earned", () => {
  it("says 'last session' on a Saturday — the exact live observation", () => {
    // Screenshot 2026-09-05: "REGIME SIDE -0.34% today" with GC1! closed.
    const view = selectRegimeBadge({ changePct: -0.34, symbol: "GC1!", at: SAT });
    expect(view).toMatchObject({ displayable: true, periodLabel: "last session" });
  });

  it("says 'today' when closure is not established", () => {
    expect(selectRegimePeriodLabel("GC1!", TUE)).toBe("today");
  });

  it("emits no period word before mount, so the label only sharpens", () => {
    // null at === the server render and first client render. Claiming either
    // word there is a coin flip that can require a retraction on settle.
    expect(selectRegimePeriodLabel("GC1!", null)).toBeNull();
    expect(selectRegimeBadge({ changePct: -0.34, symbol: "GC1!", at: null }))
      .toMatchObject({ displayable: true, periodLabel: null });
  });

  it("still says 'today' for crypto on a Saturday — it never closed", () => {
    // Continuous markets have no session to close. Labelling BTC's Saturday
    // move "last session" would be the same overreach pointed the other way.
    expect(selectRegimePeriodLabel("BTC", SAT)).toBe("today");
  });
});
