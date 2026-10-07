import { describe, expect, it } from "vitest";

import { readTastytradeFills } from "@/lib/broker/tastytradeFills";
import { readTastytradeOrder } from "@/lib/broker/tastytradeOrderState";
import { journalReviewKey, reviewEvidenceFromCapture } from "./captureReviewEvidence";
import { journalCaptureFromFill } from "./journalCaptureFromFill";
import { REVIEW_DIMENSIONS } from "./storyReview";

const order = readTastytradeOrder({ id: 7, status: "Filled", "order-type": "Market", "external-identifier": "wmo_x", legs: [{ symbol: "AAPL", action: "Sell to Open", quantity: 10, "remaining-quantity": 0 }] })!;
const fills = readTastytradeFills([{ id: 1, "transaction-type": "Trade", "order-id": 7, symbol: "AAPL", action: "Sell to Open", quantity: "10", price: "199.90", value: "1999", "value-effect": "Credit", commission: "0", "regulatory-fees": "0.05", "executed-at": "2026-10-07T14:00:00Z" }]);
const r = journalCaptureFromFill({
  intent: { decisionId: "wmd_s1", broker: "tastytrade", accountTail: "1234", instrumentType: "Equity", action: "Sell to Open", qty: 10, quote: { bid: 200, ask: 200.02, atMs: null }, multiplier: 1, protectiveStopPx: 201 },
  order, fills, brokerAccountTail: "1234", nowMs: 0,
});
if (!r.ok) throw new Error(r.reason);

describe("review evidence — each captured fact sits under the one dimension it informs", () => {
  const ev = reviewEvidenceFromCapture(r.draft);

  it("covers all ten dimensions; DISCIPLINE and MANAGEMENT carry no machine facts", () => {
    expect(Object.keys(ev).sort()).toEqual([...REVIEW_DIMENSIONS].sort());
    expect(ev.DISCIPLINE).toEqual([]);
    expect(ev.MANAGEMENT).toEqual([]);
  });

  it("slippage is under SLIPPAGE (sold 0.10 under the bid), result stays unreported (open short)", () => {
    expect(ev.SLIPPAGE[0]).toEqual({ label: "vs touch", text: "0.1", provenance: "DERIVED" });
    expect(ev.RESULT.find(l => l.label === "P&L")).toEqual({ label: "P&L", text: "unreported", provenance: "UNREPORTED" });
    expect(ev.RESULT.find(l => l.label === "Fees")).toMatchObject({ text: "0.05", provenance: "BROKER-REPORTED" });
    expect(ev.READ[0].provenance).toBe("UNREPORTED");
    expect(ev.EXECUTION.find(l => l.label === "Fill")).toMatchObject({ text: "199.9", provenance: "BROKER-REPORTED" });
  });

  it("no capture → every dimension empty", () => {
    const none = reviewEvidenceFromCapture(null);
    expect(REVIEW_DIMENSIONS.every(d => none[d].length === 0)).toBe(true);
  });

  it("a captured entry shares BrokerTruthToday's story key, so there is one review per decision", () => {
    expect(journalReviewKey({ id: "e1", capture: r.draft })).toBe("tastytrade|1234|wmd_s1");
    expect(journalReviewKey({ id: "e1" })).toBe("journal|e1");
  });
});
