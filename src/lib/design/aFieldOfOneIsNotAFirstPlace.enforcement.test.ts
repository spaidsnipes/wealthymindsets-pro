import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * H1 ON A COMPETITIVE SURFACE — a field of one is not a first place.
 *
 * ── Read off the live product ────────────────────────────────────────────────
 *
 * The /paper Leaderboard builds its board like this:
 *
 *     const myEntry = { name: "You ⭐", pct: myPct, … , isMe: true };
 *     const board = [myEntry].sort(…).slice(0, 12);
 *
 * There is exactly one entry, because WM Pro observes nobody else's paper book.
 * So `myRank` was ALWAYS 1, and a trader who placed a single paper trade was
 * handed:
 *
 *     👑  #1   Your Current Rank
 *              🎉 You're in the prize zone!
 *
 * — a crown, a podium placement, and a prize-zone congratulation for winning a
 * contest against nobody. Rendered directly beside two "Visit Partner" CTAs for
 * an external, explicitly unverified prize challenge.
 *
 * ── Why this is the same defect as the green zero ────────────────────────────
 *
 * The number was never wrong. Being 1st of 1 is arithmetically true, exactly as
 * the sum of no trades is genuinely $0.00. In both cases a real computation was
 * dressed in the visual grammar of an achievement it cannot support: green tint
 * for money not made, a crown for a field that does not exist.
 *
 * RANK IS A STATEMENT ABOUT A FIELD. With no field there is no rank to report,
 * and the honest output is a disclosure, not a number. LABEL-NOT-MODEL: the
 * board is not faked into having competitors, and `myPct` — the trader's own
 * real return — keeps rendering untouched.
 *
 * ── Why the condition is read off the board ──────────────────────────────────
 *
 * `hasField = board.length > 1`, not a hardcoded `false` and not a second
 * hand-rolled notion of "do competitors exist". Same lesson as the empty-book
 * total: the guard must read the same structure it describes, so it cannot
 * drift away from it. If WM ever observes a real field, the ranking lights up
 * on its own and nobody has to remember to come back here.
 */

const PAPER = resolve(__dirname, "..", "..", "app", "paper", "page.tsx");

/** A Sentinel that fails on its own honest prose is testing the wrong surface. */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

describe("/paper Leaderboard — a field of one is not a first place", () => {
  const code = codeOnly(readFileSync(PAPER, "utf8"));

  it("THE DEFECT: the rank claim is gated on a field actually existing", () => {
    expect(code).toMatch(/const hasField = board\.length > 1/);
    // The bare, ungated rank badge is what shipped. It must not come back.
    expect(code).toMatch(/hasField \?[\s\S]{0,400}#\{myRank\}/);
  });

  it("the prize-zone congratulation cannot fire without a field", () => {
    const at = code.indexOf("prize zone");
    expect(at).toBeGreaterThan(-1);
    // Whatever wrapping it lives in, `hasField` must be consulted immediately
    // before it. An unconditional ternary on myRank alone is the defect.
    const guard = code.slice(Math.max(0, at - 400), at);
    expect(guard).toMatch(/hasField/);
  });

  it("no podium icon is awarded for a field of one", () => {
    // `RANK_BADGES.find(p => p.rank === i + 1)` handed row 0 the 👑 crown
    // unconditionally. The lookup must now be gated.
    expect(code).toMatch(/hasField \? RANK_BADGES\.find/);
    expect(code).not.toMatch(/const badge = RANK_BADGES\.find/);
  });

  it("the withheld state says what is missing, and is not tinted as a win", () => {
    expect(code).toMatch(/NO FIELD TO RANK AGAINST/);
    expect(code).toMatch(/This board holds only your own paper result\./);
    // §9: unknown is quiet. The placeholder medallion is the neutral surface,
    // never the green reserved for a real standing.
    const at = code.indexOf("NO FIELD TO RANK AGAINST");
    const block = code.slice(Math.max(0, at - 700), at);
    expect(block).toMatch(/bg-wm-surface[\s\S]*?text-wm-text-dim/);
  });

  it("the trader's own REAL return is still reported", () => {
    // The cure must not delete the honest half. `myPct` is a genuine
    // measurement of the trader's own book and survives untouched.
    expect(code).toMatch(/\{myPct >= 0 \? "\+" : ""\}\{myPct\.toFixed\(1\)\}%/);
  });

  it("the board is not faked into having competitors", () => {
    // LABEL-NOT-MODEL. The cure is a disclosure, never invented opponents.
    expect(code).toMatch(/const board = \[myEntry\]/);
  });
});
