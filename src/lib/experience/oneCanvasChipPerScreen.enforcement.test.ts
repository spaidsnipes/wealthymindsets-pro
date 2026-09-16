/**
 * TWO CHIPS UNDER ONE NAME IS ONE CHIP THAT STUTTERS.
 *
 * WHAT WAS ON THE PHONE. ChartsDashboard renders its canvas verdict twice on
 * one branch and once on the other:
 *
 *   desktop  (!narrowViewport && !optionsOpen) → DecisionSpineBand rail,
 *                                                which receives `canvasSummary`
 *                                                = <CanvasSummaryPill/>
 *   phone /  (narrowViewport || optionsOpen)   → DecisionSpineBand band, SAME
 *   options                                      `canvasSummary` pill …
 *                                                … PLUS a second
 *                                                <CanvasSummaryPill/> in the
 *                                                breadcrumb row
 *
 * Both pills carried `ariaLabel="Chart market canvas summary"`. Two
 * `role="status"` regions, one accessible name, one underlying fact. A screen
 * reader announced the canvas twice; a sighted phone user got the widest chip
 * in the app in the narrowest row in the app.
 *
 * WHY IT SURVIVED. The duplicate existed ONLY on the branch a desktop review
 * never renders. The phone is the primary device by standing mandate and was
 * the one configuration nobody was looking at. That is not a coincidence — it
 * is the reason this class of defect accumulates there.
 *
 * THE FIX mounts CanvasBadgeMini — the verdict-only primitive that had been a
 * BORN ORPHAN since 8030f0a, written for exactly this surface and never given
 * one. The full pill keeps sole ownership of the counts, in the band, where
 * they can be read.
 *
 * This is a source-level Sentinel: @testing-library/react is not installed in
 * this repo, so the mount cannot be asserted by rendering. It is pinned at
 * ChartsDashboard because CanvasBadgeMini and CanvasSummaryPill can both stay
 * perfect forever while a caller mounts two of one of them.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DASH = resolve(__dirname, "../../components/chart/ChartsDashboard.tsx");
const src = () => readFileSync(DASH, "utf8");

/** JSX comments, block comments and line comments. A COMMENT IS NOT A CONSUMER. */
const codeOnly = () =>
  src()
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");

describe("× TWO CHIPS UNDER ONE NAME — /charts announces the canvas once", () => {
  it("the stripper really strips, so every count below is a count of CODE", () => {
    // Non-vacuity. The docblock left at the mount quotes the defect, so a
    // naive count would otherwise be satisfied by prose about the defect.
    expect(src()).toContain("CanvasSummaryPill ariaLabel=");
    expect(codeOnly()).not.toContain("CanvasSummaryPill ariaLabel=");
  });

  it("mounts CanvasSummaryPill exactly ONCE", () => {
    // THE DEFECT, counted. Two mounts is the bug no matter which branch each
    // one sits on, because the branches overlap on phone and options views.
    const mounts = codeOnly().match(/<CanvasSummaryPill\b/g) ?? [];
    expect(mounts.length, "a second canvas pill is back — one fact, two status regions")
      .toBe(1);
  });

  it("gives the tight-surface chip its OWN accessible name", () => {
    // The duplicate was not merely redundant, it was INDISTINGUISHABLE. Two
    // regions may coexist; two regions under one name may not, because a
    // screen-reader user cannot tell which one they have landed on.
    const code = codeOnly();
    const names = code.match(/ariaLabel="Chart[^"]*"/g) ?? [];
    expect(names.length).toBeGreaterThan(1);
    expect(new Set(names).size, `duplicate accessible names: ${names.join(", ")}`)
      .toBe(names.length);
  });

  it("hands the mini chip the SAME compiled vm — the wire, not just the tag", () => {
    // THE BANS CANNOT SEE AN ARGUMENT THAT WAS NEVER PASSED. A
    // <CanvasBadgeMini/> fed some other object would satisfy a tag check and
    // put a SECOND verdict owner on the screen, which is the original sin in
    // a new costume.
    expect(codeOnly()).toMatch(/<CanvasBadgeMini[\s\S]{0,120}?\bvm=\{chartMarketCanvas\}/);
  });

  it("still feeds the spine the full pill — the counts did not vanish", () => {
    // Non-vacuity in the load-bearing direction. If the fix had merely deleted
    // a chip, every assertion above would pass and the phone would have LOST
    // the blocker / unresolved / would-invalidate counts entirely.
    expect(codeOnly()).toMatch(/canvasSummary:\s*\([\s\S]{0,200}?<CanvasSummaryPill/);
  });
});
