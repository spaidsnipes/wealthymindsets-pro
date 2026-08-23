import { describe, it, expect } from "vitest";
import {
  computeCertificationLevel,
  certificationSummary,
  CERT_STAGES,
  type CertStage,
  type CertStageReport,
} from "./certification";

const pass = (stage: CertStage): CertStageReport => ({ stage, status: "PASS" });
const fail = (stage: CertStage): CertStageReport => ({ stage, status: "FAIL" });
const blocked = (stage: CertStage): CertStageReport => ({ stage, status: "BLOCKED" });

describe("computeCertificationLevel — state matrix", () => {
  it("no reports → NONE (never round up to READ_ONLY)", () => {
    const r = computeCertificationLevel("webull", []);
    expect(r.level).toBe("NONE");
    expect(r.fullyCertified).toBe(false);
    expect(r.pendingStages.length).toBe(CERT_STAGES.length);
  });

  it("auth passes only → still NONE (READ_ONLY requires all 5 read stages)", () => {
    const r = computeCertificationLevel("webull", [pass("auth")]);
    expect(r.level).toBe("NONE");
    expect(r.passedStages).toEqual(["auth"]);
  });

  it("all 5 read stages pass → READ_ONLY", () => {
    const reports = ["auth", "account_discovery", "capabilities", "read_market_data", "read_account_state"].map(s => pass(s as CertStage));
    const r = computeCertificationLevel("webull", reports);
    expect(r.level).toBe("READ_ONLY");
    expect(r.passedStages.length).toBe(5);
  });

  it("read stages + submit + ack + fill + cancel → WRITE_PAPER", () => {
    const reports = [
      "auth", "account_discovery", "capabilities", "read_market_data", "read_account_state",
      "submit_order", "acknowledgement", "partial_full_fill", "cancel_order",
    ].map(s => pass(s as CertStage));
    const r = computeCertificationLevel("webull", reports);
    expect(r.level).toBe("WRITE_PAPER");
    expect(r.fullyCertified).toBe(false);
  });

  it("all 12 stages pass → WRITE_LIVE + fullyCertified", () => {
    const reports = CERT_STAGES.map(pass);
    const r = computeCertificationLevel("webull", reports);
    expect(r.level).toBe("WRITE_LIVE");
    expect(r.fullyCertified).toBe(true);
    expect(r.passedStages.length).toBe(12);
  });

  it("11/12 stages pass → still WRITE_PAPER (rejection guarantee: never round up)", () => {
    const reports = CERT_STAGES.filter(s => s !== "journal_receipt").map(pass);
    const r = computeCertificationLevel("webull", reports);
    expect(r.level).toBe("WRITE_PAPER");
    expect(r.fullyCertified).toBe(false);
    expect(r.pendingStages).toContain("journal_receipt");
  });

  it("failed capabilities blocks WRITE_LIVE even if downstream stages pass in isolation", () => {
    const reports: CertStageReport[] = [
      pass("auth"),
      pass("account_discovery"),
      fail("capabilities"),
      // Downstream stages "pass" but the cascade means we can't call this READ_ONLY.
      pass("read_market_data"),
      pass("read_account_state"),
    ];
    const r = computeCertificationLevel("webull", reports);
    // Since capabilities didn't PASS, allRead is false → level is NONE.
    expect(r.level).toBe("NONE");
    expect(r.failedStages).toContain("capabilities");
  });

  it("blocked stages are enumerated separately from failed/pending", () => {
    const reports: CertStageReport[] = [
      pass("auth"),
      fail("account_discovery"),
      blocked("capabilities"),
      blocked("read_market_data"),
    ];
    const r = computeCertificationLevel("webull", reports);
    expect(r.failedStages).toContain("account_discovery");
    expect(r.blockedStages).toContain("capabilities");
    expect(r.blockedStages).toContain("read_market_data");
  });
});

describe("certificationSummary — human-readable output", () => {
  it("reports X/12 stages passed alongside the level", () => {
    const r = computeCertificationLevel("webull", [pass("auth"), pass("account_discovery")]);
    expect(certificationSummary(r)).toBe("NONE · 2/12 stages passed");
  });
  it("fully certified reports 12/12", () => {
    const r = computeCertificationLevel("webull", CERT_STAGES.map(pass));
    expect(certificationSummary(r)).toBe("WRITE_LIVE · 12/12 stages passed");
  });
});
