import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ATHOSInterventionPanel from "@/components/athos/ATHOSInterventionPanel";
import { StructureContextNote } from "@/components/chart/StructureContextNote";

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

    // RE-PINNED when ATHOS became the eighth WORKSPACE tenant. This read
    // `/visible\.length === 0\)? return null/` — one regex over one branch —
    // and it went red on a change that STRENGTHENED the thing it guards.
    //
    // §14 governs the UNPROMPTED case. A trader who deliberately opens the
    // equipment door has asked, and a blank panel is not silence then, it is
    // a broken door. So the empty path forked: still `return null` in the
    // room, an honest sentence behind the door. The rule follows, and is
    // stronger for it — it now pins BOTH halves, so neither can drift:
    // un-forking it back to an unconditional sentence goes red on the first
    // assertion, and deleting the disclosed branch goes red on the second.
    expect(
      panel,
      "the panel no longer self-silences on its UNPROMPTED path — §14 says " +
        "silence is a feature when nobody asked",
    ).toMatch(/visible\.length === 0\)? \{?\s*if \(!disclosed\) return null;/);
    expect(
      panel,
      "the panel has nothing to say to a trader who DID ask — an equipment " +
        "door that opens on a blank is a broken door, not silence",
    ).toMatch(/data-testid="athos-quiet"/);
  });

  it("the opened door speaks WM, not the name of the machinery behind it", () => {
    // FOUND BY WALKING PROD, NOT BY THIS SUITE. The sentence this rule guards
    // shipped reading "ATHOS has watched this session" — on the Founder's own
    // screen, inside an equipment drawer whose rail label had been written
    // specifically to keep that name off the surface.
    //
    // Every other rule in this file reads SOURCE. This one renders, because
    // the question is not "what does the file say" but "what does the trader
    // see". A source scan cannot answer that without also banning the import,
    // the component name, and the test ids — none of which the trader reads.
    const markup = renderToStaticMarkup(
      React.createElement(ATHOSInterventionPanel, {
        interventions: [],
        disclosed: true,
      }),
    );
    const visible = markup.replace(/<[^>]*>/g, " ");
    expect(
      visible,
      "the equipment drawer shows the trader the internal system name:\n\n" +
        visible.trim(),
    ).not.toMatch(/\bATHOS\b/);
    expect(
      visible,
      "the quiet state rendered nothing — the door opened on a blank",
    ).toMatch(/Nothing to raise/);
  });

  it("the structure note speaks the four dimensions, not our acronym for them", () => {
    // THE SECOND INSTANCE OF THE SAME DEFECT CLASS, FOUND THE SAME WAY — by
    // looking at a Founder screenshot of the NORMAL chart room rather than by
    // running anything. This line shipped reading "DLAR narrative: …".
    //
    // DLAR is ours. `DLARStrip` has always put the four EXPANDED words on its
    // chips — Direction, Location, Aggression, Response — and has never once
    // shown the trader the acronym, so there is nowhere the trader could have
    // learned it. That asymmetry is the whole test: the same screen says the
    // four words in one place and the initialism in another.
    //
    // RENDERED, NOT SCANNED, and for a sharper reason than the ATHOS rule
    // above. This component must legitimately READ `vm.dlar.narrative` — the
    // property is the real name of the real field. A source scan for /DLAR/
    // would therefore have to either ban that read (breaking the component) or
    // whitelist it (and then miss the JSX text node sitting one token away on
    // the SAME LINE). Rendering separates them with no ambiguity at all.
    const vm = {
      nodes: [{ key: "direction", verdict: "LONG" }],
      auction: { verdict: "FAILING" },
      dlar: {
        direction: { value: "UP" },
        narrative: "Higher timeframe up, auction failing.",
      },
    } as unknown as Parameters<typeof StructureContextNote>[0]["vm"];

    const markup = renderToStaticMarkup(
      React.createElement(StructureContextNote, { vm }),
    );
    const visible = markup.replace(/<[^>]*>/g, " ");

    // The control first: a rule that silently rendered null would pass the
    // ban below while proving nothing, and this component returns null on
    // four separate guard branches.
    expect(
      visible,
      "the fixture no longer trips the contradiction branch — this rule is " +
        "asserting a ban against an empty string, which any copy would pass",
    ).toMatch(/Structure context/);

    expect(
      visible,
      "the chart room shows the trader our internal acronym:\n\n" +
        visible.trim(),
    ).not.toMatch(/\bDLAR\b/);
    expect(
      visible,
      "the narrative lost its label — the trader now sees a bare sentence " +
        "with nothing saying which readings produced it",
    ).toMatch(/Direction, location, aggression, response/i);
  });
});
