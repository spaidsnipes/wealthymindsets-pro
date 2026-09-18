/**
 * deriveProfileDimension — branch matrix.
 *
 * The defect this deriver closes is a DISAGREEMENT, not a missing number: the
 * Living Profile panel published a measured POC/VAH/VAL while the Passport in
 * the rail beside it called the profile unresolved. So the assertions here are
 * mostly about the SHAPE of the silence — that every refusal carries the
 * compiler's own sentence rather than one invented at this layer, and that no
 * branch ever states a value area it did not receive.
 */

import { describe, expect, it } from "vitest";
import {
  deriveProfileDimension,
  PROFILE_VERDICTS,
  PROFILE_RESOLVE_MIN_BUCKETS,
  type DeriveProfileInput,
} from "./deriveProfileDimension";
import type { LivingProfileVM } from "./viewModels/selectLivingProfile";

const CAPTURED_AT = 1_700_000_000_000;

function curve(lo: number, hi: number, rows: number) {
  const step = rows > 1 ? (hi - lo) / (rows - 1) : 0;
  return Array.from({ length: rows }, (_, i) => ({
    price: hi - i * step,
    volume: 1,
    share: 1 / rows,
    insideValueArea: false,
    isPoc: false,
    node: null,
  }));
}

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
    curve: curve(80, 120, 40),
    curveNote: null,
    livePrice: 101,
    locationNote: null,
    ...over,
  } as LivingProfileVM;
}

function inputOf(vm: LivingProfileVM | null): DeriveProfileInput {
  return {
    vm,
    source: "alpaca",
    latestTickAtMs: CAPTURED_AT - 1000,
    capturedAt: CAPTURED_AT,
    snapshotIdSeed: "seed",
  };
}

describe("deriveProfileDimension — refusals", () => {
  it("UNKNOWN when no profile was compiled at all", () => {
    const d = deriveProfileDimension(inputOf(null));
    expect(d.resolution).toBe("UNKNOWN");
    expect(d.value).toBeNull();
    expect(d.evidence).toHaveLength(0);
    expect(d.unknowns[0]).toMatch(/No profile compiled/i);
  });

  it("carries the COMPILER's own missing-input sentence, not one written here", () => {
    const note = "No volume has been distributed across price yet.";
    const d = deriveProfileDimension(
      inputOf(vmOf({ measured: false, missingInputNote: note })),
    );
    expect(d.resolution).toBe("UNKNOWN");
    // Word-for-word. Two surfaces wording one silence differently is the whole
    // defect class this lane exists to prevent.
    expect(d.unknowns).toEqual([note]);
  });

  it("UNKNOWN — never a guessed value area — when levels are absent", () => {
    for (const missing of [{ poc: null }, { vah: null }, { val: null }]) {
      const d = deriveProfileDimension(inputOf(vmOf(missing)));
      expect(d.resolution).toBe("UNKNOWN");
      expect(d.value).toBeNull();
    }
  });

  it("UNKNOWN when every bucket sits at one price — no range to judge against", () => {
    const d = deriveProfileDimension(
      inputOf(vmOf({ curve: curve(100, 100, 40), vah: 100, val: 100, poc: 100 })),
    );
    expect(d.resolution).toBe("UNKNOWN");
    expect(d.unknowns[0]).toMatch(/one price/i);
  });
});

describe("deriveProfileDimension — verdicts", () => {
  it("RESOLVED with TIGHT VALUE when the accepted core is narrow", () => {
    // 4 wide over a 40 range = 10%.
    const d = deriveProfileDimension(inputOf(vmOf({ vah: 102, val: 98 })));
    expect(d.resolution).toBe("RESOLVED");
    expect(d.value).toBe(PROFILE_VERDICTS.TIGHT);
    expect(d.unknowns).toHaveLength(0);
  });

  it("RESOLVED with BROAD VALUE when value names most of the range", () => {
    // 32 wide over a 40 range = 80%.
    const d = deriveProfileDimension(inputOf(vmOf({ vah: 116, val: 84 })));
    expect(d.value).toBe(PROFILE_VERDICTS.BROAD);
  });

  it("RESOLVED with DEFINED VALUE between the two thresholds", () => {
    // 20 wide over a 40 range = 50%.
    const d = deriveProfileDimension(inputOf(vmOf({ vah: 110, val: 90 })));
    expect(d.value).toBe(PROFILE_VERDICTS.DEFINED);
  });
});

describe("deriveProfileDimension — the two honest downgrades", () => {
  it("PARTIAL with NO verdict below the bucket seal threshold", () => {
    const rows = PROFILE_RESOLVE_MIN_BUCKETS - 1;
    const d = deriveProfileDimension(
      inputOf(vmOf({ populatedRows: rows, curve: curve(80, 120, rows) })),
    );
    expect(d.resolution).toBe("PARTIAL");
    // A "value area" spanning a handful of buckets is a thin-sample artefact.
    expect(d.value).toBeNull();
    expect(d.unknowns[0]).toContain(`${PROFILE_RESOLVE_MIN_BUCKETS}-bucket`);
    // Still evidenced: the levels were really published, the sample was thin.
    expect(d.evidence).toHaveLength(1);
  });

  it("PARTIAL but STILL STATES the verdict on the candle path", () => {
    const nodesNote = "estimated from candles, so nodes are withheld";
    const d = deriveProfileDimension(
      // 20 wide over a 40 range — the same DEFINED input as the tape case
      // above, so the only variable is which path built it.
      inputOf(vmOf({ quality: "candle-estimated", vah: 110, val: 90, nodesNote })),
    );
    expect(d.resolution).toBe("PARTIAL");
    // POC/VAH/VAL survive the even spread, so withholding the width verdict
    // here would be a SECOND refusal the compiler never made.
    expect(d.value).toBe(PROFILE_VERDICTS.DEFINED);
    expect(d.unknowns).toEqual([nodesNote]);
  });

  it("labels the candle path INFERRED and caps its confidence below the tape", () => {
    const tape = deriveProfileDimension(inputOf(vmOf({ populatedRows: 200 })));
    const candles = deriveProfileDimension(
      inputOf(vmOf({ populatedRows: 200, quality: "candle-estimated" })),
    );
    expect(tape.evidence[0]?.fidelity).toBe("DERIVED");
    expect(candles.evidence[0]?.fidelity).toBe("INFERRED");
    expect(candles.confidence!).toBeLessThan(tape.confidence!);
  });
});

describe("deriveProfileDimension — evidence timing", () => {
  it("never claims an observation later than the snapshot cutoff", () => {
    const d = deriveProfileDimension({
      ...inputOf(vmOf()),
      latestTickAtMs: CAPTURED_AT + 60_000,
    });
    expect(d.evidence[0]!.observedAt).toBe(CAPTURED_AT);
    expect(d.evidence[0]!.availableAt).toBe(CAPTURED_AT);
  });

  it("falls back to capturedAt when no tick timestamp exists", () => {
    const d = deriveProfileDimension({ ...inputOf(vmOf()), latestTickAtMs: null });
    expect(d.evidence[0]!.observedAt).toBe(CAPTURED_AT);
  });

  it("names a source rather than inventing one", () => {
    const d = deriveProfileDimension({ ...inputOf(vmOf()), source: "   " });
    expect(d.evidence[0]!.source).toBe("chart-runtime");
  });
});
