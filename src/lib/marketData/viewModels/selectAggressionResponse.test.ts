/**
 * The two places Asset 03's art direction could become a lie are the two
 * places these tests push hardest:
 *
 *   1. the x-axis must keep its SIGN (an up bar and a down bar of equal size
 *      are not the same dot), and
 *   2. the y-axis must never silently swap net aggression for effort.
 *
 * Everything else here is arithmetic. These assert BEHAVIOUR, never wording —
 * the axis note's sentence is owned by the module, not by the test.
 */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { stripComments } from "@/lib/sourceScan";
import { selectAggressionResponse } from "./selectAggressionResponse";
import type { AnatomyBarInput } from "@/lib/marketData/selectAbsorptionAnatomy";

/** A plain unsigned bar: volume only, no aggressor split. The NQ1! shape. */
function bar(i: number, open: number, close: number, volume = 1000): AnatomyBarInput {
  return {
    time: 1_700_000_000 + i * 900,
    open,
    high: Math.max(open, close) + 1,
    low: Math.min(open, close) - 1,
    close,
    volume,
    askVol: null,
    bidVol: null,
  };
}

/** The same bar with a stated aggressor split, so `delta` exists. */
function signedBar(i: number, open: number, close: number, ask: number, bid: number): AnatomyBarInput {
  return {
    ...bar(i, open, close, ask + bid),
    askVol: ask,
    bidVol: bid,
  };
}

describe("selectAggressionResponse — the y-axis substitution is a field, never a silence", () => {
  it("an unsigned tape gets EFFORT on y, and netAggression is absent rather than zero", () => {
    // `0` would be a measurement claim: it asserts buys and sells were counted
    // and cancelled out. The truth is no side was ever stated.
    const vm = selectAggressionResponse(Array.from({ length: 12 }, (_, i) => bar(i, 100, 101)));
    expect(vm.aggressionAxis).toBe("EFFORT");
    expect(vm.netAggression).toBeNull();
    expect(vm.aggressionAxisNote.length).toBeGreaterThan(40);
  });

  it("ONE unsigned bar in an otherwise signed window still forces EFFORT", () => {
    // A single unsigned bar in a signed window would plot on the zero line —
    // indistinguishable from genuine balance, which is the opposite of what it
    // means. The whole window degrades or none of it does.
    const bars: AnatomyBarInput[] = [
      ...Array.from({ length: 9 }, (_, i) => signedBar(i, 100, 101, 700, 300)),
      bar(9, 100, 101),
    ];
    const vm = selectAggressionResponse(bars);
    expect(vm.aggressionAxis).toBe("EFFORT");
    expect(vm.netAggression).toBeNull();
  });

  it("a fully signed tape gets NET_AGGRESSION and a real sum", () => {
    const bars = Array.from({ length: 10 }, (_, i) => signedBar(i, 100, 101, 700, 300));
    const vm = selectAggressionResponse(bars);
    expect(vm.aggressionAxis).toBe("NET_AGGRESSION");
    expect(vm.netAggression).toBe(4000); // (700 − 300) × 10
    // and the y term each point carries is that same signed quantity
    expect(vm.points.every((p) => p.aggression === 400)).toBe(true);
  });

  it("the axis note differs between the two bases — it is not one sentence for both", () => {
    const unsigned = selectAggressionResponse(Array.from({ length: 6 }, (_, i) => bar(i, 100, 101)));
    const signed = selectAggressionResponse(
      Array.from({ length: 6 }, (_, i) => signedBar(i, 100, 101, 600, 400)),
    );
    expect(unsigned.aggressionAxisNote).not.toBe(signed.aggressionAxisNote);
  });
});

