import { describe, it, expect } from "vitest";

import { selectModelCommitment } from "./selectModelCommitment";

const SESSION_OPEN = Date.UTC(2026, 7, 25, 14, 30); // 09:30 ET
const BEFORE_OPEN = SESSION_OPEN - 60 * 60 * 1000; // 1h before
const AFTER_OPEN = SESSION_OPEN + 60 * 60 * 1000; // 1h after

describe("selectModelCommitment — canon §1 CHOOSE THE MODEL BEFORE THE MARKET", () => {
  it("NOT_DECLARED when no declaredModel", () => {
    const r = selectModelCommitment({
      sessionOpenMs: SESSION_OPEN,
      executedModels: ["M1"],
    });
    expect(r.verdict).toBe("NOT_DECLARED");
    expect(r.declared_model).toBeUndefined();
  });

  it("DECLARED_LATE when declaredAtMs >= sessionOpenMs", () => {
    const r = selectModelCommitment({
      declaredModel: "M1",
      declaredAtMs: SESSION_OPEN, // exactly at open — canon says BEFORE
      sessionOpenMs: SESSION_OPEN,
      executedModels: ["M1"],
    });
    expect(r.verdict).toBe("DECLARED_LATE");
  });

  it("DECLARED_LATE when declared after open (retro-declaration)", () => {
    const r = selectModelCommitment({
      declaredModel: "M1",
      declaredAtMs: AFTER_OPEN,
      sessionOpenMs: SESSION_OPEN,
      executedModels: ["M1"],
    });
    expect(r.verdict).toBe("DECLARED_LATE");
  });

  it("DECLARED_LATE when declaredAtMs is missing entirely", () => {
    const r = selectModelCommitment({
      declaredModel: "M1",
      sessionOpenMs: SESSION_OPEN,
      executedModels: ["M1"],
    });
    expect(r.verdict).toBe("DECLARED_LATE");
  });

  it("HELD when every execution matches the declaration", () => {
    const r = selectModelCommitment({
      declaredModel: "M1",
      declaredAtMs: BEFORE_OPEN,
      sessionOpenMs: SESSION_OPEN,
      executedModels: ["M1", "M1", "M1"],
    });
    expect(r.verdict).toBe("HELD");
    expect(r.shifted_models).toEqual([]);
  });

  it("SHIFTED when at least one execution diverges from declaration", () => {
    const r = selectModelCommitment({
      declaredModel: "M1",
      declaredAtMs: BEFORE_OPEN,
      sessionOpenMs: SESSION_OPEN,
      executedModels: ["M1", "M2"],
    });
    expect(r.verdict).toBe("SHIFTED");
    expect(r.shifted_models).toEqual(["M2"]);
  });

  it("M0 declared + any execution → SHIFTED (canon: M0 = no trade)", () => {
    const r = selectModelCommitment({
      declaredModel: "M0",
      declaredAtMs: BEFORE_OPEN,
      sessionOpenMs: SESSION_OPEN,
      executedModels: ["M1"],
    });
    expect(r.verdict).toBe("SHIFTED");
    expect(r.shifted_models).toEqual(["M1"]);
  });

  it("M0 declared + zero executions → NO_TRADES (disciplined day)", () => {
    const r = selectModelCommitment({
      declaredModel: "M0",
      declaredAtMs: BEFORE_OPEN,
      sessionOpenMs: SESSION_OPEN,
      executedModels: [],
    });
    expect(r.verdict).toBe("NO_TRADES");
  });

  it("M1 declared + zero executions → NO_TRADES (plan waiting)", () => {
    const r = selectModelCommitment({
      declaredModel: "M1",
      declaredAtMs: BEFORE_OPEN,
      sessionOpenMs: SESSION_OPEN,
      executedModels: [],
    });
    expect(r.verdict).toBe("NO_TRADES");
  });

  it("Shifted models deduped + sorted deterministically", () => {
    const r = selectModelCommitment({
      declaredModel: "M2",
      declaredAtMs: BEFORE_OPEN,
      sessionOpenMs: SESSION_OPEN,
      executedModels: ["M1", "M1", "M0", "M2"],
    });
    expect(r.verdict).toBe("SHIFTED");
    expect(r.shifted_models).toEqual(["M0", "M1"]);
  });

  it("undefined executed models are skipped from the shifted list", () => {
    const r = selectModelCommitment({
      declaredModel: "M1",
      declaredAtMs: BEFORE_OPEN,
      sessionOpenMs: SESSION_OPEN,
      executedModels: [undefined, "M1", undefined],
    });
    // Only M1 shows in unique; matches declared → HELD (all defined match).
    expect(r.verdict).toBe("HELD");
  });

  it("every verdict carries a canon anchor", () => {
    for (const input of [
      { sessionOpenMs: SESSION_OPEN, executedModels: [] },
      { declaredModel: "M1" as const, sessionOpenMs: SESSION_OPEN, executedModels: [] },
      { declaredModel: "M1" as const, declaredAtMs: BEFORE_OPEN, sessionOpenMs: SESSION_OPEN, executedModels: ["M1" as const] },
    ]) {
      const r = selectModelCommitment(input);
      expect(r.canon.startsWith("§")).toBe(true);
    }
  });
});
