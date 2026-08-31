import { describe, it, expect } from "vitest";
import {
  executionReceiptView,
  executionReceiptViewFromResponse,
  executionReceiptViewFromValue,
} from "./executionReceiptView";
import { buildExecutionReceipt } from "./executionReceipt";
import { authorizeExecution } from "./executionAuthority";

function receiptWith(over: {
  source?: "human" | "model";
  brokerAck?: { brokerOrderId: string; status: "accepted" | "rejected" } | null;
}) {
  const source = over.source ?? "human";
  const decision = authorizeExecution({
    intent: { symbol: "TSLA", side: "buy", qty: 1 },
    source,
    env: "paper",
    rightOfWay: source === "human" ? "ACTION" : null,
    humanApproval: null,
  });
  return buildExecutionReceipt({
    receiptId: "alpaca:BRK-1",
    createdAtIso: "2026-08-31T00:00:00.000Z",
    product: "wm-pro",
    decision,
    source,
    env: "paper",
    intentSummary: { symbol: "TSLA", side: "buy", qty: 1 },
    brokerAck: over.brokerAck ?? null,
  });
}

describe("executionReceiptView — one honest surface-ready projection", () => {
  it("EXECUTED view carries line, positive tone, and evidence rows", () => {
    const view = executionReceiptView(
      receiptWith({ brokerAck: { brokerOrderId: "BRK-1", status: "accepted" } }),
    );
    expect(view.line).toBe("EXECUTED — buy 1 TSLA (paper) · broker BRK-1");
    expect(view.tone).toBe("positive");
    expect(view.why.find((r) => r.label === "Result")?.value).toBe("EXECUTED");
  });

  it("DENIED view never claims a broker order and reads as warning", () => {
    const view = executionReceiptView(receiptWith({ source: "model" }));
    expect(view.tone).toBe("warning");
    expect(view.line).not.toMatch(/broker/i);
  });

  it("never leaks a secret in the whole view", () => {
    const view = executionReceiptView(
      receiptWith({ brokerAck: { brokerOrderId: "BRK-1", status: "accepted" } }),
    );
    expect(JSON.stringify(view)).not.toMatch(/secret|token|apiKey|api_key/i);
  });
});

describe("executionReceiptViewFromResponse — from raw order-route JSON", () => {
  it("builds the view from a { ok, receipt } body via JSON round-trip", () => {
    const body = { ok: true, receipt: receiptWith({ brokerAck: { brokerOrderId: "BRK-1", status: "accepted" } }) };
    const wire = JSON.parse(JSON.stringify(body)) as unknown;
    const view = executionReceiptViewFromResponse(wire);
    expect(view?.line).toBe("EXECUTED — buy 1 TSLA (paper) · broker BRK-1");
  });

  it("returns null on a malformed / receipt-less body (never crashes, never invents)", () => {
    expect(executionReceiptViewFromResponse({ error: "boom" })).toBeNull();
    expect(executionReceiptViewFromResponse(null)).toBeNull();
    expect(executionReceiptViewFromValue({ result: "NONSENSE" })).toBeNull();
  });
});
