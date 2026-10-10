/** "Journal this trade" for an imported round trip. Every fill here is synthetic. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { captureToJournalForm, readJournalCapture } from "./journalCaptureFromFill";
import { importedRoundTrips, importedTripLine, journalCaptureFromImportedTrip } from "./importedRoundTrip";
import { importPropFills, type PropFillsImport } from "./propFillsImport";

const src = (p: string) => readFileSync(path.resolve(process.cwd(), "src", p), "utf8");
it("the scanned sources are not empty", () => {
  expect(src("components/journal/PropFillsImportPanel.tsx").length).toBeGreaterThan(2000);
  expect(src("lib/journal/importedRoundTrip.ts").length).toBeGreaterThan(2000);
});

const file = (rows: string[], comm = false) => {
  const head = comm ? "Timestamp,Contract,B/S,Quantity,Price,Commission,Fill ID,Order ID" : "Timestamp,Contract,B/S,Quantity,Price,Fill ID,Order ID";
  const r = importPropFills([head, ...rows].join("\n"), { fileName: "sample.csv", nowMs: Date.UTC(2026, 0, 8), wallClockZone: "America/New_York" });
  if (!r.ok) throw new Error(r.reason);
  return r as PropFillsImport;
};

describe("round trips from a fills file", () => {
  it("flat → open → flat, FIFO; scaling in counts as one trip; open-at-end is not a trip", () => {
    const imp = file([
      "01/05/2026 09:31:00,MNQH6,Buy,1,21000,F1,O1",
      "01/05/2026 09:32:00,MNQH6,Buy,1,21010,F2,O2",
      "01/05/2026 09:40:00,MNQH6,Sell,2,21030,F3,O3",
      "01/05/2026 10:00:00,MNQH6,Sell,1,21050,F4,O4",
      "01/05/2026 10:05:00,MNQH6,Buy,1,21040,F5,O5",
      "01/05/2026 11:00:00,MNQH6,Buy,1,21000,F6,O6",
    ]);
    const trips = importedRoundTrips(imp);
    expect(trips).toHaveLength(2);
    expect(trips[0]).toMatchObject({ side: "LONG", qty: 2, avgOpen: 21005, avgClose: 21030, fills: 3, grossUsd: 100, feesUsd: null, netUsd: null, orderIds: ["O1", "O2", "O3"] });
    expect(trips[1]).toMatchObject({ side: "SHORT", qty: 1, avgOpen: 21050, avgClose: 21040, grossUsd: 20 });
    expect(importedTripLine(trips[0]!)).toBe("LONG 2 MNQH6 · 21005 → 21030 · +$100.00 before commissions (UNREPORTED in the file)");
  });
  it("a fill that flips through flat ends one trip and opens the next; commissions reported → net", () => {
    const imp = file([
      "01/05/2026 09:31:00,MNQH6,Buy,1,21000,1.00,F1,O1",
      "01/05/2026 09:40:00,MNQH6,Sell,3,21020,3.00,F2,O2",
      "01/05/2026 09:50:00,MNQH6,Buy,2,21010,2.00,F3,O3",
    ], true);
    const trips = importedRoundTrips(imp);
    expect(trips.map(t => [t.side, t.qty, t.grossUsd])).toEqual([["LONG", 1, 40], ["SHORT", 2, 40]]);
    expect(trips[0]!.feesUsd).toBe(4);
    expect(trips[0]!.netUsd).toBe(36);
    expect(importedTripLine(trips[0]!)).toBe("LONG 1 MNQH6 · 21000 → 21020 · +$36.00 net");
  });
});

describe("the trip as a Journal draft — the same hand-off and save gate as a live fill", () => {
  const imp = file(["01/05/2026 09:31:00,MNQH6,Sell,1,21050,F1,O1", "01/05/2026 09:40:00,MNQH6,Buy,1,21040,F2,O2"]);
  const t = importedRoundTrips(imp)[0]!;
  const draft = journalCaptureFromImportedTrip(t, imp.provenance, 1_000);
  it("facts wear IMPORTED-FILE with the file named; computed prices DERIVED; the plan UNREPORTED; never BROKER-REPORTED", () => {
    expect(draft.contract).toEqual({ value: "MNQH6", provenance: "IMPORTED-FILE", source: imp.provenance });
    expect(draft.fillPx).toMatchObject({ value: 21050, provenance: "DERIVED" });
    expect(draft.exitPx).toMatchObject({ value: 21040, provenance: "DERIVED" });
    expect(draft.pnlUsd.provenance).toBe("DERIVED");
    expect(draft.pnlUsd.source).toMatch(/BEFORE commissions/);
    for (const k of ["decisionId", "stopPx", "targetPx", "plannedRiskUsd", "realizedR", "quoteBid"] as const) expect(draft[k].provenance).toBe("UNREPORTED");
    expect(JSON.stringify(draft)).not.toContain("BROKER-REPORTED");
    expect(JSON.stringify(draft)).not.toContain("TICKET-INTENT");
  });
  it("survives the hand-off reader and fills the form with both sides; the trader still saves", () => {
    const back = readJournalCapture(JSON.parse(JSON.stringify(draft)))!;
    expect(back.exitPx).toMatchObject({ value: 21040, provenance: "DERIVED" });
    expect(back.orderId.value).toBe("O1");
    const form = captureToJournalForm(back, d => d.toISOString().slice(0, 10));
    expect(form).toMatchObject({ symbol: "MNQH6", side: "short", entry: 21050, exit: 21040, size: 1, date: "2026-01-05" });
  });
  it("a live capture (no exitPx) still reads and never gets an exit prefilled", () => {
    const { exitPx: _x, ...live } = draft; void _x;
    const back = readJournalCapture(JSON.parse(JSON.stringify(live)))!;
    expect(back.exitPx).toBeUndefined();
    expect(captureToJournalForm(back, d => d.toISOString().slice(0, 10)).exit).toBeUndefined();
  });
  it("source: the panel uses the one hand-off, writes nothing in a scene or the sample, saves nothing itself", () => {
    const panel = src("components/journal/PropFillsImportPanel.tsx");
    expect(panel).toContain("if (!r || !r.ok || sampleFile || proofSceneHoldsWrites()) return;");
    expect(panel).toContain("offerJournalCapture(window.localStorage, journalCaptureFromImportedTrip(t, r.imp.provenance, Date.now()), Date.now())");
    expect(panel).toContain("window.location.assign(JOURNAL_CAPTURE_URL)");
    expect(panel).not.toMatch(/writeJournalStorage|wm_journal_entries|fetch\(/);
  });
});
