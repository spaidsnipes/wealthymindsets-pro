/**
 * riskKernel — truth-lock supplement.
 *
 * The existing riskKernel.test.ts covers the happy path + a small handful
 * of failure modes. This supplement extends coverage to the input-guard
 * matrix (every null field), NaN/Infinity rejection, maxQuantity + fractional
 * quantityStep handling, and the formulaVersion stamp on both entry points.
 *
 * Silent drift here would silently mis-size every /paper trade, /journal
 * Log-New-Trade R math, and every Proof Lane R reading. Founder canon:
 * "Stop is an INPUT, never an output."
 */

import { describe, it, expect } from "vitest";
import {
  calculateAvailableR,
  calculatePositionSize,
  RISK_KERNEL_FORMULA_VERSION,
  type AvailableRInput,
  type PositionSizeInput,
} from "./riskKernel";

const baseAvailR: AvailableRInput = {
  side: "LONG",
  entry: 100,
  structuralStop: 95,
  barrier: 115,
  pointValue: 1,
  spreadPoints: 0,
  slippagePoints: 0,
  feesPerUnit: 0,
};

describe("calculateAvailableR — full null-input matrix", () => {
  it("UNKNOWN when entry is null", () => {
    expect(calculateAvailableR({ ...baseAvailR, entry: null }).status).toBe("UNKNOWN");
  });
  it("UNKNOWN when structuralStop is null", () => {
    expect(calculateAvailableR({ ...baseAvailR, structuralStop: null }).status).toBe("UNKNOWN");
  });
  it("UNKNOWN when barrier is null", () => {
    expect(calculateAvailableR({ ...baseAvailR, barrier: null }).status).toBe("UNKNOWN");
  });
  it("UNKNOWN when pointValue is null (unit economics unresolved)", () => {
    expect(calculateAvailableR({ ...baseAvailR, pointValue: null }).status).toBe("UNKNOWN");
  });
  it("UNKNOWN when slippagePoints is null (existing tests only cover spread)", () => {
    expect(calculateAvailableR({ ...baseAvailR, slippagePoints: null }).status).toBe("UNKNOWN");
  });
  it("UNKNOWN when feesPerUnit is null", () => {
    expect(calculateAvailableR({ ...baseAvailR, feesPerUnit: null }).status).toBe("UNKNOWN");
  });
});

describe("calculateAvailableR — NaN / Infinity rejection (Number.isFinite guard)", () => {
  it("NaN entry → UNKNOWN", () => {
    expect(calculateAvailableR({ ...baseAvailR, entry: NaN }).status).toBe("UNKNOWN");
  });
  it("Infinity pointValue → UNKNOWN", () => {
    expect(calculateAvailableR({ ...baseAvailR, pointValue: Infinity }).status).toBe("UNKNOWN");
  });
  it("Negative entry → UNKNOWN (positive-only guard)", () => {
    expect(calculateAvailableR({ ...baseAvailR, entry: -100 }).status).toBe("UNKNOWN");
  });
});

describe("calculateAvailableR — direction + reward-space guards", () => {
  it("UNAVAILABLE — SHORT with stop BELOW entry (wrong side)", () => {
    const r = calculateAvailableR({
      ...baseAvailR,
      side: "SHORT",
      structuralStop: 95, // must be ABOVE entry for SHORT
      barrier: 85,
    });
    expect(r.status).toBe("UNAVAILABLE");
    expect(r.status === "UNAVAILABLE" && r.reason).toMatch(/not on the loss side.*SHORT/i);
  });

  it("UNAVAILABLE — LONG with barrier BELOW entry (positive but wrong direction)", () => {
    const r = calculateAvailableR({ ...baseAvailR, barrier: 90 });
    expect(r.status).toBe("UNAVAILABLE");
    expect(r.status === "UNAVAILABLE" && r.reason).toMatch(/reward space.*LONG/i);
  });

  it("UNAVAILABLE — SHORT with barrier ABOVE entry", () => {
    const r = calculateAvailableR({
      ...baseAvailR,
      side: "SHORT",
      structuralStop: 105,
      barrier: 110, // must be BELOW entry for SHORT
    });
    expect(r.status).toBe("UNAVAILABLE");
    expect(r.status === "UNAVAILABLE" && r.reason).toMatch(/reward space.*SHORT/i);
  });

  it("AVAILABLE — futures-shaped inputs (pointValue=50, non-trivial costs)", () => {
    const r = calculateAvailableR({
      ...baseAvailR,
      pointValue: 50,
      spreadPoints: 0.25,
      slippagePoints: 0.25,
      feesPerUnit: 4,
    });
    expect(r.status).toBe("AVAILABLE");
    if (r.status === "AVAILABLE") {
      // (spread+slip)*pv + fees = (0.5)*50 + 4 = 29
      expect(r.estimatedCosts).toBeCloseTo(29);
      // risk = 5pts * $50 + $29 = $279
      expect(r.riskPerUnit).toBeCloseTo(279);
      // reward = 15pts * $50 - $29 = $721
      expect(r.netRewardPerUnit).toBeCloseTo(721);
      expect(r.value).toBeCloseTo(721 / 279, 4);
    }
  });

  it("AVAILABLE result stamps formulaVersion + barrier verbatim", () => {
    const r = calculateAvailableR(baseAvailR);
    expect(r.status).toBe("AVAILABLE");
    if (r.status === "AVAILABLE") {
      expect(r.formulaVersion).toBe(RISK_KERNEL_FORMULA_VERSION);
      expect(r.barrier).toBe(115);
    }
  });
});

