/**
 * SENTINEL — an icon-only control on the live market route must carry a real
 * name and a real target.
 *
 * ── The measured defect this pins ───────────────────────────────────────────
 *
 * MEASURED 2026-09-19 on live https://wealthymindsetspro.com/charts at 1920
 * wide, by walking every rendered control on the route and reading its computed
 * accessible name and its rendered box:
 *
 *   {"total":64,"unnamed":[],
 *    "titleOnly":[{"title":"Fullscreen","w":20},
 *                 {"title":"Compact density","w":20},
 *                 {"title":"What does this mean?","w":12}],
 *    "expNoTarget":[]}
 *
 * Sixty-four controls, none strictly nameless — and three named ONLY by a
 * `title` attribute, at 20px, 20px and 12px.
 *
 * ── Why `title` is not a name ───────────────────────────────────────────────
 *
 * `title` is a HOVER affordance. There is no hover on a phone, so on the device
 * the Founder named primary these three buttons are an unlabelled glyph and
 * nothing else. Screen readers treat `title` as the last resort in the naming
 * hierarchy — several announce it late, quietly, or not at all when any other
 * source could have applied. A control whose only name is a tooltip is a
 * control that is named for the mouse and anonymous for everyone else.
 *
 * This is not a new standard invented here. The close button in
 * `SmartMoneyPanel` two lines below the density toggle has carried the exact
 * repair — `aria-label`, real hit floor — for some time. The defect is that the
 * repair stopped at one button in a file with two.
 *
 * ── Why the size floor is part of the same fix ──────────────────────────────
 *
 * A previously shipped atom measured a button that DECLARED 26px render at 14px
 * because a flex parent was free to shrink it. Naming a 12px target correctly
 * makes it findable and still leaves it unhittable by a thumb. The repair grows
 * the target with padding and pulls the layout back with a negative margin, so
 * the HIT AREA reaches 44px without the toolbar row growing a single pixel.
 *
 * ── Why a source Sentinel and not a render ──────────────────────────────────
 *
 * There is no DOM environment in this repo — no jsdom, no happy-dom, and
 * `@testing-library/react` is not installed. Computed accessible name and
 * rendered box cannot be measured here at all; they were measured the only way
 * they can be, on the live page against the deployed build. This file is the
 * regression lock, not the proof.
 *
 * COMMENT-STRIPPED, and that is load-bearing. A sentinel in this repo has
 * already once guarded its own prose: a static test matched a property that the
 * explanatory comment above the code happened to quote, so deleting the real
 * declaration left the test GREEN. The comments this file guards name
 * `aria-label`, `aria-expanded` and `min-w-11` while explaining them. Every
 * assertion below therefore runs against source with comments removed.
 */

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/** COMMENT-STRIPPED: every claim below is also discussed in prose in-file. */
const read = (rel: string) =>
  fs
    .readFileSync(path.join(process.cwd(), rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const CHART = "src/components/chart/MainChart.tsx";
const SMART = "src/components/smart-money/SmartMoneyPanel.tsx";

/**
 * Slice the JSX attribute block of the button whose `title` contains `anchor`.
 * Anchored at the title because the title is the thing that WAS the only name —
 * it is the defect's own fingerprint, and it cannot drift away without the
 * control being rewritten entirely. Walks backwards to the opening `<button`
 * and forwards to the `>` that closes the tag, so a sibling button's
 * `aria-label` can never satisfy an assertion about this one.
 */
function buttonAttrs(src: string, anchor: string, file: string): string {
  const at = src.indexOf(anchor);
  expect(at, `${file} → no control anchored at ${anchor}`).toBeGreaterThan(-1);
  const open = src.lastIndexOf("<button", at);
  expect(open, `${file} → ${anchor} is not inside a <button`).toBeGreaterThan(-1);
  const close = src.indexOf(">", at);
  return src.slice(open, close);
}

describe("SENTINEL — icon-only controls on the market route are named for more than a mouse", () => {
  const chart = read(CHART);
  const smart = read(SMART);

  const cases: ReadonlyArray<{ label: string; src: string; file: string; anchor: string }> = [
    { label: "chart fullscreen", src: chart, file: CHART, anchor: '"Exit fullscreen"' },
    { label: "smart-money density", src: smart, file: SMART, anchor: '"Comfortable density"' },
    { label: "smart-money explainer", src: smart, file: SMART, anchor: '"What does this mean?"' },
  ];

  for (const c of cases) {
    describe(c.label, () => {
      it("carries a real accessible name, not just a hover tooltip", () => {
        expect(
          buttonAttrs(c.src, c.anchor, c.file),
          `${c.file} → the ${c.label} control is named only by \`title\`. There is no hover on ` +
            `a phone, so on the device the Founder named primary this button is an unlabelled ` +
            `glyph`,
        ).toMatch(/aria-label=/);
      });

      it("declares its type so a future move into a form cannot make it a submit", () => {
        expect(
          buttonAttrs(c.src, c.anchor, c.file),
          `${c.file} → the ${c.label} control has no explicit \`type\`. A bare <button> inside a ` +
            `form submits it, so this control's behaviour depends on where someone later moves it`,
        ).toMatch(/type="button"/);
      });

      it("has a hit floor a thumb can actually reach", () => {
        expect(
          buttonAttrs(c.src, c.anchor, c.file),
          `${c.file} → the ${c.label} control has no 44px floor. It measured 20px or less live; ` +
            `naming a target correctly and leaving it unhittable fixes the announcement and not ` +
            `the reach`,
        ).toMatch(/min-w-11[\s\S]*min-h-11|min-h-11[\s\S]*min-w-11/);
      });
    });
  }

  it("the explainer reports whether its explanation is already open", () => {
    expect(
      buttonAttrs(smart, '"What does this mean?"', SMART),
      `${SMART} → the explainer is a DISCLOSURE with no \`aria-expanded\`. A screen-reader user ` +
        `is told "button, what does this mean" with no way to learn whether the answer is ` +
        `already on screen`,
    ).toMatch(/aria-expanded=\{showEdu\}/);
  });

  it("no control on these surfaces points aria-controls at a node that is unmounted while closed", () => {
    // The explainer repair deliberately stopped short of `aria-controls`: the
    // disclosed block is conditionally rendered, so the reference would dangle
    // at exactly the moment it is asked. Pinning the absence keeps a later
    // well-meaning edit from trading one defect class for another.
    expect(
      buttonAttrs(smart, '"What does this mean?"', SMART),
      `${SMART} → the explainer now claims an aria-controls target, but the block it names is ` +
        `unmounted while closed. A reference that resolves to nothing is worse than none`,
    ).not.toMatch(/aria-controls=/);
  });
});
