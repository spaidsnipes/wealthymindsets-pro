/**
 * SEVEN TABS ANSWER ONE QUESTION SEVEN TIMES.
 *
 * ── The measured failure this pins ──────────────────────────────────────────
 *
 * PREP · OBSERVE · WAIT · EXECUTE · MANAGE · REVIEW · LEARN occupied the entire
 * centre of the masthead on every route at every moment — seven buttons of
 * equal weight, each 44px tall. Measured on the live production build at
 * 1920x840 on 2026-09-17, on the instrument view that bar was the widest
 * non-price object standing above the candles.
 *
 * The Founder cut names it directly: the mode bar "must not dominate the first
 * trading viewport."
 *
 * ── What these tests are FOR, stated so they cannot drift ───────────────────
 *
 * Not "the bar is gone". Both halves have to stay true:
 *
 *   1. the instrument view does not open with seven tabs across the masthead
 *   2. the collapsed form still NAMES the active mode, and the other six are
 *      one labelled, keyboard-reachable, correctly-announced click away
 *
 * Half 2 is the one worth guarding hardest. A hamburger that hides the answer
 * is STRICTLY WORSE than the bar it replaced: a trader would have to open
 * something to learn what mode they are in. The bar at least always said so.
 *
 * renderToStaticMarkup runs no effects and has no viewport, so it answers
 * exactly the question asked — what the FIRST frame contains.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import ExperienceModeBar, { EXPERIENCE_MODE_GROUP_ID } from "./ExperienceModeBar";
import { EXPERIENCE_MODES, DecisionContextBus } from "@/lib/experience/decisionContextBus";

function frame(props: { collapsed?: boolean } = {}): string {
  // A private bus, so this file cannot be perturbed by — or perturb — the
  // module-singleton every other surface shares.
  return renderToStaticMarkup(<ExperienceModeBar bus={new DecisionContextBus()} {...props} />);
}

/** How many of the seven states are rendered as their own button. */
function modeButtons(html: string): readonly string[] {
  return EXPERIENCE_MODES.filter((mode) => new RegExp(`>${mode}<`).test(html));
}

const CHIP = 'data-testid="experience-mode-chip"';

describe("the seven states can stand aside for the market", () => {
  it("renders all seven by default — a room that never asked keeps its bar", () => {
    // The default has to be the old behaviour. Defaulting collapsed would
    // silently re-shape the masthead of every other route in the product.
    expect(modeButtons(frame())).toEqual([...EXPERIENCE_MODES]);
    expect(frame(), "an uncollapsed bar grew a disclosure chip").not.toContain(CHIP);
  });

  it("collapsed, the first frame carries ONE mode, not seven", () => {
    const collapsed = frame({ collapsed: true });
    expect(modeButtons(collapsed)).toHaveLength(1);
  });

  it("collapsed does not leave the other six in the tree, merely unpainted", () => {
    /**
     * The tempting implementation is `display: none` or `visibility: hidden` on
     * the nav, which leaves six buttons a screen reader may still walk and a
     * `<nav aria-label="Experience mode">` still announced. Visually identical
     * to a real collapse, and worse than the bar it replaced.
     */
    const collapsed = frame({ collapsed: true });
    expect(collapsed, "a collapsed bar left a hidden nav in the tree")
      .not.toMatch(/display:\s*none|visibility:\s*hidden/);
    expect(collapsed.match(/<nav/g) ?? [], "the seven-button nav is still in the closed frame")
      .toHaveLength(0);
  });
});

describe("collapsed is not a hamburger — the answer stays on the surface", () => {
  it("the chip NAMES the active mode instead of making the human open it", () => {
    const bus = new DecisionContextBus();
    bus.setMode("EXECUTE");
    const html = renderToStaticMarkup(<ExperienceModeBar bus={bus} collapsed />);
    expect(html, "the collapsed chip does not say which mode is active").toContain(">EXECUTE<");
    expect(html, "the chip's accessible name hides the mode it is reporting")
      .toMatch(/aria-label="[^"]*EXECUTE[^"]*"/);
  });

  it("the chip is a real button with an accessible name that survives the caret", () => {
    const el = frame({ collapsed: true }).match(/<button[^>]*experience-mode-chip[^>]*>/)?.[0] ?? "";
    expect(el, "the mode control is not a button").toContain("<button");
    expect(el, "the mode control has no accessible name").toMatch(/aria-label="[^"]+"/);
    // The caret is decoration. Unhidden, it becomes part of the announced name
    // and a screen reader reads a triangle.
    expect(frame({ collapsed: true })).toMatch(/aria-hidden[^>]*>[▴▾]</);
  });

  it("the chip reports its real state through aria-expanded", () => {
    // Closed on the first frame by design — an expanded panel over the candles
    // is exactly the thing being removed.
    expect(frame({ collapsed: true })).toMatch(/aria-expanded="false"/);
  });

  it("the chip claims no aria-controls while the group it would name is unmounted", () => {
    /**
     * REMAPPED 2026-09-19 — this test carried the right law in its comment and
     * the wrong assertion under it.
     *
     * The comment read: "aria-controls pointing at an id that appears nowhere
     * is the shape of an accessibility annotation added to satisfy a reviewer
     * rather than a user." Exactly so. But the check for "appears nowhere"
     * looked for the id ANYWHERE IN THE FILE — in a separate render, of the
     * expanded form, which is a different frame than the one the chip is in.
     * So it proved the id is spelled consistently and called that a target.
     *
     * MEASURED 2026-09-19 on live /charts at 1920, the shape it let through:
     * the closed Workspace and Tools buttons in the OS frame carried the same
     * unconditional attribute and `getElementById` returned null for both.
     *
     * A dangling `aria-controls` is not ignored — it is FOLLOWED. The reader
     * offers the jump, the human takes it, and nothing is there and nothing is
     * said, which reads as a broken page rather than a shut panel. The chip is
     * only ever rendered collapsed, and collapsed it starts closed, so the
     * static frame is precisely the frame in which the target does not exist.
     *
     * `aria-expanded` is checked in the test above and carries the whole
     * disclosure claim on its own: there is more, it is currently shut. That is
     * why removing the reference silences nothing.
     */
    const collapsed = frame({ collapsed: true });
    expect(
      collapsed,
      "the closed chip points aria-controls at a group that is not rendered in this frame",
    ).not.toMatch(/aria-controls=/);
    // The id itself is still the shared contract: when the group IS drawn, it
    // must be drawn under the exported name the chip will reach for.
    expect(frame(), "the expanded bar does not carry the exported group id")
      .toContain(`id="${EXPERIENCE_MODE_GROUP_ID}"`);
  });
});

describe("the list of states has one owner", () => {
  it("the bar draws EXPERIENCE_MODES rather than a retyped list", () => {
    // If a mode is ever added, this test must start failing for the RIGHT
    // reason — a retyped list in the bar — not pass by coincidence because
    // both copies were edited together.
    expect(modeButtons(frame())).toHaveLength(EXPERIENCE_MODES.length);
  });
});