const basePosSize: PositionSizeInput = {
  accountRiskBudget: 500,
  riskPerUnit: 100,
  quantityStep: 1,
  maxQuantity: null,
};

describe("calculatePositionSize — maxQuantity + fractional-step + full null matrix", () => {
  it("UNKNOWN when accountRiskBudget is null", () => {
    expect(calculatePositionSize({ ...basePosSize, accountRiskBudget: null }).status).toBe("UNKNOWN");
  });
  it("UNKNOWN when riskPerUnit is null", () => {
    expect(calculatePositionSize({ ...basePosSize, riskPerUnit: null }).status).toBe("UNKNOWN");
  });
  it("UNKNOWN when quantityStep is null", () => {
    expect(calculatePositionSize({ ...basePosSize, quantityStep: null }).status).toBe("UNKNOWN");
  });

  it("UNAVAILABLE when maxQuantity supplied but zero (non-positive)", () => {
    const r = calculatePositionSize({ ...basePosSize, maxQuantity: 0 });
    expect(r.status).toBe("UNAVAILABLE");
    expect(r.status === "UNAVAILABLE" && r.reason).toMatch(/Maximum quantity must be positive/i);
  });

  it("UNAVAILABLE when maxQuantity supplied but negative", () => {
    const r = calculatePositionSize({ ...basePosSize, maxQuantity: -3 });
    expect(r.status).toBe("UNAVAILABLE");
  });

  it("maxQuantity=null means no cap — raw calculation used", () => {
    const r = calculatePositionSize(basePosSize);
    expect(r.status).toBe("AVAILABLE");
    if (r.status === "AVAILABLE") expect(r.quantity).toBe(5);
  });

  it("maxQuantity caps quantity when raw would exceed it", () => {
    const r = calculatePositionSize({ ...basePosSize, maxQuantity: 3 });
    expect(r.status).toBe("AVAILABLE");
    if (r.status === "AVAILABLE") {
      expect(r.quantity).toBe(3);
      expect(r.plannedDollarRisk).toBe(300);
      expect(r.unusedRiskBudget).toBe(200);
    }
  });

  it("maxQuantity ignored when raw is already below it", () => {
    // Raw 5, cap 100 → 5
    const r = calculatePositionSize({ ...basePosSize, maxQuantity: 100 });
    if (r.status === "AVAILABLE") expect(r.quantity).toBe(5);
  });

  it("fractional quantityStep (crypto) — floors to step", () => {
    // $555 / $100 = 5.55 raw, step 0.1 → floor to 5.5
    const r = calculatePositionSize({
      ...basePosSize,
      accountRiskBudget: 555,
      quantityStep: 0.1,
    });
    expect(r.status).toBe("AVAILABLE");
    if (r.status === "AVAILABLE") {
      expect(r.quantity).toBeCloseTo(5.5, 6);
      expect(r.plannedDollarRisk).toBeCloseTo(550, 6);
      expect(r.unusedRiskBudget).toBeCloseTo(5, 6);
    }
  });

  it("stamps formulaVersion (deterministic replay)", () => {
    const r = calculatePositionSize(basePosSize);
    if (r.status === "AVAILABLE") expect(r.formulaVersion).toBe(RISK_KERNEL_FORMULA_VERSION);
  });

  it("unusedRiskBudget is always >= 0 (Math.max floor)", () => {
    const r = calculatePositionSize(basePosSize);
    if (r.status === "AVAILABLE") expect(r.unusedRiskBudget).toBeGreaterThanOrEqual(0);
  });
});
