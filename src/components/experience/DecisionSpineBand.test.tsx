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
    evidenceLedger: null,
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
    // NO COMPANION CAMERA is the default fixture, so every assertion below
    // that reads the MARKET cell is reading the LIVE arm of it. The replay arm
    // is exercised explicitly, by name, in the companion-camera Sentinel.
    replayEngaged: false,
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
      canvasSummary: () => <span data-testid="canonical-canvas-verdict">WAIT</span>,
    });
    expect(html).toContain('data-presentation="rail"');
    expect(html).toContain("flex-direction:column");
    expect(html).toContain("width:clamp(232px, 17vw, 288px)");
    expect(html).not.toContain("width:320px");
    expect(html).toContain("border-left:1px solid rgba(139,106,41,0.22)");
    expect(html).toContain('data-material-plane="sanctuary-seam"');
    expect(html).toContain('data-rail-composition="continuous-instrument"');
    expect(html).toContain("linear-gradient(90deg, rgba(232,185,35,0.045) 0%");
    expect(html).toContain('data-testid="spine-provenance-header"');
    expect(html.match(/data-testid="spine-provenance-header"/g)).toHaveLength(1);
    expect(html).toContain('data-testid="spine-canvas-summary"');
    expect(html).toContain('data-testid="canonical-canvas-verdict"');
    expect(html).not.toContain("border-top:1px solid rgba(139,106,41,0.16)");
    expect(html).not.toContain("background:rgba(24,20,14,0.42)");
    expect(html).toContain("border-bottom:1px solid rgba(196,165,116,0.18)");
    // WAS: expect(html).toContain("margin-top:auto") — this line PINNED the
    // ~200px void between WHY and NEXT, so the gap was protected by a test.
    // See `× THE SEVERING VOID` below for why it had to go.
    for (const label of ["Decision", "Market", "Risk", "Why", "Next"]) {
      expect(html).toContain(`>${label}<`);
    }
    // WAS: expect(html).toContain(">Now · State<"). H-101 / F05A / F06A draw
    // the NOW state as an uncaptioned plaque — a big serif word, a glyph, one
    // sentence. The caption was a card header; the plaque IS the NOW, and its
    // accessible name still begins "Now. State …" (see the plaque laws below).
    expect(html).not.toContain(">Now · State<");
    expect(html).toContain('data-testid="spine-wait-plaque"');
  });

  /* ONE WORD, TWO MOUTHS.
     MEASURED on the serving Worker 2026-09-22 at /charts?symbol=BTC&tf=5m,
     1440x900: the canvas pill printed `WAIT` inside the DECISION cell and this
     band printed `WAIT` again forty-five pixels below it at the same x — one
     value (`oneStory.decision.value`) painted twice. The fix is not "the pill
     stops printing it"; the fix is that this band TELLS the attachment whether
     it is about to print the word itself. These three cases are the gate on
     that being COMPILED here rather than asserted by a caller. */
  it("tells the canvas attachment it owns the verdict when it prints the headline", () => {
    let seen: boolean | null = null;
    render({
      presentation: "rail",
      oneStory: oneStory(),
      canvasSummary: ({ verdictOwnedBySurface }) => {
        seen = verdictOwnedBySurface;
        return null;
      },
    });
    expect(seen).toBe(true);
  });

  it("tells the attachment it does NOT own the verdict when no headline is drawn", () => {
    // Same rail, but no decision compiled — so `spine-now-state` never renders
    // and the word would go unsaid entirely if the pill also suppressed it.
    const seen: boolean[] = [];
    const html = render({
      presentation: "rail",
      oneStory: null,
      canvasSummary: ({ verdictOwnedBySurface }) => {
        seen.push(verdictOwnedBySurface);
        return null;
      },
    });
    expect(html).not.toContain('data-testid="spine-now-state"');
    expect(seen).toEqual([false]);
  });

  it("draws no summary frame when the attachment decides it has nothing to say", () => {
    const html = render({
      presentation: "rail",
      oneStory: oneStory(),
      canvasSummary: () => null,
    });
    // An empty bordered box is worse than the duplicate it removed.
    expect(html).not.toContain('data-testid="spine-canvas-summary"');
    expect(html).toContain('data-testid="spine-now-state"');
  });

  it("retains the horizontal band as the default responsive projection", () => {
    const html = render({ canvasSummary: () => <span data-testid="canonical-canvas-verdict">WAIT</span> });
    expect(html).toContain('data-presentation="band"');
    expect(html).toContain("flex-direction:row");
    expect(html).not.toContain('data-testid="spine-provenance-header"');
    expect(html).not.toContain('data-material-plane="sanctuary-seam"');
    expect(html).not.toContain('data-testid="spine-canvas-summary"');
    expect(html).not.toContain('data-testid="canonical-canvas-verdict"');
    expect(html).not.toContain("margin-top:auto");
  });

  it("renders the desktop rail as a compact state instrument instead of visible prose cards", () => {
    const html = render({ presentation: "rail", oneStory: oneStory() });
    // WAS: ">Now · State<" — the caption retired with the card (H-101 plaque).
    expect(html).toContain('aria-label="Now. State WAIT.');
    expect(html).toContain('data-testid="spine-now-state"');
    expect(html).toContain(">WAIT<");
    expect(html).toContain(">NOT BORN<");
    expect(html).toContain('class="wm-spine-sr-only"');
    // Full truth remains present for assistive technology and inspection.
    expect(html).toContain("No decision born yet");
    expect(html).toContain("Price is inside value with no resolved direction.");
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
        debt: { payable: 9, watch: 0, resolved: 0, missing: 9, warn: 0, missingLabels: ["Regime", "Direction"], missingPayableLabels: ["Regime", "Direction"], missingPayable: 9, warnLabels: [] },
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

/**
 * ── THE HONESTY PLAQUE ON THE SPINE ─────────────────────────────────────────
 *
 * `MarketHonestyPlaque` existed for a day with exactly one caller — the
 * quarantined /command-deck — written as `<MarketHonestyPlaque reading={null} />`
 * with the null spelled out in the source. That is a picture of disclosure: it
 * renders the UNMEASURED state whatever the market is doing, forever, and no
 * type error and no render test would ever notice.
 *
 * The governing directive names the failure outright — HARD-CODED WAIT =
 * ORGANISM FAIL — so the gates below are written against exactly that shape:
 * the plaque must be ABSENT when nothing was attached, must render its own
 * UNMEASURED state when a fidelity was attempted and refused, and must render
 * the REAL word when one was established. The last of the four is the one that
 * cannot pass while a literal is wired in.
 */
describe("DecisionSpineBand — the honesty plaque is fed, not drawn", () => {
  const AS_OF = 1_700_000_000_000;

  it("renders NO plate when the surface attached no fidelity at all", () => {
    // Every caller that predates the prop. An UNMEASURED plaque invented for a
    // surface that never claimed to measure is its own small overclaim.
    expect(render()).not.toContain('data-testid="honesty-plaque"');
  });

  it("renders the plaque's own UNMEASURED state for an explicit null", () => {
    // ATTACHED AND REFUSED is not ATTACHED AND FINE. `readMarketFidelity`
    // returns null when there is no finite asOf, and that null has to reach
    // the glass — an unmeasured canvas that renders nothing looks exactly like
    // a certified one.
    const html = render({ honesty: null });
    expect(html).toContain('data-fidelity="UNMEASURED"');
    expect(html).toContain("UNMEASURED");
  });

  it("renders the REAL fidelity word, its asOf, and its treatment", () => {
    const html = render({
      honesty: { fidelity: "DEGRADED", asOf: AS_OF, reasons: ["DELAYED"] },
    });
    expect(html).toContain('data-fidelity="DEGRADED"');
    expect(html).toContain("asOf ");
    // The treatment in WORDS. A dimmed chart and a dim monitor are the same
    // picture; the word is the part that cannot be mistaken for the lighting.
    expect(html).toContain("WOUNDED");
    expect(html).not.toContain('data-fidelity="UNMEASURED"');
  });

  it("× THE PAINTED PLAQUE: a different reading must produce a different word", () => {
    // The falsifier for a hard-coded plaque. If the reading were ignored,
    // these two renders would be byte-identical and this is the only gate in
    // the file that would notice.
    const degraded = render({ honesty: { fidelity: "DEGRADED", asOf: AS_OF, reasons: [] } });
    const executable = render({ honesty: { fidelity: "EXECUTABLE", asOf: AS_OF, reasons: [] } });
    expect(degraded).not.toBe(executable);
    expect(executable).toContain('data-fidelity="EXECUTABLE"');
    expect(executable).toContain("INTACT");
  });

  it("carries the plaque in BOTH placements — the rail and the phone band", () => {
    // One compiled spine, two projections. A plate that appears on desktop and
    // vanishes on a phone is a second truth policy keyed on viewport.
    for (const presentation of ["band", "rail"] as const) {
      const html = render({ presentation, honesty: null });
      expect(html, presentation).toContain('data-testid="honesty-plaque"');
    }
  });

  it("× THE HARD-CODED PLAQUE: /charts must compose a reading, never write a literal", () => {
    const dash = readFileSync(resolve(__dirname, "../chart/ChartsDashboard.tsx"), "utf8");
    // The composition moved OUT of the dashboard memo and into
    // `readCanvasHonesty`, which now owns the sanctioned crossing, the choice
    // of accept-site stamp, and the refusal. The assertions moved with it
    // rather than being dropped — they are enforced against the new owner in
    // lib/marketData/readCanvasHonesty.test.ts, and what is pinned HERE is
    // that /charts still delegates instead of growing a second copy.
    expect(dash).toContain("readCanvasHonesty");
    expect(dash).toContain("honesty: chartHonesty");
    // The literal that made the organ decorative on its first caller.
    expect(dash).not.toContain("reading={null}");
    // Imported AND used — a dead import satisfies a naive source scan.
    expect(dash.split("readCanvasHonesty").length - 1).toBeGreaterThan(1);
    // AND THE SURFACE MUST NOT RE-DERIVE. A dashboard that calls the crossing
    // itself is a second owner of the reading, which is the state this
    // extraction exists to end.
    expect(dash).not.toContain("fidelityFromPipelineLabel(");
    expect(dash).not.toContain("readMarketFidelity(");
  });

  it("× THE SECOND GRADER: the chip and the plaque read ONE grading", () => {
    const dash = readFileSync(resolve(__dirname, "../chart/ChartsDashboard.tsx"), "utf8");
    // Two independent calls to the grader on one surface is precisely how a
    // masthead chip reading ACTIVE DEGRADED comes to sit beside a plaque
    // reading EXECUTABLE about one instrument at one instant.
    expect(dash.split("resolveChartSurfaceBadge(").length - 1).toBe(1);
    expect(dash).toContain("const b = chartSurfaceBadge;");
  });

  it("× THE SILENT DEFAULT: an unfinished question may not be folded into a word", () => {
    // The refusal followed the composition into `readCanvasHonesty`. Pinned
    // here at its new address so the breadcrumb does not simply vanish, and
    // exercised behaviourally (not just scanned) in that module's own suite.
    const owner = readFileSync(
      resolve(__dirname, "../../lib/marketData/readCanvasHonesty.ts"),
      "utf8",
    );
    // AWAITING and UNAVAILABLE both set `availability`. Grading either into one
    // of the five manufactures a measurement out of an open question.
    expect(owner).toContain("if (input.badge.availability !== undefined) return null;");
    // asOf IS AN OBSERVATION, never a clock read at render. `Date.now()` here
    // is the move that stamped a 12-hour-old close as now.
    //
    // Scanned against CODE ONLY. This assertion fired on its first run against
    // the module's own docblock — the paragraph that promises Date.now never
    // appears. That is the third time this shift a source scan has caught a
    // comment, and the third time the stripper was fixed rather than the
    // assertion weakened.
    const ownerCode = owner
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//"))
      .join("\n");
    expect(ownerCode).not.toContain("Date.now()");
  });
});

/**
 * THE LEDGER MUST SAY WHICH CONDITIONS ARE OWED.
 *
 * MEASURED LIVE 2026-09-20, /charts, BTC · 1h: the rail drew `WAIT ●●●■■■■`.
 * Four conditions owed, zero of them named — one was named in the sentence
 * beneath, sampled from a capped array, and the remaining three appeared
 * nowhere on the screen at all. Canon mockup 123 draws the same ledger as
 * NAMED first-class conditions: [DIRECTION ✓] … [AGGRESSION ?] [CLC ?].
 *
 * These are wrong-answer laws, not rename laws: a chip that lost its mark, or
 * a roster that quietly named only the nodes it could reach, typechecks
 * perfectly and reads as a finished feature.
 */
describe("DecisionSpineBand — evidence chips are NAMED conditions (canon 123)", () => {
  const rollDebt = {
    payable: 5,
    watch: 0,
    resolved: 3,
    missing: 2,
    warn: 0,
    missingLabels: ["Aggression", "CLC"],
    missingPayableLabels: ["Aggression"],
    missingPayable: 1,
    warnLabels: [],
    roll: [
      { key: "direction", label: "Direction", standing: "RESOLVED" as const, payableNow: false, venueBlocked: false },
      { key: "location", label: "Location", standing: "RESOLVED" as const, payableNow: false, venueBlocked: false },
      { key: "available-r", label: "Available R", standing: "RESOLVED" as const, payableNow: false, venueBlocked: false },
      { key: "aggression", label: "Aggression", standing: "MISSING" as const, payableNow: true, venueBlocked: false },
      { key: "clc", label: "CLC", standing: "MISSING" as const, payableNow: false, venueBlocked: false },
    ],
  };

  it("prints every owed condition by name, not only the sampled one", () => {
    const html = render({ presentation: "rail", oneStory: oneStory({ debt: rollDebt }) });
    for (const label of ["Direction", "Location", "Available R", "Aggression", "CLC"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('data-testid="evidence-ladder-roster"');
    expect(html).toContain('data-named="5"');
  });

  it("states each standing in a MARK, so the ledger survives greyscale", () => {
    // Colour-only encoding is unreadable to a colour-blind trader and invisible
    // in the grey screenshots this product is reviewed in.
    const html = render({ presentation: "rail", oneStory: oneStory({ debt: rollDebt }) });
    expect(html).toContain("✓");
    expect(html).toContain("?");
  });

  it("speaks each chip as one phrase, never a bare glyph", () => {
    const html = render({ presentation: "rail", oneStory: oneStory({ debt: rollDebt }) });
    expect(html).toContain("Aggression: owed");
    expect(html).toContain("Direction: settled");
  });

  it("keeps the rail inside H-101's three-condition attention budget", () => {
    const html = render({ presentation: "rail", oneStory: oneStory({ debt: rollDebt }) });
    expect(html.match(/data-testid="evidence-ladder-chip"/g)).toHaveLength(3);
    expect(html).toContain('data-visible="3"');
    expect(html).toContain('data-collapsed="2"');
    expect(html).toContain('data-testid="evidence-ladder-more"');
    expect(html).toContain("+2");
    // The two collapsed facts remain inspectable and spoken; visual restraint
    // must never become evidence deletion.
    expect(html).toContain("Aggression: owed");
    expect(html).toContain("CLC: owed");
  });

  it("draws NO roster at all when the chain carried no names", () => {
    // A placeholder chip would be a fabricated condition. The anonymous bar is
    // the truthful rendering of an input with no identity in it.
    const html = render({
      presentation: "rail",
      oneStory: oneStory({
        debt: { payable: 4, watch: 0, resolved: 0, missing: 4, warn: 0, missingLabels: ["Regime"], missingPayableLabels: [], missingPayable: 0, warnLabels: [] },
      }),
    });
    expect(html).not.toContain('data-testid="evidence-ladder-roster"');
    expect(html).toContain('data-testid="evidence-ladder"');
  });
});

/**
 * WAIT MUST SAY WHETHER IT IS FINISHED.
 *
 * MEASURED LIVE 2026-09-20, /charts: the NOW cell read `WAIT` and nothing else.
 * "Stand down, there is nothing to do" and "you have unpaid evidence in front
 * of you" rendered as the same six pixels. Canon 064 / 094 / 123 all draw the
 * finished case explicitly ("No action required. Stand by.").
 *
 * This is a wrong-answer law: printing the finished chip over a workable chain
 * typechecks, renders, and tells a human to sit still in front of their own job.
 */
describe("DecisionSpineBand — WAIT declares whether it is finished (canon 064/094/123)", () => {
  const waiting = (over: Record<string, unknown>) =>
    oneStory({
      decision: { value: "WAIT", detail: "evidence debt", tone: "pending" },
      debt: {
        payable: 4,
        watch: 0,
        resolved: 0,
        missing: 4,
        warn: 0,
        missingLabels: [],
        warnLabels: [],
        missingPayableLabels: [],
        missingPayable: 0,
        ...over,
      },
    });

  it("declares a finished wait, so the trader knows to stand down", () => {
    const html = render({ presentation: "rail", oneStory: waiting({}) });
    expect(html).toContain('data-standing="FINISHED"');
    expect(html).toContain("No action required");
  });

  it("never says no-action-required while evidence is payable", () => {
    const html = render({ presentation: "rail", oneStory: waiting({ missingPayable: 2 }) });
    expect(html).toContain('data-standing="WORKABLE"');
    expect(html).toContain("2 TO RESOLVE");
    expect(html).not.toContain("No action required");
  });

  it("does not dress a venue blockage as a finished wait", () => {
    const html = render({ presentation: "rail", oneStory: waiting({ venueBlocked: 3 }) });
    expect(html).toContain('data-standing="VENUE_BLOCKED"');
    expect(html).not.toContain("No action required");
  });

  it("says nothing about standing when the verdict is not WAIT", () => {
    const html = render({
      presentation: "rail",
      oneStory: oneStory({
        decision: { value: "NO TRADE", detail: "hard rule engaged", tone: "warn" },
        debt: null,
      }),
    });
    expect(html).not.toContain('data-testid="spine-wait-standing"');
  });
});

/**
 * THE DEBT MUST READ AS THE LOCK, NOT AS A NOTE BESIDE ONE.
 *
 * Canon WM_NewMockup_123 heads the roster with "FIRST-CLASS CONDITION ·
 * PERMISSION WITHHELD". The rail drew the verdict and the chips as two
 * neighbouring facts and left the trader to infer that one caused the other.
 *
 * The wrong answer this guards is narrow and expensive: PERMISSION GRANTED
 * rendered above chips that still carry `?`. Both halves are drawn by
 * different lines of one component, so no selector test can catch it — only a
 * render with a contradictory fixture can.
 */
describe("DecisionSpineBand — the GO interlock (canon 123, H-101 leg 3)", () => {
  const held = {
    payable: 5,
    watch: 0,
    resolved: 3,
    missing: 2,
    warn: 0,
    missingLabels: ["Aggression", "CLC"],
    missingPayableLabels: ["Aggression"],
    missingPayable: 1,
    warnLabels: [],
    roll: [
      { key: "direction", label: "Direction", standing: "RESOLVED" as const, payableNow: false, venueBlocked: false },
      { key: "location", label: "Location", standing: "RESOLVED" as const, payableNow: false, venueBlocked: false },
      { key: "available-r", label: "Available R", standing: "RESOLVED" as const, payableNow: false, venueBlocked: false },
      { key: "aggression", label: "Aggression", standing: "MISSING" as const, payableNow: true, venueBlocked: false },
      { key: "clc", label: "CLC", standing: "MISSING" as const, payableNow: false, venueBlocked: false },
    ],
  };

  const waiting = () =>
    oneStory({ decision: { value: "WAIT", detail: "evidence debt", tone: "pending" }, debt: held });

  it("says PERMISSION WITHHELD over an owed roster", () => {
    const html = render({ presentation: "rail", oneStory: waiting() });
    expect(html).toContain('data-testid="go-interlock"');
    expect(html).toContain('data-interlock="HELD"');
    expect(html).toContain("PERMISSION WITHHELD");
  });

  it("never says PERMISSION GRANTED while a condition is owed", () => {
    // The one rendering this whole leg exists to make impossible.
    const html = render({ presentation: "rail", oneStory: waiting() });
    expect(html).not.toContain("PERMISSION GRANTED");
    expect(html).toContain("?");
  });

  it("counts the lock from the same roll the chips are drawn from", () => {
    const html = render({ presentation: "rail", oneStory: waiting() });
    expect(html).toContain('data-held-by="2"');
    expect(html).toContain('data-named="5"');
  });

  it("will not print GRANTED on a paid chain, because this rail has no broker owner", () => {
    // ── E-301 FALSE RIPENESS, and why this test asserts the OPPOSITE of what
    //    an earlier version of it asserted ────────────────────────────────────
    //
    // GO is two contactors in series: gates-not-in-debt AND intent (bars
    // EXECUTABLE and a broker that has answered). ACTION closes the first one
    // and says nothing about the second. This rail is handed `honesty` but is
    // handed no broker honesty by anybody, so the intent contactor has never
    // been MEASURED here — and an unmeasured contactor is not a closed one.
    //
    // So the honest plaque on a fully paid chain is NOT EVALUATED, not GRANTED.
    // If a future change wires a real broker owner into this band, this test
    // SHOULD be rewritten to expect CLEAR — but only alongside that owner. It
    // must never be "fixed" by handing the selector a broker it did not measure.
    const html = render({
      presentation: "rail",
      oneStory: oneStory({
        decision: { value: "ACTION", detail: "required evidence paid", tone: "resolved" },
        debt: { payable: 3, watch: 0, resolved: 3, missing: 0, warn: 0, missingLabels: [], warnLabels: [], missingPayableLabels: [], missingPayable: 0 },
      }),
    });
    expect(html).toContain('data-interlock="NOT_EVALUATED"');
    expect(html).not.toContain("PERMISSION GRANTED");
    expect(html).toContain("paid is not the same as ripe");
  });

  it("distinguishes an unevaluated chain from an open one", () => {
    const html = render({
      presentation: "rail",
      oneStory: oneStory({
        decision: { value: "UNKNOWN", detail: "required evidence not evaluated", tone: "unknown" },
        debt: null,
      }),
    });
    expect(html).toContain('data-interlock="NOT_EVALUATED"');
    expect(html).not.toContain("PERMISSION GRANTED");
  });

  it("does not hide the plaque from a screen reader — it is the only place this fact is said", () => {
    const html = render({ presentation: "rail", oneStory: waiting() });
    expect(html).toContain("PERMISSION WITHHELD. Evidence debt is a first-class condition");
  });
});

/**
 * H-101 / F05A / F06A / P110 — THE RAIL AT REST IS ONE CALM WAIT PLAQUE.
 *
 * MEASURED on serving /charts beside the canon plates, 2026-09-25: four
 * stacked cards at rest (DECISION · NOT BORN + pill; NOW · STATE · WAIT · 2 TO
 * RESOLVE · SESSION ?; RISK · WHY · DETAIL + integrity chip; NEXT + PERMISSION
 * WITHHELD). The Founder: "a lot of just cards, not the actual designs within
 * the canon". Every plate draws ONE plaque — a large serif word, a glyph, one
 * sentence, an asOf stamp — and puts depth behind a fold.
 *
 * These are wrong-answer laws, and static markup can hold them because the
 * fold is a native <details>: what is at rest is exactly what is outside the
 * details element plus its summary.
 */
describe("DecisionSpineBand — H-101: the rail at rest is ONE calm WAIT plaque", () => {
  /** The live /charts ledger shape of 2026-09-25, with its roll. */
  const liveDebt = {
    payable: 7,
    watch: 0,
    resolved: 3,
    missing: 4,
    warn: 0,
    missingLabels: ["Aggression", "CLC", "Available R"],
    missingPayableLabels: ["Available R", "Permission"],
    missingPayable: 2,
    warnLabels: [],
    venueBlocked: 1,
    venueBlockedLabels: ["Aggression"],
    roll: [
      { key: "direction", label: "Direction", standing: "RESOLVED" as const, payableNow: false, venueBlocked: false },
      { key: "location", label: "Location", standing: "RESOLVED" as const, payableNow: false, venueBlocked: false },
      { key: "auction", label: "Auction", standing: "RESOLVED" as const, payableNow: false, venueBlocked: false },
      { key: "aggression", label: "Aggression", standing: "MISSING" as const, payableNow: false, venueBlocked: true },
      { key: "clc", label: "CLC", standing: "MISSING" as const, payableNow: false, venueBlocked: false },
      { key: "risk", label: "Available R", standing: "MISSING" as const, payableNow: true, venueBlocked: false },
      { key: "permission", label: "Permission", standing: "MISSING" as const, payableNow: true, venueBlocked: false },
    ],
  };
  const waitingOn = (debt: Record<string, unknown> = liveDebt) =>
    oneStory({ decision: { value: "WAIT", detail: "evidence debt", tone: "warn" }, debt: debt as never });
  const AS_OF = Date.UTC(2026, 8, 25, 19, 16, 4);

  function split(html: string) {
    // Anchored on the SPINE's drawer, and closed at the LAST </details> before
    // the section ends: the honesty plaque inside the fold carries a native
    // <details> of its own.
    // (The plaque is a <section> too, so the spine's end is the LAST one.)
    const end = html.lastIndexOf("</section>");
    const open = html.indexOf('<details data-testid="spine-detail-drawer"');
    const close = html.lastIndexOf("</details>", end);
    expect(open, "the fold is missing").toBeGreaterThan(-1);
    expect(close).toBeGreaterThan(open);
    const summary = html.slice(html.indexOf("<summary", open), html.indexOf("</summary>", open));
    return {
      rest: html.slice(0, open),
      summary,
      fold: html.slice(open, close),
      after: html.slice(close + "</details>".length, end),
    };
  }

  function railHtml(over: Partial<DecisionSpineBandProps> = {}) {
    return render({
      presentation: "rail",
      oneStory: waitingOn(),
      honesty: { fidelity: "DEGRADED", asOf: AS_OF, reasons: ["DELAYED"] },
      market: { symbol: "TSLA", timeframe: "15m", quality: "LIVE", capturedAt: AS_OF, last: 412.5 },
      canvasSummary: () => <span data-testid="canonical-canvas-verdict">6 blockers</span>,
      onOpenWhy: () => {},
      ...over,
    });
  }

  it("at rest: one state word, one glyph, one reason sentence, one asOf — and nothing else but the fold's handle", () => {
    const { rest, after } = split(railHtml());
    expect(rest.match(/data-testid="spine-wait-plaque"/g)).toHaveLength(1);
    expect(rest.match(/data-testid="spine-now-state"/g)).toHaveLength(1);
    expect(rest).toContain(">WAIT<");
    expect(rest.match(/data-testid="spine-plaque-reason"/g)).toHaveLength(1);
    expect(rest.match(/data-testid="spine-plaque-asof"/g)).toHaveLength(1);
    expect(rest).toContain("asOf 19:16:04Z");
    expect(rest).toContain("⚖");
    // Everything the four cards used to show at rest is NOT at rest any more.
    for (const organ of [
      "spine-provenance-header",
      "spine-decision-absent",
      "spine-canvas-summary",
      "spine-next",
      "go-interlock",
      "honesty-plaque",
      "evidence-ladder",
      "risk-reach",
      "why-severity",
      "spine-available-r-detail",
    ]) {
      expect(rest, `${organ} is still a card at rest`).not.toContain(`data-testid="${organ}`);
    }
    // No cell trails the fold: the rail ends at the door.
    expect(after).not.toContain("data-testid");
    expect(after).not.toContain("<div");
  });

  it("the fold holds the rest, whole, and ships CLOSED", () => {
    const html = railHtml();
    expect(html.match(/<details data-testid="spine-detail-drawer"/g)).toHaveLength(1);
    expect(html).not.toMatch(/<details data-testid="spine-detail-drawer"[^>]*\sopen/);
    // Nothing at rest is a disclosure of its own — one door, one fold.
    expect(split(html).rest).not.toContain("<details");
    const { fold } = split(html);
    for (const organ of [
      "spine-provenance-header",
      "spine-decision-absent",
      "spine-canvas-summary",
      "spine-next",
      "go-interlock",
      "honesty-plaque",
      "evidence-ladder-roster",
      "spine-available-r-detail",
    ]) {
      expect(fold, `${organ} was deleted rather than folded`).toContain(`data-testid="${organ}`);
    }
    expect(fold).toContain("PERMISSION WITHHELD");
    expect(fold).toContain("Resolve available R");
    expect(fold).toContain("Full evidence");
    // The id's absence REASON is printed inside the fold, not hidden.
    expect(fold).toContain("No decision born yet — permission has not crossed.");
  });

  it("keeps the existing truth at rest: the WAIT debt count, the session, and a wounded integrity word on the handle", () => {
    const { rest, summary } = split(railHtml());
    expect(rest).toContain('data-standing="WORKABLE"');
    expect(rest).toContain(">2 TO RESOLVE<");
    expect(rest).toContain(">SESSION ?<");
    expect(summary).toContain('data-testid="spine-fold-integrity"');
    expect(summary).toContain("WOUNDED");
    expect(summary).toContain(">Decision · Risk · Why · Next<");
  });

  it("the sentence is the compiled ledger's first payable node, in F05A's voice — the node NEXT names", () => {
    const { rest, fold } = split(railHtml());
    expect(rest).toContain('data-plaque-basis="FIRST_PAYABLE"');
    expect(rest).toContain('data-plaque-node="Available R"');
    expect(rest).toContain(">RISK NOT DECLARED<");
    expect(rest).toContain(">CLARITY PRECEDES ENTRY<");
    expect(fold).toContain("Resolve available R");
  });

  it("× THE PAINTED PLAQUE: a different ledger produces a different sentence", () => {
    const finished = {
      ...liveDebt,
      missing: 1,
      missingPayable: 0,
      missingPayableLabels: [],
      venueBlocked: 0,
      venueBlockedLabels: [],
      missingLabels: ["Regime"],
      roll: [
        { key: "regime", label: "Regime", standing: "MISSING" as const, payableNow: false, venueBlocked: false },
        { key: "direction", label: "Direction", standing: "RESOLVED" as const, payableNow: false, venueBlocked: false },
      ],
    };
    const a = split(railHtml()).rest;
    const b = split(railHtml({ oneStory: waitingOn(finished) })).rest;
    expect(b).toContain(">LET STRUCTURE DEVELOP<");
    expect(b).toContain('data-standing="FINISHED"');
    expect(a).not.toContain("LET STRUCTURE DEVELOP");
    expect(b).not.toContain("RISK NOT DECLARED");
  });

  it("never borrows F06A's ABSORPTION sentence — no owner on this rail publishes absorption", () => {
    expect(railHtml()).not.toMatch(/ABSORPTION/i);
  });

  it("asOf is the canonical capture, UNKNOWN when absent, and withheld under a replay camera", () => {
    const unknown = split(railHtml({ market: { symbol: "TSLA", timeframe: "15m", quality: null, capturedAt: null, last: null } })).rest;
    expect(unknown).toContain("asOf UNKNOWN");
    expect(unknown).not.toContain("1970");
    const replay = split(railHtml({ replayEngaged: true })).rest;
    const stamp = replay.slice(replay.indexOf('data-testid="spine-plaque-asof"'));
    expect(stamp).toContain("BAR REPLAY");
    expect(replay).not.toContain("asOf 19:16:04Z");
    expect(replay).toContain('data-replay-camera="engaged"');
  });

  it("with no story compiled there is no word on the plate — and it says why rather than guess", () => {
    const { rest } = split(railHtml({ oneStory: null }));
    expect(rest).not.toContain('data-testid="spine-now-state"');
    expect(rest).toContain('data-plaque-basis="NONE"');
    expect(rest).toContain(">NO STORY COMPILED<");
    expect(rest).not.toMatch(/>(WAIT|ACTION|NO TRADE|CAUTION|UNKNOWN)</);
  });

  it("ACTION on this rail is never a green light — paid is not ripe", () => {
    const html = railHtml({
      oneStory: oneStory({
        decision: { value: "ACTION", detail: "required evidence paid", tone: "resolved" },
        debt: { payable: 3, watch: 0, resolved: 3, missing: 0, warn: 0, missingLabels: [], warnLabels: [], missingPayableLabels: [], missingPayable: 0 },
      }),
    });
    const { rest } = split(html);
    expect(rest).toContain(">ACTION<");
    expect(rest).toContain("PERMISSION NOT EVALUATED");
    expect(html).not.toContain("PERMISSION GRANTED");
  });

  it("F06A: order-flow context sits beneath the plaque at rest — only with a reading, provenance printed", () => {
    const flow = { buyPct: 72, sellPct: 28, provenance: "INFERRED" as const, basis: "TICK-RULE SIDES · INFERRED" };
    const { rest } = split(railHtml({ flowContext: flow }));
    const plaqueAt = rest.indexOf('data-testid="spine-wait-plaque"');
    const flowAt = rest.indexOf('data-testid="spine-flow-context"');
    expect(flowAt, "the panel is not at rest").toBeGreaterThan(plaqueAt);
    expect(rest).toContain('data-provenance="INFERRED"');
    expect(rest).toContain(">72%<");
    expect(rest).toContain(">28%<");
    expect(rest).toContain("width:72%");
    expect(rest).toContain("TICK-RULE SIDES · INFERRED");
    // F06A's BOOK words are not this reading's words.
    expect(rest).not.toMatch(/STACK/i);
    // No reading → no panel; a replay camera → withheld like the clock.
    expect(railHtml({ flowContext: null })).not.toContain('data-testid="spine-flow-context"');
    expect(railHtml()).not.toContain('data-testid="spine-flow-context"');
    expect(railHtml({ flowContext: flow, replayEngaged: true })).not.toContain('data-testid="spine-flow-context"');
    // The band is not the 1440 frame.
    expect(render({ flowContext: flow })).not.toContain('data-testid="spine-flow-context"');
  });

  it("the phone band is not the 1440 frame — it draws no plaque and keeps every cell inline", () => {
    const band = render({ oneStory: waitingOn() });
    expect(band).not.toContain('data-testid="spine-wait-plaque"');
    expect(band).not.toContain("<details");
    for (const label of ["Decision", "Now", "Market", "Risk", "Why", "Next"]) {
      expect(band).toContain(`>${label}<`);
    }
  });
});