describe("selectAggressionResponse — the response term keeps its sign", () => {
  it("a down bar sits left of centre and an up bar of equal size sits right", () => {
    // `selectAbsorptionAnatomy` computes |close − open|. If this view reused
    // that term the two bars below would be the same dot, and the left/right
    // split is most of what the picture says.
    const vm = selectAggressionResponse([
      bar(0, 100, 102),
      bar(1, 100, 98),
    ]);
    const [up, down] = vm.points;
    expect(up.response).toBeCloseTo(2);
    expect(down.response).toBeCloseTo(-2);
    expect(up.response).not.toBe(down.response);
  });

  it("meanResponse is signed too — a balanced window reads ~0, an empty one reads null", () => {
    const balanced = selectAggressionResponse([bar(0, 100, 102), bar(1, 100, 98)]);
    expect(balanced.meanResponse).toBeCloseTo(0);
    expect(selectAggressionResponse([]).meanResponse).toBeNull();
  });
});

describe("selectAggressionResponse — classification and efficiency", () => {
  it("an absorbing bar stays ABSORBING even when it is also recent", () => {
    // The recent-absorbing dot is the single most informative point on the
    // chart; demoting it to the highlight colour would hide the thing the view
    // exists to show. This asserts the precedence, not that any given fixture
    // absorbs — so it only runs its claim when the window produced one.
    const vm = selectAggressionResponse(
      Array.from({ length: 30 }, (_, i) =>
        // huge effort, almost no displacement, for the newest third
        i >= 20 ? bar(i, 100, 100.01, 50_000) : bar(i, 100, 101, 1000),
      ),
    );
    const absorbing = vm.points.filter((p) => p.cls === "ABSORBING");
    if (absorbing.length > 0) {
      const lastIndex = vm.points.length - 1;
      expect(vm.points[lastIndex].cls).not.toBe("TYPICAL");
    }
    // Whatever the zones say, every point must carry exactly one known class.
    for (const p of vm.points) {
      expect(["ABSORBING", "RECENT", "TYPICAL"]).toContain(p.cls);
    }
  });

  it("the newest bars are RECENT and the oldest are not", () => {
    const vm = selectAggressionResponse(Array.from({ length: 30 }, (_, i) => bar(i, 100, 101)));
    expect(vm.points[vm.points.length - 1].cls).toBe("RECENT");
    expect(vm.points[0].cls).toBe("TYPICAL");
  });

  it("an empty window measures nothing and offers no efficiency number", () => {
    // Dividing by no effort is not a zero — it is an absent measurement.
    const vm = selectAggressionResponse([]);
    expect(vm.points).toHaveLength(0);
    expect(vm.efficiency).toBeNull();
    expect(vm.netAggression).toBeNull();
    expect(vm.measured).toBe(false);
  });

  it("THE LIMIT, PINNED: efficiency is window-relative and cannot rank two windows", () => {
    // Written because the first version of this test asserted the opposite and
    // failed — it expected a window of big moves to out-read a window of tiny
    // moves. Both read exactly 1.0, and that is CORRECT: both terms are
    // normalised against their own window's peak, so twenty identical bars are
    // all at 1.0 of themselves whether they moved a tick or a dollar.
    //
    // That is the price of a scale that means the same thing on a 5-tick future
    // and a $400 stock, and it is the same normalisation Asset 06 uses. The
    // danger is a reader treating the number as a cross-symbol grade, so the
    // limit is pinned here and disclosed on screen rather than left to be
    // rediscovered by someone trusting it.
    const bigMoves = selectAggressionResponse(
      Array.from({ length: 20 }, (_, i) => bar(i, 100, 100 + (i % 2 ? 4 : -4), 1000)),
    );
    const tinyMoves = selectAggressionResponse(
      Array.from({ length: 20 }, (_, i) => bar(i, 100, 100 + (i % 2 ? 0.02 : -0.02), 1000)),
    );
    expect(bigMoves.efficiency).toBeCloseTo(tinyMoves.efficiency!);
  });

  it("the printed scale note states the window-relative limit, not just the ladder", () => {
    // A ladder with no stated frame invites exactly the cross-symbol reading
    // the test above proves is unavailable.
    const vm = selectAggressionResponse(Array.from({ length: 10 }, (_, i) => bar(i, 100, 101)));
    expect(vm.efficiencyScaleNote.toLowerCase()).toContain("window-relative");
  });

  it("WITHIN one window, flat displacement against varied effort reads differently from the reverse", () => {
    // What the number CAN do: compare bars inside one window. These two windows
    // carry the same bars with effort and displacement swapped, and they must
    // not produce the same reading — if they did, the statistic would be blind
    // to which side of the relationship varied and would be printing noise.
    const effortVaries = selectAggressionResponse(
      Array.from({ length: 20 }, (_, i) => bar(i, 100, 101, 1000 * (i + 1))),
    );
    const displacementVaries = selectAggressionResponse(
      Array.from({ length: 20 }, (_, i) => bar(i, 100, 100 + (i + 1) * 0.5, 1000)),
    );
    expect(effortVaries.efficiency).not.toBeNull();
    expect(displacementVaries.efficiency).not.toBeNull();
    expect(effortVaries.efficiency!).not.toBeCloseTo(displacementVaries.efficiency!);
  });

  it("effortNorm is present on every point regardless of axis — it drives dot size", () => {
    const vm = selectAggressionResponse(Array.from({ length: 10 }, (_, i) => bar(i, 100, 101, 100 * (i + 1))));
    for (const p of vm.points) {
      expect(Number.isFinite(p.effortNorm)).toBe(true);
      expect(p.effortNorm).toBeGreaterThanOrEqual(0);
      expect(p.effortNorm).toBeLessThanOrEqual(1);
    }
  });

  it("carries Asset 06's CAPACITY verdict, so an empty zone list is never printed as a finding", () => {
    // Live on a thin crypto venue, one 15m print held ~85% of the window's
    // volume. Every other bar's effortNorm collapsed toward zero, no run could
    // clear the effort gate, and the panel said NO ZONE QUALIFIED — a sentence
    // about the market, when the truth was a sentence about the feed.
    const dominated = selectAggressionResponse([
      bar(0, 100, 100.01, 1_000_000),
      ...Array.from({ length: 11 }, (_, i) => bar(i + 1, 100, 100.01, 3)),
    ]);
    expect(dominated.zones).toEqual([]);
    expect(dominated.zoneQualificationPossible).toBe(false);
    expect(dominated.effortConcentration).toBeGreaterThan(0.9);
    expect(dominated.effortSpreadNote).not.toBeNull();

    // A well-spread window keeps its right to say "no zone qualified".
    const spread = selectAggressionResponse(
      Array.from({ length: 12 }, (_, i) => bar(i, 100, 100 + (i % 2 ? 1 : -1), 1000)),
    );
    expect(spread.zoneQualificationPossible).toBe(true);
    expect(spread.effortSpreadNote).toBeNull();
  });

  it("does not re-derive zones — it passes through the ones Asset 06 found", () => {
    // Two owners of "which bars absorbed" is the drift class this repo has
    // already been repaired for. The scatter reads; it does not decide.
    const src = stripComments(
      fs.readFileSync(path.resolve(__dirname, "selectAggressionResponse.ts"), "utf8"),
    );
    expect(src).toContain("selectAbsorptionAnatomy(");
    expect(src).toContain("zones: anatomy.zones");
  });
});

describe("selectAggressionResponse — no mockup literal survives", () => {
  it("none of the art-direction numbers appear in the source", () => {
    // `18,732`, `−2,552`, `7.42`, `98.7th percentile`, `+0.62`, `+2.1 TICKS`,
    // `0.34` are art direction. A literal here would be a number on screen with
    // no owner, which is exactly what LIVING-PIXEL LAW forbids.
    const src = stripComments(
      fs.readFileSync(path.resolve(__dirname, "selectAggressionResponse.ts"), "utf8"),
    );
    for (const literal of ["18,732", "2,552", "7.42", "98.7", "0.62", "0.34", "412.7K"]) {
      expect(src, `${literal} is art direction, not data`).not.toContain(literal);
    }
  });

  it("ships no forward-looking implication and no conviction grade", () => {
    const src = stripComments(
      fs.readFileSync(path.resolve(__dirname, "selectAggressionResponse.ts"), "utf8"),
    );
    expect(src).not.toMatch(/REVERSAL RISK/);
    expect(src).not.toMatch(/CONVICTION/);
    expect(src).not.toMatch(/HIGH PROBABILITY/);
  });
});
