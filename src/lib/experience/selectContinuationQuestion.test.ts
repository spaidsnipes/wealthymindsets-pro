import { describe, it, expect } from "vitest";
import { selectContinuationQuestion } from "./selectContinuationQuestion";
import { selectContinuationHealth } from "../marketData/viewModels/selectContinuationHealth";
import type { MarketStructureVM } from "../marketData/viewModels/selectMarketStructure";
import type { RegimeVM, RegimeVerdict } from "../marketData/viewModels/selectRegime";

/**
 * Compiled from the REAL owner rather than a hand-built VM. A banner test that
 * mocks the reading it is meant to render can pass while the two files
 * disagree about the shape they share — which is the failure this whole lane
 * exists to prevent.
 */

function structureOf(over: Partial<MarketStructureVM> = {}): MarketStructureVM {
  return {
    measured: true,
    lookback: 5,
    barCount: 120,
    unconfirmedBars: 5,
    confirmationLagNote: "the newest 5 bars cannot yet be a pivot",
    swingHighs: [],
    swingLows: [],
    lastSwingHigh: null,
    lastSwingLow: null,
    bias: "HIGHER_HIGHS",
    biasNote: "the last two confirmed highs each printed higher",
    insufficientNote: null,
    ...over,
  } as MarketStructureVM;
}

function regimeOf(verdict: RegimeVerdict): RegimeVM {
  return {
    verdict,
    resolution: "RESOLVED",
    confidence: 0.6,
    narrative: `Regime narrative for ${verdict}`,
    evidence: [],
    contradictions: [],
    capturedAt: 1_700_000_000_000,
  } as RegimeVM;
}

const ask = (bias: MarketStructureVM["bias"], verdict: RegimeVerdict) =>
  selectContinuationQuestion(
    selectContinuationHealth({ structure: structureOf({ bias }), regime: regimeOf(verdict) }),
  );

describe("selectContinuationQuestion", () => {
  it("names the real sequence when one was confirmed", () => {
    const out = ask("HIGHER_HIGHS", "TREND");
    expect(out.focus.basis).toBe("CONTINUATION_COHERENT");
    expect(out.focus.unresolved).toBe(false);
    expect(out.question).toContain("the higher highs sequence");
    expect(out.focus.focus).toBe("Continuation health of the higher highs sequence");
  });

  it("carries the counter-clause so the banner is not an endorsement of the move", () => {
    // "Is it healthy?" invites a yes. The trader's actual exposure is the other
    // branch, and it must be in the sentence.
    expect(ask("LOWER_LOWS", "TREND").question).toContain("or is the move already spent?");
  });

  it("REFUSES the mockup's string over a rotating market — it would presume its own subject", () => {
    // `Is this continuation healthy?` asks how healthy a move is, on a screen
    // whose own evidence says no move is in progress.
    const out = ask("RANGE", "BALANCE");
    expect(out.focus.basis).toBe("CONTINUATION_ROTATING");
    expect(out.question).toBe("Is anything continuing here at all?");
    expect(out.question).not.toContain("this continuation healthy");
    // ROTATING is a FINDING, not a failure — the window answered.
    expect(out.focus.unresolved).toBe(false);
  });

  it("DOES go unresolved when an owner produced nothing, and only then", () => {
    const unreadable = selectContinuationQuestion(
      selectContinuationHealth({ structure: structureOf({ measured: false }), regime: regimeOf("TREND") }),
    );
    expect(unreadable.focus.basis).toBe("CONTINUATION_UNREADABLE");
    expect(unreadable.focus.unresolved).toBe(true);
    // Only here does the mockup's bare wording survive.
    expect(unreadable.question).toBe("Is this continuation healthy?");
    expect(ask("RANGE", "BALANCE").focus.unresolved).toBe(false);
  });

  it("treats a null reading exactly as an unreadable one — a surface with nothing in hand must not throw", () => {
    expect(selectContinuationQuestion(null).focus.basis).toBe("CONTINUATION_UNREADABLE");
    expect(selectContinuationQuestion(undefined).focus.unresolved).toBe(true);
  });

  it("asks the SAME question of a coherent and a contested move, and distinguishes them in basis", () => {
    // The question a trader brings to the screen does not change because the
    // answer did. What must stay distinguishable is which reading drove it.
    const coherent = ask("HIGHER_HIGHS", "TREND");
    const contested = ask("HIGHER_HIGHS", "BALANCE");
    expect(coherent.question).toBe(contested.question);
    expect(coherent.focus.basis).toBe("CONTINUATION_COHERENT");
    expect(contested.focus.basis).toBe("CONTINUATION_CONTESTED");
  });

  it("reads the sequence OFF THE READING so the banner cannot name a different one", () => {
    const out = ask("LOWER_LOWS", "EXPANSION");
    expect(out.question).toContain("the lower lows sequence");
    expect(out.focus.focus).toContain("lower lows");
  });

  it("keeps the focus a SUBJECT, never the verdict the reason line already owns", () => {
    const cases: ContinuationCase[] = [
      ["HIGHER_HIGHS", "TREND"],
      ["HIGHER_HIGHS", "BALANCE"],
      ["RANGE", "BALANCE"],
    ];
    for (const [bias, verdict] of cases) {
      const out = ask(bias, verdict);
      expect(out.focus.focus).toMatch(/^Continuation health/);
      // The verdict words belong to the reading, not the banner.
      expect(out.focus.focus).not.toMatch(/COHERENT|CONTESTED|ROTATING/);
    }
    expect(selectContinuationQuestion(null).focus.focus).toMatch(/^Continuation health/);
  });

  it("PUTS NO SCORE in the largest sentence on the canvas", () => {
    for (const out of [ask("HIGHER_HIGHS", "TREND"), ask("RANGE", "BALANCE")]) {
      expect(out.question).not.toMatch(/\d|%/);
      expect(out.focus.focus).not.toMatch(/\d|%/);
    }
  });

  it("is pure — the same reading compiles the same banner twice", () => {
    const vm = selectContinuationHealth({ structure: structureOf(), regime: regimeOf("TREND") });
    expect(selectContinuationQuestion(vm)).toEqual(selectContinuationQuestion(vm));
  });
});

type ContinuationCase = readonly [MarketStructureVM["bias"], RegimeVerdict];
