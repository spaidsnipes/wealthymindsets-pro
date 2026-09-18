/**
 * deriveLocationDimension — branch matrix.
 *
 * The property under test is mostly a NEGATIVE one: this deriver must never
 * place price against a value area it did not receive, and must never word the
 * position differently from the compiler that owns the sentence.
 */

import { describe, expect, it } from "vitest";
import {
  deriveLocationDimension,
  LOCATION_VERDICTS,
  type DeriveLocationInput,
} from "./deriveLocationDimension";
import { PROFILE_RESOLVE_MIN_BUCKETS } from "./deriveProfileDimension";
import type { LivingProfileVM } from "./viewModels/selectLivingProfile";

const CAPTURED_AT = 1_700_000_000_000;

function vmOf(over: Partial<LivingProfileVM> = {}): LivingProfileVM {
  return {
    measured: true,
    missingInput: null,
    missingInputNote: null,
    quality: "trade-based",
    qualityNote: "built from trades",
    poc: 100,
    vah: 105,
    val: 95,
    valueAreaPct: 0.7,
    totalVolume: 5000,
    populatedRows: 40,
    tickSize: 1,
    nodesMeasured: true,
    nodesMissingInput: null,
    nodesNote: null,
    hvn: [],
    lvn: [],
    curve: [],
    curveNote: null,
    livePrice: 110,
    locationNote: "price is ABOVE the value area",
    ...over,
  } as LivingProfileVM;
}

function inputOf(vm: LivingProfileVM | null): DeriveLocationInput {
  return {
    vm,
    source: "alpaca",
    latestTickAtMs: CAPTURED_AT - 1000,
    capturedAt: CAPTURED_AT,
    snapshotIdSeed: "seed",
  };
}

describe("deriveLocationDimension — a location needs something to be located against", () => {
  it("UNKNOWN with no profile at all, and says why", () => {
    const d = deriveLocationDimension(inputOf(null));
    expect(d.resolution).toBe("UNKNOWN");
    expect(d.unknowns[0]).toMatch(/nothing to be located against/i);
  });

  it("carries the COMPILER's missing-input sentence when nothing was measured", () => {
    const note = "No volume has been distributed across price yet.";
    const d = deriveLocationDimension(
      inputOf(vmOf({ measured: false, missingInputNote: note })),
    );
    expect(d.unknowns).toEqual([note]);
  });

  it("UNKNOWN when a live price exists but no value area does", () => {
    const d = deriveLocationDimension(inputOf(vmOf({ vah: null, val: null })));
    expect(d.resolution).toBe("UNKNOWN");
    expect(d.value).toBeNull();
  });

  it("UNKNOWN when a value area exists but no live price does — and names WHICH half is missing", () => {
    const d = deriveLocationDimension(
      inputOf(vmOf({ livePrice: null, locationNote: null })),
    );
    expect(d.resolution).toBe("UNKNOWN");
    expect(d.unknowns[0]).toMatch(/no live price/i);
  });
});

describe("deriveLocationDimension — the three positions", () => {
  it("ABOVE VALUE when price cleared the high of value", () => {
    const d = deriveLocationDimension(inputOf(vmOf({ livePrice: 110 })));
    expect(d.resolution).toBe("RESOLVED");
    expect(d.value).toBe(LOCATION_VERDICTS.ABOVE);
  });

  it("BELOW VALUE when price is under the low of value", () => {
    const d = deriveLocationDimension(
      inputOf(vmOf({ livePrice: 90, locationNote: "price is BELOW the value area" })),
    );
    expect(d.value).toBe(LOCATION_VERDICTS.BELOW);
  });

  it("INSIDE VALUE between the edges — and the edges themselves count as inside", () => {
    for (const p of [95, 100, 105]) {
      const d = deriveLocationDimension(
        inputOf(vmOf({ livePrice: p, locationNote: "price is INSIDE the value area" })),
      );
      expect(d.value, `price ${p}`).toBe(LOCATION_VERDICTS.INSIDE);
    }
  });
});

describe("deriveLocationDimension — honest downgrades", () => {
  it("PARTIAL on a thin sample, because the boundary itself may still move", () => {
    const d = deriveLocationDimension(
      inputOf(vmOf({ populatedRows: PROFILE_RESOLVE_MIN_BUCKETS - 1 })),
    );
    expect(d.resolution).toBe("PARTIAL");
    // The side is still stated — price really is outside the line that was
    // drawn. What is uncertain is where the line settles.
    expect(d.value).toBe(LOCATION_VERDICTS.ABOVE);
    expect(d.unknowns[0]).toMatch(/edges may move/i);
  });

  it("PARTIAL when the value area it is measured against was estimated from candles", () => {
    const d = deriveLocationDimension(inputOf(vmOf({ quality: "candle-estimated" })));
    expect(d.resolution).toBe("PARTIAL");
    expect(d.value).toBe(LOCATION_VERDICTS.ABOVE);
    expect(d.evidence[0]!.fidelity).toBe("INFERRED");
    expect(d.unknowns[0]).toMatch(/estimated from candles/i);
  });
});

describe("deriveLocationDimension — evidence", () => {
  it("quotes the OWNER's sentence verbatim rather than rewriting it", () => {
    const note = "price is ABOVE the value area";
    const d = deriveLocationDimension(inputOf(vmOf({ locationNote: note })));
    expect(d.evidence[0]!.basis).toContain(note);
    // And states the levels, so the claim can be checked rather than trusted.
    expect(d.evidence[0]!.basis).toContain("VAL 95");
    expect(d.evidence[0]!.basis).toContain("VAH 105");
  });

  it("never claims an observation later than the snapshot cutoff", () => {
    const d = deriveLocationDimension({
      ...inputOf(vmOf()),
      latestTickAtMs: CAPTURED_AT + 60_000,
    });
    expect(d.evidence[0]!.observedAt).toBe(CAPTURED_AT);
  });

  it("names a source rather than inventing one", () => {
    const d = deriveLocationDimension({ ...inputOf(vmOf()), source: null });
    expect(d.evidence[0]!.source).toBe("chart-runtime");
  });
});
