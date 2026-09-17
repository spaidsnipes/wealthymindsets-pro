/**
 * MarketObjectPassportPanel — the Evidence-Reversibility Moat had no affordance.
 *
 * The panel's own header calls itself "the Evidence-Reversibility Moat as a
 * surface: every claim travels backward to an evidence ref." It put that
 * lineage behind a `<details>` and set `listStyle: "none"` on the summary,
 * which removes the disclosure triangle — the one native signal that says
 * "there is more here". What was left is `cursor: pointer`, which does not
 * exist on a phone, and phones are primary.
 *
 * The 390px geometry screenshot showed the consequence: a RESOLVED row
 * carrying evidence refs and an UNRESOLVED row carrying nothing rendered
 * IDENTICALLY. No gate could see it. MEASURE was EXIT=0 and correct — nothing
 * was clipped, nothing noodled. The panel had no tests at all.
 *
 * Worse, CONTRADICTIONS rendered only inside the collapsed block. A
 * contradiction nobody opens is indistinguishable from no contradiction, which
 * makes the panel quietly sit on a disagreement it had already detected.
 *
 * These tests stand over the affordance, over the contradiction disclosure,
 * and over the Auto-Quiet ordering the panel already carried unguarded.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarketObjectPassportPanel } from "./MarketObjectPassportPanel";
import { FIDELITY_RANK } from "@/lib/marketData/viewModels/selectMarketObjectPassport";
import type {
  MarketObjectPassportVM,
  MarketObjectPassport,
} from "@/lib/marketData/viewModels/selectMarketObjectPassport";

function obj(over: Partial<MarketObjectPassport> = {}): MarketObjectPassport {
  return {
    id: "direction",
    label: "Direction",
    lifecycle: "RESOLVED",
    value: "Balanced inside value",
    confidence: 0.72,
    fidelity: "OBSERVED",
    sources: ["alpaca"],
    evidence: [
      {
        eventId: "ev-1",
        source: "alpaca",
        fidelity: "OBSERVED",
        basis: "Value area accepted on the retest.",
        observedAt: 1_800_000_000_000,
        availableAt: 1_800_000_000_000,
      },
    ],
    contradictions: [],
    unknowns: [],
    summary: "Direction resolved from observed value acceptance.",
    ...over,
  } as MarketObjectPassport;
}

function vm(objects: readonly MarketObjectPassport[]): MarketObjectPassportVM {
  return {
    version: "wm.market-object-passport.v1",
    snapshotId: "cms_2026-09-12T14:46:05Z_TSLA",
    capturedAt: 1_800_000_000_000,
    // A canon MarketQualityState, not prose. The first draft of this fixture
    // invented "SESSION CLOSED — LAST VERIFIED", which no producer can emit.
    // A test that feeds its subject a value the real wire cannot carry proves
    // nothing about the real wire.
    qualityState: "STALE",
    objects,
    resolvedCount: objects.filter((o) => o.lifecycle === "RESOLVED").length,
    totalCount: objects.length,
  } as MarketObjectPassportVM;
}

const render = (objects: readonly MarketObjectPassport[]): string =>
  renderToStaticMarkup(<MarketObjectPassportPanel vm={vm(objects)} />);

describe("MarketObjectPassportPanel — reversible claims must LOOK reversible", () => {
  it("marks a row that has evidence behind it", () => {
    const html = render([obj()]);
    expect(html).toContain('data-testid="passport-dna-affordance"');
    expect(html).toContain("DNA · 1 ref");
  });

  it("does NOT mark a row with nothing behind it", () => {
    // The defect made executable: an UNRESOLVED object with no lineage must
    // not wear the affordance, or the mark means nothing.
    const html = render([
      obj({
        id: "regime",
        label: "Regime",
        lifecycle: "UNRESOLVED",
        value: null,
        confidence: null,
        fidelity: null,
        evidence: [],
        summary: "Not enough evidence has arrived to seal this object.",
      }),
    ]);
    expect(html).not.toContain('data-testid="passport-dna-affordance"');
    expect(html).toContain("Not enough evidence has arrived to seal this object.");
  });

  it("a resolved row and an unresolved row are no longer indistinguishable", () => {
    // The exact reading from the 390px screenshot that opened this atom.
    const resolved = render([obj()]);
    const bare = render([
      obj({ id: "regime", label: "Regime", lifecycle: "UNRESOLVED", value: null, evidence: [] }),
    ]);
    expect(resolved).toContain("DNA ·");
    expect(bare).not.toContain("DNA ·");
  });

  it("counts refs honestly, and pluralises on the real number", () => {
    const three = render([
      obj({
        evidence: [
          { eventId: "a", source: "alpaca", fidelity: "OBSERVED", basis: "b1", observedAt: 1, availableAt: 1 },
          { eventId: "b", source: "polygon", fidelity: "DERIVED", basis: "b2", observedAt: 2, availableAt: 2 },
          { eventId: "c", source: "yahoo", fidelity: "PROXY", basis: "b3", observedAt: 3, availableAt: 3 },
        ],
      }),
    ]);
    expect(three).toContain("DNA · 3 refs");
    expect(render([obj()])).toContain("DNA · 1 ref");
    expect(render([obj()])).not.toContain("1 refs");
  });
});

describe("MarketObjectPassportPanel — a detected contradiction is never silent", () => {
  it("discloses the contradiction COUNT while the block is still collapsed", () => {
    const html = render([obj({ contradictions: ["Aggression says LONG while location says distribution."] })]);
    expect(html).toContain("1 contradiction");
    expect(html).not.toContain("1 contradictions");
  });

  it("pluralises, and still names each contradiction in full inside", () => {
    const html = render([
      obj({ contradictions: ["Aggression disagrees with location.", "Structure disagrees with regime."] }),
    ]);
    expect(html).toContain("2 contradictions");
    expect(html).toContain("Aggression disagrees with location.");
    expect(html).toContain("Structure disagrees with regime.");
  });

  it("does not claim a contradiction when none was detected", () => {
    expect(render([obj()])).not.toContain("contradiction");
  });
});

describe("MarketObjectPassportPanel — Auto-Quiet ordering and honest absence", () => {
  it("leads with resolved objects and quiets unresolved ones below", () => {
    const html = render([
      obj({ id: "regime", label: "Regime", lifecycle: "UNRESOLVED", value: null, evidence: [] }),
      obj({ id: "flow", label: "Order flow", lifecycle: "FORMING", value: "Aggression mixed" }),
      obj({ id: "direction", label: "Direction", lifecycle: "RESOLVED" }),
    ]);
    const at = (s: string) => html.indexOf(s);
    expect(at("Direction")).toBeLessThan(at("Order flow"));
    expect(at("Order flow")).toBeLessThan(at("Regime"));
  });

  it("states an empty passport rather than rendering a blank panel", () => {
    const html = render([]);
    expect(html).toContain("No sealed market state yet — no objects to passport.");
    expect(html).not.toContain('data-testid="passport-dna-affordance"');
  });

  it("is findable by name and reports its own resolved ratio", () => {
    const html = render([obj(), obj({ id: "regime", lifecycle: "UNRESOLVED", value: null, evidence: [] })]);
    expect(html).toContain('aria-label="Market object passports"');
    expect(html).toContain("1/2 resolved");
  });

  it("renders no placeholder leakage when a claim is entirely unknown", () => {
    const html = render([
      obj({
        id: "regime",
        label: "Regime",
        lifecycle: "UNRESOLVED",
        value: null,
        confidence: null,
        fidelity: null,
        sources: [],
        evidence: [],
        summary: "Not enough evidence has arrived to seal this object.",
      }),
    ]);
    expect(html).not.toContain("[object Object]");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("null");
  });
});

/**
 * DEPTH IS NOT SIZE — the passport as WORKSPACE equipment.
 *
 * The passport used to be an article pinned permanently open on /command-deck.
 * It is now equipment the trader picks up, which means it acquired a FULL
 * stage: a whole screen, with the layer telling it so via `unabridged`.
 *
 * A full screen that still folded each object's lineage behind a `<details>`
 * would make ENTER a resize. The interaction directive names that failure in
 * its own words — "if the intelligence exists but requires hunting through
 * implementation containers: FAIL" — so the tests below hold the line that
 * `unabridged` removes the disclosure rather than merely widening it.
 *
 * The docked stage keeps the `<details>`, deliberately: at 420px beside a live
 * chart, eight objects' full lineage unfolded is the clutter the same
 * directive bans. Both halves are asserted so neither can drift alone.
 */
