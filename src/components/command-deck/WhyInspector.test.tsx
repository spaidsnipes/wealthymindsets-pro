/**
 * WhyInspector — regression lock: the WHY? evidence panel MUST route its
 * body through the shared <SemanticZoom> primitive (canon §Phase 2
 * Experience Shell). This ensures the L1/L2/L3 progressive-disclosure
 * pattern stays consistent across every canon truth surface — no hand-
 * rolled tab strips are permitted on the deck.
 */

import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WhyInspector, type WhyTarget } from "./WhyInspector";

describe("WhyInspector — canon §Phase 2 (SemanticZoom composition)", () => {
  it("renders null when no target is supplied", () => {
    const html = renderToStaticMarkup(
      <WhyInspector target={null} state={null} dlar={null} clc={null} />,
    );
    expect(html).toBe("");
  });

  it("wraps its body in the SemanticZoom primitive (role=tablist with 3 pills)", () => {
    const target: WhyTarget = { kind: "hero" };
    const html = renderToStaticMarkup(
      <WhyInspector target={target} state={null} dlar={null} clc={null} />,
    );
    // The SemanticZoom pill row appears when >1 level is supplied. Since
    // WhyInspector always supplies L1/L2/L3, the tablist MUST render.
    expect(html).toContain('role="tablist"');
    expect(html).toContain(">L1<");
    expect(html).toContain(">L2<");
    expect(html).toContain(">L3<");
  });

  it("uses an evidence-scoped aria-label so screen readers hear the WHY? context", () => {
    const target: WhyTarget = { kind: "hero" };
    const html = renderToStaticMarkup(
      <WhyInspector target={target} state={null} dlar={null} clc={null} />,
    );
    expect(html).toContain("evidence zoom");
  });

  it("defaults to L3 so opening the inspector still shows full detail (no regression)", () => {
    const target: WhyTarget = { kind: "hero" };
    const html = renderToStaticMarkup(
      <WhyInspector target={target} state={null} dlar={null} clc={null} />,
    );
    // The L3 render includes the "No observed evidence" full-detail block
    // when evidence is empty — which is the pre-Phase-2 baseline behavior.
    expect(html).toContain("No observed evidence");
  });
});
