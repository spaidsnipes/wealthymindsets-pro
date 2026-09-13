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
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarketObjectPassportPanel } from "./MarketObjectPassportPanel";
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
