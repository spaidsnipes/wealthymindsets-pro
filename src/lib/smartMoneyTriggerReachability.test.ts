/**
 * smartMoneyTriggerReachability — the branded Smart Money control must be
 * REACHABLE ON SIGHT on /charts, not buried behind a menu that never says its
 * name.
 *
 * What happened, plainly:
 *
 *   e3ce41f "refactor(charts): disclose advanced study controls on demand"
 *   moved the ENTIRE second toolbar row behind `studyToolsOpen`, which
 *   defaults to false. The branded Smart Money trigger lived inside that row.
 *   From the trader's seat this is indistinguishable from deletion: the
 *   control vanished from the chart, and its only surviving path was
 *   ChartToolbar → Advanced → "Flow & studies" — a label that never utters
 *   the words "Smart Money".
 *
 *   Verified against production before the fix: the live /charts DOM returned
 *   zero nodes matching /smart money/i across 101 buttons.
 *
 * Why this class of defect needs a Sentinel and not just a fix:
 *
 *   Progressive disclosure is the right instinct for a dense study strip, and
 *   it will be reached for again. But an identity-bearing, branded control is
 *   not a study tool — hiding it does not quiet the room, it removes the
 *   product's signature from its primary surface. Nothing in the type system
 *   distinguishes "one more control tucked into the row" from "the brand mark
 *   tucked into the row", so the next disclosure refactor can silently redo
 *   this. These assertions fail the moment it does.
 *
 * This deliberately does NOT assert the study row is visible. The row stays
 * gated; that part of e3ce41f was correct and is pinned by
 * chartProgressiveDisclosure.test.ts. The only claim here is that the Smart
 * Money trigger renders OUTSIDE it.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(__dirname, "..", "..");

const dashboard = readFileSync(
  resolve(REPO_ROOT, "src/components/chart/ChartsDashboard.tsx"),
  "utf8",
);
const toolbar = readFileSync(
  resolve(REPO_ROOT, "src/components/chart/ChartToolbar.tsx"),
  "utf8",
);

/** The `studyToolsOpen`-gated dense strip, matched from its opening brace. */
const STUDY_ROW_GATE =
  '{(activeTab === "Chart" || activeTab === "Options") && studyToolsOpen && <div className="wm-chart-tools';

/** The always-visible identity strip, matched from its opening brace. */
const IDENTITY_STRIP_GATE =
  '{(activeTab === "Chart" || activeTab === "Options") && <div className="wm-chart-identity-strip';

/** The branded trigger itself — the logo is the Founder-named requirement. */
const TRIGGER_LOGO = "<WMLogo size={18} showGlow={smartMoneyOpen} /> Smart Money";

/**
 * Find the `}` closing the JSX expression container that starts at `open`.
 *
 * Skips string and template literals and both comment forms, so a brace inside
 * `"{"` or `/* { *\/` cannot desynchronise the depth count. Returns -1 if the
 * braces never balance, which the positive control below turns into a red test
 * rather than a silently-empty range.
 */