describe("MarketObjectPassportPanel — ENTER buys depth, not a bigger box", () => {
  const withEvidence = () => [
    obj(),
    obj({
      id: "regime",
      label: "Regime",
      lifecycle: "FORMING",
      value: null,
      contradictions: ["Late-session volume contradicts the forming regime."],
      unknowns: ["No settled value area yet."],
      summary: "Regime is still forming.",
    }),
  ];

  it("docked, the lineage stays folded — a 420px drawer beside a live chart", () => {
    const html = renderToStaticMarkup(<MarketObjectPassportPanel vm={vm(withEvidence())} />);
    expect(html, "the docked panel must keep its disclosure").toContain("<details");
    expect(html, "the affordance says what is behind the fold").toContain(
      'data-testid="passport-dna-affordance"',
    );
  });

  it("unabridged, NOTHING is behind a disclosure", () => {
    const html = renderToStaticMarkup(
      <MarketObjectPassportPanel vm={vm(withEvidence())} unabridged />,
    );
    // THE LOAD-BEARING ASSERTION. A full stage that still contains a <details>
    // has not given the trader depth; it has given them a larger place to hunt.
    expect(html, "the full stage still buries the lineage in a disclosure").not.toContain(
      "<details",
    );
    expect(html, "the DNA block did not render at all").toContain('data-testid="passport-dna"');
  });

  it("uncapping ADDS nothing and WITHHOLDS nothing — same rows, same words", () => {
    // Arrangement is not disclosure. If the full stage rendered facts the
    // drawer never had, the two depths would be two readings of one object,
    // which is the second-brain failure wearing a layout's clothes.
    const objects = withEvidence();
    const docked = renderToStaticMarkup(<MarketObjectPassportPanel vm={vm(objects)} />);
    const full = renderToStaticMarkup(
      <MarketObjectPassportPanel vm={vm(objects)} unabridged />,
    );
    for (const claim of [
      "Value area accepted on the retest.",
      "Late-session volume contradicts the forming regime.",
      "No settled value area yet.",
      "1/2 resolved",
    ]) {
      expect(docked, `the drawer withheld: ${claim}`).toContain(claim);
      expect(full, `the full stage withheld: ${claim}`).toContain(claim);
    }
  });
});

