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
    // A thesis exists in this fixture, so a contradiction WOULD have been
    // detectable. See selectOneStory.contradictionDetectability.
    contradictionDetectability: "COMPARABLE",
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
    // Fixtures are not capped, so the honest default is the sample size. An
    // explicit blockerCount override models the CAPPED case.
    blockerCount: over.blockerCount ?? (over.blockers ?? []).length,
  };
}

function props(over: Partial<DecisionSpineBandProps> = {}): DecisionSpineBandProps {
  return {
    decisionId: null,
    decisionIdAbsence: "No decision born yet — permission has not crossed.",
    now: {
      token: "SESSION ?",
      detail: "no exchange calendar — the current session is not established",
      established: false,
    },
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
    expect(html).toContain("width:clamp(260px, 22vw, 320px)");
    expect(html).not.toContain("width:320px");
    expect(html).toContain("border-left:1px solid rgba(139,106,41,0.22)");
    expect(html).toContain('data-material-plane="sanctuary-seam"');
    expect(html).toContain("linear-gradient(90deg, rgba(232,185,35,0.045) 0%");
    expect(html).toContain('data-testid="spine-provenance-header"');
    expect(html.match(/data-testid="spine-provenance-header"/g)).toHaveLength(1);
    expect(html).toContain('data-testid="spine-canvas-summary"');
    expect(html).toContain('data-testid="canonical-canvas-verdict"');
    expect(html).not.toContain("border-top:1px solid rgba(139,106,41,0.16)");
    // WAS: expect(html).toContain("margin-top:auto") — this line PINNED the
    // ~200px void between WHY and NEXT, so the gap was protected by a test.
    // See `× THE SEVERING VOID` below for why it had to go.
    for (const label of ["Decision", "Now", "Market", "Risk", "Why", "Next"]) {
      expect(html).toContain(`>${label}<`);
    }
  });

  it("retains the horizontal band as the default responsive projection", () => {
    const html = render({ canvasSummary: <span data-testid="canonical-canvas-verdict">WAIT</span> });
    expect(html).toContain('data-presentation="band"');
    expect(html).toContain("flex-direction:row");
    expect(html).not.toContain('data-testid="spine-provenance-header"');
    expect(html).not.toContain('data-material-plane="sanctuary-seam"');
    expect(html).not.toContain('data-testid="spine-canvas-summary"');
    expect(html).not.toContain('data-testid="canonical-canvas-verdict"');
    expect(html).not.toContain("margin-top:auto");
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

  /**
   * MEASURED LIVE on wealthymindsetspro.com/charts, NQ1! 15m, 2026-09-17, in
   * ONE two-line cell read exactly as a trader reads it:
   *
   *     NQ1! · 15m · 29727 LAST 15m BAR CLOSE
   *     UNAVAILABLE · asOf 12:47:27Z
   *
   * The grade is honest about the LIVE QUOTE CHANNEL and says so nowhere. Set
   * directly beneath a number that is present and provenance-labelled, the
   * only available reading is that the line above is what is unavailable —
   * WM understating what it holds, which is a truth defect in the same family
   * as overclaiming it.
   *
   * The cure is a SCOPE, never a softer verdict: a bar close is still not a
   * print, and no state here promotes. These two gates hold that line from
   * both sides — the word must change under a bar close, and it must NOT
   * change under a print, where `UNAVAILABLE` is grading the very number
   * shown and is precisely right.
   */
  it("a bar-close reading is not graded with a bare UNAVAILABLE", () => {
    const html = render({
      market: {
        symbol: "NQ1!",
        timeframe: "15m",
        quality: "UNAVAILABLE",
        capturedAt: Date.UTC(2026, 8, 17, 12, 47, 27),
        last: null,
        lastBarClose: 29727,
        lastBarTimeframe: "15m",
      },
    });
    expect(html).toContain("29727 LAST 15m BAR CLOSE");
    expect(html).toContain("NO LIVE PRINT");
    expect(html).not.toContain("UNAVAILABLE");
  });

  it("an UNAVAILABLE grade over no reading at all is left exactly as it is", () => {
    const html = render({
      market: { symbol: "NQ1!", timeframe: "15m", quality: "UNAVAILABLE", capturedAt: null, last: null },
    });
    expect(html).toContain("PRICE UNKNOWN");
    expect(html).toContain("UNAVAILABLE");
    expect(html).not.toContain("NO LIVE PRINT");
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
    expect(html).toContain("Available R UNKNOWN");
    expect(html).toContain("No surface in this build declares them, so no R can be computed here.");
    expect(html).toContain('data-testid="spine-available-r-detail"');
    expect(html).toContain("No invalidator published.");
  });
});

