import { describe, expect, it } from "vitest";

import { readTastytradeFills } from "@/lib/broker/tastytradeFills";
import { readTastytradeOrder } from "@/lib/broker/tastytradeOrderState";
import { selectJournalSaveMoney } from "./computePnl";
import { captureToJournalForm, journalCaptureFromFill, readJournalCapture, type FillCaptureIntent } from "./journalCaptureFromFill";
import { JOURNAL_CAPTURE_HANDOFF_KEY, JOURNAL_CAPTURE_HANDOFF_TTL_MS, offerJournalCapture, takeJournalCapture } from "./journalCaptureHandoff";
import { hydrateJournalEntry } from "./hydrateJournalEntries";

/* ── FIXTURE: a tastytrade order readback + its trade transaction, in tastytrade's own field names. ── */
const RAW_ORDER = {
  id: 418_220_331,
  status: "Filled",
  "order-type": "Limit",
  price: "21480.25",
  "external-identifier": "wmo_3f9a1c2b7d8e4f60a1b2c3d4",
  "updated-at": "2026-10-07T14:31:05.120Z",
  legs: [{ symbol: "/MNQZ6", action: "Buy to Open", quantity: 2, "remaining-quantity": 0 }],
};
const RAW_FILLS = [
  { id: 9001, "transaction-type": "Trade", "order-id": 418_220_331, symbol: "/MNQZ6", "instrument-type": "Future", action: "Buy to Open", quantity: "1", price: "21480.0", value: "0", "value-effect": "None", commission: "0.35", "clearing-fees": "0.19", "regulatory-fees": "0.02", "executed-at": "2026-10-07T14:31:04.900Z" },
  { id: 9002, "transaction-type": "Trade", "order-id": 418_220_331, symbol: "/MNQZ6", "instrument-type": "Future", action: "Buy to Open", quantity: "1", price: "21480.5", value: "0", "value-effect": "None", commission: "0.35", "clearing-fees": "0.19", "regulatory-fees": "0.02", "executed-at": "2026-10-07T14:31:05.000Z" },
  // Someone else's fill in the same account — never read into this order's story.
  { id: 9100, "transaction-type": "Trade", "order-id": 1, symbol: "/ESZ6", "instrument-type": "Future", action: "Sell to Open", quantity: "1", price: "6000", value: "0", "value-effect": "None", commission: "9", "executed-at": "2026-10-07T13:00:00Z" },
];

const order = readTastytradeOrder(RAW_ORDER)!;
const fills = readTastytradeFills(RAW_FILLS);

const INTENT: FillCaptureIntent = {
  decisionId: "wmd_abc123",
  orderIntentId: "wmi_proposal_77",
  view: "Long above the overnight high",
  broker: "tastytrade",
  environment: "production",
  accountTail: "5678",
  instrumentType: "Future",
  chartSymbol: "MNQ1!",
  action: "Buy to Open",
  qty: 2,
  orderType: "Limit",
  limitPx: 21480.25,
  protectiveStopPx: 21470,
  targetPx: 21510,
  quote: { bid: 21479.75, ask: 21480.0, atMs: Date.parse("2026-10-07T14:31:03.000Z") },
  sentAtMs: Date.parse("2026-10-07T14:31:03.400Z"),
  multiplier: 2,
};
const NOW = Date.parse("2026-10-07T14:32:00Z");

