import { describe, it, expect } from "vitest";

import { selectCostAveragingFirewall } from "./selectCostAveragingFirewall";

describe("selectCostAveragingFirewall — canon §COST-AVERAGING FIREWALL", () => {
  it("NO_SCALE when addedDebit = 0", () => {
    const r = selectCostAveragingFirewall({
      originalOneRDollars: 100,
      scalePlanDeclared: true,
      addedDebitDollars: 0,
      postAddStructuralRiskDollars: 100,
    });
    expect(r.verdict).toBe("NO_SCALE");
  });

  it("NO_SCALE when addedDebit is negative", () => {
    const r = selectCostAveragingFirewall({
      originalOneRDollars: 100,
      scalePlanDeclared: true,
      addedDebitDollars: -20,
      postAddStructuralRiskDollars: 100,
    });
    expect(r.verdict).toBe("NO_SCALE");
  });

  it("NO_SCALE when originalOneRDollars is missing / zero / negative", () => {
    for (const oneR of [0, -1, Number.NaN, Infinity]) {
      const r = selectCostAveragingFirewall({
        originalOneRDollars: oneR,
        scalePlanDeclared: true,
        addedDebitDollars: 50,
        postAddStructuralRiskDollars: 100,
      });
      expect(r.verdict).toBe("NO_SCALE");
    }
  });

  it("PLAN_CLEAN when declared + total risk within 1R", () => {
    const r = selectCostAveragingFirewall({
      originalOneRDollars: 100,
      scalePlanDeclared: true,
      addedDebitDollars: 25,
      postAddStructuralRiskDollars: 90,
    });
    expect(r.verdict).toBe("PLAN_CLEAN");
    expect(r.breaches_one_r).toBe(false);
    expect(r.post_add_risk_over_one_r).toBe(0.9);
  });

  it("PLAN_CLEAN at exactly 1R risk (canon inclusive ≤ 1)", () => {
    const r = selectCostAveragingFirewall({
      originalOneRDollars: 100,
      scalePlanDeclared: true,
      addedDebitDollars: 25,
      postAddStructuralRiskDollars: 100,
    });
    expect(r.verdict).toBe("PLAN_CLEAN");
  });

  it("EXECUTION_VIOLATION when total risk > 1R even with declared plan", () => {
    const r = selectCostAveragingFirewall({
      originalOneRDollars: 100,
      scalePlanDeclared: true,
      addedDebitDollars: 30,
      postAddStructuralRiskDollars: 130,
    });
    expect(r.verdict).toBe("EXECUTION_VIOLATION");
    expect(r.breaches_one_r).toBe(true);
    expect(r.canon).toContain("declared plan cannot authorize a 1R breach");
  });

  it("EXPERIMENTAL_MANAGEMENT when undeclared + risk within 1R", () => {
    const r = selectCostAveragingFirewall({
      originalOneRDollars: 100,
      scalePlanDeclared: false,
      addedDebitDollars: 25,
      postAddStructuralRiskDollars: 90,
    });
    expect(r.verdict).toBe("EXPERIMENTAL_MANAGEMENT");
  });

  it("EXECUTION_VIOLATION when undeclared + risk > 1R (worst case)", () => {
    const r = selectCostAveragingFirewall({
      originalOneRDollars: 100,
      scalePlanDeclared: false,
      addedDebitDollars: 60,
      postAddStructuralRiskDollars: 140,
    });
    expect(r.verdict).toBe("EXECUTION_VIOLATION");
    expect(r.canon).toContain("undeclared add exceeded 1R");
  });

  it("reports risk ratio for the tooltip", () => {
    const r = selectCostAveragingFirewall({
      originalOneRDollars: 100,
      scalePlanDeclared: true,
      addedDebitDollars: 25,
      postAddStructuralRiskDollars: 125,
    });
    expect(r.post_add_risk_over_one_r).toBe(1.25);
    expect(r.verdict).toBe("EXECUTION_VIOLATION");
  });

  it("every verdict carries a canon anchor", () => {
    for (const input of [
      { originalOneRDollars: 100, scalePlanDeclared: true, addedDebitDollars: 0, postAddStructuralRiskDollars: 0 },
      { originalOneRDollars: 100, scalePlanDeclared: true, addedDebitDollars: 25, postAddStructuralRiskDollars: 90 },
      { originalOneRDollars: 100, scalePlanDeclared: false, addedDebitDollars: 25, postAddStructuralRiskDollars: 90 },
      { originalOneRDollars: 100, scalePlanDeclared: true, addedDebitDollars: 25, postAddStructuralRiskDollars: 150 },
    ]) {
      const r = selectCostAveragingFirewall(input);
      expect(r.canon.startsWith("§")).toBe(true);
    }
  });
});
