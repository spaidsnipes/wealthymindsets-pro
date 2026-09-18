/**
 * deriveStructureDimension — branch matrix.
 *
 * The property that matters most here is unlike every other dimension in this
 * lane: the caveat is PERMANENT. `confirmationLagNote` must ride every stated
 * verdict, RESOLVED included, because a fractal pivot needs bars on both sides
 * and the newest ones can never be pivots. A longer window does not cure it,
 * so a RESOLVED structure reading with an empty `unknowns` array would be a
 * silent overclaim — and nothing else in the repo would catch it.
 */

import { describe, expect, it } from "vitest";
import {
  deriveStructureDimension,
  STRUCTURE_VERDICTS,
  STRUCTURE_RESOLVE_MIN_BARS,
  type DeriveStructureInput,
} from "./deriveStructureDimension";
import type { MarketStructureVM } from "./viewModels/selectMarketStructure";

const CAPTURED_AT = 1_700_000_000_000;

const LAG_NOTE =
  "the newest 5 bars cannot yet be a pivot — a swing needs 5 bars on BOTH sides "
  + "to confirm, so the most recent move is always unconfirmed structure";

function vmOf(over: Partial<MarketStructureVM> = {}): MarketStructureVM {
  return {
    measured: true,
    lookback: 5,
    barCount: 120,
    unconfirmedBars: 5,
    confirmationLagNote: LAG_NOTE,
    swingHighs: [{ time: 1, price: 110 }, { time: 3, price: 130 }],
    swingLows: [{ time: 2, price: 70 }, { time: 4, price: 80 }],
    lastSwingHigh: { time: 3, price: 130 },
    lastSwingLow: { time: 4, price: 80 },
    bias: "HIGHER_HIGHS",
    biasNote: "the last two confirmed highs each printed higher",
    insufficientNote: null,
    ...over,
  } as MarketStructureVM;
}

function inputOf(vm: MarketStructureVM | null): DeriveStructureInput {
  return {
    vm,
    source: "alpaca",
    latestTickAtMs: CAPTURED_AT - 1000,
    capturedAt: CAPTURED_AT,
    snapshotIdSeed: "seed",
  };
}

describe("deriveStructureDimension — THE LAG IS ADMITTED EVEN WHEN RESOLVED", () => {
  it("a RESOLVED verdict still carries the owner's confirmation-lag sentence", () => {
    const d = deriveStructureDimension(inputOf(vmOf()));
    expect(d.resolution).toBe("RESOLVED");
    expect(d.value).toBe(STRUCTURE_VERDICTS.HIGHER_HIGHS);
    // NOT empty. This is the assertion the whole file exists for.
    expect(d.unknowns).toEqual([LAG_NOTE]);
  });

  it("carries the sentence VERBATIM rather than composing its own wording", () => {
    const odd = "bespoke lag sentence the owner happened to publish";
    const d = deriveStructureDimension(inputOf(vmOf({ confirmationLagNote: odd })));
    expect(d.unknowns).toContain(odd);
  });

  it("a thin window stacks its own caveat ON TOP of the permanent one", () => {
    const d = deriveStructureDimension(
      inputOf(vmOf({ barCount: STRUCTURE_RESOLVE_MIN_BARS - 1 })),
    );
    expect(d.resolution).toBe("PARTIAL");
    expect(d.unknowns[0]).toBe(LAG_NOTE);
    expect(d.unknowns[1]).toMatch(/can flip on a single rotation/);
  });
});

describe("deriveStructureDimension — refusals", () => {
  it("UNKNOWN with no compiled sequence at all", () => {
    const d = deriveStructureDimension(inputOf(null));
    expect(d.resolution).toBe("UNKNOWN");
    expect(d.value).toBeNull();
    expect(d.evidence).toHaveLength(0);
  });

  it("carries the COMPILER's own sentence when the window was unreadable", () => {
    const note = "Only 6 bars are loaded; a 5-bar pivot needs at least 11.";
    const d = deriveStructureDimension(
      inputOf(vmOf({ measured: false, insufficientNote: note })),
    );
    expect(d.resolution).toBe("UNKNOWN");
    expect(d.unknowns).toEqual([note]);
  });

  it("UNKNOWN rather than a guess when the owner published UNCLEAR", () => {
    const d = deriveStructureDimension(inputOf(vmOf({ bias: "UNCLEAR" })));
    expect(d.resolution).toBe("UNKNOWN");
    expect(d.value).toBeNull();
  });
});

describe("deriveStructureDimension — the sequence verdicts", () => {
  it("HIGHER HIGHS", () => {
    expect(deriveStructureDimension(inputOf(vmOf({ bias: "HIGHER_HIGHS" }))).value)
      .toBe(STRUCTURE_VERDICTS.HIGHER_HIGHS);
  });

  it("LOWER LOWS", () => {
    expect(deriveStructureDimension(inputOf(vmOf({ bias: "LOWER_LOWS" }))).value)
      .toBe(STRUCTURE_VERDICTS.LOWER_LOWS);
  });

  it("ROTATING IN RANGE", () => {
    expect(deriveStructureDimension(inputOf(vmOf({ bias: "RANGE" }))).value)
      .toBe(STRUCTURE_VERDICTS.RANGE);
  });

  it("still states the sequence on a thin window — those pivots really printed", () => {
    const d = deriveStructureDimension(inputOf(vmOf({ barCount: 20, bias: "LOWER_LOWS" })));
    expect(d.resolution).toBe("PARTIAL");
    expect(d.value).toBe(STRUCTURE_VERDICTS.LOWER_LOWS);
  });
});

describe("deriveStructureDimension — fidelity and confidence", () => {
  it("is ALWAYS INFERRED — the detector calls itself visual and approximate", () => {
    const long = deriveStructureDimension(inputOf(vmOf({ barCount: 5000 })));
    expect(long.evidence[0]!.fidelity).toBe("INFERRED");
  });

  it("more bars narrow sampling error but never reach an observed confidence", () => {
    const few = deriveStructureDimension(inputOf(vmOf({ barCount: 45 })));
    const many = deriveStructureDimension(inputOf(vmOf({ barCount: 5000 })));
    expect(many.confidence!).toBeGreaterThan(few.confidence!);
    // A pattern read off price may not rival a counted observation.
    expect(many.confidence!).toBeLessThanOrEqual(0.5);
  });
});

describe("deriveStructureDimension — evidence", () => {
  it("states the pivot counts, the lookback and the owner's sentence, so it can be checked", () => {
    const d = deriveStructureDimension(inputOf(vmOf()));
    const basis = d.evidence[0]!.basis;
    expect(basis).toContain("2 swing highs");
    expect(basis).toContain("2 swing lows");
    expect(basis).toContain("5-bar lookback");
    expect(basis).toContain("120 bars");
    expect(basis).toContain("the last two confirmed highs each printed higher");
  });

  it("never claims an observation later than the snapshot cutoff", () => {
    const d = deriveStructureDimension({
      ...inputOf(vmOf()),
      latestTickAtMs: CAPTURED_AT + 60_000,
    });
    expect(d.evidence[0]!.observedAt).toBe(CAPTURED_AT);
    expect(d.evidence[0]!.availableAt).toBe(CAPTURED_AT);
  });

  it("names a source rather than inventing one", () => {
    const d = deriveStructureDimension({ ...inputOf(vmOf()), source: "  " });
    expect(d.evidence[0]!.source).toBe("chart-runtime");
  });
});
