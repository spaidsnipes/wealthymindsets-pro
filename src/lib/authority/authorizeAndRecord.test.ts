import { describe, it, expect } from "vitest";
import { authorizeAndRecord, type AuthorizeAndRecordInput } from "./authorizeAndRecord";
import type { AuthorizationInput } from "./executionAuthority";

const okIntent = { side: "buy" as const, qty: 1, symbol: "TSLA" };

function auth(partial: Partial<AuthorizationInput>): AuthorizationInput {
  return {
    intent: okIntent,
    source: "human",
    env: "paper",
    rightOfWay: "ACTION",
    humanApproval: null,
    ...partial,
  };
}

function input(partial: Partial<AuthorizeAndRecordInput>): AuthorizeAndRecordInput {
  return {
    authorization: auth({}),
    receiptId: "rcpt-1",
    createdAtIso: "2026-08-31T00:00:00.000Z",
    product: "wm-pro",
    ...partial,
  };
}

describe("authorizeAndRecord — the composed honest entry point", () => {
  it("receipt authorization can never disagree with the gate (authorized path)", () => {
    const { decision, receipt } = authorizeAndRecord(input({}));
    expect(decision.authorized).toBe(true);
    expect(receipt.authorized).toBe(decision.authorized);
    expect(receipt.reasonCode).toBe(decision.reasonCode);
  });

  it("a denial is a first-class receipt, not a silent drop", () => {
    const { decision, receipt } = authorizeAndRecord(
      input({ authorization: auth({ source: "model" }) }), // model self-authorize -> denied
    );
    expect(decision.authorized).toBe(false);
    expect(receipt.reasonCode).toBe("DENIED_MODEL_CANNOT_SELF_AUTHORIZE");
    expect(receipt.result).toBe("DENIED");
    expect(receipt.brokerOrderId).toBeNull();
  });

  it("never fabricates execution: authorized but no broker ack => AUTHORIZED_NOT_EXECUTED", () => {
    const { receipt } = authorizeAndRecord(input({}));
    expect(receipt.result).toBe("AUTHORIZED_NOT_EXECUTED");
    expect(receipt.brokerOrderId).toBeNull();
  });

  it("carries a real broker ack through to EXECUTED with the broker order id", () => {
    const { receipt } = authorizeAndRecord(
      input({ brokerAck: { brokerOrderId: "BRK-7", status: "accepted" } }),
    );
    expect(receipt.result).toBe("EXECUTED");
    expect(receipt.brokerOrderId).toBe("BRK-7");
  });

  it("mirrors the intent + approver identity into the receipt (identity, not secret)", () => {
    const { receipt } = authorizeAndRecord(
      input({
        authorization: auth({
          env: "live",
          humanApproval: { approved: true, approvedBy: "dave" },
        }),
      }),
    );
    expect(receipt.intentSummary).toEqual({ symbol: "TSLA", side: "buy", qty: 1 });
    expect(receipt.humanApprovedBy).toBe("dave");
    expect(JSON.stringify(receipt)).not.toMatch(/secret|token|apiKey|api_key/i);
  });

  it("is reproducible: same input => byte-identical receipt JSON (pure)", () => {
    const a = authorizeAndRecord(input({}));
    const b = authorizeAndRecord(input({}));
    expect(JSON.stringify(a.receipt)).toBe(JSON.stringify(b.receipt));
  });
});
