/**
 * deriveAggressionDimension — branch matrix.
 *
 * The property that matters most here is a NEGATIVE one, and it has its own
 * describe block: this deriver may NEVER name a side unless the owner
 * published a NET_AGGRESSION axis. On /charts today it never does, so the
 * side-naming branch is the one most likely to rot unnoticed — and the one
 * whose failure would put a fabricated "BUYERS PRESSING" in front of a trader.
 */

import { describe, expect, it } from "vitest";
import {
  deriveAggressionDimension,
  AGGRESSION_VERDICTS,
  AGGRESSION_RESOLVE_MIN_BARS,
  type DeriveAggressionInput,
} from "./deriveAggressionDimension";
import type {
  AggressionResponseVM,
  AggressionPoint,
} from "./viewModels/selectAggressionResponse";

const CAPTURED_AT = 1_700_000_000_000;

const EFFORT_NOTE =
  "y is EFFORT, not net aggression — this tape never stated an aggressor side, "
  + "so the axis shows how much traded rather than who was pushing";

function points(aggressions: readonly number[]): AggressionPoint[] {
  return aggressions.map((a, i) => ({
    time: 1000 + i,
    response: 1,
    aggression: a,
    effortNorm: 0.5,
    cls: "TYPICAL",
  }));
}

function vmOf(over: Partial<AggressionResponseVM> = {}): AggressionResponseVM {
  return {
    basis: "VOLUME",
    measured: true,
    aggressionAxis: "EFFORT",
    aggressionAxisNote: EFFORT_NOTE,
    points: points([0.5, 0.5, 0.5]),
    netAggression: null,
    meanResponse: 1,
    efficiency: 0.8,
    efficiencyScaleNote: "scale note",
    zones: [],
    windowBars: 30,
    zoneQualificationPossible: true,
    effortSpreadNote: null,
    effortConcentration: 0.2,
    ...over,
  } as AggressionResponseVM;
}

function inputOf(vm: AggressionResponseVM | null): DeriveAggressionInput {
  return {
    vm,
    source: "alpaca",
    latestTickAtMs: CAPTURED_AT - 1000,
    capturedAt: CAPTURED_AT,
    snapshotIdSeed: "seed",
  };
}

describe("deriveAggressionDimension — refusals", () => {
  it("UNKNOWN with no compiled window at all", () => {
    const d = deriveAggressionDimension(inputOf(null));
    expect(d.resolution).toBe("UNKNOWN");
    expect(d.value).toBeNull();
    expect(d.evidence).toHaveLength(0);
  });

  it("carries the COMPILER's own spread sentence when nothing was measured", () => {
    const note = "The window's effort sits in too few bars for a run to have formed.";
    const d = deriveAggressionDimension(
      inputOf(vmOf({ measured: false, effortSpreadNote: note })),
    );
    expect(d.resolution).toBe("UNKNOWN");
    expect(d.unknowns).toEqual([note]);
  });

  it("UNKNOWN when no effort was spent — dividing by nothing is not a zero", () => {
    const d = deriveAggressionDimension(inputOf(vmOf({ efficiency: null })));
    expect(d.resolution).toBe("UNKNOWN");
    expect(d.value).toBeNull();
  });
});

describe("deriveAggressionDimension — THE SIDE IS NEVER GUESSED", () => {
  it("PARTIAL on the EFFORT axis, stating effort-vs-response but NO side", () => {
    const d = deriveAggressionDimension(inputOf(vmOf({ efficiency: 0.2 })));
    expect(d.resolution).toBe("PARTIAL");
    expect(d.value).toBe(AGGRESSION_VERDICTS.ABSORBED);
    // The three side-naming verdicts must be unreachable from here.
    expect(d.value).not.toBe(AGGRESSION_VERDICTS.BUYERS);
    expect(d.value).not.toBe(AGGRESSION_VERDICTS.SELLERS);
    expect(d.value).not.toBe(AGGRESSION_VERDICTS.TWO_SIDED);
  });

  it("carries the OWNER's axis sentence verbatim as the reason the side is absent", () => {
    const d = deriveAggressionDimension(inputOf(vmOf()));
    expect(d.unknowns).toEqual([EFFORT_NOTE]);
  });

  it("refuses the side even when netAggression is somehow populated on an EFFORT axis", () => {
    // Defence in depth: the axis is the authority, not the number beside it.
    const d = deriveAggressionDimension(
      inputOf(vmOf({ aggressionAxis: "EFFORT", netAggression: 9999 })),
    );
    expect(d.resolution).toBe("PARTIAL");
    expect(d.value).toBe(AGGRESSION_VERDICTS.MATCHED);
  });

  it("refuses the side when the axis is signed but the sum is missing", () => {
    const d = deriveAggressionDimension(
      inputOf(vmOf({ aggressionAxis: "NET_AGGRESSION", netAggression: null })),
    );
    expect(d.resolution).toBe("PARTIAL");
  });
});

