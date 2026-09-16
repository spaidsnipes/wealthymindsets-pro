/**
 * Sentinel — the ACTIVE QUESTION must own the deck's dominant gaze.
 *
 * Founder Visual Systems Canon, SAME-APP REJECTION TEST:
 *   "Could a reasonable Founder looking at BEFORE and AFTER say this is
 *    basically the same app, just a bit newer?"  If YES, FAIL.
 *
 * The defect this pins was NOT a wrong fact. `routeQuestion` compiled the one
 * dominant question correctly for months. It was rendered as a 13px italic
 * line wedged between a mode bar and a chart — so the canon's single loudest
 * element was, on screen, the quietest thing in the scene.
 *
 * A CORRECT FACT RENDERED AT THE WRONG SIZE IS STILL A FAILED CUTOVER.
 *
 * `@testing-library/react` is NOT installed in this repo, so this Sentinel is
 * source-level by necessity. It reads the page and asserts the COMPOSITION —
 * which component owns the question — rather than any pixel value. Pinning a
 * font size here would be a Sentinel pinned to a spelling: the deck could
 * satisfy it while burying the element again in a collapsed drawer.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve(process.cwd(), "src/app/command-deck/page.tsx"), "utf8");
const barSource = readFileSync(
  resolve(process.cwd(), "src/components/command/ActiveQuestionBar.tsx"),
  "utf8",
);

/**
 * Comments are PROSE, not rendered output.
 *
 * The first cut of this Sentinel asserted `bar` contained no /decision/i — and
 * failed on the bar's OWN DOCBLOCK, the paragraph explaining why it renders no
 * decision chip. A Sentinel that cannot tell an implementation from a sentence
 * about the implementation is pinned to a spelling, not a meaning.
 */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const bar = stripComments(barSource);

describe("ACTIVE QUESTION owns the deck's dominant gaze", () => {
  it("renders the compiled question through ActiveQuestionBar, not a bare styled div", () => {
    expect(page).toContain("<ActiveQuestionBar");
    expect(page).toMatch(/<ActiveQuestionBar[^>]*question=\{experienceQuestion\}/s);
  });

  it("hands the bar a COMPILED focus — the banner may not derive its own subject", () => {
    expect(page).toContain("selectQuestionFocus(oneStory)");
    expect(page).toMatch(/<ActiveQuestionBar[^>]*focus=\{questionFocus\}/s);
  });

  it("compiles the focus from the SAME oneStory the question was routed from", () => {
    // Two compilations of one fact on one screen is the defect class that
    // pinned the chapter clock at zero. The question and its subject must
    // share an input or the banner's two lines can disagree.
    expect(page).toMatch(/routeQuestion\(experienceContext\.mode,\s*oneStory\)/);
    expect(page).toMatch(/selectQuestionFocus\(oneStory\)/);
  });

  it("does NOT reintroduce the buried 13px italic question subtitle", () => {
    // The exact shape of the displaced burden, named so it cannot creep back.
    expect(page).not.toMatch(/fontSize:\s*13,[\s\S]{0,120}?fontStyle:\s*"italic"[\s\S]{0,80}?\{experienceQuestion\}/);
  });

  it("keeps exactly ONE owner of the question on the page", () => {
    expect(page.match(/\{experienceQuestion\}/g)).toHaveLength(1);
    expect(page.match(/<ActiveQuestionBar\b/g)).toHaveLength(1);
  });

  describe("the bar refuses to become a second owner of the decision", () => {
    it("self-test: the comment stripper actually removes the docblock prose", () => {
      // Guards the guard. If this ever passes trivially the assertion below
      // becomes vacuous and would stop detecting a real second owner.
      expect(barSource).toMatch(/\bdecision\b/i);
      expect(bar).not.toMatch(/\bdecision\b/i);
    });

    it("renders no Right-of-Way / decision verdict — OneStoryStrip owns that", () => {
      expect(bar).not.toMatch(/NO TRADE|RightOfWay|rightOfWay/);
      expect(bar).not.toContain("OneStoryVM");
    });

    it("gives UNRESOLVED its own look, per canon 'UNKNOWN has a look'", () => {
      expect(bar).toContain("focus.unresolved");
    });
  });
});
