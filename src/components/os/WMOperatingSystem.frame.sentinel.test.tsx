/**
 * The OS frame geometry — a Sentinel for four defects the suite could not see.
 *
 * READ THIS BEFORE TRUSTING THIS FILE.
 *
 * Every assertion here is a STRING MATCH AGAINST SOURCE. That is a weaker
 * proof than measurement and this file does not pretend otherwise. It cannot
 * tell you the footer is on screen; it can only tell you the declaration that
 * put it there is still present. It is a tripwire, not a guarantee.
 *
 * It exists because the honest alternative is nothing. There is no DOM test
 * environment in this repo — no jsdom, no happy-dom, no
 * @testing-library/react. Component tests render with renderToStaticMarkup,
 * which produces a string. A string has no viewport. It has no box model, no
 * fold, no scroll position, and no computed style. So no assertion written in
 * it can ever observe:
 *
 *   - a control that is BELOW THE FOLD
 *   - a pane that is CLIPPED by an ancestor's overflow
 *   - a max-height cap that RESOLVES AGAINST THE WRONG BOX
 *   - a flex item that REFUSES TO SHRINK
 *
 * All four of those shipped. All four were found by opening the OS shell in a
 * real browser and reading the box model. Throughout every one of them the
 * suite was 648 files and 7727 tests green — before the defects, during them,
 * and after the fixes. Not one test changed colour. PRESENCE IS NOT
 * REACHABILITY, and a render test only ever measures presence.
 *
 * So the rule for anyone extending this file: if you can only prove it by
 * looking at it, then LOOK AT IT, and leave a matcher here so the next person
 * at least learns that the thing they deleted was load-bearing.
 *
 * The measurements quoted below were taken at 1280x800 on
 * public/founder-room-sample.html, the one OS-shell surface that is not
 * auth-gated and therefore the only one a headless browser can reach.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as path from "node:path";

import { OS_RAIL_BREAKPOINT_PX, OS_PHONE_NAV_HEIGHT_PX } from "./WMOperatingSystem";

const OS = readFileSync(path.resolve(__dirname, "WMOperatingSystem.tsx"), "utf-8");
const SHELL = readFileSync(
  path.resolve(__dirname, "../experience/WMExperienceShell.tsx"),
  "utf-8",
);

/**
 * Slice the inline `style={{ ... }}` object of the element carrying a given
 * className, so an assertion about the RAIL cannot be accidentally satisfied
 * by an identical declaration on some other element in this 800-line file.
 *
 * That distinction is not hypothetical: `minHeight: 0` appears on several
 * elements here for unrelated reasons, and `boxSizing` appears on the phone
 * nav. A whole-file `toContain` would have passed against the wrong owner and
 * guarded nothing — the same silent-pass failure mode that made the four
 * defects below invisible in the first place.
 */
/**
 * Strip `/* ... *\/` comments.
 *
 * THIS IS NOT TIDYING. Without it this file had a test that could not fail.
 *
 * The inline styles in this codebase are heavily commented — deliberately, and
 * those comments are the reason the fixes are understandable. But they discuss
 * the code in the code's own vocabulary. The rail-and-room fix carries a note
 * reading "minHeight: 0 releases the shrink", written in camelCase because
 * that is what the property is called in JSX.
 *
 * So `expect(styleOf(...)).toMatch(/minHeight:\s*0/)` matched THE SENTENCE
 * ABOUT the declaration, not the declaration. Proven by positive control:
 * the actual `minHeight: 0` was deleted from the element and the test stayed
 * green, because the paragraph explaining why it must be there was still
 * present. The comment would have outlived the code it justified and gone on
 * asserting a fact that was no longer true.
 *
 * A comment must not be able to satisfy an assertion about behaviour.
 */
function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, "");
}

function styleOf(source: string, className: string): string {
  const at = source.indexOf(`className="${className}"`);
  if (at < 0) throw new Error(`no element with className="${className}"`);
  const styleAt = source.indexOf("style={{", at);
  if (styleAt < 0) throw new Error(`no inline style on .${className}`);
  let depth = 0;
  let i = source.indexOf("{", styleAt);
  const start = i;
  for (; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return stripComments(source.slice(start, i + 1));
    }
  }
  throw new Error(`unterminated style object on .${className}`);
}

