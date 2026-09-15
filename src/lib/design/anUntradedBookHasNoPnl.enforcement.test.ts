import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * H1 IN THE ACCOUNT HEADER — a book that was never put to work has no P&L.
 *
 * ── How it was found ─────────────────────────────────────────────────────────
 *
 * In the live verification screenshot for `2c624f9`, two rooms above the row
 * that commit had just fixed. The account strip read:
 *
 *     EQUITY $100,000 · CASH $100,000 · DAY P&L +$0.00 · REALIZED +$0.00
 *
 * and the equity card below it read `+0.00 today (0.00%)` — all in
 * text-wm-green, on a book holding zero trades and zero positions.
 *
 * That is three consecutive defects found inside the receipt for the previous
 * one. The screenshot is not a formality; it is the best instrument in the kit.
 *
 * ── What is and is not the defect ────────────────────────────────────────────
 *
 * EQUITY and CASH are NOT part of this and keep rendering untouched. $100,000
 * of simulated cash really is held; that is an observed fact about the book.
 *
 * The defect is confined to the cells that claim a RESULT — Day P&L, Realized,
 * and the "today" line — because a result requires the book to have been used.
 * `0 >= 0` is true, so the win tint was arithmetically earned and factually a
 * lie: green asserts money was made.
 *
 * ── Why the guard is not `dayPnl === 0` ──────────────────────────────────────
 *
 * A real trading day CAN close at exactly zero — scratched at entry, or wins
 * and losses that cancel. That is a genuine flat result and it must keep its
 * tint and its figure. The question is never "is the number zero" but
 * "was anything ever traded". Hence:
 *
 *     const bookNeverTraded = trades.length === 0 && positions.length === 0;
 *
 * read off the book's own contents, so it cannot drift from the thing it
 * describes and re-lights on its own at the first fill.
 *
 * ── This was not a careless surface ──────────────────────────────────────────
 *
 * The same strip already forces UNKNOWN for `bookRecoveryRequired` and for
 * `hasUnmarkedOptions`. Two honest degradations were already in place. It had
 * simply never been asked what it should say BEFORE the first trade — which is
 * the one state every new trader sees first.
 */

const PAPER = resolve(__dirname, "..", "..", "app", "paper", "page.tsx");

/** A Sentinel that fails on its own honest prose is testing the wrong surface. */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

describe("H1: an untraded book has no P&L to report", () => {
  it("THE DEFECT: Day P&L is withheld before the book has been traded", () => {
    const code = codeOnly(readFileSync(PAPER, "utf8"));
    expect(code).toMatch(/l:hasUnmarkedOptions\?"Known P&L":"Day P&L"[\s\S]{0,120}bookNeverTraded\?"—"/);
    expect(code).toMatch(/"Day P&L"[\s\S]{0,260}bookNeverTraded\?"text-wm-text-muted"/);
  });

  it("THE DEFECT: Realized is withheld before the book has been traded", () => {
    const code = codeOnly(readFileSync(PAPER, "utf8"));
    expect(code).toMatch(/l:"Realized"[\s\S]{0,120}bookNeverTraded\?"—"/);
    expect(code).toMatch(/l:"Realized"[\s\S]{0,260}bookNeverTraded\?"text-wm-text-muted"/);
  });

  it("the 'today' line names what is missing rather than printing a zero", () => {
    const code = codeOnly(readFileSync(PAPER, "utf8"));
    expect(code).toMatch(/bookNeverTraded\s*\n?\s*\? "No trades placed — nothing to measure yet"/);
    // and it must not take the win tint while doing so
    expect(code).toMatch(/bookNeverTraded \? "text-wm-text-muted" : dayPnl>=0\?"text-wm-green"/);
  });

  it("the guard reads the book's own contents, not the value of the number", () => {
    const code = codeOnly(readFileSync(PAPER, "utf8"));
    expect(code).toMatch(
      /const bookNeverTraded = trades\.length === 0 && positions\.length === 0/,
    );
    // `dayPnl === 0` would silence a REAL flat day, which is a true result.
    expect(code).not.toMatch(/bookNeverTraded = dayPnl === 0/);
    expect(code).not.toMatch(/const bookNeverTraded = trades\.length === 0;/);
  });

  it("OVER-CORRECTION: EQUITY and CASH are untouched observed facts", () => {
    const code = codeOnly(readFileSync(PAPER, "utf8"));
    // The trader really does hold this simulated cash. Withholding it would be
    // the opposite error — hiding something WM genuinely observes.
    expect(code).toMatch(/l:"Cash",\s+v:bookRecoveryRequired\?"UNKNOWN":`\$\$\{cash\.toLocaleString/);
    expect(code).not.toMatch(/l:"Cash"[\s\S]{0,120}bookNeverTraded/);
    expect(code).not.toMatch(/l:hasUnmarkedOptions\?"Equity":"Equity"[\s\S]{0,140}bookNeverTraded/);
  });

  it("OVER-CORRECTION: a book that HAS traded still reports a real flat day", () => {
    const code = codeOnly(readFileSync(PAPER, "utf8"));
    // A day closing at exactly $0.00 after real trades is a true result and
    // keeps both its figure and its tint.
    expect(code).toMatch(/dayPnl>=0\?"text-wm-green":"text-wm-red"/);
    expect(code).toMatch(/totalRealPnl>=0\?"text-wm-green":"text-wm-red"/);
  });

  it("OVER-CORRECTION: the existing honest degradations still win", () => {
    const code = codeOnly(readFileSync(PAPER, "utf8"));
    // bookRecoveryRequired is a STRONGER claim than "never traded" — an
    // unreadable book must say UNKNOWN, never "—". Order matters, so it is
    // pinned: recovery is tested first in both cells.
    expect(code).toMatch(/l:"Realized", v:bookRecoveryRequired\?"UNKNOWN":bookNeverTraded\?"—"/);
    expect(code).toMatch(/"Day P&L", v:bookRecoveryRequired\?"UNKNOWN":bookNeverTraded\?"—"/);
    expect(code).toMatch(/bookRecoveryRequired\s*\n?\s*\? "UNKNOWN · recovery required/);
  });
});
