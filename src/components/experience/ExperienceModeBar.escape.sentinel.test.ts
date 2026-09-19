/**
 * SENTINEL — a panel that opens over the candles must answer Escape.
 *
 * ── The measured defect this pins ───────────────────────────────────────────
 *
 * MEASURED 2026-09-19 on live https://wealthymindsetspro.com/charts at 1920
 * wide, by driving the real page:
 *
 *   {"before":"true","afterEscape":"true"}
 *
 * Opening the collapsed mode chip hung a seven-button panel over the live
 * market, reported `aria-expanded="true"` and `aria-controls` pointing at it —
 * and pressing Escape left it reading `"true"` with the panel still up.
 *
 * ── Why this is a defect and not a preference ───────────────────────────────
 *
 * `ExperienceModeBar` already states the law, in its own choose-handler:
 * "Leaving it open would put a 7-button panel back over the candles." It then
 * enforced that law for exactly ONE of the three ways a human leaves a
 * disclosure. The trader who opened the panel to LOOK, decided against
 * switching, and pressed the key every disclosure on earth answers to, kept the
 * panel — and kept it over the price.
 *
 * That is the same shape as the defect the component itself records at its
 * minHeight note: a comment asserting a care the code never delivered.
 *
 * The standing order names this directly in the Shot 4 clause — "Escape
 * restores the Shot 1 silhouette". A disclosure over the market that cannot be
 * dismissed from the keyboard is the silhouette not coming back.
 *
 * ── Why a source Sentinel and not a render ──────────────────────────────────
 *
 * There is no DOM environment in this repo — no jsdom, no happy-dom, and
 * `@testing-library/react` is not installed (see the note in
 * ShellAccessParity.test.tsx). `renderToStaticMarkup` runs no effects, so it
 * cannot see a keydown listener at all. The behaviour itself was proven the
 * only way it can be here: on the live page, against the deployed build. This
 * file is the regression lock, not the proof.
 *
 * COMMENT-STRIPPED, and that is load-bearing. A sentinel in this repo has
 * already once guarded its own prose: an earlier static test sliced from a
 * function name and matched a property the explanatory comment above the code
 * happened to quote, so deleting the real declaration left the test GREEN. The
 * component's Escape comment names `setOpen(false)`, `chipRef` and `focus()`
 * while explaining them. Every assertion below therefore runs against source
 * with comments removed.
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

const BAR = "src/components/experience/ExperienceModeBar.tsx";

describe("SENTINEL — the mode panel over the market can be dismissed from the keyboard", () => {
  const src = read(BAR);

  it("listens for Escape at all", () => {
    expect(
      src,
      `${BAR} → nothing in the bar reads Escape. The collapsed chip hangs a seven-button ` +
        `panel over the live candles; without this the only way back to the market is to ` +
        `find the chip again with a mouse`,
    ).toMatch(/key\s*!==\s*"Escape"|key\s*===\s*"Escape"/);
  });

  it("Escape actually closes the panel rather than merely being heard", () => {
    // Anchored at the handler, not the file: `setOpen(false)` also appears in
    // the re-seed branch and in the choose-handler, either of which would let a
    // do-nothing Escape listener satisfy a whole-file match.
    const at = src.indexOf('"Escape"');
    expect(at, `${BAR} → no Escape handler to anchor to`).toBeGreaterThan(-1);
    expect(
      src.slice(at, at + 220),
      `${BAR} → the Escape handler does not close the panel. A listener that hears the key ` +
        `and leaves the panel up is worse than none: it looks handled`,
    ).toMatch(/setOpen\(false\)/);
  });

  it("Escape returns focus to the chip instead of dropping the human in the document", () => {
    const at = src.indexOf('"Escape"');
    expect(
      src.slice(at, at + 220),
      `${BAR} → Escape closes the panel but does not restore focus to the chip. A keyboard ` +
        `user is then standing nowhere announced — the trap is dismissed by opening a ` +
        `quieter one`,
    ).toMatch(/chipRef\.current\?\.focus\(\)/);
  });

  it("the chip is actually wired to the ref the Escape path focuses", () => {
    expect(
      src,
      `${BAR} → chipRef is focused but never attached to the chip, so the focus call is a ` +
        `no-op that reads as care`,
    ).toMatch(/ref=\{chipRef\}/);
  });

  it("the document listener is removed, and only exists while the panel is up", () => {
    const at = src.indexOf('"Escape"');
    const region = src.slice(Math.max(0, at - 400), at + 600);
    expect(
      region,
      `${BAR} → the keydown listener is never removed; every open/close leaks one more ` +
        `document listener for the life of the masthead`,
    ).toMatch(/removeEventListener\(\s*"keydown"/);
    expect(
      region,
      `${BAR} → the listener is not gated on the panel being open. A document-level keydown ` +
        `bound for the life of the masthead runs on every keystroke the trader types into ` +
        `the symbol search`,
    ).toMatch(/if\s*\(!collapsed\s*\|\|\s*!open\)\s*return/);
  });
});