describe("deriveAggressionDimension — the effort-vs-response scale", () => {
  it("ABSORBED when a lot of effort bought almost no movement", () => {
    const d = deriveAggressionDimension(inputOf(vmOf({ efficiency: 0.1 })));
    expect(d.value).toBe(AGGRESSION_VERDICTS.ABSORBED);
  });

  it("MATCHED in the middle of the owner's own printed scale", () => {
    const d = deriveAggressionDimension(inputOf(vmOf({ efficiency: 0.7 })));
    expect(d.value).toBe(AGGRESSION_VERDICTS.MATCHED);
  });

  it("REWARDED when movement outran the effort spent on it", () => {
    const d = deriveAggressionDimension(inputOf(vmOf({ efficiency: 1.4 })));
    expect(d.value).toBe(AGGRESSION_VERDICTS.REWARDED);
  });
});

describe("deriveAggressionDimension — a side, only when the tape stated one", () => {
  function signed(net: number, aggs: readonly number[]): AggressionResponseVM {
    return vmOf({
      basis: "SIGNED_DELTA",
      aggressionAxis: "NET_AGGRESSION",
      aggressionAxisNote:
        "y is net aggression — buyer-initiated minus seller-initiated, as the tape stated it",
      netAggression: net,
      points: points(aggs),
    });
  }

  it("RESOLVED BUYERS PRESSING on a buy-skewed signed window", () => {
    const d = deriveAggressionDimension(inputOf(signed(80, [40, 40, -10, 10])));
    expect(d.resolution).toBe("RESOLVED");
    expect(d.value).toBe(AGGRESSION_VERDICTS.BUYERS);
    expect(d.unknowns).toHaveLength(0);
  });

  it("RESOLVED SELLERS PRESSING on a sell-skewed signed window", () => {
    const d = deriveAggressionDimension(inputOf(signed(-80, [-40, -40, 10, -10])));
    expect(d.value).toBe(AGGRESSION_VERDICTS.SELLERS);
  });

  it("TWO-SIDED when both sides pushed and neither won", () => {
    // Gross 200, net 10 → imbalance 0.05, well inside the band.
    const d = deriveAggressionDimension(inputOf(signed(10, [100, -95, 5])));
    expect(d.value).toBe(AGGRESSION_VERDICTS.TWO_SIDED);
  });

  it("UNKNOWN rather than a divide-by-zero when nothing pushed either way", () => {
    const d = deriveAggressionDimension(inputOf(signed(0, [0, 0, 0])));
    expect(d.resolution).toBe("UNKNOWN");
    expect(d.value).toBeNull();
  });

  it("labels a signed tape DERIVED and an unsigned one INFERRED, and caps the unsigned", () => {
    const sgn = deriveAggressionDimension(inputOf(signed(80, [40, 40, -10, 10])));
    const eff = deriveAggressionDimension(inputOf(vmOf({ windowBars: 90 })));
    expect(sgn.evidence[0]!.fidelity).toBe("DERIVED");
    expect(eff.evidence[0]!.fidelity).toBe("INFERRED");
    // More prints narrow a proxy's sampling error; they do not make it an
    // observation. A 90-bar unsigned window must not outrank a 30-bar signed one.
    expect(eff.confidence!).toBeLessThan(sgn.confidence!);
  });
});

describe("deriveAggressionDimension — honest downgrade on a thin window", () => {
  it("PARTIAL below the bar seal threshold, and says why the ratio is suspect", () => {
    const d = deriveAggressionDimension(
      inputOf(vmOf({ windowBars: AGGRESSION_RESOLVE_MIN_BARS - 1 })),
    );
    expect(d.resolution).toBe("PARTIAL");
    // The ratio is still stated — those bars really did spend that effort.
    expect(d.value).toBe(AGGRESSION_VERDICTS.MATCHED);
    expect(d.unknowns[0]).toMatch(/normalised against its own peak/i);
  });

  it("the thin-window downgrade outranks even a fully signed tape", () => {
    const d = deriveAggressionDimension(
      inputOf(vmOf({
        windowBars: 4,
        basis: "SIGNED_DELTA",
        aggressionAxis: "NET_AGGRESSION",
        netAggression: 80,
        points: points([40, 40]),
      })),
    );
    expect(d.resolution).toBe("PARTIAL");
    expect(d.value).not.toBe(AGGRESSION_VERDICTS.BUYERS);
  });
});

describe("deriveAggressionDimension — evidence", () => {
  it("states the ratio, the window and the owner's axis sentence, so it can be checked", () => {
    const d = deriveAggressionDimension(inputOf(vmOf({ efficiency: 0.83 })));
    const basis = d.evidence[0]!.basis;
    expect(basis).toContain("0.83");
    expect(basis).toContain("30 bars");
    expect(basis).toContain("VOLUME");
    expect(basis).toContain(EFFORT_NOTE);
  });

  it("never claims an observation later than the snapshot cutoff", () => {
    const d = deriveAggressionDimension({
      ...inputOf(vmOf()),
      latestTickAtMs: CAPTURED_AT + 60_000,
    });
    expect(d.evidence[0]!.observedAt).toBe(CAPTURED_AT);
    expect(d.evidence[0]!.availableAt).toBe(CAPTURED_AT);
  });

  it("names a source rather than inventing one", () => {
    const d = deriveAggressionDimension({ ...inputOf(vmOf()), source: "   " });
    expect(d.evidence[0]!.source).toBe("chart-runtime");
  });
});
