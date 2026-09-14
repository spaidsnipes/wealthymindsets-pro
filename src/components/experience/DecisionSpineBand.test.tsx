/**
 * DecisionSpineBand — the band is the Founder's permanent scene, so the laws
 * it enforces have to be enforceable by something other than a reviewer's eye.
 *
 * ── Why this file exists ─────────────────────────────────────────────────────
 *
 * The band shipped with zero tests. The carried finding of this build is that
 * `tsc --noEmit` stays EXIT=0 through behavioural breaks — "renames are
 * type-visible; wrong answers are not." Every law the band carries is a WRONG
 * ANSWER law, not a rename law:
 *
 *   - `rText` must render the literal string "UNKNOWN" for the selector's
 *     UNKNOWN sentinel. Changing it to `?? 0` fabricates a flat 0.00R
 *     risk-to-reward and typechecks perfectly.
 *   - `asOfText` must say "asOf UNKNOWN" for a null capture time. Changing it
 *     to `new Date(capturedAt ?? 0)` prints 1970 and typechecks perfectly.
 *   - A null decision id must render the REASON it is null. Rendering an empty
 *     string, or a placeholder id, typechecks perfectly.
 *
 * "Missing data is not 0.00" is a named law of this build. A law with no gate
 * standing for it is a comment. These are the gate.
 *
 * ── Why static markup and not a DOM ──────────────────────────────────────────
 *
 * The band computes nothing — it is a pure projection of already-compiled VMs.
 * `renderToStaticMarkup` is therefore a complete test of it, and matches the
 * harness the sibling experience components already use.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DecisionSpineBand, type DecisionSpineBandProps } from "./DecisionSpineBand";
import type { OneStoryVM } from "@/lib/marketData/viewModels/selectOneStory";
import type { DecisionWhyVM } from "@/lib/marketData/viewModels/selectDecisionWhyNot";
import type { AvailableRVM } from "@/lib/traderMemory/viewModels/selectAvailableR";

function oneStory(over: Partial<OneStoryVM> = {}): OneStoryVM {
  return {
    primary: "Price is inside value with no resolved direction.",
    contradiction: null,
    missing: null,
    decision: { value: "WAIT", detail: "Direction unresolved.", tone: "pending" },
    debt: null,
    ...over,
  };
}

function availableR(over: Partial<AvailableRVM> = {}): AvailableRVM {
  return {
    resolution: "UNKNOWN",
    conservativeR: "UNKNOWN",
    optimisticR: "UNKNOWN",
    riskPerUnit: "UNKNOWN",
    costDragR: "UNKNOWN",
    destination: null,
    missingInputs: [],
    warnings: [],
    ...over,
  };
}

function decisionWhy(over: Partial<DecisionWhyVM> = {}): DecisionWhyVM {
  return {
    version: "wm.decision-why.v1",
    verdict: "WAIT",
    clear: false,
    headline: "Right-of-way withheld — evidence debt unpaid.",
    blockers: [],
    clearances: [],
    invalidators: [],
    ...over,
  };
}

function props(over: Partial<DecisionSpineBandProps> = {}): DecisionSpineBandProps {
  return {
    decisionId: null,
    decisionIdAbsence: "No decision born yet — permission has not crossed.",
    market: { symbol: "TSLA", timeframe: "5m", quality: null, capturedAt: null, last: null },
    oneStory: null,
    availableR: null,
    decisionWhy: null,
    expression: null,
    ...over,
  };
}

function render(over: Partial<DecisionSpineBandProps> = {}): string {
  return renderToStaticMarkup(<DecisionSpineBand {...props(over)} />);
}

describe("DecisionSpineBand — the five surfaces are ON the scene", () => {
  it("renders all five spine labels without any drawer being opened", () => {
    const html = render();
    for (const label of ["Decision", "Now", "Market", "Risk", "Why", "Next"]) {
      expect(html).toContain(`>${label}<`);
    }
  });

  it("is a landmark the trader can find by name, not a nameless div", () => {
    expect(render()).toContain('aria-label="Decision spine"');
  });

  it("keeps MARKET usable on a phone by scrolling the spine horizontally", () => {
    const html = render();
    expect(html).toContain("@media (max-width: 767px)");
    expect(html).toContain("flex-wrap: nowrap !important");
    expect(html).toContain("overflow-x: auto");
    expect(html).toContain("flex: 0 0 180px !important");
  });

  it("compacts decision and MARKET provenance into one desktop rail header", () => {
    const html = render({
      presentation: "rail",
      canvasSummary: <span data-testid="canonical-canvas-verdict">WAIT</span>,
    });
    expect(html).toContain('data-presentation="rail"');
    expect(html).toContain("flex-direction:column");
    expect(html).toContain("width:320px");
    expect(html).toContain("border-left:1px solid rgba(139,106,41,0.22)");
    expect(html).toContain('data-testid="spine-provenance-header"');
    expect(html.match(/data-testid="spine-provenance-header"/g)).toHaveLength(1);
    expect(html).toContain('data-testid="spine-canvas-summary"');
    expect(html).toContain('data-testid="canonical-canvas-verdict"');
    expect(html).not.toContain("border-top:1px solid rgba(139,106,41,0.16)");
    for (const label of ["Decision", "Now", "Market", "Risk", "Why", "Next"]) {
      expect(html).toContain(`>${label}<`);
    }
  });

  it("retains the horizontal band as the default responsive projection", () => {
    const html = render({ canvasSummary: <span data-testid="canonical-canvas-verdict">WAIT</span> });
    expect(html).toContain('data-presentation="band"');
    expect(html).toContain("flex-direction:row");
    expect(html).not.toContain('data-testid="spine-provenance-header"');
    expect(html).not.toContain('data-testid="spine-canvas-summary"');
    expect(html).not.toContain('data-testid="canonical-canvas-verdict"');
  });
});

describe("DecisionSpineBand — absence is disclosed, never filled", () => {
  it("renders the REASON a decision id is absent, not a blank and not a placeholder id", () => {
    const html = render({
      decisionId: null,
      decisionIdAbsence: "Decision not minted: the uniqueness supplied looks like a broker id.",
      });
    expect(html).toContain('data-testid="spine-decision-absent"');
    expect(html).toContain("Decision not minted: the uniqueness supplied looks like a broker id.");
    // The absence branch must not also render an id slot — two answers to one
    // question is the shadow-object failure this band exists to avoid.
    expect(html).not.toContain('data-testid="spine-decision-id"');
  });

  it("never truncates the id — an ellipsised identity is ambiguous, not merely ugly", () => {
    // Found by `scripts/measure-experience-geometry.mjs` at 834px: the id box
    // was 242px and the id 264px, so it rendered `wmd_9f3c1a22-…d3…`. Two
    // decisions sharing a prefix would then render identically and neither
    // could be checked against the journal. Static markup cannot see the
    // overflow, but it CAN see the declarations that cause it.
    const html = render({ decisionId: "wmd_9f3c1a22-5e77-4a10-b2d4-7c918ee0d311" });
    const idTag = html.slice(html.indexOf('data-testid="spine-decision-id"') - 400);
    const style = idTag.slice(idTag.indexOf("style=\""), idTag.indexOf('data-testid="spine-decision-id"'));
    expect(style).not.toContain("white-space:nowrap");
    expect(style).not.toContain("text-overflow:ellipsis");
    expect(style).toContain("overflow-wrap:anywhere");
  });

  it("renders the id verbatim when one exists, and then stops disclosing absence", () => {
    const html = render({ decisionId: "wmd_abc-123" });
    expect(html).toContain('data-testid="spine-decision-id"');
    expect(html).toContain("wmd_abc-123");
    expect(html).not.toContain('data-testid="spine-decision-absent"');
    expect(html).not.toContain("No decision born yet");
  });

  it("UNKNOWN R is the literal word, never 0.00R — missing data is not zero", () => {
    const html = render({ availableR: availableR() });
    expect(html).toContain("Available R UNKNOWN");
    expect(html).toContain("risk/unit UNKNOWN");
    expect(html).not.toContain("0.00R");
  });

  it("a real R is rendered to two places, so UNKNOWN is a branch and not the only output", () => {
    const html = render({
      availableR: availableR({ conservativeR: 2.5, riskPerUnit: 1.25 }),
    });
    expect(html).toContain("Available R 2.50R");
    expect(html).toContain("risk/unit 1.25R");
    expect(html).not.toContain("Available R UNKNOWN");
  });

  it("mixed resolution discloses per-figure — one known number does not resolve the other", () => {
    const html = render({ availableR: availableR({ conservativeR: 3, riskPerUnit: "UNKNOWN" }) });
    expect(html).toContain("Available R 3.00R");
    expect(html).toContain("risk/unit UNKNOWN");
  });

  it("a null capture time says asOf UNKNOWN — never an epoch-zero 1970 timestamp", () => {
    const html = render();
    expect(html).toContain("asOf UNKNOWN");
    expect(html).not.toContain("1970");
    expect(html).not.toContain("00:00:00Z");
  });

  it("a real capture time is rendered as a UTC clock reading", () => {
    // 2026-09-12T14:46:05Z
    const html = render({
      market: { symbol: "TSLA", timeframe: "5m", quality: "LIVE", capturedAt: Date.UTC(2026, 8, 12, 14, 46, 5), last: 332.25 },
    });
    expect(html).toContain("asOf 14:46:05Z");
    expect(html).not.toContain("asOf UNKNOWN");
    expect(html).toContain('data-price-provenance="PRINT"');
  });

  it("an absent price says PRICE UNKNOWN, and an absent quality says QUALITY UNKNOWN", () => {
    const html = render();
    expect(html).toContain("PRICE UNKNOWN");
    expect(html).toContain("QUALITY UNKNOWN");
    expect(html).toContain('data-price-provenance="NONE"');
  });

  it("renders the canonical bar close with inspectable provenance when no print exists", () => {
    const html = render({
      market: {
        symbol: "AAPL",
        timeframe: "5m",
        quality: "HISTORICAL BARS VERIFIED",
        capturedAt: Date.UTC(2026, 8, 14, 7, 20, 0),
        last: null,
        lastBarClose: 332.25,
        lastBarTimeframe: "5m",
      },
    });
    expect(html).toContain('data-price-provenance="BAR_CLOSE"');
    expect(html).toContain("AAPL · 5m · 332.25 LAST 5m BAR CLOSE");
    expect(html).not.toContain("PRICE UNKNOWN");
  });

  it("quality is echoed verbatim from the canonical state — never re-worded", () => {
    const html = render({
      market: { symbol: "TSLA", timeframe: "1D", quality: "SESSION CLOSED — LAST VERIFIED", capturedAt: null, last: 332.25 },
    });
    expect(html).toContain("SESSION CLOSED — LAST VERIFIED");
  });

  it("an uncompiled story and an uncompiled verdict each say so in their own words", () => {
    const html = render({ oneStory: null, decisionWhy: null });
    expect(html).toContain("No story compiled — evidence insufficient.");
    expect(html).toContain("No verdict compiled yet.");
    expect(html).toContain("Available R not computed — no chain.");
    expect(html).toContain("No invalidator published.");
  });
});

describe("DecisionSpineBand — NEXT: WAIT is a first-class decision", () => {
  it("with no expression attached, NEXT is the compiled decision and says an order is not required", () => {
    const html = render({ oneStory: oneStory() });
    expect(html).toContain('data-testid="spine-next"');
    expect(html).toContain(">WAIT<");
    expect(html).toContain("a decision needs no order.");
  });

  it("renders the decision's VALUE, not the reading object — a [object Object] is a lie", () => {
    const html = render({ oneStory: oneStory({ decision: { value: "ACTION", detail: "Path clear.", tone: "resolved" } }) });
    expect(html).toContain(">ACTION<");
    expect(html).not.toContain("[object Object]");
  });

  it("an attached expression replaces the verdict in NEXT and is labelled as attached", () => {
    const html = render({
      oneStory: oneStory(),
      expression: "TSLA260918C00340000 2026-09-18 340 call",
    });
    expect(html).toContain("TSLA260918C00340000 2026-09-18 340 call");
    expect(html).toContain("Attached expression");
    expect(html).not.toContain("a decision needs no order.");
  });

  it("with neither story nor expression, NEXT is UNKNOWN — not an invented WAIT", () => {
    const html = render({ oneStory: null, expression: null });
    expect(html).toContain('data-testid="spine-next"');
    expect(html).toContain(">UNKNOWN<");
    expect(html).toContain("WAIT is a decision — no expression required.");
  });
});

describe("DecisionSpineBand — the band summarises WHY, it does not replace it", () => {
  it("offers the full-evidence route only when a handler exists to honour it", () => {
    expect(render({ onOpenWhy: () => {} })).toContain("Full evidence");
    // A button that opens nothing is a dead control. Absent handler, absent button.
    expect(render()).not.toContain("Full evidence");
  });

  it("returns the actual full-evidence trigger to the shared WHY opener", () => {
    const source = readFileSync(resolve(__dirname, "DecisionSpineBand.tsx"), "utf8");
    expect(source).toContain("onClick={(event) => props.onOpenWhy?.(event.currentTarget)}");
  });

  it("surfaces the first invalidator inline so the risk cell is not decorative", () => {
    const html = render({
      decisionWhy: decisionWhy({ invalidators: ["Value migrates below 330.10", "Delta flips negative"] }),
    });
    expect(html).toContain("Invalidated by: Value migrates below 330.10");
    expect(html).not.toContain("No invalidator published.");
  });

  it("an ACTION verdict with no invalidators still says so rather than showing an empty line", () => {
    const html = render({ decisionWhy: decisionWhy({ verdict: "ACTION", clear: true, invalidators: [] }) });
    expect(html).toContain("No invalidator published.");
  });
});
