import { describe, it, expect } from "vitest";
import {
  buildExecutionReceipt,
  deriveExecutionResult,
  type ExecutionReceiptInput,
} from "./executionReceipt";
import { authorizeExecution } from "./executionAuthority";

const baseIntent = { side: "buy" as const, qty: 1, symbol: "TSLA" };

function receiptInput(partial: Partial<ExecutionReceiptInput>): ExecutionReceiptInput {
  const decision = authorizeExecution({
    intent: baseIntent,
    source: "human",
    env: "paper",
    rightOfWay: "ACTION",
    humanApproval: null,
  });
  return {
    receiptId: "rcpt-1",
    createdAtIso: "2026-08-31T00:00:00.000Z",
    product: "wm-pro",
    decision,
    source: "human",
    env: "paper",
    intentSummary: { symbol: "TSLA", side: "buy", qty: 1 },
    ...partial,
  };
}

describe("deriveExecutionResult", () => {
  it("DENIED when not authorized (regardless of ack)", () => {
    expect(deriveExecutionResult(false, null)).toBe("DENIED");
    expect(deriveExecutionResult(false, { status: "accepted" })).toBe("DENIED");
  });
  it("AUTHORIZED_NOT_EXECUTED when authorized but no broker ack (no overclaim)", () => {
    expect(deriveExecutionResult(true, null)).toBe("AUTHORIZED_NOT_EXECUTED");
    expect(deriveExecutionResult(true, undefined)).toBe("AUTHORIZED_NOT_EXECUTED");
  });
  it("EXECUTED only when a broker ack is accepted or pending", () => {
    expect(deriveExecutionResult(true, { status: "accepted" })).toBe("EXECUTED");
    expect(deriveExecutionResult(true, { status: "pending" })).toBe("EXECUTED");
  });
  it("FAILED when broker ack is rejected or unknown", () => {
    expect(deriveExecutionResult(true, { status: "rejected" })).toBe("FAILED");
    expect(deriveExecutionResult(true, { status: "unknown" })).toBe("FAILED");
  });
});

describe("buildExecutionReceipt — truth discipline", () => {
  it("records a denied proposal as DENIED and never claims execution", () => {
    const decision = authorizeExecution({
      intent: baseIntent,
      source: "model",
      env: "paper",
      rightOfWay: "ACTION",
      humanApproval: null, // model self-authorize -> denied
    });
    const r = buildExecutionReceipt(receiptInput({ source: "model", decision }));
    expect(r.authorized).toBe(false);
    expect(r.reasonCode).toBe("DENIED_MODEL_CANNOT_SELF_AUTHORIZE");
    expect(r.result).toBe("DENIED");
    expect(r.brokerOrderId).toBeNull();
  });

  it("authorized but no broker ack => AUTHORIZED_NOT_EXECUTED (authorization != execution)", () => {
    const r = buildExecutionReceipt(receiptInput({}));
    expect(r.authorized).toBe(true);
    expect(r.result).toBe("AUTHORIZED_NOT_EXECUTED");
    expect(r.brokerOrderId).toBeNull();
  });

  it("authorized WITH accepted broker ack => EXECUTED and carries the broker order id", () => {
    const r = buildExecutionReceipt(
      receiptInput({ brokerAck: { brokerOrderId: "BRK-42", status: "accepted" } }),
    );
    expect(r.result).toBe("EXECUTED");
    expect(r.brokerOrderId).toBe("BRK-42");
  });

  it("carries model runtime CLASS + source refs but no secrets, and records approver", () => {
    const decision = authorizeExecution({
      intent: baseIntent,
      source: "model",
      env: "paper",
      rightOfWay: "ACTION",
      humanApproval: { approved: true, approvedBy: "dave" },
    });
    const r = buildExecutionReceipt(
      receiptInput({
        source: "model",
        decision,
        modelRuntime: { providerClass: "anthropic-claude", capability: "propose-order" },
        sourceRefs: ["decisionChain:node-1", "nectar:TSLA"],
        approvedBy: "dave",
      }),
    );
    expect(r.authorized).toBe(true);
    expect(r.modelRuntime?.providerClass).toBe("anthropic-claude");
    expect(r.sourceRefs).toContain("nectar:TSLA");
    expect(r.humanApprovedBy).toBe("dave");
    // The receipt object must not smuggle a key/token field.
    expect(JSON.stringify(r)).not.toMatch(/secret|token|apiKey|api_key/i);
  });

  it("is reproducible: same input => byte-identical JSON (pure, no clock/random)", () => {
    const a = buildExecutionReceipt(receiptInput({}));
    const b = buildExecutionReceipt(receiptInput({}));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("preserves the caller-supplied id + timestamp verbatim", () => {
    const r = buildExecutionReceipt(
      receiptInput({ receiptId: "rcpt-xyz", createdAtIso: "2026-08-31T12:34:56.000Z" }),
    );
    expect(r.receiptId).toBe("rcpt-xyz");
    expect(r.createdAtIso).toBe("2026-08-31T12:34:56.000Z");
  });
});
