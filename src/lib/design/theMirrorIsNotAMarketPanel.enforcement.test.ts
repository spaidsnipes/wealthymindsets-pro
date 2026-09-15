import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * STRUCTURAL H1 — an unobserved MARKET must not silence an observable fact
 * about the PERSON.
 *
 * ── The same defect, eight lines down ────────────────────────────────────────
 *
 * `/command-deck` already carries the full diagnosis of this coupling, written
 * above the Opening Bell at line ~1855: `chainVm` is null whenever canonical
 * market state has not resolved, so on a morning reading MARKET STATE UNKNOWN
 * the panel vanished entirely and the trader was told nothing about their own
 * prep because the MARKET was unreadable.
 *
 * Eight lines below the end of that comment sat:
 *
 *     {chainVm && (phase === "REVIEW" || phase === "POST_EXIT") && <MirrorPanel/>}
 *
 * A comment guards the cell it sits on and nothing else. That is the argument
 * for Sentinels over prose, made by the codebase without being asked.
 *
 * ── Why the Mirror in particular ─────────────────────────────────────────────
 *
 * Every input is the trader's own record:
 *
 *     phase             selected by the trader, not read off the tape
 *     sessionDecisions  the decision store plus their journal
 *     ownerId, nowMs    identity and the clock
 *
 * And REVIEW after a session you could not read the tape on is *exactly* when
 * you most want to look at what you actually did. The panel disappeared
 * precisely when it was most useful — the same inversion as defect #3.
 *
 * ── The over-correction this set also forbids ────────────────────────────────
 *
 * Ungating must not turn the Mirror into design theater. It does not:
 * `MirrorPanel` returns null at zero patterns, and `selectMirror`'s empty VM
 * says so in words rather than in zeros. Both are pinned below, because the
 * safety of the ungating DEPENDS on them — if either regressed, this fix would
 * start rendering an empty frame at every REVIEW.
 */

const ROOT = resolve(__dirname, "..", "..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

/** A Sentinel that fails on its own honest prose is testing the wrong surface. */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

describe("the Mirror reflects the trader, not the tape", () => {
  it("THE DEFECT: MirrorPanel is not gated behind market-state resolution", () => {
    const deck = codeOnly(read("app/command-deck/page.tsx"));
    expect(deck).toContain("MirrorPanel");
    expect(deck).not.toMatch(/chainVm && \(phase === "REVIEW"/);
    expect(deck).not.toMatch(/chainVm &&\s*\(phase === "REVIEW"/);
    expect(deck).not.toMatch(/phase === "POST_EXIT"\) && chainVm/);
  });

  it("the phase gate survives — REVIEW and POST_EXIT are still the only moments", () => {
    // The cure is removing ONE conjunct, not opening the panel everywhere.
    // A Mirror during PREPARATION would be a different overclaim.
    const deck = codeOnly(read("app/command-deck/page.tsx"));
    expect(deck).toMatch(
      /\{\(phase === "REVIEW" \|\| phase === "POST_EXIT"\) && \(\s*<MirrorPanel/,
    );
  });

  it("the panel's inputs are the trader's own record and nothing else", () => {
    const deck = codeOnly(read("app/command-deck/page.tsx"));
    const call = deck.slice(deck.indexOf("<MirrorPanel"));
    const args = call.slice(0, call.indexOf("/>"));
    expect(args).toContain("ownerId");
    expect(args).toContain("decisions: sessionDecisions");
    expect(args).toContain("nowMs");
    // If a market-shaped argument ever appears here, the coupling is back —
    // this time inside the selector call rather than in front of it.
    expect(args).not.toMatch(/chainVm|marketState|qualityState|state\?\./);
  });

  it("the claim that selectMirror ignores the market is checked, not asserted", () => {
    // The whole fix rests on this. If selectMirror ever grows a market input,
    // the ungating above stops being obviously correct and must be re-argued.
    const sel = codeOnly(read("lib/traderMemory/viewModels/selectMirror.ts"));
    expect(sel).not.toMatch(/chainVm|marketState|qualityState|canonicalMarket/);
  });

  it("OVER-CORRECTION: MirrorPanel still self-silences when there is nothing to reflect", () => {
    // This is what stops the ungating from becoming an empty frame at REVIEW.
    const panel = codeOnly(read("components/mirror/MirrorPanel.tsx"));
    expect(panel).toMatch(/vm\.patterns\.length === 0\s*\)?\s*return null/);
  });

  it("OVER-CORRECTION: the empty case says so in words, not in zeros", () => {
    const sel = read("lib/traderMemory/viewModels/selectMirror.ts");
    expect(sel).toMatch(/No decisions in scope/);
  });

  it("OVER-CORRECTION: panels that genuinely ARE about the market keep their gate", () => {
    // ATHOS interventions are compiled WITH chainVm. Stripping every `chainVm
    // &&` on the page would be the opposite error — rendering market claims
    // built from an unresolved market.
    const deck = codeOnly(read("app/command-deck/page.tsx"));
    expect(deck).toMatch(/\{chainVm && \(\s*<ATHOSInterventionPanel/);
  });
});
