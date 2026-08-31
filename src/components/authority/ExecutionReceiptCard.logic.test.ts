/**
 * ExecutionReceiptCard — pure-logic tests.
 *
 * The card itself is presentation, and this repo has no DOM render harness
 * (no testing-library / jsdom), so we test the two pure decisions the card
 * makes: (1) tone -> Pill semantic state, and (2) which view model it resolves
 * from whichever input the caller supplied. The heavy lifting (parsing +
 * formatting) is covered by executionReceiptView's own suite.
 *
 * The canon guarantee under test: the card never manufactures an authority the
 * receipt does not carry — a receipt-less body resolves to `null` (the honest
 * "no receipt" state), and a DENIED receipt never resolves to a positive tone.
 */

import { describe, it, expect } from "vitest";
import { toneToPillState, resolveView } from "./ExecutionReceiptCard";
import { buildExecutionReceipt } from "../../lib/authority/executionReceipt";
import { authorizeExecution } from "../../lib/authority/executionAuthority";

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

describe("toneToPillState — honest tone maps to a semantic pill state", () => {
  it("positive -> confirmed, warning/danger/neutral pass through", () => {
    expect(toneToPillState("positive")).toBe("confirmed");
    expect(toneToPillState("warning")).toBe("warning");
    expect(toneToPillState("danger")).toBe("danger");
    expect(toneToPillState("neutral")).toBe("neutral");
  });
});

describe("resolveView — one view model, never an invented verdict", () => {
  it("resolves an EXECUTED view from a typed receipt", () => {
    const view = resolveView({
      receipt: receiptWith({ brokerAck: { brokerOrderId: "BRK-1", status: "accepted" } }),
    });
    expect(view?.receipt.result).toBe("EXECUTED");
    expect(view?.tone).toBe("positive");
  });

  it("resolves a receipt-less / malformed body to null (honest 'no receipt')", () => {
    expect(resolveView({ responseBody: { error: "boom" } })).toBeNull();
    expect(resolveView({ responseBody: null })).toBeNull();
    expect(resolveView({})).toBeNull();
  });

  it("a DENIED model-sourced receipt never resolves to a positive tone", () => {
    const view = resolveView({ receipt: receiptWith({ source: "model" }) });
    expect(view?.tone).toBe("warning");
    expect(view?.line).not.toMatch(/broker/i);
  });

  it("prefers the typed receipt over a response body when both are supplied", () => {
    const view = resolveView({
      receipt: receiptWith({ brokerAck: { brokerOrderId: "BRK-1", status: "accepted" } }),
      responseBody: { error: "ignored" },
    });
    expect(view?.receipt.result).toBe("EXECUTED");
  });
});
