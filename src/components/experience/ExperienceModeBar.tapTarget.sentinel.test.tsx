/**
 * SENTINEL — the seven-mode bar's tap targets must not shrink below 44px.
 *
 * WHY THIS FILE EXISTS
 *
 * On 2026-09-13, `scripts/audit-phone-parity.mjs` measured the sanctuary
 * shell in a real Chrome at 390x844 and reported:
 *
 *     /founder-room-sample.html  offenders=1  evicted-text=0  under-44px-taps=7
 *         tap 52x23  button "PREP"
 *         tap 71.2x23  button "OBSERVE"
 *         ... all seven ...
 *
 * Every one of the seven was 23px tall. The bar had carried, since it was
 * written, this comment directly above the offending style:
 *
 *     // Keep each tap target readable when the bar wraps on mobile;
 *     // ignored on desktop where flex-grow spreads them across one row.
 *     minWidth: 52,
 *
 * The comment asserted a care about touch. The code set a WIDTH and never a
 * HEIGHT. A COMMENT IS NOT A GATE — the same failure class as REVIVE #9 ("a
 * required prop is not a gate"), where tsc was satisfied by the PRESENCE of a
 * `governed` prop while the panel ignored its value. Here English was
 * satisfied by the presence of the word "tap target" while the box stayed
 * 23px. `tsc --noEmit` was EXIT=0 throughout: a number in a style object is
 * type-correct at any value, so the type system could never see it.
 *
 * This matters more than an ordinary a11y nit. The mobile + visual-confirmation
 * standard is BINDING across all ATH products — phone and iPad are PRIMARY,
 * not an afterthought. And this bar is not a peripheral control: after the
 * Ticket T parent cut it is THE navigation of the new room, the first thing a
 * thumb reaches on every one of the seven Asset-10 routes.
 *
 * WHAT THIS SENTINEL CAN AND CANNOT SEE — read before trusting a green run.
 *
 * This is a DOM-level assertion on the emitted inline style, not a geometry
 * measurement. It is strictly stronger than a source-scan for the literal
 * `minHeight: 44` (which would pass on a prop that is never applied, and on a
 * button that a later flex rule crushes), and strictly weaker than a rendered
 * measurement. It CANNOT witness:
 *
 *   · an ancestor `height` or `align-items` that compresses the button anyway
 *   · a stylesheet rule with higher specificity landing after the inline style
 *   · the actual painted box on a real device
 *
 * The authority for those is the harness that caught this in the first place:
 *
 *     node scripts/audit-phone-parity.mjs --base http://localhost:4333 \
 *          --width 390 --height 844 /founder-room-sample.html
 *
 * which reported `under-44px-taps=0` after the fix. This file exists to make
 * the regression fail fast and BY NAME in CI, where no browser is running.
 * It is a tripwire, not the proof.
 */

import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ExperienceModeBar } from "./ExperienceModeBar";
import { EXPERIENCE_MODES } from "@/lib/experience/decisionContextBus";

/** The binding floor. Named once so a future edit changes it deliberately. */
const MIN_TAP_PX = 44;

const HTML = renderToStaticMarkup(<ExperienceModeBar />);

/**
 * Slice each <button ...> open tag. React emits attributes in JSX order, so
 * slicing FORWARD from the tag start to the first ">" keeps us on the same
 * element — slicing backwards from a testid picks up the PRECEDING sibling's
 * style, a mistake this codebase has already paid for once.
 */
function buttonOpenTags(html: string): string[] {
  const tags: string[] = [];
  let i = html.indexOf("<button");
  while (i !== -1) {
    tags.push(html.slice(i, html.indexOf(">", i) + 1));
    i = html.indexOf("<button", i + 1);
  }
  return tags;
}

describe("ExperienceModeBar — tap-target floor (Sentinel)", () => {
  it("renders exactly the seven canon modes as buttons", () => {
    expect(buttonOpenTags(HTML)).toHaveLength(EXPERIENCE_MODES.length);
    expect(EXPERIENCE_MODES.length).toBe(7);
  });

  it("gives EVERY mode button a min-height of at least 44px", () => {
    const tags = buttonOpenTags(HTML);
    const offenders: string[] = [];

    tags.forEach((tag, idx) => {
      const mode = EXPERIENCE_MODES[idx];
      const match = /min-height:\s*([0-9.]+)px/.exec(tag);
      if (!match) {
        offenders.push(`${mode}: no min-height at all`);
        return;
      }
      const px = Number(match[1]);
      if (px < MIN_TAP_PX) {
        offenders.push(`${mode}: min-height ${px}px < ${MIN_TAP_PX}px`);
      }
    });

    expect(
      offenders,
      `Measured 2026-09-13 at 390x844: these were 23px tall. The seven-mode ` +
        `bar is the navigation of the sanctuary — on a phone it is the first ` +
        `thing a thumb reaches. Offenders:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("keeps the min-width floor too — the fix must not trade one axis for the other", () => {
    for (const tag of buttonOpenTags(HTML)) {
      const match = /min-width:\s*([0-9.]+)px/.exec(tag);
      expect(match, "every mode button needs a min-width floor").not.toBeNull();
      expect(Number(match![1])).toBeGreaterThanOrEqual(52);
    }
  });

  it("centres the label so a 44px box does not render as top-aligned text in a tall box", () => {
    // Height without centring is a bigger hit area with the same ugly glyph
    // position — the geometry fix must not cost the composition.
    for (const tag of buttonOpenTags(HTML)) {
      expect(tag).toMatch(/align-items:\s*center/);
      expect(tag).toMatch(/justify-content:\s*center/);
    }
  });

  it("states the floor in one place so it cannot drift per-button", () => {
    const heights = buttonOpenTags(HTML).map(
      (t) => /min-height:\s*([0-9.]+)px/.exec(t)?.[1],
    );
    expect(new Set(heights).size, "all seven must share one floor").toBe(1);
  });
});