/**
 * × THE PANEL DREW A RANK IT DID NOT OWN.
 *
 * Fidelity, confidence and resolution were all rendered as words and bare
 * numbers: `OBSERVED`, `· 72%`, `3/8 resolved`. Every one of those is an
 * ORDERED fact printed in a form that carries no order. OBSERVED and INFERRED
 * are five rungs apart on `FIDELITY_RANK` and occupied identical pixels in two
 * golds four percent apart in luminance; `· 87%` and `· 12%` differ by one
 * glyph at 11px; and two rooms both reporting `3/8` could mean "three sealed,
 * five nothing" or "three sealed, five forming" — different market states,
 * identical words.
 *
 * Drawing them is the cure, and drawing them is also the risk this block
 * exists for: a picture of a rank is a CLAIM about that rank. If the panel
 * held its own copy of the fidelity ordering, it could draw four rungs under a
 * word the selector chose by a different table, and both files would stay
 * green while disagreeing about which evidence is stronger. So the ordering
 * has exactly one author and these tests hold it there.
 */
describe("× ORDERED FACTS ARE DRAWN IN ORDER — and the order has one author", () => {
  it("the rungs filled equal the selector's own rank, not a second opinion", () => {
    // Walked across the whole scale rather than sampled: an off-by-one or an
    // inverted table survives any single reading.
    for (const [fidelity, rank] of Object.entries(FIDELITY_RANK)) {
      const html = render([obj({ fidelity: fidelity as never })]);
      expect(html, `${fidelity} drew no rungs`).toContain('data-testid="passport-fidelity-rungs"');
      expect(html, `${fidelity} drew the wrong rank`).toContain(`data-rank="${rank}"`);
    }
  });

  it("THE WORD SURVIVES THE PICTURE", () => {
    // The rungs are `aria-hidden` decoration. Rank encoded ONLY as height is
    // invisible to a screen reader and unreliable for anyone who cannot
    // separate two adjacent golds, so the addition must never become a
    // substitution.
    const html = render([obj({ fidelity: "OBSERVED", confidence: 0.72 })]);
    expect(html).toContain("OBSERVED");
    expect(html).toContain("72%");
    expect(html).toContain('aria-hidden="true"');
  });

  it("an unmeasured confidence draws NO bar rather than an empty one", () => {
    // A zero-length bar reads as "no confidence". The truth is "no
    // measurement", and those are different claims — the same fabricated-zero
    // family `monitorLatencyFact` refuses by name.
    const html = render([obj({ confidence: null })]);
    expect(html).not.toContain('data-testid="passport-confidence-bar"');
    const measured = render([obj({ confidence: 0.4 })]);
    expect(measured).toContain('data-confidence="40"');
  });

  it("the band keeps the denominator — eight objects always read as eight", () => {
    const objects = [
      obj({ id: "direction", lifecycle: "RESOLVED" }),
      obj({ id: "regime", lifecycle: "FORMING" }),
      obj({ id: "profile", lifecycle: "UNRESOLVED" }),
    ];
    const html = render(objects);
    const segments = html.match(/data-lifecycle="/g)?.length ?? 0;
    expect(
      segments,
      "a dropped UNRESOLVED segment would shorten the band and silently redraw " +
        "the denominator — 2/3 would be painted as if it were 2/2",
    ).toBe(3);
    expect(html).toContain('data-lifecycle="UNRESOLVED"');
  });

  it("the panel does NOT keep its own fidelity ordering", () => {
    // The single-writer rule, made executable against the source. A local
    // `const RANK = { OBSERVED: 5, ... }` here is the exact defect: two tables,
    // one picture, no gate.
    //
    // Comments stripped before matching. The docblock above NAMES the shape
    // being forbidden so the next reader knows what not to reintroduce, and a
    // scan over the raw text would read that explanation as the defect itself
    // and force the record to be deleted to make the rule pass. Rules that
    // punish written-down history get the history erased.
    const RAW = readFileSync(
      join(process.cwd(), "src/components/experience/MarketObjectPassportPanel.tsx"),
      "utf8",
    );
    const SRC = RAW.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(SRC).toMatch(/import\s*\{[^}]*FIDELITY_RANK[^}]*\}/);
    expect(SRC).not.toMatch(/(const|let)\s+\w*(RANK|ORDER)\w*\s*[:=]/);
    expect(SRC).not.toMatch(/OBSERVED:\s*5/);
  });
});
