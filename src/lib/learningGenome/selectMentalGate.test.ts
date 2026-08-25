import { describe, it, expect } from "vitest";

import { selectMentalGate } from "./selectMentalGate";

describe("selectMentalGate — canon §17 four-check pre-trade gate", () => {
  it("INSUFFICIENT_INPUT when nothing is answered", () => {
    const r = selectMentalGate({});
    expect(r.verdict).toBe("INSUFFICIENT_INPUT");
    expect(r.unanswered.length).toBe(4);
  });

  it("INSUFFICIENT_INPUT when some checks are blank but no explicit false", () => {
    const r = selectMentalGate({ calmAndClear: true });
    expect(r.verdict).toBe("INSUFFICIENT_INPUT");
    expect(r.unanswered.length).toBe(3);
  });

  it("PASS when all four checks are true", () => {
    const r = selectMentalGate({
      calmAndClear: true,
      takenIfAlreadyAhead: true,
      skippedIfClcFailed: true,
      drivenByEvidenceNotNeed: true,
    });
    expect(r.verdict).toBe("PASS");
    expect(r.failed).toEqual([]);
    expect(r.reason).toContain("ACTION authorized");
  });

  it("WAIT when calmAndClear is false", () => {
    const r = selectMentalGate({
      calmAndClear: false,
      takenIfAlreadyAhead: true,
      skippedIfClcFailed: true,
      drivenByEvidenceNotNeed: true,
    });
    expect(r.verdict).toBe("WAIT");
    expect(r.failed).toEqual(["calmAndClear"]);
    expect(r.reason).toContain("Emotional state");
  });

  it("WAIT when takenIfAlreadyAhead is false (canon: needing the trade)", () => {
    const r = selectMentalGate({
      calmAndClear: true,
      takenIfAlreadyAhead: false,
      skippedIfClcFailed: true,
      drivenByEvidenceNotNeed: true,
    });
    expect(r.verdict).toBe("WAIT");
    expect(r.failed).toEqual(["takenIfAlreadyAhead"]);
  });

  it("WAIT when skippedIfClcFailed is false (rules discipline bent)", () => {
    const r = selectMentalGate({
      calmAndClear: true,
      takenIfAlreadyAhead: true,
      skippedIfClcFailed: false,
      drivenByEvidenceNotNeed: true,
    });
    expect(r.verdict).toBe("WAIT");
    expect(r.reason).toContain("rules discipline");
  });

  it("WAIT when drivenByEvidenceNotNeed is false (money pressure)", () => {
    const r = selectMentalGate({
      calmAndClear: true,
      takenIfAlreadyAhead: true,
      skippedIfClcFailed: true,
      drivenByEvidenceNotNeed: false,
    });
    expect(r.verdict).toBe("WAIT");
    expect(r.reason).toContain("money pressure");
  });

  it("failed list contains every false answer, headline uses the first", () => {
    const r = selectMentalGate({
      calmAndClear: false,
      takenIfAlreadyAhead: false,
      skippedIfClcFailed: true,
      drivenByEvidenceNotNeed: true,
    });
    expect(r.verdict).toBe("WAIT");
    expect(r.failed).toEqual(["calmAndClear", "takenIfAlreadyAhead"]);
    expect(r.reason).toContain("Emotional state"); // first-failed wins headline
  });

  it("WAIT when 3 answered + 1 explicit false (missing does not save a fail)", () => {
    const r = selectMentalGate({
      calmAndClear: false, // explicit fail
      takenIfAlreadyAhead: true,
      skippedIfClcFailed: true,
      // drivenByEvidenceNotNeed unanswered
    });
    expect(r.verdict).toBe("WAIT");
    expect(r.failed).toEqual(["calmAndClear"]);
    expect(r.unanswered).toEqual(["drivenByEvidenceNotNeed"]);
  });
});
