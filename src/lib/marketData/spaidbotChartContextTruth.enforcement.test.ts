/**
 * The AI assistant may not be handed a day-change it cannot back.
 *
 * WHY THIS FILE EXISTS (2026-09-05). After the REGIME chip was fixed I swept
 * for the same defect class and found it had already escaped the screen. The
 * chain was fully wired and entirely real:
 *
 *   ChartsDashboard.tsx:751
 *     data-ctx={JSON.stringify({ … change: ticker.change, changePct: ticker.changePct })}
 *   SpaidBotButton.tsx:83
 *     document.getElementById("wm-chart-context")  →  JSON.parse(el.dataset.ctx)
 *     →  POST /api/spaidbot  { context }
 *   route.ts:92
 *     if (context.changePct !== undefined)
 *       ctxNote += ` (${context.changePct >= 0 ? "+" : ""}${context.changePct.toFixed(2)}%)`;
 *
 * `!== undefined` is the same too-weak guard that put "+0.00% last session" on
 * the visible chip. useWebSocket.flush() leaves change and changePct at their
 * initial 0 until a real prior close arrives, so the zero-pair is the absence
 * sentinel — and it is very much `!== undefined`. On a closed Saturday the
 * model's own prompt therefore read:
 *
 *   [Current chart: GC1! @ $4,476.60 (+0.00%)]
 *
 * while the SYSTEM_PROMPT in that same file told it "Never invent current
 * prices" and "When live evidence is missing, say exactly what is missing".
 * The model cannot disclose a gap it was never shown.
 *
 * This is WORSE than the chip, not better. A chip sits beside a fidelity badge
 * and a SESSION CLOSED label a trader can weigh. Assistant prose carries
 * conversational authority and arrives with no badge at all.
 *
 * WHAT IS PINNED. Both ends, because either one alone is insufficient:
 *   - The route guards independently, since any authenticated client can POST a
 *     hand-crafted body. A publisher-side fix cannot bind a hostile caller.
 *   - The publisher stops emitting the number anyway, so the defect cannot be
 *     re-litigated by a future route refactor.
 * Every ban below was checked against the real pre-fix source at HEAD~ — that
 * is the only reason each one is here. Whole-file `toContain` is deliberately
 * NOT the mechanism: a revive can keep the import and hand-roll the arithmetic
 * beside it.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROUTE = resolve(__dirname, "../../app/api/spaidbot/route.ts");
const DASHBOARD = resolve(__dirname, "../../components/chart/ChartsDashboard.tsx");
const BUTTON = resolve(__dirname, "../../components/layout/SpaidBotButton.tsx");

/**
 * Comments are stripped BEFORE anything is matched. The doc comment on the
 * route quotes the defect verbatim in order to explain it, so a naive scan
 * would fail on the very sentence documenting the fix. This already bit the
 * sibling regime Sentinel once.
 */
const code = (path: string) =>
  readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");

describe("/api/spaidbot builds the chart note from the canonical owner", () => {
  it("composes formatChartContextNote", () => {
    // Necessary, not sufficient — the bans below are what actually hold.
    expect(code(ROUTE)).toContain("formatChartContextNote");
  });

  it("no `!== undefined` guard survives near changePct", () => {
    // THE DEFECT, verbatim. The zero-pair passes this test, which is exactly
    // how a closed Saturday became "(+0.00%)" inside the model's prompt.
    expect(code(ROUTE)).not.toMatch(/changePct\s*!==\s*undefined/);
  });

  it("the route does not format a percentage itself", () => {
    // `${context.changePct.toFixed(2)}%` was the print statement. Any percent
    // rendered in this file is a claim made outside the owner that decides
    // whether the claim is backed.
    expect(code(ROUTE)).not.toMatch(/toFixed\(\s*2\s*\)\s*\}\s*%/);
  });

  it("the note text is not re-assembled inline", () => {
    // Rebuilding the bracket by hand is how the guard gets separated from the
    // string it guards. The whole note comes from one pure function.
    expect(code(ROUTE)).not.toContain("[Current chart:");
  });

  it("the guard is re-derived server-side, not trusted from the body", () => {
    // Any authenticated client can POST here. A `displayable: true` flag in the
    // request body must never be sufficient to print a change.
    expect(code(ROUTE)).not.toMatch(/context(\?)?\.(displayable|changeDisplayable)/);
  });
});

describe("the publisher stops emitting an unbacked change", () => {
  /** The hidden span, delimited structurally rather than by a character window. */
  const contextSpan = () => {
    const src = code(DASHBOARD);
    const start = src.indexOf('id="wm-chart-context"');
    expect(start, "#wm-chart-context span not found in ChartsDashboard").toBeGreaterThan(-1);
    const end = src.indexOf("/>", start);
    expect(end).toBeGreaterThan(start);
    return src.slice(start, end);
  };

  it("data-ctx does not publish raw ticker.changePct", () => {
    // The pre-fix attribute was `changePct: ticker.changePct` — raw, unguarded,
    // straight off the socket shape whose absence sentinel is a literal zero.
    expect(contextSpan()).not.toMatch(/ticker\.changePct/);
    expect(contextSpan()).not.toMatch(/ticker\.change\b/);
  });

  it("data-ctx routes the change through the canonical selector", () => {
    expect(contextSpan()).toContain("selectTickerChangeDisplay");
  });

  it("the change keys are conditional on displayability", () => {
    // Emitting `changePct: 0` unconditionally would satisfy the bans above
    // while reopening the defect. The keys must be absent, not zeroed.
    expect(contextSpan()).toMatch(/displayable\s*\n?\s*\?/);
  });
});

describe("the wire between the two ends is real", () => {
  it("SpaidBotButton reads the same element id the dashboard publishes", () => {
    // If this drifts, every ban above is guarding a span nobody reads, and the
    // real one is unguarded. The id is the join.
    expect(code(BUTTON)).toContain('getElementById("wm-chart-context")');
    expect(code(DASHBOARD)).toContain('id="wm-chart-context"');
  });

  it("SpaidBotButton forwards that payload to the route as `context`", () => {
    const src = code(BUTTON);
    expect(src).toContain("dataset.ctx");
    expect(src).toMatch(/context:\s*getContext\(\)/);
  });
});
