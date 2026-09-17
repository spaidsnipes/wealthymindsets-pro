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

  /**
   * RE-PINNED FROM "THE FIRST MOUNT'S PROPS" TO "EVERY COMPILATION ON THE PAGE".
   *
   * This read `deck.slice(deck.indexOf("<MirrorPanel"))` and checked the first
   * mount's arguments for the trader's own record. That worked while there was
   * exactly one mount and the selector was called inline inside it. Both facts
   * changed on the same day: the Mirror became WORKSPACE equipment, so there are
   * two mounts, and the selector was hoisted to a single `mirrorVm` memo so the
   * two consumers could not compile the trader's behaviour twice.
   *
   * A first-occurrence scan does not merely miss a violation here — it inverts.
   * With the props moved to `vm={mirrorVm}` the old assertion would have gone RED
   * on a change that made the coupling LESS possible, and the obvious way to
   * quiet it would have been to inline a second `selectMirror` call, which is the
   * defect. A rule whose cheapest cure is the disease is worse than no rule.
   *
   * So it is re-pinned to the thing the old form was reaching for, and it is
   * STRONGER in three ways the old one could not be:
   *   1. EVERY `selectMirror(` call on the page is checked, not one.
   *   2. The count is pinned at exactly one — a second brain fails even if its
   *      arguments are impeccable, because two honest answers about the trader's
   *      own behaviour can still disagree.
   *   3. Every `<MirrorPanel` mount must be fed from that one call, so a mount
   *      handed some other view model fails too.
   */
  it("the panel's inputs are the trader's own record and nothing else", () => {
    const deck = codeOnly(read("app/command-deck/page.tsx"));

    const calls = [...deck.matchAll(/selectMirror\(\{([\s\S]*?)\}\)/g)].map((m) => m[1]);
    expect(
      calls.length,
      "the deck compiles the Mirror " +
        `${calls.length} times — one room, one reflection. Two selectMirror calls ` +
        "are two answers to what the trader's behaviour teaches, and they can drift.",
    ).toBe(1);

    const args = calls[0];
    expect(args).toContain("ownerId");
    expect(args).toContain("decisions: sessionDecisions");
    expect(args).toContain("nowMs");
    // If a market-shaped argument ever appears here, the coupling is back —
    // this time inside the selector call rather than in front of it.
    expect(args).not.toMatch(/chainVm|marketState|qualityState|state\?\./);

    // …and every mount is fed from that single compilation.
    const mounts = [...deck.matchAll(/<MirrorPanel([\s\S]*?)\/>/g)].map((m) => m[1]);
    expect(mounts.length, "MirrorPanel is never mounted; this rule would pass vacuously")
      .toBeGreaterThan(0);
    for (const m of mounts) {
      expect(
        m,
        "a MirrorPanel mount is fed something other than the room's single " +
          "`mirrorVm` — the second brain is back, wearing a prop name",
      ).toMatch(/vm=\{mirrorVm\}/);
    }
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

  /**
   * RE-PINNED. This rule used to read:
   *
   *     expect(deck).toMatch(/\{chainVm && \(\s*<ATHOSInterventionPanel/);
   *
   * …on the argument that "ATHOS interventions are compiled WITH chainVm", so
   * stripping that gate would be the opposite error — market claims rendered
   * from an unresolved market.
   *
   * The GUARDRAIL was right and the EXAMPLE was wrong. ATHOS has seven
   * detectors. Two consume `clc`/`dlar`; five consume only `sessionDecisions`.
   * So the panel-level gate silenced five statements about the TRADER in order
   * to guard two statements about the MARKET — and it did not even guard those,
   * because both market detectors already open with their own null-check on the
   * same inputs.
   *
   * Pinning a redundant gate as the example of a correct one made this rule an
   * active obstacle: the honest fix could not be made without the suite going
   * red, and the cheapest way to quiet it was to leave the defect in place.
   *
   * So the guardrail is kept and re-pinned to the thing the old form was
   * reaching for — market claims must be guarded BY THEIR OWN MARKET INPUT,
   * inside the compiler, where the claim is. That is strictly stronger: the old
   * assertion could be satisfied by a blanket gate in front of a compiler that
   * guarded nothing, which is the weaker arrangement of the two.
   */
  it("OVER-CORRECTION: market claims are guarded by their own market input", () => {
    const sel = codeOnly(read("lib/traderMemory/viewModels/selectATHOSIntervention.ts"));

    // Every detector that READS the chain must also CHECK it. Anything else is
    // a market claim compiled from an unresolved market — the real defect the
    // old form of this rule was trying to name.
    const bodies = [...sel.matchAll(/const (detect\w+): Detector = \(input\) => \{([\s\S]*?)\n\};/g)];
    expect(bodies.length, "no detectors found — this rule would pass vacuously")
      .toBeGreaterThan(0);

    let marketDetectors = 0;
    for (const [, name, body] of bodies) {
      const readsChain = /input\.(clc|dlar)\b/.test(body);
      if (!readsChain) continue;
      marketDetectors += 1;
      expect(
        body,
        `${name} reads input.clc/input.dlar but never checks it is present. ` +
          "A market claim must be guarded by the market input it is built from.",
      ).toMatch(/if \(!input\.(clc|dlar)[\s\S]*?\) return null;/);
    }
    expect(marketDetectors, "no detector consumes the chain — re-examine this rule")
      .toBeGreaterThan(0);
  });

  it("OVER-CORRECTION: the trader-memory detectors are not gated on the market at all", () => {
    // The other half of the same truth, and the half the old rule inverted.
    // If a behaviour detector ever grows a chain input, the ungating below
    // stops being obviously correct and must be re-argued.
    const sel = codeOnly(read("lib/traderMemory/viewModels/selectATHOSIntervention.ts"));
    const behaviourDetectors = [
      "detectPostRuleViolationSeparation",
      "detectMaxLossesReached",
      "detectSuccessTriggeredRuleBending",
    ];
    for (const name of behaviourDetectors) {
      const m = sel.match(new RegExp(`const ${name}: Detector = \\(input\\) => \\{([\\s\\S]*?)\\n\\};`));
      expect(m, `${name} is gone — re-pin this rule to whatever replaced it`).not.toBeNull();
      expect(
        m![1],
        `${name} is a statement about the TRADER and has grown a market input. ` +
          "That would make the deck's ungated ATHOS mount an overclaim.",
      ).not.toMatch(/input\.(clc|dlar|marketState)\b/);
    }
  });

  it("THE DEFECT: ATHOS is not gated behind market-state resolution", () => {
    // The five behaviour detectors are exactly what a trader needs on a session
    // they could not read the tape on. Max-losses-reached going quiet because
    // the MARKET was unreadable is the inversion this whole file is about.
    const deck = codeOnly(read("app/command-deck/page.tsx"));
    expect(deck).toContain("ATHOSInterventionPanel");
    expect(deck).not.toMatch(/\{chainVm && \(\s*<ATHOSInterventionPanel/);
    expect(deck).not.toMatch(/chainVm &&\s*<ATHOSInterventionPanel/);
  });

  it("OVER-CORRECTION: ATHOS still self-silences when it has nothing to say", () => {
    // Founder doctrine §14 "silence is a feature" is what stops the ungating
    // from becoming an empty frame on every deck render.
    const panel = codeOnly(read("components/athos/ATHOSInterventionPanel.tsx"));
    expect(panel).toMatch(/visible\.length === 0\)? return null/);
  });
});
