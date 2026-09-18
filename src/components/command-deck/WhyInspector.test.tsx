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

/**
 * ── 2026-09-18: TWO OF FOUR TRUNCATIONS DISCLOSED NOTHING ─────────────────
 *
 * This component truncates four lists. `evidence group items` (4) and
 * `coverage channels` (6) each printed a "+N more" line. `contradictions` (5)
 * and `unknowns` (5) printed nothing at all — a list that simply stopped.
 *
 * All four live in one file, so the two correct copies are the author's own
 * statement of what the other two were meant to do. Fourth sighting in this
 * repo of one shape: a convention re-decided at every call site, with some of
 * the decisions wrong. `<MoreNotice>` is now the single owner.
 */
describe("WhyInspector — a truncated list must say it was truncated", () => {
  const heroState = (unknowns: number, contradictions: number, channels: number) =>
    ({
      qualityState: "PARTIAL",
      capturedAt: 1_700_000_000_000,
      unknowns: Array.from({ length: unknowns }, (_, i) => `unknown reason ${i + 1}`),
      contradictions: Array.from({ length: contradictions }, (_, i) => `contradiction ${i + 1}`),
      coverage: Array.from({ length: channels }, (_, i) => ({
        channel: `chan${i + 1}`,
        providerPath: `p${i + 1}`,
        observedEventCount: 0,
        lastEventAt: null,
        gapCount: 0,
      })),
      dimensions: {},
    }) as never;

  const render = (unknowns: number, contradictions: number, channels: number) =>
    renderToStaticMarkup(
      <WhyInspector
        target={{ kind: "hero" }}
        state={heroState(unknowns, contradictions, channels)}
        dlar={null}
        clc={null}
      />,
    );

  it("discloses the unknowns it did not print", () => {
    // 9 unknowns, 5 rows rendered. The 4 it dropped must have a name on screen.
    expect(render(9, 0, 1)).toContain("+4 more unknowns");
  });

  it("discloses the contradictions it did not print", () => {
    expect(render(1, 8, 1)).toContain("+3 more contradictions");
  });

  it("discloses the coverage channels it did not print", () => {
    expect(render(1, 0, 10)).toContain("+4 more channels");
  });

  it("says nothing when nothing is hidden — a '+0 more' has nothing behind it", () => {
    const html = render(5, 5, 6);
    expect(html).not.toContain("more unknowns");
    expect(html).not.toContain("more contradictions");
    expect(html).not.toContain("more channels");
    expect(html).not.toContain("+0");
  });

  it("says nothing when the list is shorter than the cap", () => {
    const html = render(2, 2, 2);
    expect(html).not.toContain("+");
  });

  it("the remainder derives from the TRUE length, not the sliced array", () => {
    // The inversion that renders "+1" beside a leading count of 9. Walking the
    // true length must move the remainder one-for-one; a remainder computed off
    // the capped array would be pinned at the same value for every input here.
    for (const total of [6, 7, 12, 41]) {
      expect(render(total, 0, 1)).toContain(`+${total - 5} more unknowns`);
    }
  });

  it("the section header's count and the disclosed remainder reconcile", () => {
    // LIVING-PIXEL LAW: 5 printed + 4 disclosed must equal the 9 in the header,
    // or two numbers on one panel disagree about one list.
    const html = render(9, 0, 1);
    expect(html).toContain("Unknowns (9)");
    expect(html).toContain("+4 more unknowns");
  });
});
