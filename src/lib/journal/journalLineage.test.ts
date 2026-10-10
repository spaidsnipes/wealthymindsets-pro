/**
 * JOURNAL LINEAGE — regression (order §, 2026-10-10). One Decision_ID from the ticket to the Journal:
 *
 *   A. a sent order's Decision_ID: ticket at send (kept under the idempotency key) → tastytrade echoes
 *      that key → the fill capture carries the Decision_ID as TICKET-INTENT → it survives storage;
 *   B. the server's own record (orderDecisionLedger) answers the same Decision_ID by broker + key, and the
 *      journal feed tags broker executions with it — an order WM did not send carries null, never a guess;
 *   C. an imported execution keeps its SOURCE (IMPORTED-FILE + the file it came from) and says plainly
 *      that no Decision_ID was recorded — never a fabricated one.
 * Pure; nothing is fetched or sent.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { readTastytradeFills } from "@/lib/broker/tastytradeFills";
import { readTastytradeOrder } from "@/lib/broker/tastytradeOrderState";
import { getOrderDecision, putOrderDecision } from "@/lib/broker/orderDecisionLedger";
import type { WebullKvNamespace } from "@/lib/marketData/webullKvTokenStore";

import { journalCaptureFromFill, readJournalCapture, type FillCaptureIntent } from "./journalCaptureFromFill";
import { journalCaptureFromImportedTrip, type ImportedRoundTrip } from "./importedRoundTrip";
import { rememberTicketAtSend, ticketForOrder } from "./ticketAtSendStore";

const KEY = "wmo3f9a1c2b7d8e4f60a1b2c3d4";
const DECISION = "wmd_lineage_42";
const NOW = Date.parse("2026-10-07T14:32:00Z");

const mem = (): Storage => {
  const m = new Map<string, string>();
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); }, clear: () => m.clear(), key: i => [...m.keys()][i] ?? null, get length() { return m.size; } } as Storage;
};

const INTENT: FillCaptureIntent = {
  decisionId: DECISION, orderIntentId: null, view: null, broker: "tastytrade", environment: "production", accountTail: "5678",
  instrumentType: "Future", chartSymbol: "MNQ1!", action: "Buy to Open", qty: 1, orderType: "Limit", limitPx: 21480.25,
  protectiveStopPx: 21470, targetPx: 21510, quote: null, sentAtMs: NOW - 60_000, multiplier: 2,
};

describe("A. a sent order's Decision_ID flows to the Journal capture", () => {
  it("ticket at send → broker echo of the key → capture → storage round trip", () => {
    const storage = mem();
    rememberTicketAtSend(storage, KEY, INTENT, NOW - 60_000, null);
    const ticket = ticketForOrder(storage, KEY, NOW);
    expect(ticket?.decisionId).toBe(DECISION);
    const order = readTastytradeOrder({ id: 1, status: "Filled", "order-type": "Limit", price: "21480.25", "external-identifier": KEY, "updated-at": "2026-10-07T14:31:05Z", legs: [{ symbol: "/MNQZ6", action: "Buy to Open", quantity: 1, "remaining-quantity": 0 }] })!;
    const fills = readTastytradeFills([{ id: 7, "transaction-type": "Trade", "order-id": 1, symbol: "/MNQZ6", "instrument-type": "Future", action: "Buy to Open", quantity: "1", price: "21480.25", value: "0", "value-effect": "None", commission: "0.35", "executed-at": "2026-10-07T14:31:05Z" }]);
    const r = journalCaptureFromFill({ intent: ticket!, order, fills, brokerAccountTail: "5678", nowMs: NOW });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.draft.decisionId).toMatchObject({ value: DECISION, provenance: "TICKET-INTENT" });
    expect(r.draft.clientOrderId).toMatchObject({ value: KEY, provenance: "BROKER-REPORTED" });
    const back = readJournalCapture(JSON.parse(JSON.stringify(r.draft)));
    expect(back?.decisionId).toMatchObject({ value: DECISION, provenance: "TICKET-INTENT" });
    expect(back?.clientOrderId.value).toBe(KEY);
  });
  it("the live ticket stamps the decision on what it remembers and on the one send", () => {
    const t = readFileSync(path.join(process.cwd(), "src/components/chart/TastytradeLiveOrder.tsx"), "utf8");
    expect(t.length).toBeGreaterThan(5000);
    expect(t).toMatch(/sentTicketRef\.current = \{\s*decisionId: ensureDecision\(\)/);
    expect(t).toMatch(/JSON\.stringify\(\{ \.\.\.body\(\), decisionId, clientOrderId: keyRef\.current, confirmLive: true \}\)/);
  });
});

describe("B. the server's record and the journal feed carry the same Decision_ID", () => {
  const kvOf = (): WebullKvNamespace => { const m = new Map<string, string>(); return { get: async k => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); } }; };
  it("orderDecisionLedger answers by broker + idempotency key; another key or broker is null", async () => {
    const kv = kvOf();
    await putOrderDecision(kv, { broker: "tastytrade", clientOrderId: KEY, decisionId: DECISION, instrumentType: "Future", symbol: "/MNQZ6", action: "Buy to Open", qty: 1, limitPx: 21480.25, accountTail: "5678", sentAtMs: NOW });
    expect((await getOrderDecision(kv, "tastytrade", KEY))?.decisionId).toBe(DECISION);
    expect(await getOrderDecision(kv, "tastytrade", "someotherkey1")).toBeNull();
    expect(await getOrderDecision(kv, "webull", KEY)).toBeNull();
  });
  it("the journal feed tags broker executions with the linked decision, else null — both brokers", () => {
    const feed = readFileSync(path.join(process.cwd(), "src/app/api/broker/journal-feed/route.ts"), "utf8");
    expect(feed.length).toBeGreaterThan(1000);
    expect(feed).toContain("orders.push({ ...o, decisionId: link?.decisionId ?? null, sentFromWm: !!link })");
    expect(feed).toContain("fills.push({ ...f, decisionId: link?.decisionId ?? null, sentFromWm: !!link })");
  });
});

describe("C. an imported execution keeps its source and never invents a Decision_ID", () => {
  const trip: ImportedRoundTrip = { id: "f1", account: "Apex-123", symbol: "MNQZ6", side: "LONG", qty: 1, openedAt: "2026-10-07T14:00:00Z", closedAt: "2026-10-07T14:20:00Z", avgOpen: 21480, avgClose: 21490, fills: 2, grossUsd: 20, feesUsd: 1.1, netUsd: 18.9, orderIds: ["o-9"] };
  it("source is IMPORTED-FILE with the file named; Decision_ID is UNREPORTED with the reason — and both survive storage", () => {
    const d = journalCaptureFromImportedTrip(trip, "Tradovate fills CSV (apex-oct.csv)", NOW);
    expect(d.broker).toMatchObject({ value: "imported file", provenance: "IMPORTED-FILE", source: "Tradovate fills CSV (apex-oct.csv)" });
    expect(d.account).toMatchObject({ value: "Apex-123", provenance: "IMPORTED-FILE" });
    expect(d.decisionId).toMatchObject({ value: null, provenance: "UNREPORTED" });
    expect(d.decisionId.source).toMatch(/no decision was recorded/);
    const back = readJournalCapture(JSON.parse(JSON.stringify(d)));
    expect(back?.broker).toMatchObject({ provenance: "IMPORTED-FILE", source: "Tradovate fills CSV (apex-oct.csv)" });
    expect(back?.decisionId.value).toBeNull();
  });
});
