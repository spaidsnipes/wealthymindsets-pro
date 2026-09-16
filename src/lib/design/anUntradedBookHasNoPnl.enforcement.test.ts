import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { paperAccountStats, type PaperBookFacts } from "../paper/paperAccountStats";

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
 *
 * ── AMENDED: THE REMEDY OVER-CORRECTED, AND THIS FILE HAD PINNED IT ─────────
 *
 * Everything above is still true. What this Sentinel then DID about it was to
 * regex the exact ternary that implemented the remedy:
 *
 *     expect(code).toMatch(/…"Day P&L"[\s\S]{0,120}bookNeverTraded\?"—"/)
 *
 * That pinned A DASH. And the dash was the wrong half of the fix.
 *
 * Only the TINT was ever the lie. Day P&L and Realized are SUMS; the sum of no
 * trades is exactly $0.00, which is a fact WM holds, and a dash in a money
 * column says it does not. Because the figure and the tint hung off one
 * ternary, killing the green killed the number with it — an OVERCLAIM traded
 * for an UNDERCLAIM. This file then froze that trade in place.
 *
 * FOURTH TIME IN THIS CHAIN a Sentinel has pinned an incidental form, and the
 * most consequential: the others guarded punctuation, this one guarded a
 * REMEDY and so forbade the correction of its own subject. The remedy is the
 * same as always — RE-ANCHOR ON THE MEANING, NEVER RELAX.
 *
 * The meaning, stated once, is the prose above: A BOOK THAT WAS NEVER PUT TO
 * WORK MAY NOT CLAIM A RESULT. It may still state its zero. So these tests now
 * drive `paperAccountStats` directly and assert BEHAVIOUR — which is strictly
 * stronger than a regex, because it cannot be satisfied by punctuation.
 */

const PAPER = resolve(__dirname, "..", "..", "app", "paper", "page.tsx");

/** A Sentinel that fails on its own honest prose is testing the wrong surface. */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const untraded: PaperBookFacts = {
  bookRecoveryRequired: false,
  hasUnmarkedOptions: false,
  unmarkedOptionCount: 0,
  neverTraded: true,
  totalEquity: 100000,
  cash: 100000,
  dayPnl: 0,
  realizedPnl: 0,
  winRatePct: null,
  closedCount: 0,
};
const cell = (facts: PaperBookFacts, label: string) =>
  paperAccountStats(facts).find((s) => s.label === label)!;

