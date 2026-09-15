import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * H1 ON THE LEADERBOARD ROW — an untraded book has no return.
 *
 * ── How it was found ─────────────────────────────────────────────────────────
 *
 * By looking. `e714b04` removed the crown from a field of one, and the live
 * verification screenshot of that fix showed the row underneath it reading:
 *
 *     #  TRADER   RETURN   P&L   TRADES   WIN%
 *     1  You ⭐   +0.0%    +$0     0       —
 *
 * with `+0.0%` and `+$0` both computed to `text-wm-green` (rgb(0,212,170)) and
 * `—` correctly muted. The fix was right and the row beside it was still wrong.
 * This defect exists in the receipt for the previous one.
 *
 * ── The defect ───────────────────────────────────────────────────────────────
 *
 * The cells were:
 *
 *     entry.pct >= 0 ? "text-wm-green" : "text-wm-red"
 *     entry.pnl >= 0 ? "text-wm-green" : "text-wm-red"
 *
 * `0 >= 0` is true, so a book that has never placed a trade takes the WIN tint
 * for money it did not make. This is the chromatic shape of H1: colour is a
 * claim, and green asserts a gain.
 *
 * It is worse than a tint. A RETURN is a ratio over a book that was PUT TO
 * WORK. With `entry.trades === 0` there is no numerator and no denominator —
 * there is no return, not a return of zero.
 *
 * ── The lesson was already learned three cells to the right ──────────────────
 *
 * The WIN% column in the same row, under a comment that predates this file:
 *
 *     An unknown win rate gets the MUTED colour, not the red one.
 *     Colouring "no closed trades yet" as failure is the same overclaim as
 *     printing 0%.
 *
 * Same row. Same record. Same `trades === 0`. The neighbouring column had the
 * whole diagnosis written above it and the defect survived anyway, because a
 * comment guards the cell it sits on and nothing else.
 *
 * ── Owner-derived discrimination ─────────────────────────────────────────────
 *
 * The guard is `entry.trades === 0` — the row's own trade counter, the same
 * structure the cell describes. Not a hardcoded `false`, not a second
 * independent notion of emptiness that will drift. Same shape as
 * `board.length > 1` above it and `recordedTotal.counted === 0` on /journal.
 * The moment a real trade lands, the colour and the number re-light on their
 * own and nobody has to remember to come back here.
 *
 * ── The over-correction these Sentinels also forbid ──────────────────────────
 *
 * A "cure" that made every row muted, or that deleted the P&L column, would
 * pass a Sentinel that only forbade the defect. A trader who HAS traded must
 * still see their real return in the real tint — that is the honest half and it
 * is not what was wrong.
 */

const PAPER = resolve(__dirname, "..", "..", "app", "paper", "page.tsx");

/** A Sentinel that fails on its own honest prose is testing the wrong surface. */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

describe("H1: an untraded book has no return to report", () => {
  it("THE DEFECT: the RETURN cell does not take the win tint at zero trades", () => {
    const code = codeOnly(readFileSync(PAPER, "utf8"));
    expect(code).toMatch(
      /entry\.trades === 0 \? "text-wm-text-muted"\s*\n?\s*: entry\.pct >= 0 \? "text-wm-green"/,
    );
    // The bare form that shipped the defect must not return.
    expect(code).not.toMatch(
      /"text-xs font-black font-mono", entry\.pct >= 0 \? "text-wm-green"/,
    );
  });

  it("THE DEFECT: the P&L cell does not take the win tint at zero trades", () => {
    const code = codeOnly(readFileSync(PAPER, "utf8"));
    expect(code).toMatch(
      /entry\.trades === 0 \? "text-wm-text-muted"\s*\n?\s*: entry\.pnl >= 0 \? "text-wm-green"/,
    );
    expect(code).not.toMatch(
      /"text-\[10px\] font-mono font-bold", entry\.pnl >= 0 \? "text-wm-green"/,
    );
  });

  it("a book with no trades prints no percentage and no dollar figure", () => {
    const code = codeOnly(readFileSync(PAPER, "utf8"));
    // Both value cells must be gated, not merely re-tinted. Rendering "+0.0%"
    // in grey is still the claim that a return of zero was measured.
    expect(code).toMatch(/entry\.trades === 0 \? "—" : `\$\{entry\.pct >= 0/);
    expect(code).toMatch(/entry\.trades === 0\s*\n?\s*\? "—"\s*\n?\s*: `\$\{entry\.pnl >= 0/);
  });

  it("the discrimination reads the row's own trade counter", () => {
    const code = codeOnly(readFileSync(PAPER, "utf8"));
    // Never a second, independent notion of "this book is empty" — it will
    // drift away from the thing it describes.
    expect(code).toMatch(/entry\.trades === 0/);
    expect(code).not.toMatch(/const isEmptyBook\b/);
    expect(code).not.toMatch(/entry\.pct === 0 \?/);
  });

  it("OVER-CORRECTION: a trader who HAS traded still sees a real tint", () => {
    const code = codeOnly(readFileSync(PAPER, "utf8"));
    // The honest half survives: real returns keep the green/red that describes
    // them. A cure that muted every row would pass the four Sentinels above.
    expect(code).toMatch(/entry\.pct >= 0 \? "text-wm-green" : "text-wm-red"/);
    expect(code).toMatch(/entry\.pnl >= 0 \? "text-wm-green" : "text-wm-red"/);
  });

  it("OVER-CORRECTION: the WIN% column keeps the treatment it already had right", () => {
    const code = codeOnly(readFileSync(PAPER, "utf8"));
    // This column was never the defect. It is the reference implementation, and
    // a sweep that "unified" the row by rewriting it would be a regression.
    expect(code).toMatch(/entry\.win == null \? "text-wm-text-muted"/);
    expect(code).toMatch(/entry\.win == null \? "—" : `\$\{entry\.win\}%`/);
  });
});
