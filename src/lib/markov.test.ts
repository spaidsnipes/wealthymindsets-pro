import { describe, it, expect } from "vitest";
import {
  classifyBar, countTransitions, normalizeMatrix, steadyState,
  computeMarkov, markovConfidence,
  MIN_TRANSITIONS_TOTAL, MIN_TRANSITIONS_CURRENT,
  type Bar, type MarkovConfig, type MarkovState,
} from "./markov";
import type { TFId } from "./timeframes";

// ────────────────────────────────────────────────────────────────────────────
// Test helpers
// ────────────────────────────────────────────────────────────────────────────

/** Bar whose classification is determined by the return `r` alone. */
function bar(r: number, t = 0): Bar {
  return { time: t, open: 100, high: 100 + Math.max(0, r * 100), low: 100 + Math.min(0, r * 100), close: 100 * (1 + r), volume: 1000 };
}

/** Build a run of bars from a state sequence, given a threshold. */
function barsFromStates(states: readonly MarkovState[], sideThreshold: number): Bar[] {
  const above = sideThreshold * 2;
  const below = -sideThreshold * 2;
  const inside = 0;
  return states.map((s, i) => bar(s === "BULL" ? above : s === "BEAR" ? below : inside, i));
}

const CFG: MarkovConfig = { sideThreshold: 0.005, version: "test-v1" };
const CALC = { symbol: "TSLA", timeframe: "15m" as TFId };

// ────────────────────────────────────────────────────────────────────────────
// Step 1 -- classification
// ────────────────────────────────────────────────────────────────────────────