/**
 * Slice a CSS rule body out of the `<style>` template literal.
 *
 * The obvious `\.selector\s*\{[^}]*\}` does NOT work here and failing to
 * notice that is how a Sentinel goes quiet. These rules interpolate constants
 * — `calc(${OS_PHONE_NAV_HEIGHT_PX}px + ...)` — and `[^}]*` stops dead at the
 * closing brace of the `${...}`. The captured "rule" is then a fragment
 * ending mid-expression.
 *
 * That is not merely a broken matcher; it is a matcher that can PASS on the
 * fragment. When this file was first written the height-reservation assertion
 * did exactly that: it matched `OS_PHONE_NAV_HEIGHT_PX` inside the truncated
 * text and reported green while testing a substring that stopped before the
 * part it meant to check. Only the `!important` assertion, which lives after
 * the truncation point, failed loudly enough to expose it.
 *
 * So: match to a closing brace at the rule's own indentation instead.
 */
function cssRule(source: string, selector: string): string {
  const re = new RegExp(`\\${selector}\\s*\\{[\\s\\S]*?\\n\\s*\\}`);
  const found = source.match(re);
  if (!found) throw new Error(`no CSS rule for ${selector}`);
  // Same reason as styleOf: the CSS rules carry comments that name the very
  // declarations being asserted, and a comment must not be able to stand in
  // for the code it explains.
  return stripComments(found[0]);
}

describe("OS frame · the desktop room must not clip itself", () => {
  it("the rail-and-room region is allowed to shrink", () => {
    /**
     * `flex: 1 1 auto` says "shrink me". The DEFAULT `min-height: auto` on a
     * flex item says "but never below my content". The second wins.
     *
     * Measured with the default in place: this region stayed 828px tall inside
     * a frame with 696px to give it. The provenance footer — the line that
     * says where the numbers came from — was pushed to y=901 and cut off by
     * the sanctuary's overflow:hidden. The document was not scrollable, so it
     * could not be reached by any means at all.
     *
     * Deleting `minHeight: 0` brings that back in full and silently.
     */
    const body = styleOf(OS, "wm-os-body");
    expect(body).toMatch(/minHeight:\s*0\b/);
  });

  it("the rail is capped against its container, not against the screen", () => {
    /**
     * This cap read `100vh` and therefore never bound. The rail does not start
     * at the top of the viewport: it starts below the masthead and must end
     * above the provenance footer, so `100vh` was ~104px too generous.
     *
     * The rail's own comment says the cap exists so that "a short screen
     * simply CUTS the last rooms off" cannot happen. With twenty-one rooms it
     * was happening, guarded by a cap that could not possibly guard it. A
     * wrong unit is not a weak fix, it is an absent one.
     */
    const rail = styleOf(OS, "wm-os-rail");
    expect(rail).toMatch(/maxHeight:\s*"100%"/);
    expect(rail).not.toMatch(/maxHeight:\s*"100vh"/);
  });

  it("the rail's cap means the whole box, padding included", () => {
    /**
     * max-height on a content-box element caps the CONTENT and then adds the
     * padding on top. With `padding: 14px 0` that is 28px of overrun — the
     * rail measured 724px inside a 696px region and still crossed into the
     * footer. Fixing the unit without fixing the box leaves 28px of the same
     * bug, which is exactly the kind of "mostly fixed" that stops getting
     * looked at.
     */
    const rail = styleOf(OS, "wm-os-rail");
    expect(rail).toMatch(/boxSizing:\s*"border-box"/);
  });

  it("the rail can still scroll once the cap binds", () => {
    // The cap and the scroller are a pair: capping without scrolling would
    // trade a clipped rail for a truncated one. Measured after the fix, the
    // rail holds 1311px of doors in 696px of space and reaches the last one.
    const rail = styleOf(OS, "wm-os-rail");
    expect(rail).toMatch(/overflowY:\s*"auto"/);
  });
});

