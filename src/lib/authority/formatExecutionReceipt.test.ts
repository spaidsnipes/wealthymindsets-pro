import { describe, it, expect } from "vitest";
import {
  executionResultLabel,
  executionResultTone,
  formatExecutionReceiptLine,
  formatExecutionReceiptWhy,
} from "./formatExecutionReceipt";
import { buildExecutionReceipt } from "./executionReceipt";
import { authorizeExecution } from "./executionAuthority";

const baseIntent = { side: "buy" as const, qty: 1, symbol: "TSLA" };

function receipt(over: {
  source?: "human" | "model";
  env?: "paper" | "live";
  humanApproval?: { approved: boolean; approvedBy?: string } | null;
  brokerAck?: { brokerOrderId: string; status: "accepted" | "pending" | "rejected" | "unknown" } | null;
  approvedBy?: string | null;
  sourceRefs?: string[];
}) {
  const decision = authorizeExecution({
    intent: baseIntent,
    source: over.source ?? "human",
    env: over.env ?? "paper",
    rightOfWay: "ACTION",
    humanApproval: over.humanApproval ?? null,
  });
  return buildExecutionReceipt({
    receiptId: "r1",
    createdAtIso: "2026-08-31T00:00:00.000Z",
    product: "wm-pro",
    decision,
    source: over.source ?? "human",
    env: over.env ?? "paper",
    intentSummary: { symbol: "TSLA", side: "buy", qty: 1 },
    approvedBy: over.approvedBy ?? null,
    sourceRefs: over.sourceRefs,
    brokerAck: over.brokerAck ?? null,
  });
}

describe("executionResultLabel / tone", () => {
  it("never dresses AUTHORIZED_NOT_EXECUTED up as done", () => {
    expect(executionResultLabel("AUTHORIZED_NOT_EXECUTED")).toBe("AUTHORIZED — NOT EXECUTED");
    expect(executionResultTone("AUTHORIZED_NOT_EXECUTED")).toBe("neutral");
  });
  it("maps tones truthfully", () => {
    expect(executionResultTone("EXECUTED")).toBe("positive");
    expect(executionResultTone("FAILED")).toBe("danger");
    expect(executionResultTone("DENIED")).toBe("warning");
  });
});

describe("formatExecutionReceiptLine — never overclaims", () => {
  it("EXECUTED names the real broker order id", () => {
    const r = receipt({ brokerAck: { brokerOrderId: "BRK-42", status: "accepted" } });
    expect(formatExecutionReceiptLine(r)).toBe("EXECUTED — buy 1 TSLA (paper) · broker BRK-42");
  });
  it("authorized-but-no-ack reads as NOT EXECUTED, no broker claim", () => {
    const r = receipt({});
    expect(formatExecutionReceiptLine(r)).toBe("AUTHORIZED — NOT EXECUTED — buy 1 TSLA (paper) · no broker effect");
  });
  it("DENIED includes the machine reason and never claims an order", () => {
    const r = receipt({ source: "model" });
    const line = formatExecutionReceiptLine(r);
    expect(line.startsWith("DENIED — buy 1 TSLA (paper):")).toBe(true);
    expect(line).not.toMatch(/broker/i);
  });
  it("FAILED reads as broker rejected", () => {
    const r = receipt({ brokerAck: { brokerOrderId: "BRK-9", status: "rejected" } });
    expect(formatExecutionReceiptLine(r)).toBe("FAILED — buy 1 TSLA (paper) · broker rejected");
  });
});

describe("formatExecutionReceiptWhy — only truthful rows, no secrets", () => {
  it("records live human-approval identity", () => {
    const r = receipt({ env: "live", humanApproval: { approved: true, approvedBy: "dave" }, approvedBy: "dave" });
    const rows = formatExecutionReceiptWhy(r);
    const approval = rows.find(x => x.label === "Human approval");
    expect(approval?.value).toContain("approved by dave");
  });
  it("shows required-but-not-provided when a live order lacks approval", () => {
    const r = receipt({ env: "live" });
    const approval = formatExecutionReceiptWhy(r).find(x => x.label === "Human approval");
    expect(approval?.value).toBe("required · NOT provided");
  });
  it("includes evidence refs when present and never formats a secret", () => {
    const r = receipt({ sourceRefs: ["owner:user-1", "nectar:TSLA"] });
    const rows = formatExecutionReceiptWhy(r);
    expect(rows.find(x => x.label === "Evidence")?.value).toContain("nectar:TSLA");
    expect(JSON.stringify(rows)).not.toMatch(/secret|token|apiKey|api_key/i);
  });
});
