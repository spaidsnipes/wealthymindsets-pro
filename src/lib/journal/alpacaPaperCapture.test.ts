/** An Alpaca PAPER fill → a Journal draft marked PAPER, kept out of every live result. Synthetic orders only. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ALPACA_PAPER_SOURCE, journalCaptureFromAlpacaPaperOrder } from "./alpacaPaperCapture";
import { captureToJournalForm, readJournalCapture } from "./journalCaptureFromFill";
import { isPaperEntry, liveJournalRecords } from "./paperEntry";

const P = readFileSync(path.resolve(process.cwd(), "src/components/broker/AlpacaTradingPanel.tsx"), "utf8");
it("the scanned source is not empty", () => { expect(P.length).toBeGreaterThan(5000); });

const ord = { id: "9b1e-sample", symbol: "aapl", side: "buy", type: "limit", status: "filled", qty: "10", filled_qty: "10", filled_avg_price: "201.25", limit_price: "201.30", submitted_at: "2026-01-05T14:31:00Z", filled_at: "2026-01-05T14:31:02Z" };

describe("the paper draft", () => {
  it("a FILLED order becomes a draft whose environment is PAPER, from Alpaca's own readback", () => {
    const d = journalCaptureFromAlpacaPaperOrder(ord, 1)!;
    expect(d.environment).toEqual({ value: "PAPER", provenance: "BROKER-REPORTED", source: ALPACA_PAPER_SOURCE });
    expect(d.fillPx.value).toBe(201.25);
    expect(d.filledQty.value).toBe(10);
    expect(d.contract.value).toBe("AAPL");
    expect(d.fees.provenance).toBe("UNREPORTED");
    expect(d.decisionId.provenance).toBe("UNREPORTED");
  });
  it("anything not filled with a price is refused", () => {
    for (const o of [{ ...ord, status: "new" }, { ...ord, filled_avg_price: null }, { ...ord, filled_qty: "0" }, { ...ord, id: "" }]) expect(journalCaptureFromAlpacaPaperOrder(o, 1)).toBeNull();
  });
  it("saved as an entry it is PAPER: the one predicate keeps it out of live results", () => {
    const d = readJournalCapture(JSON.parse(JSON.stringify(journalCaptureFromAlpacaPaperOrder(ord, 1))))!;
    const entry = { id: "j1", symbol: "AAPL", capture: d };
    expect(isPaperEntry(entry)).toBe(true);
    expect(liveJournalRecords([entry, { id: "live" }])).toEqual([{ id: "live" }]);
    expect(captureToJournalForm(d, x => x.toISOString().slice(0, 10))).toMatchObject({ symbol: "AAPL", side: "long", entry: 201.25, size: 10, date: "2026-01-05" });
  });
});

it("source: the panel offers it only on a FILLED order read back, uses the one hand-off, saves nothing, holds in proof scenes", () => {
  expect(P).toContain('{isFilled && ordersLoad !== "failed" ? (');
  expect(P).toContain('data-testid="alpaca-journal-paper"');
  expect(P).toContain("if (typeof window === \"undefined\" || proofSceneHoldsWrites()) return;");
  expect(P).toContain("offerJournalCapture(window.localStorage, draft, Date.now())");
  expect(P).not.toMatch(/writeJournalStorage|wm_journal_entries/);
});