function matchBrace(code: string, open: number): number {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    const c = code[i];
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i++;
      while (i < code.length && code[i] !== quote) {
        if (code[i] === "\\") i++;
        i++;
      }
      continue;
    }
    if (c === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2);
      i = end < 0 ? code.length : end + 1;
      continue;
    }
    if (c === "/" && code[i + 1] === "/") {
      const end = code.indexOf("\n", i);
      i = end < 0 ? code.length : end;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** [start, end] source offsets of the JSX block opened by `gate`. */
function blockRange(code: string, gate: string): [number, number] {
  const open = code.indexOf(gate);
  if (open < 0) return [-1, -1];
  return [open, matchBrace(code, open)];
}

describe("smart money trigger reachability", () => {
  it("the containment detector is not vacuous", () => {
    // Axis 1: we are reading the real dashboard, not an empty/renamed file.
    expect(dashboard.length).toBeGreaterThan(50_000);

    // Axis 2: both gates exist in source. If a refactor renames either class,
    // every containment assertion below would compare against [-1, -1] and pass
    // for the wrong reason. Fail loudly here instead.
    const [studyStart, studyEnd] = blockRange(dashboard, STUDY_ROW_GATE);
    const [stripStart, stripEnd] = blockRange(dashboard, IDENTITY_STRIP_GATE);
    expect(studyStart).toBeGreaterThan(-1);
    expect(stripStart).toBeGreaterThan(-1);

    // Axis 3 — POSITIVE CONTROL. The brace matcher must actually close the
    // block. FootprintControls and DrawingToolsPanel are known-good residents
    // of the dense study row: if matchBrace() returns a truncated or degenerate
    // range, they fall outside it and this control goes red BEFORE the
    // "Smart Money is not in the row" assertion can pass vacuously. A detector
    // that contains nothing reports "nothing is buried" forever, and that reads
    // exactly like a clean bill of health.
    expect(studyEnd).toBeGreaterThan(studyStart);
    expect(stripEnd).toBeGreaterThan(stripStart);
    const studyRow = dashboard.slice(studyStart, studyEnd);
    expect(studyRow).toContain("<FootprintControls");
    expect(studyRow).toContain("<DrawingToolsPanel");

    // Axis 4: the two blocks are disjoint siblings, not nested. Nesting would
    // make "outside the study row" unprovable by offset comparison.
    expect(stripEnd).toBeLessThan(studyStart);
  });

  it("renders exactly one Smart Money trigger — no duplicate, single writer", () => {
    const triggers = dashboard.match(/aria-label="Open Smart Money panel"/g) ?? [];
    expect(triggers).toHaveLength(1);

    const logos = dashboard.split(TRIGGER_LOGO).length - 1;
    expect(logos).toBe(1);
  });

  it("FOUNDER GATE: the trigger carries the WM logo, not a generic icon", () => {
    // "it should be on the charts section still with the new logo"
    //   — Founder, 2026-09-04
    expect(dashboard).toContain(TRIGGER_LOGO);
    expect(dashboard).toContain('import { WMLogo } from "@/components/ui/WMLogo"');
  });

  it("FOUNDER GATE: the trigger is NOT inside the studyToolsOpen-gated row", () => {
    const [studyStart, studyEnd] = blockRange(dashboard, STUDY_ROW_GATE);
    const studyRow = dashboard.slice(studyStart, studyEnd);

    // This is the exact regression e3ce41f introduced. If a future disclosure
    // refactor sweeps the trigger back into the dense row, this goes red.
    expect(studyRow).not.toContain("Smart Money");
    expect(studyRow).not.toContain("setSmartMoneyOpen");
  });

  it("FOUNDER GATE: the trigger sits in a strip gated only by the chart surface", () => {
    const [stripStart, stripEnd] = blockRange(dashboard, IDENTITY_STRIP_GATE);
    const strip = dashboard.slice(stripStart, stripEnd);

    // Present in the always-visible strip...
    expect(strip).toContain(TRIGGER_LOGO);
    expect(strip).toContain("setSmartMoneyOpen");

    // ...and that strip depends on NOTHING that defaults to closed. Any
    // `*Open` state name appearing in its gate expression would reintroduce a
    // default-hidden path. The gate is the text before the opening <div.
    const gateExpr = strip.slice(0, strip.indexOf("<div"));
    expect(gateExpr).toContain('activeTab === "Chart"');
    expect(gateExpr).not.toMatch(/Open\b/);
  });

  it("records WHY the menu path alone was not enough", () => {
    // The Advanced menu still offers the study row, and should. But its label
    // never says "Smart Money" — which is precisely why the control read as
    // deleted. Pinned so nobody "fixes" this by arguing the menu was
    // sufficient discovery.
    expect(toolbar).toContain("Flow &amp; studies");
    const menuItem = toolbar.slice(
      toolbar.indexOf("Flow &amp; studies") - 200,
      toolbar.indexOf("Flow &amp; studies") + 100,
    );
    expect(menuItem).not.toContain("Smart Money");
  });
});
