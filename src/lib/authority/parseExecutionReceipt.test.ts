import { describe, it, expect } from "vitest";
import { parseExecutionReceipt, parseReceiptFromResponse } from "./parseExecutionReceipt";
import { buildExecutionReceipt } from "./executionReceipt";
import { authorizeExecution } from "./executionAuthority";
import { formatExecutionReceiptLine } from "./formatExecutionReceipt";

function realReceipt() {
  const decision = authorizeExecution({
    intent: { symbol: "TSLA", side: "buy", qty: 1 },
    source: "human",
    env: "paper",
    rightOfWay: "ACTION",
    humanApproval: null,
  });
  return buildExecutionReceipt({
    receiptId: "alpaca:BRK-1",
    createdAtIso: "2026-08-31T00:00:00.000Z",
    product: "wm-pro",
    decision,
    source: "human",
    env: "paper",
    intentSummary: { symbol: "TSLA", side: "buy", qty: 1 },
    brokerAck: { brokerOrderId: "BRK-1", status: "accepted" },
  });
}

describe("parseExecutionReceipt — trusts nothing, fabricates nothing", () => {
  it("round-trips a real receipt through JSON and back into the formatter", () => {
    const original = realReceipt();
    const wire = JSON.parse(JSON.stringify(original)) as unknown;
    const parsed = parseExecutionReceipt(wire);
    expect(parsed).not.toBeNull();
    expect(formatExecutionReceiptLine(parsed!)).toBe("EXECUTED — buy 1 TSLA (paper) · broker BRK-1");
  });

  it("returns null for non-objects", () => {
    expect(parseExecutionReceipt(null)).toBeNull();
    expect(parseExecutionReceipt(undefined)).toBeNull();
    expect(parseExecutionReceipt("EXECUTED")).toBeNull();
    expect(parseExecutionReceipt(42)).toBeNull();
    expect(parseExecutionReceipt([])).toBeNull();
  });

  it("returns null when result is not a known verdict (no invented verdict)", () => {
    const r = JSON.parse(JSON.stringify(realReceipt())) as Record<string, unknown>;
    r.result = "TOTALLY_DONE";
    expect(parseExecutionReceipt(r)).toBeNull();
  });

  it("returns null when intentSummary is malformed", () => {
    const r = JSON.parse(JSON.stringify(realReceipt())) as Record<string, unknown>;
    r.intentSummary = { symbol: "TSLA", side: "buy" }; // missing qty
    expect(parseExecutionReceipt(r)).toBeNull();
  });

  it("returns null when a required verdict field is missing", () => {
    const r = JSON.parse(JSON.stringify(realReceipt())) as Record<string, unknown>;
    delete r.authorized;
    expect(parseExecutionReceipt(r)).toBeNull();
  });

  it("returns null when actionClass is not a known member (no garbage reaches the WHY row)", () => {
    const r = JSON.parse(JSON.stringify(realReceipt())) as Record<string, unknown>;
    r.actionClass = "SUPER_ACT";
    expect(parseExecutionReceipt(r)).toBeNull();
    delete r.actionClass;
    expect(parseExecutionReceipt(r)).toBeNull();
  });

  it("returns null when reasonCode is not a known member", () => {
    const r = JSON.parse(JSON.stringify(realReceipt())) as Record<string, unknown>;
    r.reasonCode = "BECAUSE_I_SAID_SO";
    expect(parseExecutionReceipt(r)).toBeNull();
  });

  it("returns null when env or source is not a known member", () => {
    const r1 = JSON.parse(JSON.stringify(realReceipt())) as Record<string, unknown>;
    r1.env = "production";
    expect(parseExecutionReceipt(r1)).toBeNull();
    const r2 = JSON.parse(JSON.stringify(realReceipt())) as Record<string, unknown>;
    r2.source = "aliens";
    expect(parseExecutionReceipt(r2)).toBeNull();
  });

  it("normalizes missing optionals rather than emitting undefined", () => {
    const r = JSON.parse(JSON.stringify(realReceipt())) as Record<string, unknown>;
    delete r.sourceRefs;
    delete r.brokerOrderId;
    delete r.humanApprovedBy;
    const parsed = parseExecutionReceipt(r);
    expect(parsed).not.toBeNull();
    expect(parsed!.sourceRefs).toEqual([]);
    expect(parsed!.brokerOrderId).toBeNull();
    expect(parsed!.humanApprovedBy).toBeNull();
  });
});

describe("parseReceiptFromResponse — pulls the receipt off an order-route body", () => {
  it("extracts and validates the nested receipt", () => {
    const body = { ok: true, order_id: "BRK-1", receipt: realReceipt() };
    const wire = JSON.parse(JSON.stringify(body)) as unknown;
    expect(parseReceiptFromResponse(wire)?.receiptId).toBe("alpaca:BRK-1");
  });

  it("returns null when the body carries no receipt", () => {
    expect(parseReceiptFromResponse({ ok: true })).toBeNull();
    expect(parseReceiptFromResponse({ error: "boom" })).toBeNull();
    expect(parseReceiptFromResponse(null)).toBeNull();
  });
});