describe("journalCaptureFromFill — a broker-confirmed fill becomes a provenance-labelled draft", () => {
  const r = journalCaptureFromFill({ intent: INTENT, order, fills, brokerAccountTail: "5678", nowMs: NOW });
  if (!r.ok) throw new Error(r.reason);
  const d = r.draft;

  it("labels ticket intent, broker reports and derived numbers separately", () => {
    expect(d.decisionId).toMatchObject({ value: "wmd_abc123", provenance: "TICKET-INTENT" });
    expect(d.orderIntentId).toMatchObject({ value: "wmi_proposal_77", provenance: "TICKET-INTENT" });
    expect(d.view).toMatchObject({ value: "Long above the overnight high", provenance: "TICKET-INTENT" });
    expect(d.orderId).toMatchObject({ value: "418220331", provenance: "BROKER-REPORTED" });
    expect(d.clientOrderId).toMatchObject({ value: "wmo_3f9a1c2b7d8e4f60a1b2c3d4", provenance: "BROKER-REPORTED" });
    expect(d.contract).toMatchObject({ value: "/MNQZ6", provenance: "BROKER-REPORTED" });
    expect(d.datedContract).toMatchObject({ value: "/MNQZ6 · DEC 2026", provenance: "DERIVED" });
    expect(d.account).toMatchObject({ value: "…5678", provenance: "BROKER-REPORTED" });
    expect(d.filledQty).toMatchObject({ value: 2, provenance: "BROKER-REPORTED" });
    expect(d.limitPx).toMatchObject({ value: 21480.25, provenance: "BROKER-REPORTED" });
  });

  it("averages two broker fills by quantity (DERIVED), sums fees (BROKER-REPORTED), ignores other orders' fills", () => {
    expect(d.fillPx).toMatchObject({ value: 21480.25, provenance: "DERIVED" });
    expect(d.fees).toMatchObject({ value: 1.12, provenance: "BROKER-REPORTED" });
    expect(d.filledAt).toMatchObject({ value: "2026-10-07T14:31:04.900Z", provenance: "BROKER-REPORTED" });
  });

  it("derives spread, quote age, slippage vs the touch and planned 1R only from reported inputs", () => {
    expect(d.quoteBid.provenance).toBe("TICKET-INTENT");
    expect(d.spread).toMatchObject({ value: 0.25, provenance: "DERIVED" });
    expect(d.quoteAgeAtSendMs).toMatchObject({ value: 400, provenance: "DERIVED" });
    // Bought at 21480.25 against an ask of 21480.00: a quarter point worse than the touch.
    expect(d.slippage).toMatchObject({ value: 0.25, provenance: "DERIVED" });
    expect(d.slippageUsd).toMatchObject({ value: 1, provenance: "DERIVED" });
    expect(d.stopPx).toMatchObject({ value: 21470, provenance: "TICKET-INTENT" });
    expect(d.targetPx).toMatchObject({ value: 21510, provenance: "TICKET-INTENT" });
    expect(d.plannedRiskUsd).toMatchObject({ value: 41, provenance: "DERIVED" });
  });

  it("an open position has NO result: P&L and R are UNREPORTED (null), never 0", () => {
    expect(d.pnlUsd.value).toBeNull();
    expect(d.pnlUsd.provenance).toBe("UNREPORTED");
    expect(d.realizedR.value).toBeNull();
  });

  it("refuses anything tastytrade has not read back as FILLED", () => {
    const working = readTastytradeOrder({ ...RAW_ORDER, status: "Live", legs: [{ ...RAW_ORDER.legs[0], "remaining-quantity": 2 }] })!;
    const no = journalCaptureFromFill({ intent: INTENT, order: working, fills, nowMs: NOW });
    expect(no.ok).toBe(false);
  });

  it("without broker transactions: fill price and fees stay UNREPORTED — the limit is never passed off as the fill", () => {
    const bare = journalCaptureFromFill({ intent: { ...INTENT, quote: null, protectiveStopPx: null, orderIntentId: null }, order, fills: [], nowMs: NOW });
    if (!bare.ok) throw new Error(bare.reason);
    const b = bare.draft;
    expect(b.fillPx).toMatchObject({ value: null, provenance: "UNREPORTED" });
    expect(b.fees).toMatchObject({ value: null, provenance: "UNREPORTED" });
    expect(b.filledAt.value).toBeNull();
    expect(b.slippage.value).toBeNull();
    expect(b.spread.value).toBeNull();
    expect(b.plannedRiskUsd.value).toBeNull();
    expect(b.orderIntentId.provenance).toBe("UNREPORTED");
    expect(b.account).toMatchObject({ value: "…5678", provenance: "TICKET-INTENT" });
    // Every UNREPORTED field is null; every reported one has a value.
    for (const [, f] of Object.entries(b).filter(([k]) => !["kind", "version", "capturedAtMs"].includes(k))) {
      const cf = f as { value: unknown; provenance: string };
      expect(cf.provenance === "UNREPORTED").toBe(cf.value === null);
    }
  });

  it("a closing fill with tastytrade's round-trip result carries P&L (BROKER-REPORTED) and no planned risk of its own", () => {
    const closeOrder = readTastytradeOrder({ ...RAW_ORDER, legs: [{ symbol: "/MNQZ6", action: "Sell to Close", quantity: 2, "remaining-quantity": 0 }] })!;
    const c = journalCaptureFromFill({ intent: { ...INTENT, action: "Sell to Close" }, order: closeOrder, fills, brokerResult: { net: 58.88, fees: 2.24, closedAt: null }, nowMs: NOW });
    if (!c.ok) throw new Error(c.reason);
    expect(c.draft.pnlUsd).toMatchObject({ value: 58.88, provenance: "BROKER-REPORTED" });
    expect(c.draft.plannedRiskUsd.value).toBeNull();
    expect(c.draft.realizedR.value).toBeNull();
  });
});