describe("OS frame · the phone bar must be reachable", () => {
  it("is pinned, not merely present", () => {
    /**
     * This bar shipped `position: static` and laid out at y=1121 in an 844px
     * viewport — 277px below the fold. Every assertion about it was green: the
     * testid was in the markup, all five hrefs resolved, the breakpoints were
     * complementary. And the trader still could not leave the room without
     * first scrolling to the bottom of the page to discover a navigation
     * existed.
     */
    const nav = styleOf(OS, "wm-os-phone-nav");
    expect(nav).toMatch(/position:\s*"fixed"/);
    expect(nav).toMatch(/bottom:\s*0/);
  });

  it("reserves its own height from the constant it is drawn from", () => {
    /**
     * The bar is out of flow, so the room must RESERVE its height or the
     * footer sits underneath the navigation. Two literals would be two numbers
     * that drift the first time someone adjusts the padding, and the failure
     * is silent — nothing errors, a footer is just quietly unreadable.
     *
     * One owner, applied in both places. This asserts the CONSTANT is used,
     * not the number: a bare `66` in either place would satisfy a numeric
     * match while reintroducing the second owner.
     */
    const nav = styleOf(OS, "wm-os-phone-nav");
    expect(nav).toMatch(/height:\s*OS_PHONE_NAV_HEIGHT_PX/);
    expect(cssRule(OS, ".wm-os-provenance")).toContain("OS_PHONE_NAV_HEIGHT_PX");
  });

  it("the reservation outranks the footer's inline padding", () => {
    /**
     * MEASURED, and it is the reason this assertion exists rather than being
     * assumed: with the rule written plainly the computed padding-bottom
     * stayed at the footer's inline 10px and the reservation did nothing at
     * all. The footer sets its padding inline, and an inline style beats a
     * stylesheet rule. With the important flag it became 78px.
     *
     * A reservation that loses its specificity fight is indistinguishable
     * from no reservation, and reads in review as if it works.
     */
    expect(cssRule(OS, ".wm-os-provenance")).toContain("!important");
  });
});

describe("OS frame · the two frame laws are complementary, not contradictory", () => {
  it("the shell releases the fixed frame below the rail breakpoint", () => {
    /**
     * The sanctuary is height:100dvh + overflow:hidden. That is the OS frame
     * law and it is correct on a desktop: an operating system does not scroll
     * as a document, its panes scroll inside a fixed frame.
     *
     * On a phone it is wrong, because there is no room for a fixed frame AND
     * its contents. Measured at phone width BEFORE this rule: clientHeight
     * 844 against scrollHeight 1189 — 345px of the room, including the whole
     * provenance footer, cut off with no way to scroll to it. Not below the
     * fold. Gone.
     */
    const sanctuary = cssRule(SHELL, ".wm-sanctuary");
    expect(sanctuary).toMatch(/overflow:\s*visible/);
    expect(sanctuary).toMatch(/height:\s*auto/);
  });

  it("the shell reads the breakpoint from the OS rather than restating it", () => {
    /**
     * If the shell hard-coded 900 and the OS later moved the rail breakpoint,
     * there would be a band of widths where the rail is hidden but the frame
     * is still clamped — a phone layout inside a desktop frame, which is the
     * clipped-footer defect again in a narrow window where nobody looks.
     */
    expect(SHELL).toContain("OS_RAIL_BREAKPOINT_PX");
    expect(SHELL).toMatch(/max-width:\s*\$\{OS_RAIL_BREAKPOINT_PX\}px/);
  });

  it("the breakpoints stay exactly complementary — no overlap, no gap", () => {
    /**
     * Asserting the ARITHMETIC, not the text. An overlap renders two
     * navigations at once; a gap renders none. The `+ 1` is what makes the
     * two media queries partition the width line instead of nearly doing so.
     */
    expect(OS).toMatch(/min-width:\s*\$\{OS_RAIL_BREAKPOINT_PX \+ 1\}px/);
    expect(OS).toMatch(/max-width:\s*\$\{OS_RAIL_BREAKPOINT_PX\}px/);
  });

  it("both constants are real exported numbers", () => {
    // Guards the imports above from becoming vacuous: if either constant were
    // renamed away, every `${...}` matcher in this file would still be
    // matching literal source text while the module no longer owned the fact.
    expect(typeof OS_RAIL_BREAKPOINT_PX).toBe("number");
    expect(typeof OS_PHONE_NAV_HEIGHT_PX).toBe("number");
    expect(OS_RAIL_BREAKPOINT_PX).toBeGreaterThan(0);
    expect(OS_PHONE_NAV_HEIGHT_PX).toBeGreaterThan(0);
  });
});
