import { describe, it, expect } from "vitest";

import { selectStewardshipVerdict } from "./selectStewardshipVerdict";

describe("selectStewardshipVerdict — canon §Stewardship composite", () => {
  it("INSUFFICIENT_EVIDENCE when process grade is insufficient", () => {
    const r = selectStewardshipVerdict({
      process_grade: "INSUFFICIENT_EVIDENCE",
      shutdown_state: "OK",
      recovery_candidate_count: 0,
    });
    expect(r.verdict).toBe("INSUFFICIENT_EVIDENCE");
    expect(r.reasons.length).toBe(1);
  });

  it("HELD on a clean A-process day, no recovery, session OK", () => {
    const r = selectStewardshipVerdict({
      process_grade: "A_PROCESS",
      shutdown_state: "OK",
      recovery_candidate_count: 0,
    });
    expect(r.verdict).toBe("HELD");
    expect(r.reasons[0]!.severity).toBe("PASS");
  });

  it("HELD on B-process + +3R target (canon: +3R is stewardship signal, not fail)", () => {
    const r = selectStewardshipVerdict({
      process_grade: "B_PROCESS",
      shutdown_state: "AT_THREE_R_TARGET",
      recovery_candidate_count: 0,
    });
    expect(r.verdict).toBe("HELD");
  });

  it("BROKEN when any recovery trade detected", () => {
    const r = selectStewardshipVerdict({
      process_grade: "A_PROCESS",
      shutdown_state: "OK",
      recovery_candidate_count: 1,
    });
    expect(r.verdict).toBe("BROKEN");
    expect(r.reasons.some((x) => x.canon === "§Daily Risk")).toBe(true);
  });

  it("BROKEN when hard -2R stop reached", () => {
    const r = selectStewardshipVerdict({
      process_grade: "C_PROCESS",
      shutdown_state: "AT_TWO_R_STOP",
      recovery_candidate_count: 0,
    });
    expect(r.verdict).toBe("BROKEN");
  });

  it("BROKEN when 2-loss cap hit", () => {
    const r = selectStewardshipVerdict({
      process_grade: "B_PROCESS",
      shutdown_state: "AT_TWO_LOSSES",
      recovery_candidate_count: 0,
    });
    expect(r.verdict).toBe("BROKEN");
  });

  it("BROKEN when PROCESS_FAILURE", () => {
    const r = selectStewardshipVerdict({
      process_grade: "PROCESS_FAILURE",
      shutdown_state: "OK",
      recovery_candidate_count: 0,
    });
    expect(r.verdict).toBe("BROKEN");
    expect(r.reasons.some((x) => x.canon === "§14 Process Failure")).toBe(true);
  });

  it("MIXED when only C_PROCESS warning fires (no FAIL signals)", () => {
    const r = selectStewardshipVerdict({
      process_grade: "C_PROCESS",
      shutdown_state: "OK",
      recovery_candidate_count: 0,
    });
    expect(r.verdict).toBe("MIXED");
  });

  it("Multiple FAIL reasons all captured, verdict remains BROKEN", () => {
    const r = selectStewardshipVerdict({
      process_grade: "PROCESS_FAILURE",
      shutdown_state: "AT_TWO_R_STOP",
      recovery_candidate_count: 2,
    });
    expect(r.verdict).toBe("BROKEN");
    // At least 3 FAIL reasons: recovery + process fail + hard-stop
    expect(r.reasons.filter((x) => x.severity === "FAIL").length).toBeGreaterThanOrEqual(3);
  });

  it("Every reason has canon anchor + severity", () => {
    const r = selectStewardshipVerdict({
      process_grade: "PROCESS_FAILURE",
      shutdown_state: "AT_TWO_LOSSES",
      recovery_candidate_count: 1,
    });
    for (const reason of r.reasons) {
      expect(reason.canon.startsWith("§")).toBe(true);
      expect(["PASS", "WARN", "FAIL"]).toContain(reason.severity);
    }
  });
});
