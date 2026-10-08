import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  traderPerformanceStats,
  type ClosedTradeInput,
} from "./traderPerformanceStats";

const PAGE = fs.readFileSync(
  path.join(process.cwd(), "src/app/profile/page.tsx"),
  "utf8",
);
const PAGE_CODE = PAGE
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

const t = (pnl: number): ClosedTradeInput => ({ pnl });
const by = (rows: readonly ClosedTradeInput[], label: string) =>
  traderPerformanceStats(rows).find((s) => s.label === label)!;

describe("a sentinel substituted for a missing denominator is a fabrication", () => {
  it("THE DEFECT: no losing trades must NOT produce a ratio", () => {
    // WAS `const avgLoss = losses > 0 ? … : 1`, then `avgWin / avgLoss`.
    // With no losses that is avgWin / 1 = avgWin — A RAW DOLLAR AMOUNT —
    // rendered as `${rr}:1` and labelled "Avg R:R". Three wins averaging
    // $450 printed "450.0:1".
    const rr = by([t(300), t(600), t(450)], "Avg R:R");
    expect(rr.kind).toBe("UNDEFINED");
    expect(rr.value).not.toMatch(/450/);
    expect(rr.value).not.toMatch(/:1$/);
    expect(rr.reason).toContain("no average loss");
  });

  it("no winning trades is equally undefined, not zero", () => {
    const rr = by([t(-100), t(-250)], "Avg R:R");
    expect(rr.kind).toBe("UNDEFINED");
    expect(rr.value).not.toBe("0.0:1");
  });

  it("with BOTH sides real and 20 trades the ratio is real and correct", () => {
    // avgWin 400, avgLoss 200 -> 2.0:1, over 20 closed trades
    const rows = Array.from({ length: 5 }, () => [t(300), t(500), t(-200), t(-200)]).flat();
    const rr = by(rows, "Avg R:R");
    expect(rr.kind).toBe("MEASURED");
    expect(rr.value).toBe("2.0:1");
  });

  it("n ≥ 20: below 20 closed trades Win Rate and Avg R:R are INSUFFICIENT EVIDENCE with the count, never a figure", () => {
    const four = [t(300), t(500), t(-200), t(-200)];
    for (const label of ["Win Rate", "Avg R:R"]) {
      const s = by(four, label);
      expect(s.kind).toBe("INSUFFICIENT_EVIDENCE");
      expect(s.value).toBe("INSUFFICIENT EVIDENCE");
      expect(s.reason).toMatch(/INSUFFICIENT EVIDENCE — 4 of 20 closed trades so far/);
    }
    // Counts and sums stay measured at any n.
    expect(by(four, "Net P&L").kind).toBe("MEASURED");
    expect(by(four, "Trades").value).toBe("4");
  });

  it("A SUM AND A RATIO DO NOT FAIL THE SAME WAY ON AN EMPTY SET", () => {
    // The whole reason the four tiles cannot share one glyph.
    const empty = traderPerformanceStats([]);
    const g = (l: string) => empty.find((s) => s.label === l)!;

    // Sums and counts: zero is a real answer.
    expect(g("Net P&L").kind).toBe("MEASURED");
    expect(g("Net P&L").value).toBe("+$0");
    expect(g("Trades").kind).toBe("MEASURED");
    expect(g("Trades").value).toBe("0");

    // Ratios: no denominator, therefore no value.
    expect(g("Win Rate").kind).toBe("UNDEFINED");
    expect(g("Win Rate").value).not.toBe("0%");
    expect(g("Win Rate").reason).toContain("NOT zero percent");
    expect(g("Avg R:R").kind).toBe("UNDEFINED");
  });

  it("no tile renders a bare glyph and every tile carries a reason", () => {
    const cases: ClosedTradeInput[][] = [
      [],
      [t(100)],
      [t(-100)],
      [t(100), t(-50)],
      [t(0)],
    ];
    for (const rows of cases) {
      for (const s of traderPerformanceStats(rows)) {
        expect(s.value).not.toBe("—");
        expect(s.value.trim().length).toBeGreaterThan(0);
        expect(s.reason.length).toBeGreaterThan(20);
        expect(s.reason).not.toBe(s.label);
      }
    }
  });

  it("a breakeven trade counts as a trade but as neither win nor loss", () => {
    const rows = [t(0)];
    expect(by(rows, "Trades").value).toBe("1");
    // 0 of 1 has a real denominator, but one trade is not a rate (n ≥ 20).
    expect(by(rows, "Win Rate").kind).toBe("INSUFFICIENT_EVIDENCE");
    expect(by(rows, "Win Rate").value).not.toBe("0%");
    expect(by(rows, "Avg R:R").kind).toBe("UNDEFINED"); // no win AND no loss
  });

  it("the page reads the tiles from the owner and computes none of them", () => {
    expect(PAGE_CODE).toContain("traderPerformanceStats(");
    // THE FABRICATION, VERBATIM. Reintroducing the sentinel denominator is
    // how a dollar amount becomes a ratio again.
    expect(PAGE_CODE).not.toMatch(/losses\s*>\s*0\s*\?[\s\S]{0,200}:\s*1;/);
    expect(PAGE_CODE).not.toContain("avgWin / avgLoss");
    expect(PAGE_CODE).not.toContain('winRate: "—"');
  });

  it("the reason is announced on a phone, not only hovered", () => {
    // The tiles are painted by ONE view, shared by /profile and its proof scene (Garden 19, 2026-10-08).
    const TILES = fs.readFileSync(path.join(process.cwd(), "src/components/profile/ProfilePerfTiles.tsx"), "utf8");
    expect(PAGE_CODE).toContain("<ProfilePerfTiles stats={stats} />");
    expect(TILES).toContain("title={s.reason}");
    expect(TILES).toContain("aria-label={`${s.label}: ${s.value}. ${s.reason}`}");
  });
});