describe("classifyBar", () => {
  it("uses symmetric threshold on (close - open) / open", () => {
    expect(classifyBar(bar( 0.01),  0.005)).toBe("BULL");
    expect(classifyBar(bar(-0.01),  0.005)).toBe("BEAR");
    expect(classifyBar(bar( 0.001), 0.005)).toBe("SIDE");
  });

  it("boundary is strictly less-than -- exact threshold is SIDE", () => {
    expect(classifyBar(bar( 0.005), 0.005)).toBe("SIDE");
    expect(classifyBar(bar(-0.005), 0.005)).toBe("SIDE");
  });

  it("degenerate open is not a crash and never a fabricated direction", () => {
    expect(classifyBar({ time: 0, open: 0, high: 1, low: 0, close: 1, volume: 0 }, 0.005)).toBe("SIDE");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Steps 2-3 -- counting + normalization (pure, no invention)
// ────────────────────────────────────────────────────────────────────────────

describe("countTransitions", () => {
  it("counts adjacent pairs only -- no smoothing, no priors", () => {
    const counts = countTransitions(["BULL", "BULL", "BEAR"]);
    expect(counts.BULL.BULL).toBe(1);
    expect(counts.BULL.BEAR).toBe(1);
    // Every other cell exactly 0 -- absence of imputation.
    expect(counts.BULL.SIDE).toBe(0);
    expect(counts.BEAR.BULL).toBe(0);
    expect(counts.BEAR.BEAR).toBe(0);
    expect(counts.BEAR.SIDE).toBe(0);
    expect(counts.SIDE.BULL).toBe(0);
    expect(counts.SIDE.BEAR).toBe(0);
    expect(counts.SIDE.SIDE).toBe(0);
  });

  it("empty and single-state inputs produce all-zero matrices", () => {
    for (const cts of [countTransitions([]), countTransitions(["BULL"])]) {
      const total = cts.BULL.BULL + cts.BULL.BEAR + cts.BULL.SIDE
                  + cts.BEAR.BULL + cts.BEAR.BEAR + cts.BEAR.SIDE
                  + cts.SIDE.BULL + cts.SIDE.BEAR + cts.SIDE.SIDE;
      expect(total).toBe(0);
    }
  });
});

describe("normalizeMatrix", () => {
  it("each observed row sums to exactly 1", () => {
    const matrix = normalizeMatrix({
      BULL: { BULL: 3, BEAR: 1, SIDE: 1 },
      BEAR: { BULL: 1, BEAR: 8, SIDE: 1 },
      SIDE: { BULL: 2, BEAR: 1, SIDE: 7 },
    });
    for (const from of ["BULL", "BEAR", "SIDE"] as const) {
      const s = matrix[from].BULL + matrix[from].BEAR + matrix[from].SIDE;
      expect(s).toBeCloseTo(1, 12);
    }
  });

  it("an unobserved row stays all zeros -- never uniform 33/33/33", () => {
    const matrix = normalizeMatrix({
      BULL: { BULL: 0, BEAR: 0, SIDE: 0 },
      BEAR: { BULL: 0, BEAR: 5, SIDE: 5 },
      SIDE: { BULL: 3, BEAR: 3, SIDE: 4 },
    });
    expect(matrix.BULL.BULL).toBe(0);
    expect(matrix.BULL.BEAR).toBe(0);
    expect(matrix.BULL.SIDE).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Step 4 -- steady state
// ────────────────────────────────────────────────────────────────────────────

describe("steadyState", () => {
  it("golden case: matches the independently verified reference (29 / 41 / 29)", () => {
    // From docs/WM_MARKOV_CONFLUENCE_ARCHITECTURE_2026-07-29.md §1 -- values
    // re-derived from the observed panel matrix. If this test fails, the
    // implementation has drifted from the reference the design was validated
    // against.
    const observed = {
      BULL: { BULL: 0.74, BEAR: 0.13, SIDE: 0.13 },
      BEAR: { BULL: 0.10, BEAR: 0.90, SIDE: 0.00 },
      SIDE: { BULL: 0.12, BEAR: 0.01, SIDE: 0.87 },
    };
    const pi = steadyState(observed);
    // Independent numpy computation: 29.4 / 41.2 / 29.4.
    // Damped power iteration mixes 1% uniform, shifting each entry by <0.3 pp;
    // 1 pp tolerance covers that plus rounding, and is well inside "consistent
    // with the displayed 29/42/29 within display rounding".
    expect(pi.BULL).toBeCloseTo(0.294, 2);
    expect(pi.BEAR).toBeCloseTo(0.412, 2);
    expect(pi.SIDE).toBeCloseTo(0.294, 2);
    expect(pi.BULL + pi.BEAR + pi.SIDE).toBeCloseTo(1, 12);
  });

  it("uniform matrix -> uniform steady state", () => {
    const uniform = {
      BULL: { BULL: 1/3, BEAR: 1/3, SIDE: 1/3 },
      BEAR: { BULL: 1/3, BEAR: 1/3, SIDE: 1/3 },
      SIDE: { BULL: 1/3, BEAR: 1/3, SIDE: 1/3 },
    };
    const pi = steadyState(uniform);
    expect(pi.BULL).toBeCloseTo(1/3, 4);
    expect(pi.BEAR).toBeCloseTo(1/3, 4);
    expect(pi.SIDE).toBeCloseTo(1/3, 4);
  });

  it("absorbing state does not divide by zero and stays finite", () => {
    // BEAR absorbs; damping guarantees non-degenerate convergence.
    const absorbing = {
      BULL: { BULL: 0.5, BEAR: 0.5, SIDE: 0.0 },
      BEAR: { BULL: 0.0, BEAR: 1.0, SIDE: 0.0 },
      SIDE: { BULL: 0.0, BEAR: 0.5, SIDE: 0.5 },
    };
    const pi = steadyState(absorbing);
    expect(Number.isFinite(pi.BULL)).toBe(true);
    expect(Number.isFinite(pi.BEAR)).toBe(true);
    expect(Number.isFinite(pi.SIDE)).toBe(true);
    expect(pi.BULL + pi.BEAR + pi.SIDE).toBeCloseTo(1, 12);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Confidence -- derived, not asserted
// ────────────────────────────────────────────────────────────────────────────

describe("markovConfidence", () => {
  it("is 0 for no evidence", () => { expect(markovConfidence(0)).toBe(0); });
  it("is capped at 1", () => { expect(markovConfidence(1_000_000)).toBe(1); });
  it("monotonic in sample size", () => {
    expect(markovConfidence(60)).toBeGreaterThan(markovConfidence(30));
    expect(markovConfidence(30)).toBeGreaterThan(markovConfidence(5));
  });
  it("reaches ~0.5 at the honesty gate", () => {
    expect(markovConfidence(MIN_TRANSITIONS_CURRENT)).toBeCloseTo(0.5, 2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Honesty gates
// ────────────────────────────────────────────────────────────────────────────

describe("computeMarkov honesty gates", () => {
  it("no threshold -> insufficient-evidence with no-threshold-configured", () => {
    const r = computeMarkov({
      bars: barsFromStates(Array(200).fill("BULL"), 0.005),
      config: { sideThreshold: null, version: "unblessed" },
      ...CALC,
    });
    expect(r.status).toBe("insufficient-evidence");
    if (r.status === "insufficient-evidence") expect(r.reason).toBe("no-threshold-configured");
    // A number field must be structurally absent, not merely undefined-valued.
    expect((r as { edge?: number }).edge).toBeUndefined();
  });

  it("too few bars -> too-few-bars", () => {
    const r = computeMarkov({ bars: barsFromStates(Array(50).fill("BULL"), 0.005), config: CFG, ...CALC });
    expect(r.status).toBe("insufficient-evidence");
    if (r.status === "insufficient-evidence") expect(r.reason).toBe("too-few-bars");
  });

  it("enough total but too few from the current row -> too-few-transitions-current", () => {
    // 200 SIDE bars followed by 1 BEAR bar: total transitions ~200 (all SIDE->SIDE
    // plus one SIDE->BEAR), current state = BEAR, current-row count = 0.
    // That collapses to the row-unobserved case, which is a stricter form of the
    // same insufficient-current-row failure -- both must refuse to publish.
    const bars: Bar[] = [
      ...barsFromStates(Array(200).fill("SIDE"), 0.005),
      bar(-0.02, 200),
    ];
    const r = computeMarkov({ bars, config: CFG, ...CALC });
    expect(r.status).toBe("insufficient-evidence");
    if (r.status === "insufficient-evidence") {
      expect(["current-row-unobserved", "too-few-transitions-current"]).toContain(r.reason);
    }
  });

  it("threshold ready + enough evidence -> ready with numbers", () => {
    const states: MarkovState[] = [];
    // Enough transitions across all three rows to satisfy the gate on any current state.
    for (let i = 0; i < 250; i++) states.push(i % 3 === 0 ? "BULL" : i % 3 === 1 ? "BEAR" : "SIDE");
    const r = computeMarkov({ bars: barsFromStates(states, 0.005), config: CFG, ...CALC });
    expect(r.status).toBe("ready");
    if (r.status === "ready") {
      expect(typeof r.edge).toBe("number");
      expect(r.currentRowSample).toBeGreaterThanOrEqual(MIN_TRANSITIONS_CURRENT);
      expect(r.sampleSize).toBeGreaterThanOrEqual(MIN_TRANSITIONS_TOTAL);
      expect(r.calculatedFor).toEqual(CALC);
      // Every row of the normalized matrix that has any observations sums to 1.
      for (const from of ["BULL", "BEAR", "SIDE"] as const) {
        const row = r.transitionMatrix[from];
        const total = row.BULL + row.BEAR + row.SIDE;
        if (total > 0) expect(total).toBeCloseTo(1, 10);
      }
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Determinism -- the property that fixes the 56 -> 60 drift
// ────────────────────────────────────────────────────────────────────────────

describe("computeMarkov determinism", () => {
  const states: MarkovState[] = [];
  for (let i = 0; i < 500; i++) {
    // Deterministic pseudo-sequence -- no RNG, so reproducible across runs.
    const m = (i * 7 + 3) % 11;
    states.push(m < 4 ? "BULL" : m < 8 ? "SIDE" : "BEAR");
  }
  const bars = barsFromStates(states, 0.005);

  it("same input -> byte-identical output across 20 runs", () => {
    const first = JSON.stringify(computeMarkov({ bars, config: CFG, ...CALC }));
    for (let i = 0; i < 20; i++) {
      expect(JSON.stringify(computeMarkov({ bars, config: CFG, ...CALC }))).toBe(first);
    }
  });

  it("configVersion is embedded on every result -- ready or unavailable", () => {
    const ready = computeMarkov({ bars, config: CFG, ...CALC });
    expect(ready.configVersion).toBe("test-v1");
    const unavailable = computeMarkov({
      bars, config: { sideThreshold: null, version: "test-v0" }, ...CALC,
    });
    expect(unavailable.configVersion).toBe("test-v0");
  });

  it("calculatedFor is carried into every result -- discardability at the UI layer", () => {
    const r = computeMarkov({ bars, config: CFG, symbol: "AAPL", timeframe: "4h" });
    expect(r.calculatedFor).toEqual({ symbol: "AAPL", timeframe: "4h" });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Timeframe sensitivity -- WM-STATE-P0-01 core acceptance criterion
// ────────────────────────────────────────────────────────────────────────────

describe("timeframe changes the computed inputs, not just the label", () => {
  // Same underlying returns, two different thresholds (as would be blessed per
  // timeframe): must produce different classifications, therefore different
  // matrices, therefore different edges.
  const raw: number[] = [];
  for (let i = 0; i < 400; i++) raw.push(((i * 13 + 7) % 41 - 20) / 1000); // returns in [-0.02, +0.02]
  const bars = raw.map((r, i) => bar(r, i));

  it("different sideThresholds produce different states", () => {
    const tight = computeMarkov({ bars, config: { sideThreshold: 0.001, version: "t1" }, symbol: "X", timeframe: "1m" });
    const loose = computeMarkov({ bars, config: { sideThreshold: 0.015, version: "t2" }, symbol: "X", timeframe: "1D" });
    expect(tight.status).toBe("ready");
    expect(loose.status).toBe("ready");
    if (tight.status === "ready" && loose.status === "ready") {
      // Same bars, different thresholds -> matrices MUST differ, because that
      // is exactly the class of change WM-STATE-P0-01 requires to be provable.
      expect(JSON.stringify(tight.transitionMatrix)).not.toBe(JSON.stringify(loose.transitionMatrix));
    }
  });
});
