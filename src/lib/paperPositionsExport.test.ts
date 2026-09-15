import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  paperPositionsToCsv,
  PAPER_POSITION_EXPORT_HEADERS,
} from "./paperPositionsExport";
import { PERSISTED_EXPORT_CAVEAT } from "./paperPositionMark";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

/**
 * Source with comments removed.
 *
 * A fix that explains itself has to NAME the thing it removed, and a Sentinel
 * that greps the raw file then fails on that explanation is testing the wrong
 * surface — this codebase has now learned that three times. The claim is about
 * what the code DOES, so the scan must see only code.
 */
function codeOnly(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** The data section only — everything before the blank line that precedes the note. */
function dataSection(csv: string): string[] {
  const lines = csv.split("\n");
  const end = lines.indexOf("");
  return end === -1 ? lines : lines.slice(0, end);
}

describe("paperPositionsExport — the saved book as a file that tells the truth", () => {
  const ONE = [{ symbol: "TSLA", qty: -10, avgPx: 400, marketPx: 395 }];

  it("REFUSES an empty book rather than shipping a header-only file", () => {
    expect(paperPositionsToCsv([])).toBeNull();
    expect(paperPositionsToCsv(null)).toBeNull();
    expect(paperPositionsToCsv(undefined)).toBeNull();
  });

  it("emits exactly the columns the saved book can justify", () => {
    const csv = paperPositionsToCsv(ONE)!;
    expect(dataSection(csv)[0]).toBe("Symbol,Side,Qty,AvgPx,FillPx");
    expect(PAPER_POSITION_EXPORT_HEADERS).toEqual(["Symbol", "Side", "Qty", "AvgPx", "FillPx"]);
  });

  it("NO MARKET VALUE: the word MarketPx never appears as a column", () => {
    const csv = paperPositionsToCsv(ONE)!;
    // Only the data section — the caveat prose is allowed to discuss the field
    // it refuses to ship. A Sentinel that fails on its own honest explanation
    // is testing the wrong surface.
    expect(dataSection(csv).join("\n")).not.toContain("MarketPx");
  });

  it("NO PLACEHOLDER ZERO: unrealized P&L is absent, not exported as 0", () => {
    const csv = paperPositionsToCsv(ONE)!;
    const data = dataSection(csv);
    expect(data[0]).not.toContain("Unreal");
    expect(data[0]).not.toContain("PnL");
    // The row must carry exactly as many fields as there are headers — a
    // silently appended P&L column would show up here first.
    expect(data[1].split(",").length).toBe(PAPER_POSITION_EXPORT_HEADERS.length);
    expect(data[1]).toBe("TSLA,SHORT,10,400,395");
  });

  it("H1: a position with no fill price gets a BLANK cell, never a 0", () => {
    const csv = paperPositionsToCsv([{ symbol: "AAPL", qty: 5, avgPx: 100 }])!;
    const row = dataSection(csv)[1];
    expect(row).toBe("AAPL,LONG,5,100,");
    expect(row.endsWith(",")).toBe(true);
    expect(row).not.toMatch(/,0$/);
  });

  it("THE ABSENCE TRAVELS WITH THE FILE: the caveat is inside the CSV", () => {
    const csv = paperPositionsToCsv(ONE)!;
    for (const s of PERSISTED_EXPORT_CAVEAT) expect(csv).toContain(`# ${s}`);
    // After the data, so a parser reading rows is not poisoned by it.
    expect(csv.indexOf("# This export")).toBeGreaterThan(csv.indexOf("TSLA,SHORT"));
  });

  it("the caveat names BOTH withheld things, not just one", () => {
    const note = PERSISTED_EXPORT_CAVEAT.join(" ");
    expect(note).toContain("no market value");
    expect(note).toContain("unrealized P&L");
    expect(note).toContain("never updated");
  });

  it("escapes separators so a row cannot shift its own columns", () => {
    const csv = paperPositionsToCsv([{ symbol: 'A,B"C', qty: 1, avgPx: 2, marketPx: 3 }])!;
    expect(dataSection(csv)[1]).toBe('"A,B""C",LONG,1,2,3');
  });

  it("is pure: the input positions are not mutated", () => {
    const input = [{ symbol: "TSLA", qty: -10, avgPx: 400, marketPx: 395 }];
    const snapshot = JSON.stringify(input);
    paperPositionsToCsv(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  // ---- DEFECT Sentinels: a claim and its justification must fail together ----

  it("THE DEFECT: applyFill still writes the FILL PRICE into marketPx", () => {
    const trade = read("src/lib/paperTrade.ts");
    const writers = (trade.match(/marketPx:\s*[A-Za-z_$][\w$]*/g) ?? []).filter(
      (a) => a !== "marketPx: number",
    );
    expect(writers.length).toBeGreaterThan(0);
    for (const w of writers) expect(w).toBe("marketPx: fillPx");
  });

  it("THE DEFECT: unrealPnl is still written ONCE, as 0, and never updated", () => {
    const trade = read("src/lib/paperTrade.ts");
    // Every assignment to the field, excluding the interface declaration.
    // `unrealPnl: number;` is the interface FIELD DECLARATION, not a writer, so
    // it is excluded by name — with and without its trailing semicolon.
    const writes = (trade.match(/unrealPnl:\s*[^,}\n]+/g) ?? [])
      .map((s) => s.trim().replace(/;$/, ""))
      .filter((s) => s !== "unrealPnl: number");
    expect(writes).toEqual(["unrealPnl: 0"]);
  });

  it("THE SURFACE USES IT: /profile exports through this owner, not inline", () => {
    const profile = codeOnly(read("src/app/profile/page.tsx"));
    expect(profile).toContain("paperPositionsToCsv");
    // The inline construction that produced the untrue columns must be gone.
    // This is the REVIVE-FOUND lesson: importing the owner is not using it, so
    // assert the OLD code is absent as well as the new call being present.
    expect(profile).not.toContain('"MarketPx"');
    expect(profile).not.toContain('"UnrealizedPnL"');
    expect(profile).not.toContain("p.unrealPnl");
  });
});