describe("H1: an untraded book has no P&L to report", () => {
  it("THE DEFECT: Day P&L is withheld before the book has been traded", () => {
    // WHAT IS WITHHELD IS THE CLAIM, NOT THE NUMBER. `0 >= 0` is true, so the
    // green was arithmetically earned and factually a lie — that is the defect
    // and it is dead. The zero itself is a measured fact and keeps rendering.
    const d = cell(untraded, "Day P&L");
    expect(d.tone).not.toBe("WIN");
    expect(d.tone).toBe("NEUTRAL");
    expect(d.kind).toBe("MEASURED");
    expect(d.value).toBe("+$0.00");
    expect(d.reason).toMatch(/no win tint/i);
  });

  it("THE DEFECT: Realized is withheld before the book has been traded", () => {
    const r = cell(untraded, "Realized");
    expect(r.tone).not.toBe("WIN");
    expect(r.tone).toBe("NEUTRAL");
    expect(r.kind).toBe("MEASURED");
    expect(r.value).toBe("+$0.00");
  });

  it("THE OVER-CORRECTION: withholding the claim must not erase the figure", () => {
    // A dash in a money column asserts the number is unavailable. It is not —
    // a sum over an empty set is zero and WM holds it. This is the assertion
    // the old regex made impossible.
    for (const label of ["Day P&L", "Realized"]) {
      expect(cell(untraded, label).value).not.toBe("—");
      expect(cell(untraded, label).value).toContain("0.00");
    }
    const code = codeOnly(readFileSync(PAPER, "utf8"));
    expect(code).not.toMatch(/bookNeverTraded\s*\?\s*"—"/);
  });

  it("the 'today' line states the zero and withholds only the reading of it", () => {
    const code = codeOnly(readFileSync(PAPER, "utf8"));
    // "nothing to measure yet" went one word too far — there IS something to
    // measure and it measures $0.00. What is absent is a RESULT to interpret.
    expect(code).not.toMatch(/"No trades placed — nothing to measure yet"/);
    expect(code).toMatch(/bookNeverTraded\s*\n?\s*\? "\+\$0\.00 · no trades placed/);
    // AND IT MUST NOT TAKE THE WIN TINT WHILE DOING SO.
    //
    // RESTATED POSITIVELY — 2026-09-16. This assertion used to pin the literal
    // source text `bookNeverTraded ? "text-wm-text-muted" : dayPnl>=0?"text-wm-green"`.
    // Pinning that spelling asserted the PRESENCE of a sign-tint, so the moment
    // the page was corrected to take its colour from the owner's tone the guard
    // failed THE FIX rather than the defect. A Sentinel that pins a spelling
    // defends the spelling and loses the law.
    //
    // The law is: this line's colour is chosen by a TONE computed from the
    // book's contents, and never by the sign of the figure printed beside it.
    expect(code).toMatch(/TONE_CLASS\[dayPnlStat\.tone\]/);
    expect(
      code,
      "the 'today' line is tinted by a sign test again — `dayPnl >= 0` is how a " +
        "book of unknown value, and a book that never traded, both earned the green",
    ).not.toMatch(/dayPnl\s*>=\s*0\s*\?\s*"text-wm-green"/);
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
    // The trader really does hold this simulated cash. Withholding it would be
    // the opposite error — hiding something WM genuinely observes.
    expect(cell(untraded, "Cash").value).toBe("$100,000");
    expect(cell(untraded, "Cash").kind).toBe("MEASURED");
    expect(cell(untraded, "Equity").value).toBe("$100,000");
    expect(cell(untraded, "Equity").kind).toBe("MEASURED");
  });

  it("OVER-CORRECTION: a book that HAS traded still reports a real flat day", () => {
    // A day closing at exactly $0.00 after real trades is a true result and
    // keeps its figure. Flat is not a win, so the tint stays neutral — but the
    // REASON must not claim the book was never used.
    const flat = { ...untraded, neverTraded: false, winRatePct: 0, closedCount: 2 };
    expect(cell(flat, "Day P&L").value).toBe("+$0.00");
    expect(cell(flat, "Day P&L").reason).not.toMatch(/No trades have been placed/);
    // and a real result still earns its tint in both directions
    expect(cell({ ...flat, dayPnl: 10 }, "Day P&L").tone).toBe("WIN");
    expect(cell({ ...flat, dayPnl: -10 }, "Day P&L").tone).toBe("LOSS");
  });

  it("OVER-CORRECTION: the existing honest degradations still win", () => {
    // bookRecoveryRequired is a STRONGER claim than "never traded" — an
    // unreadable book must say UNKNOWN. Order matters, so it is asserted by
    // BEHAVIOUR: recovery wins even when the book has also never traded.
    const broken = { ...untraded, bookRecoveryRequired: true };
    expect(cell(broken, "Day P&L").value).toBe("UNKNOWN");
    expect(cell(broken, "Day P&L").kind).toBe("UNKNOWN");
    expect(cell(broken, "Realized").value).toBe("UNKNOWN");
    expect(cell(broken, "Equity").value).toBe("UNKNOWN");

    const code = codeOnly(readFileSync(PAPER, "utf8"));
    expect(code).toMatch(/bookRecoveryRequired\s*\n?\s*\? "UNKNOWN · recovery required/);
  });

  it("the page computes none of the strip itself", () => {
    const code = codeOnly(readFileSync(PAPER, "utf8"));
    expect(code).toContain("paperAccountStats(");
    // The figure and the tint must not share a ternary again — that coupling
    // is what made killing the green kill the number.
    expect(code).not.toMatch(/bookNeverTraded\?"text-wm-text-muted":dayPnl>=0\?"text-wm-green"/);
  });
});
