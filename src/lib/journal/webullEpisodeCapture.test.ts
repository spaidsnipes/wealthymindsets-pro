/**
 * "Journal this trade" for a Webull round trip (Supermax §8). Built from
 * fixture history — no Webull API is called; nothing is placed or saved here.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { readWebullHistory, reconstructEpisodes } from "@/lib/broker/webullLedger";
import { journalCaptureFromWebullEpisode, webullEpisodeJournalable, webullHistorySource } from "./webullEpisodeCapture";

const o = (id: string, side: string, price: string, at: string, fees: unknown = [{ actual_value: "0.05" }]) => ({ client_order_id: id, orders: [{ order_id: id, symbol: "TSLA", side, status: "FILLED", filled_quantity: "1", filled_price: price, filled_time_at: at, legs: [{ option_type: "CALL", option_expire_date: "2026-10-02", strike_price: "390", option_contract_multiplier: "100" }], ...(fees === undefined ? {} : { fees }) }] });
const NOW = Date.parse("2026-10-02T20:00:00Z");
const AS_OF = "2026-10-10T06:10:00.000Z";
const closed = () => reconstructEpisodes(readWebullHistory([o("A1", "BUY", "0.13", "2026-10-01T14:10:47Z"), o("B2", "SELL", "0.18", "2026-10-01T14:12:46Z")], "OS5B"), NOW)[0]!;
const read = (p: string) => readFileSync(path.join(process.cwd(), "src", p), "utf8");

describe("journalCaptureFromWebullEpisode", () => {
  it("Webull's stated facts wear BROKER-REPORTED with 'Webull history · as of <time>'; averages and P&L are DERIVED; the plan is UNREPORTED", () => {
    const e = closed();
    const d = journalCaptureFromWebullEpisode(e, AS_OF, 1_000)!;
    const src = webullHistorySource(AS_OF);
    expect(src).toBe("Webull history · as of Oct 10, 2026, 2:10 AM EDT");
    expect(d).toMatchObject({ kind: "WM_FILL_CAPTURE", version: 1, capturedAtMs: 1_000 });
    expect(d.broker).toEqual({ value: "Webull", provenance: "BROKER-REPORTED", source: src });
    expect(d.orderId).toEqual({ value: "A1", provenance: "BROKER-REPORTED", source: src });
    expect(d.contract).toMatchObject({ value: e.instrumentKey, provenance: "BROKER-REPORTED" });
    expect(d.action).toMatchObject({ value: "Buy to Open", provenance: "BROKER-REPORTED" });
    expect(d.account).toMatchObject({ value: "…OS5B", provenance: "BROKER-REPORTED" });
    expect(d.filledQty).toMatchObject({ value: 1, provenance: "BROKER-REPORTED" });
    expect(d.fees).toMatchObject({ value: e.fees, provenance: "BROKER-REPORTED" });
    expect(d.fillPx).toMatchObject({ value: e.avgEntry, provenance: "DERIVED" });
    expect(d.exitPx).toMatchObject({ value: e.avgExit, provenance: "DERIVED" });
    expect(d.pnlUsd).toMatchObject({ value: e.net, provenance: "DERIVED" });
    expect(String((d.pnlUsd as { source: string }).source)).toContain(src);
    for (const k of ["decisionId", "stopPx", "targetPx", "plannedRiskUsd", "realizedR", "quoteBid", "quoteAsk"] as const) expect((d as unknown as Record<string, { provenance: string }>)[k].provenance, k).toBe("UNREPORTED");
  });

  it("fees Webull did not state are UNREPORTED (never $0), and the P&L says it is BEFORE fees", () => {
    // The ledger marks fills Webull stated no fee on (feesUnreportedFills); the capture must carry that through.
    const e = { ...closed(), feesUnreportedFills: 2 };
    const d = journalCaptureFromWebullEpisode(e, AS_OF, 1)!;
    expect(d.fees).toMatchObject({ value: null, provenance: "UNREPORTED" });
    expect(String((d.fees as { source: string }).source)).toMatch(/never \$0/);
    expect(String((d.pnlUsd as { source: string }).source)).toMatch(/BEFORE fees/);
  });

  it("an episode still open is not offered", () => {
    const open = reconstructEpisodes(readWebullHistory([o("A1", "BUY", "0.13", "2026-10-01T14:10:47Z")], "OS5B"), NOW)[0]!;
    expect(webullEpisodeJournalable(open)).toBe(false);
    expect(journalCaptureFromWebullEpisode(open, AS_OF, 1)).toBeNull();
    expect(webullEpisodeJournalable(closed())).toBe(true);
  });
});

describe("the button", () => {
  it("hands the draft over through the same hand-off the ticket uses, then opens the Journal's form — it saves nothing itself", () => {
    const ledger = read("components/journal/WebullLifetimeLedger.tsx");
    expect(ledger.length).toBeGreaterThan(5000);
    const fn = ledger.slice(ledger.indexOf("const journalThis = () => {"), ledger.indexOf("return (", ledger.indexOf("const journalThis = () => {")));
    expect(fn).toContain("journalCaptureFromWebullEpisode(e, asOf ?? new Date().toISOString(), Date.now())");
    expect(fn).toContain("offerJournalCapture(window.localStorage, draft, Date.now())");
    expect(fn).toContain("window.location.assign(JOURNAL_CAPTURE_URL)");
    expect(fn).not.toMatch(/fetch\(|saveJournal|writeJournal|persist\(/);
    expect(ledger).toContain("{webullEpisodeJournalable(e) ? (");
    expect(ledger).toContain('data-testid="ledger-journal-this"');
  });

  it("the owner is pure: no request, no storage, nothing placed", () => {
    const src = read("lib/journal/webullEpisodeCapture.ts").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
    expect(src.length).toBeGreaterThan(1500);
    expect(src).not.toMatch(/fetch\(|localStorage|setItem|place_|submit|preview/i);
  });
});