/**
 * SUPERSEDED BY LAW (kk) — A NEXT THAT REPEATS NOW IS NOT A NEXT.
 *
 * This block used to assert that NEXT prints the Right-of-Way verdict: it
 * required ">WAIT<" and ">UNKNOWN<" inside the NEXT cell. That assertion was
 * itself the defect, pinned. The verdict already has an owner and a cell; a
 * second rendering of it under a different label spends a whole cell of the
 * rail restating what the trader just read.
 *
 * The canon: "NOW — current market/job state. NEXT — one decision-relevant
 * thing capable of changing the job." WAIT cannot change the job; WAIT IS the
 * job. So these tests are re-aimed at the same CELL with the correct QUESTION,
 * and the one durable guarantee the old block carried — that the cell never
 * stringifies a reading object — is kept verbatim.
 *
 * See selectOneNextThing.test.ts for the compiler's own state matrix.
 */
describe("DecisionSpineBand — NEXT names an act, not the state", () => {
  it("with no expression attached, NEXT names the first unpaid node, not the verdict", () => {
    const html = render({
      oneStory: oneStory({
        debt: { payable: 9, watch: 0, resolved: 0, missing: 9, warn: 0, missingLabels: ["Regime", "Direction"], warnLabels: [] },
      }),
    });
    expect(html).toContain('data-testid="spine-next"');
    expect(html).toContain("Resolve regime");
    // The echoed verdict is exactly what this cell must never say again.
    expect(html).not.toContain(">WAIT<");
    expect(html).toContain("does not authorise entry");
  });

  it("never stringifies the reading object — a [object Object] is a lie", () => {
    const html = render({ oneStory: oneStory({ decision: { value: "ACTION", detail: "Path clear.", tone: "resolved" } }) });
    expect(html).toContain("Choose how to express the thesis");
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

  it("with neither story nor expression, NEXT admits it knows nothing — it does not invent a task", () => {
    const html = render({ oneStory: null, expression: null });
    expect(html).toContain('data-testid="spine-next"');
    expect(html).toContain("Establish the evidence ledger");
    expect(html).toContain("nothing is known about what would change the job");
    expect(html).not.toContain(">UNKNOWN<");
  });

  it("× THE SEVERING VOID: no rail cell pushes itself away from the one above it", () => {
    // `margin-top: auto` in a flex column eats all spare height and parks the
    // cell at the bottom. Measured live on /charts 2026-09-15: ~200px of
    // nothing between WHY and NEXT. NEXT is derived from the evidence WHY
    // displays, so a gap mid-column claims they are unrelated. Spare space
    // belongs at the END of the column, where it reads as margin.
    const html = render({ presentation: "rail" });
    expect(html).toContain('aria-label="Decision spine"');
    expect(html).not.toContain("margin-top:auto");
    // Not vacuous: the rail presentation really is the one under test.
    expect(render({ presentation: "rail" })).not.toBe(render({ presentation: "band" }));
  });

  it("the cell publishes WHICH kind of next thing it compiled, for the surface to key on", () => {
    const html = render({ oneStory: oneStory({ decision: { value: "NO TRADE", detail: "hard rule", tone: "warn" } }) });
    expect(html).toContain('data-next-kind="AWAIT_RELEASE"');
    const attached = render({ oneStory: oneStory(), expression: "TSLA 340C" });
    expect(attached).toContain('data-next-kind="ATTACHED_EXPRESSION"');
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

/**
 * A LABEL IS NOT AN OWNER.
 *
 * The cell headed "Now" carried `oneStory.primary` — a market-STRUCTURE
 * narrative — and nothing about the moment. The band's own header still listed
 * "NOW — absent" while that cell was on screen, and it was right to: the label
 * had moved, the absence had not. So the spine projected Available R, a named
 * invalidator and an attached expression under a heading that reads NEXT, with
 * nothing anywhere in the market room stating whether the market was trading.
 */
describe("× NOW HAS AN OWNER, NOT JUST A HEADING", () => {
  it("× THE UNSTATED MOMENT: the session token is on the scene, not in a drawer", () => {
    const html = render({
      now: { token: "CLOSED", detail: "closure is established for this market today", established: true },
    });
    expect(html).toContain('data-testid="spine-now-session"');
    expect(html).toContain(">CLOSED<");
  });

  it("× THE DECORATIVE NOW: the moment is stated even when no story compiled", () => {
    // oneStory is null in the default fixture — the OLD cell rendered only
    // "No story compiled" here, i.e. the NOW cell went fully silent about time.
    const html = render();
    expect(html).toContain("No story compiled — evidence insufficient.");
    expect(html).toContain(">SESSION ?<");
  });

  it("× THE SILENT TOKEN: the reason travels with the token on title AND aria", () => {
    const html = render({
      now: { token: "24X7", detail: "continuous market — this instrument has no session to close", established: true },
    });
    expect(html).toContain('title="continuous market — this instrument has no session to close"');
    expect(html).toContain('aria-label="24X7 — continuous market — this instrument has no session to close"');
  });

  it("× THE BORROWED CERTAINTY: an unestablished token is not toned like a proven one", () => {
    const proven = render({ now: { token: "CLOSED", detail: "d", established: true } });
    const unproven = render({ now: { token: "SESSION ?", detail: "d", established: false } });
    expect(proven).toContain('data-session-established="true"');
    expect(unproven).toContain('data-session-established="false"');
    // COLOUR IS A CLAIM: the two states may not wear the same colour.
    const colourOf = (h: string) => /spine-now-session[^>]*?color:([^;"]+)/.exec(h.replace(/\n/g, ""))?.[1]
      ?? /color:([^;"]+)[^>]*?spine-now-session/.exec(h.replace(/\n/g, ""))?.[1];
    expect(colourOf(proven)).toBeDefined();
    expect(colourOf(proven)).not.toBe(colourOf(unproven));
  });

  it("× THE OPTIONAL NOW: the prop is required, so a new surface cannot omit it", () => {
    const source = readFileSync(resolve(__dirname, "DecisionSpineBand.tsx"), "utf8");
    expect(source).toContain("readonly now: SpineNowEvidence;");
    expect(source).not.toContain("readonly now?: SpineNowEvidence");
    // Tone comes from a TOTAL record keyed on `established`, never from the
    // token's spelling — a new session quality must fail the build, not
    // silently inherit the established colour.
    expect(source).toMatch(/Record<"established" \| "unestablished", React\.CSSProperties>/);
  });

  it("× THE SECOND SESSION OWNER: /charts composes the canonical writer, it does not re-derive", () => {
    const dash = readFileSync(
      resolve(__dirname, "../chart/ChartsDashboard.tsx"),
      "utf8",
    );
    expect(dash).toContain("now: selectCanonicalSessionToken({ symbol, at: sessionClockDate })");
    // A HIDDEN CLOCK IS A HIDDEN CLAIM — the spine's session must not be fed
    // by a clock read during render.
    expect(dash).not.toContain("at: new Date()");
    // The owner must be imported AND used: a dead import satisfies a naive
    // truth Sentinel.
    expect(dash.split("selectCanonicalSessionToken").length - 1).toBeGreaterThan(1);
  });
});
