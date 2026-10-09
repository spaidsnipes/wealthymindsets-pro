/**
 * Prop-account fills from a file the trader exported (Garden 19 Supermax §8).
 * Synthetic files only: the real Tradovate header names are not published, so
 * these cover the alias list, the refusals and the arithmetic — a real export
 * is still owed to certify the names.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { detectPropFillColumns, importPropFills, parseCsvRows, propDailyResults, propDayOf, readPropFillTime, readPropSide, type PropFillsImport } from "./propFillsImport";

const NOW = Date.UTC(2026, 9, 9, 23, 30, 0);               // Oct 9, 2026, 7:30 PM EDT
const open = (text: string, o: Partial<Parameters<typeof importPropFills>[1]> = {}) => importPropFills(text, { fileName: "Fills.csv", nowMs: NOW, wallClockZone: "America/Chicago", ...o });
const must = (r: ReturnType<typeof importPropFills>): PropFillsImport => { if (!r.ok) throw new Error(r.reason); return r; };

const FILE = [
  "Fill ID,Order ID,Account,Contract,Product,B/S,Quantity,Price,Timestamp,commission",
  "f1,o1,EVAL-50K-01,MNQZ6,MNQ,Buy,2,25000.00,10/08/2026 09:31:05,1.04",
  "f2,o2,EVAL-50K-01,MNQZ6,MNQ,Sell,2,25010.50,10/08/2026 09:44:10,1.04",
  "f3,o3,EVAL-50K-01,MNQZ6,MNQ,Sell,1,25020.00,10/09/2026 10:02:00,0.52",
  "f4,o4,EVAL-50K-01,MNQZ6,MNQ,Buy,1,25031.25,10/09/2026 10:15:30,0.52",
].join("\r\n");

describe("the CSV reader", () => {
  it("reads quoted cells, doubled quotes, commas and newlines inside quotes, CRLF and a BOM; blank lines vanish", () => {
    expect(parseCsvRows('\uFEFFa,b,c\r\n"1,5","say ""hi""","two\nlines"\r\n\r\nx,,z\n')).toEqual([["a", "b", "c"], ["1,5", 'say "hi"', "two\nlines"], ["x", "", "z"]]);
  });
});

describe("columns are found by name, never by position", () => {
  it("finds every column under its aliases, in any order and any casing", () => {
    const d = detectPropFillColumns(["_tickSize", "PRICE", "Qty", "Side", "Symbol", "Fill Time", "Fees", "Account", "Order ID", "Fill ID"]);
    expect(d).toEqual({ ok: true, columns: { time: 5, contract: 4, side: 3, qty: 2, price: 1, commission: 6, fillId: 9, orderId: 8, account: 7 } });
  });

  it("a file with a required column missing is refused, naming what is missing and where the right file is", () => {
    const d = detectPropFillColumns(["symbol", "pnl", "buyPrice", "sellPrice", "boughtTimestamp"]);
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.missing).toEqual(["time", "side", "qty", "price"]);
    expect(d.reason).toBe("This file has no column for the fill time, buy or sell, the quantity, the fill price. Export the Fills report (Account Reports › Fills › Download CSV) and open that file.");
    expect(open("symbol,pnl\nMNQZ6,12.5")).toEqual({ ok: false, reason: d.reason.replace("the fill time, buy or sell, the quantity, the fill price", "the fill time, buy or sell, the quantity, the fill price") });
  });
});

describe("cells", () => {
  it("side: the platform's words for buy and sell; anything else is not a side", () => {
    for (const b of ["Buy", " B ", "BOT", "bought"]) expect(readPropSide(b)).toBe("Buy");
    for (const s of ["Sell", "S", "SLD", "sold"]) expect(readPropSide(s)).toBe("Sell");
    for (const x of ["", "Hold", "1", undefined]) expect(readPropSide(x)).toBeNull();
  });

  it("time: a zone in the cell is honoured; a wall-clock time needs the trader's zone and is never guessed", () => {
    expect(readPropFillTime("2026-10-08T14:31:05Z", null)).toBe(Date.UTC(2026, 9, 8, 14, 31, 5));
    expect(readPropFillTime("2026-10-08T09:31:05-05:00", null)).toBe(Date.UTC(2026, 9, 8, 14, 31, 5));
    expect(readPropFillTime("10/08/2026 09:31:05", "America/Chicago")).toBe(Date.UTC(2026, 9, 8, 14, 31, 5));      // CDT, UTC−5
    expect(readPropFillTime("2026-12-08 09:31:05", "America/Chicago")).toBe(Date.UTC(2026, 11, 8, 15, 31, 5));     // CST, UTC−6
    expect(readPropFillTime("10/08/2026 1:05 PM", "America/New_York")).toBe(Date.UTC(2026, 9, 8, 17, 5, 0));
    expect(readPropFillTime("10/08/2026 09:31:05", null)).toBeNull();
    for (const bad of ["", "yesterday", "13/40/2026 09:00", "02/31/2026 09:00", "10/08/2026 25:00", "10/08/2026"]) expect(readPropFillTime(bad, "America/Chicago"), bad).toBeNull();
  });
});

describe("the import", () => {
  it("maps each row to the Journal's fill shape, with its provenance line", () => {
    const r = must(open(FILE));
    expect(r.rowsInFile).toBe(4);
    expect(r.fills).toHaveLength(4);
    expect(r.disclosure).toBeNull();
    expect(r.commissionsReported).toBe(true);
    expect(r.accounts).toEqual(["EVAL-50K-01"]);
    expect(r.provenance).toBe("imported file · Fills.csv · as of Oct 9, 2026, 7:30 PM EDT");
    expect(r.fills[0]).toEqual({
      id: "import:f1", orderId: "o1", symbol: "MNQZ6", instrumentType: "Future", action: "Buy", quantity: 2, price: 25000,
      value: null, fees: 1.04, feesReported: true, executedAt: "2026-10-08T14:31:05.000Z", source: "IMPORTED_FILE",
      account: "EVAL-50K-01", provenance: "imported file · Fills.csv · as of Oct 9, 2026, 7:30 PM EDT",
    });
    expect(r.fills.every(f => f.provenance === r.provenance)).toBe(true);
  });

  it("PARTIAL SYNC is said: how many rows were skipped, and why — the good rows still come through", () => {
    const text = [
      "Fill ID,Contract,B/S,Quantity,Price,Timestamp",
      "a,MNQZ6,Buy,1,25000,10/08/2026 09:31:05",
      "b,MNQZ6,Sell,1,,10/08/2026 09:40:00",                 // no price
      "c,MNQZ6,Sell,1,25005,not a time",                     // unreadable time
      "a,MNQZ6,Buy,1,25000,10/08/2026 09:31:05",             // the same fill id again
      "d,MNQZ6,Hold,1,25005,10/08/2026 09:41:00",            // no side
      "e,MNQZ6,Sell,1,25006,10/08/2026 09:42:00",
    ].join("\n");
    const r = must(open(text));
    expect(r.fills.map(f => f.id)).toEqual(["import:a", "import:e"]);
    expect(r.skipped).toEqual([{ line: 3, reason: "NO_PRICE" }, { line: 4, reason: "NO_TIME" }, { line: 5, reason: "DUPLICATE" }, { line: 6, reason: "NO_SIDE" }]);
    expect(r.disclosure).toBe("PARTIAL: read 2 of 6 rows. Skipped 4: 1 with no fill price, 1 with a time that could not be read, 1 with the same fill id as an earlier row, 1 with no buy / sell.");
  });

  it("no commission column → commissions UNREPORTED on every fill, never zero-as-a-fact", () => {
    const r = must(open("Contract,B/S,Quantity,Price,Timestamp\nMNQZ6,Buy,1,25000,10/08/2026 09:31:05\nMNQZ6,Sell,1,25004,10/08/2026 09:35:00"));
    expect(r.commissionsReported).toBe(false);
    expect(r.fills.every(f => f.feesReported === false && f.fees === 0)).toBe(true);
    // No fill id column: the id is the file and line, so a second open of the same file cannot double-count.
    expect(r.fills.map(f => f.id)).toEqual(["import:Fills.csv:2", "import:Fills.csv:3"]);
  });

  it("wall-clock times with no zone named → one plain refusal, not a file of skips", () => {
    expect(open(FILE, { wallClockZone: null })).toEqual({ ok: false, reason: "This file's times carry no time zone. Say which zone the export was made in (the platform's display zone) and open it again." });
  });

  it("an empty file, a header alone, and a path-shaped name", () => {
    expect(open("")).toEqual({ ok: false, reason: "This file has no rows to read." });
    expect(open("Contract,B/S,Quantity,Price,Timestamp")).toEqual({ ok: false, reason: "This file has no rows to read." });
    expect(must(open(FILE, { fileName: "C:\\Users\\dave\\Downloads\\Fills (3).csv" })).fileName).toBe("Fills (3).csv");
  });
});

describe("daily net results for the prop-evaluation desk", () => {
  it("FIFO round trips, priced by the one contract-economics owner, after commissions, in whole cents", () => {
    const d = propDailyResults(must(open(FILE)));
    // Oct 8: long 2 MNQ, +10.50 pts × $2 × 2 = $42.00, less $2.08 → $39.92. Oct 9: short 1, −11.25 pts × $2 = −$22.50, less $1.04 → −$23.54.
    expect(d.days).toEqual([{ date: "2026-10-08", netCents: 3992 }, { date: "2026-10-09", netCents: -2354 }]);
    expect(d.basis).toBe("AFTER_COMMISSIONS");
    expect(d.roundTrips).toBe(2);
    expect(d.openAtEnd).toEqual([]);
    expect(d.unpriced).toEqual([]);
    expect(d.provenance).toBe("imported file · Fills.csv · as of Oct 9, 2026, 7:30 PM EDT");
    expect(d.days.every(x => Number.isInteger(x.netCents) && /^\d{4}-\d{2}-\d{2}$/.test(x.date))).toBe(true);
  });

  it("no commissions in the file → the days are BEFORE commissions, and the notes say so", () => {
    const d = propDailyResults(must(open("Contract,B/S,Quantity,Price,Timestamp\nMNQZ6,Buy,1,25000,10/08/2026 09:31:05\nMNQZ6,Sell,1,25004,10/08/2026 09:35:00")));
    expect(d.days).toEqual([{ date: "2026-10-08", netCents: 800 }]);
    expect(d.basis).toBe("BEFORE_COMMISSIONS");
    expect(d.notes.join(" ")).toMatch(/Commissions are UNREPORTED in this file, so each day is BEFORE commissions/);
  });

  it("a partial fill, a scale-out and a position still open at the end are each handled and said", () => {
    const text = [
      "Contract,B/S,Quantity,Price,Timestamp,commission",
      "ESZ6,Buy,3,7800.00,10/08/2026 09:31:05,3.00",
      "ESZ6,Sell,1,7802.00,10/08/2026 09:40:00,1.00",       // +2 × $50 = +$100
      "ESZ6,Sell,1,7799.00,10/08/2026 09:50:00,1.00",       // −1 × $50 = −$50
    ].join("\n");
    const d = propDailyResults(must(open(text)));
    expect(d.days).toEqual([{ date: "2026-10-08", netCents: 10000 - 5000 - 500 }]);
    expect(d.roundTrips).toBe(2);
    expect(d.openAtEnd).toEqual([{ symbol: "ESZ6", account: null, quantity: 1, side: "LONG" }]);
    expect(d.notes.join(" ")).toContain("Still open at the end of the file, in no day's result: 1 ESZ6 long.");
  });

  it("a contract with no point value on file is in no day's result, and is named", () => {
    const text = "Contract,B/S,Quantity,Price,Timestamp\nZZZZ9,Buy,1,10,10/08/2026 09:31:05\nZZZZ9,Sell,1,11,10/08/2026 09:35:00\nMNQZ6,Buy,1,25000,10/08/2026 09:36:00\nMNQZ6,Sell,1,25001,10/08/2026 09:37:00";
    const d = propDailyResults(must(open(text)));
    expect(d.unpriced).toEqual(["ZZZZ9"]);
    expect(d.days).toEqual([{ date: "2026-10-08", netCents: 200 }]);
    expect(d.notes.join(" ")).toContain("No point value on file for ZZZZ9 — those fills are in no day's result.");
  });

  it("two accounts in one file never net against each other", () => {
    const text = "Account,Contract,B/S,Quantity,Price,Timestamp\nA,MNQZ6,Buy,1,25000,10/08/2026 09:31:05\nB,MNQZ6,Sell,1,25010,10/08/2026 09:35:00";
    const d = propDailyResults(must(open(text)));
    expect(d.roundTrips).toBe(0);
    expect(d.openAtEnd.map(o => `${o.account} ${o.side}`).sort()).toEqual(["A LONG", "B SHORT"]);
  });

  it("the day is Eastern; the CME rule moves an evening fill to the next trading day, and the rule in force is said", () => {
    expect(propDayOf("2026-10-08T21:59:00.000Z", "ET_CALENDAR_DAY")).toBe("2026-10-08");     // 5:59 PM EDT
    expect(propDayOf("2026-10-08T22:30:00.000Z", "ET_CALENDAR_DAY")).toBe("2026-10-08");     // 6:30 PM EDT
    expect(propDayOf("2026-10-08T22:30:00.000Z", "CME_TRADING_DAY")).toBe("2026-10-09");
    expect(propDayOf("2026-10-09T03:30:00.000Z", "ET_CALENDAR_DAY")).toBe("2026-10-08");     // 11:30 PM EDT, still Oct 8 in ET
    expect(propDayOf("2026-10-09T03:30:00.000Z", "CME_TRADING_DAY")).toBe("2026-10-09");
    const imp = must(open(FILE));
    expect(propDailyResults(imp, "CME_TRADING_DAY").notes[0]).toBe("Day rule: each round trip is counted on the CME trading day it closed in (a new day starts at 6:00 PM ET).");
    expect(propDailyResults(imp).notes[0]).toBe("Day rule: each round trip is counted on the Eastern calendar date it closed.");
    expect(propDailyResults(imp).notes.at(-1)).toMatch(/It is not the firm's statement/);
  });
});

describe("the owner is pure: nothing uploaded, nothing stored, nothing scraped, no credential", () => {
  it("no request, no storage, no clock of its own, no credential word in code", () => {
    const src = readFileSync(path.join(process.cwd(), "src/lib/journal/propFillsImport.ts"), "utf8").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/[^\n]*$/gm, "");
    expect(src.length).toBeGreaterThan(3000);
    expect(src).not.toMatch(/fetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|Date\.now\(|password|apiKey|token/i);
  });
});
