/**
 * SCENE_FRAGMENTATION guard — the /charts permanent frame.
 *
 * `deckSceneFragmentation.test.ts` pins the deck's workspace pieces. This is
 * its sibling for the primary trading surface, and it pins a DIFFERENT half
 * of the same defect class.
 *
 * `WMExperienceShell` is the outer parent for every Founder route and it is
 * what publishes the sanctuary: vignette, grain, WATER-BREATH. A child that
 * paints its own opaque background does not merely fail to participate — it
 * actively OCCLUDES the atmosphere it is supposed to be living inside, and
 * the surface re-reads as "an app pane bolted into a sanctuary frame".
 *
 * On /charts that occlusion ran all the way around MARKET: the 36px tool
 * band above, the 40px drawing rail left, the info panel and its 14px
 * collapse strip right, the order-flow strip and timeframe rail below. Each
 * painted its own `#0D0E14` with a hard `#1E2030` rule, so the sanctuary
 * stopped dead at the edge of the candles and the chart sat in a visible box.
 *
 * The cure is ONE OWNER, not six rgba values. `.wm-room-chrome` shares the
 * single `.wm-sticky-glass` declaration — same block, two selectors — so the
 * `@supports` fallback and BOTH theme restatements are extended together and
 * a future theme cannot drift one and forget the other.
 *
 * ── WHY THIS GATE EXISTS AT ALL ───────────────────────────────────────
 * `tsc --noEmit` is structurally blind to every line of this. A CSS string's
 * content is type-correct at any value, and `background: "#0D0E14"` is a
 * perfectly well-typed `React.CSSProperties`. Unit tests that mount these
 * components are blind too: the defect is a COLOR, and it renders happily.
 * Only a source-level assertion can hold this, which is why it is pinned
 * here rather than left to the build.
 *
 * ── THE TRAPS THIS SUITE DELIBERATELY ENCODES ─────────────────────────
 *
 * 1. THEME COUPLING. `globals.css` implements neon and light as attribute
 *    selectors keyed on the inline hex STRING itself —
 *    `.wm-neon [style*="#0D0E14"]`. Deleting an inline hex therefore
 *    silently breaks two alternate visual constitutions unless the element
 *    is given a replacement hook the theme rules also target. That is the
 *    entire reason `.wm-room-chrome` has explicit neon/light restatements,
 *    and this suite fails if either one goes missing.
 *
 * 2. THE POPOVER EXCEPTION IS LOAD-BEARING. Translucency is NOT universally
 *    correct. Floating popovers — drawing-tool palettes, watchlist menus,
 *    dropdowns — sit ON TOP of live candles and must stay opaque to remain
 *    readable. Glass there would be an accessibility regression dressed up
 *    as atmosphere. `.wm-room-chrome` is deliberately bounded to PERMANENT
 *    FRAME CHROME, and the `isSheet` phone overlay keeping its opaque fill
 *    is asserted as a REQUIREMENT below, not tolerated as an oversight.
 *
 * 3. A GATE A COMMENT CAN TURN RED. The prose above and the comments in the
 *    source files under test both name `#0D0E14` while explaining why it was
 *    removed. A naive `not.toContain` would therefore fail on the very
 *    comment documenting the fix. Every negative assertion below runs on
 *    comment-stripped source.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const READ = (rel: string) => readFileSync(resolve(__dirname, "../..", rel), "utf8");

/** Strip block and line comments so prose about a hex cannot fail a gate. */
const CODE = (rel: string) =>
  READ(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

const css = READ("app/globals.css");

describe("/charts permanent frame is room chrome, not opaque slabs", () => {
  it("gives .wm-room-chrome ONE owner shared with .wm-sticky-glass", () => {
    // Same declaration block, two selectors. `.wm-room-chrome` must come
    // FIRST: founderRoomShell.test.ts matches /\.wm-sticky-glass\s*\{/, so
    // appending instead of prepending would break that sibling gate.
    expect(css).toMatch(/\.wm-room-chrome,\s*\n\.wm-sticky-glass\s*\{/);
  });

  it("extends the no-backdrop-filter fallback to both selectors together", () => {
    // A browser without backdrop-filter must still get an opaque-enough
    // fill, or the chrome becomes unreadable rather than atmospheric.
    const supports = css.slice(css.indexOf("@supports not ((backdrop-filter"));
    const block = supports.slice(0, supports.indexOf("}", supports.indexOf("{")) + 1);
    expect(block).toContain(".wm-room-chrome");
    expect(block).toContain(".wm-sticky-glass");
  });

  it("restates BOTH alternate constitutions for the new selector", () => {
    // Trap 1: the themes are keyed on inline hex strings, so removing a hex
    // without providing these hooks silently breaks neon and light.
    expect(css).toMatch(/\.wm-neon\s+\.wm-room-chrome,\s*\n\s*\.wm-neon\s+\.wm-sticky-glass/);
    expect(css).toMatch(/\.wm-light\s+\.wm-room-chrome,\s*\n\s*\.wm-light\s+\.wm-sticky-glass/);
    // The border restatements must be !important: they override an INLINE
    // declaration, because these frame elements also carry Tailwind border
    // utilities of equal specificity and a class rule would win or lose on
    // stylesheet emission order — a coin flip that moves with Tailwind.
    expect(css).toMatch(/\.wm-neon\s+\.wm-room-chrome\s*\{[^}]*border-color:[^;]*!important/);
    expect(css).toMatch(/\.wm-light\s+\.wm-room-chrome\s*\{[^}]*border-color:[^;]*!important/);
  });

  it("never hand-writes a -webkit-backdrop-filter DECLARATION", () => {
    // MEASURED LIVE, NOT GUESSED. After this material shipped, every
    // `.wm-room-chrome` element on production computed
    // `backdrop-filter: none` while its fill applied correctly — the glass
    // was half-delivered. Cause: the CSS minifier collapses an authored
    // standard+prefixed pair down to the PREFIXED declaration only, and
    // Chrome reports `CSS.supports('-webkit-backdrop-filter','blur(8px)')`
    // as FALSE. So the hand-written prefix is not a safety net; it is the
    // thing that deletes the blur. `.wm-shell-header` declares ONLY the
    // standard property and the build emitted BOTH — it blurs correctly.
    //
    // A DECLARATION only. The `@supports` CONDITION below legitimately names
    // the prefixed property so a webkit-only engine is not pushed onto the
    // opaque fallback; conditions are not collapsed by the minifier.
    const decls = css
      .split("\n")
      .filter((l) => /^\s*-webkit-backdrop-filter\s*:/.test(l));
    expect(decls, "hand-written vendor prefix suppresses the blur in Chrome")
      .toEqual([]);
  });

  const FRAME: Array<[string, string]> = [
    ["ChartToolbar.tsx", "the 32px tool band above MARKET"],
    ["LeftDrawingSidebar.tsx", "the 40px drawing rail left of MARKET"],
    ["StockInfoPanel.tsx", "the info panel right of MARKET"],
    ["ChartsDashboard.tsx", "the study row and the 14px collapse strip"],
    ["TimeframeSelector.tsx", "the timeframe rail under MARKET"],
  ];

  it.each(FRAME)("%s adopts wm-room-chrome (%s)", (file) => {
    expect(CODE(`components/chart/${file}`)).toContain("wm-room-chrome");
  });

  it("leaves no opaque slab on the four single-purpose frame files", () => {
    // ChartsDashboard and StockInfoPanel are excluded from this sweep on
    // purpose: both also contain legitimately-opaque popovers and interior
    // surfaces that are NOT the room boundary. Widening the sweep to them
    // would make this gate a demand to break trap 2.
    for (const file of [
      "ChartToolbar.tsx",
      "OrderFlowCockpitStrip.tsx",
      "TimeframeSelector.tsx",
    ]) {
      const src = CODE(`components/chart/${file}`);
      expect(src, `${file} repainted an opaque slab over the sanctuary`)
        .not.toMatch(/background(-color)?:\s*"#0D0E14"/);
    }
  });

  it("keeps the phone drawing SHEET opaque — readability beats atmosphere", () => {
    // Trap 2. This is a REQUIREMENT, not an oversight. The sheet is an
    // overlay sitting on live candles; glass there would be an
    // accessibility regression. Only the permanent rail became chrome.
    const src = CODE("components/chart/LeftDrawingSidebar.tsx");
    expect(src).toContain('background: "#0D0E14"');
    // Order-tolerant on purpose. A frozen full-ternary literal is exactly the
    // trap that made responsiveShell.test.ts unextendable — class order
    // carries no CSS meaning, so pin the MEMBERSHIP, not the spelling.
    const branches = src.match(/isSheet \? "([^"]*)" : "([^"]*)"/);
    expect(branches, "the sheet/rail class ternary is missing").not.toBeNull();
    const [, sheetClasses, railClasses] = branches!;
    expect(sheetClasses.split(/\s+/), "the phone sheet must NOT become glass")
      .not.toContain("wm-room-chrome");
    expect(railClasses.split(/\s+/), "the permanent rail must be room chrome")
      .toContain("wm-room-chrome");
  });

  // ── RE-AIMED 2026-09-21 · THE CLASS THIS PINNED NO LONGER EXISTS ─────────
  //
  // This asserted `className="wm-chart-toolbar-pinned wm-room-chrome` — a
  // class ORDER, kept so a sibling guard's substring match would not silently
  // stop matching. It was never a claim about the room; it was two guards
  // holding each other's coats.
  //
  // D-701 demolished that cluster (it covered two of its own neighbours at
  // 1440), and the coat-holding is obsolete because the sibling guard now
  // asserts the class is ABSENT. What is NOT obsolete is the thing this file
  // is actually for: the glass. The cluster carried `wm-room-chrome`, and its
  // replacement is a `ShellModalDrawer` — so the question becomes whether the
  // sanctuary is still respected by whatever the toolbar now puts on screen.
  //
  // STRICTLY STRONGER: a class-order assertion could be satisfied while the
  // surface was repainted opaque, moved, or emptied. These three cannot — the
  // band must still be glass, the demolished cluster must not return, and the
  // drawer that replaced it must exist rather than the controls having been
  // deleted. The `wm-room-chrome` adoption for this file is separately held by
  // the FRAME table above, which is where it belongs.
  it("does not repaint the demolished pinned cluster back over the sanctuary", () => {
    const src = CODE("components/chart/ChartToolbar.tsx");
    expect(src, "the toolbar read as empty code").not.toHaveLength(0);
    expect(
      src,
      "`.wm-chart-toolbar-pinned` is back. It was a sticky 823px strip over an unscrollable " +
        "row and it covered that row's own controls; D-701 demolished it on 2026-09-21.",
    ).not.toContain("wm-chart-toolbar-pinned");
    // The band it used to float over is still the room's glass, not a lid.
    expect(src).toContain('className="wm-room-chrome wm-chart-toolbar');
    // And the organs were rehomed rather than deleted.
    expect(src).toContain('id="chart-equipment-sheet"');
  });
});