describe("the draft → the Journal's form, and back from storage", () => {
  const r = journalCaptureFromFill({ intent: INTENT, order, fills, brokerAccountTail: "5678", nowMs: NOW });
  if (!r.ok) throw new Error(r.reason);
  const dayKey = (x: Date) => x.toISOString().slice(0, 10);

  it("prefills symbol / side / entry / size / date / planned R — never exit or P&L", () => {
    const f = captureToJournalForm(r.draft, dayKey);
    expect(f).toMatchObject({ symbol: "MNQ1!", side: "long", entry: 21480.25, size: 2, date: "2026-10-07", plannedRDollars: 41 });
    expect("exit" in f).toBe(false);
    expect("pnl" in f).toBe(false);
  });

  it("the Journal's save gate refuses the prefilled draft until the trader writes an exit — never a breakeven", () => {
    const f = captureToJournalForm(r.draft, dayKey);
    const money = selectJournalSaveMoney({ entry: f.entry ?? 0, exit: 0, size: f.size ?? 0, side: f.side ?? "long", symbol: f.symbol, contractType: f.contractType, plannedRDollars: f.plannedRDollars, isNoTradeDay: false });
    expect(money.status).toBe("REFUSED");
  });

  it("a stored capture survives hydration; a tampered provenance degrades to UNREPORTED", () => {
    const stored = JSON.parse(JSON.stringify(r.draft));
    stored.fees = { value: 0, provenance: "MADE-UP", source: "x" };
    const back = readJournalCapture(stored)!;
    expect(back.fees).toMatchObject({ value: null, provenance: "UNREPORTED" });
    expect(back.fillPx).toEqual(r.draft.fillPx);
    expect(readJournalCapture({ kind: "OTHER" })).toBeNull();

    const entry = hydrateJournalEntry({ id: "a", date: "2026-10-07", symbol: "MNQ1!", side: "long", entry: 21480.25, exit: 21500, size: 2, pnl: 79, capture: r.draft });
    expect(entry?.capture?.decisionId.value).toBe("wmd_abc123");
    const plain = hydrateJournalEntry({ id: "b", date: "2026-10-07", symbol: "ES", side: "long", entry: 1, exit: 2, size: 1, pnl: 1 });
    expect(plain && "capture" in plain).toBe(false);
  });

  it("the hand-off is read once and expires", () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
    expect(offerJournalCapture(storage, r.draft, NOW)).toBe(true);
    expect(takeJournalCapture(storage, NOW + 1000)?.orderId.value).toBe("418220331");
    expect(mem.has(JOURNAL_CAPTURE_HANDOFF_KEY)).toBe(false);
    expect(takeJournalCapture(storage, NOW + 2000)).toBeNull();
    offerJournalCapture(storage, r.draft, NOW);
    expect(takeJournalCapture(storage, NOW + JOURNAL_CAPTURE_HANDOFF_TTL_MS + 1)).toBeNull();
  });
});
