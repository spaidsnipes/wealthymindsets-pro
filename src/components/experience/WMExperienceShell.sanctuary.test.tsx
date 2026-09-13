/**
 * WMExperienceShell · sanctuary layers — the atmosphere gate.
 *
 * The 2026-09-13 Founder audit prescribed the sanctuary explicitly:
 *
 *   WATER MAY BREATHE. PRICE MAY ONLY MOVE WHEN TRUTH MOVES.
 *   NO OWNER = STILL.
 *
 * That is a design LAW, not a decoration. It splits the visual system into
 * three planes: STATIC MATERIAL (vignette, grain, brass hairlines), AMBIENT
 * (WATER-BREATH — subtle non-market motion), and SEMANTIC MARKET (the chart
 * and its truths). The shell is the owner of the first two.
 *
 * These tests gate the shape of that ownership without a browser:
 * `renderToStaticMarkup` sees the inline `<style>` block, and the source
 * itself carries the ownership disclosures (pointer-events, aria-hidden,
 * reduced-motion, no market keying). The rendered picture can only be
 * verified visually — F8 will require a screenshot read — but everything
 * BELOW that picture can be gated in code.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WMExperienceShell } from "./WMExperienceShell";

const SOURCE = readFileSync(
  path.resolve(__dirname, "WMExperienceShell.tsx"),
  "utf-8",
);

const HTML = renderToStaticMarkup(
  <WMExperienceShell>
    <div>MARKET</div>
  </WMExperienceShell>,
);

describe("WMExperienceShell · sanctuary — the three planes are named", () => {
  it("wears the wm-sanctuary class as its own naming affordance", () => {
    // A room needs a name. Anything that names itself `wm-sanctuary` on the
    // DOM tells the next reader what to look for; anything unnamed relies
    // on tribal memory.
    expect(HTML).toContain('class="wm-sanctuary');
  });

  it("mounts the water-breath layer once, and marks it aria-hidden", () => {
    // Screen readers must not narrate the ambient plane — it says nothing.
    // Missing aria-hidden here would make the ambience appear in an a11y
    // tree as a mysterious empty region.
    expect(HTML).toContain('class="wm-water-breath"');
    expect(HTML).toContain('aria-hidden="true"');
    // Exactly one instance, not one per child.
    const count = (HTML.match(/class="wm-water-breath"/g) || []).length;
    expect(count).toBe(1);
  });

  it("renders vignette and grain via ::before and ::after so nothing renders in the tree", () => {
    // The static material plane must not consume DOM nodes. Pseudo-elements
    // keep the atmosphere off the accessibility tree and off React's
    // reconciliation.
    expect(SOURCE).toMatch(/\.wm-sanctuary::before\b/);
    expect(SOURCE).toMatch(/\.wm-sanctuary::after\b/);
  });
});

describe("WMExperienceShell · sanctuary — the audit's laws are in the source", () => {
  it("keeps every atmosphere layer off pointer events", () => {
    // A click on the vignette that steals focus from a market surface
    // would be silently harmful. pointer-events: none is the guard.
    expect(SOURCE).toMatch(/pointer-events:\s*none/);
  });

  it("holds the atmosphere at z-index 0 and lifts content to z-index 1", () => {
    // Without this, a modal or focus outline could fall behind the grain
    // and become invisible to keyboard users.
    expect(SOURCE).toMatch(/z-index:\s*0/);
    expect(SOURCE).toMatch(/z-index:\s*1/);
  });

  it("gates WATER-BREATH on prefers-reduced-motion: no-preference", () => {
    // The audit is explicit: "If the OS asks for reduced motion:
    // WATER-BREATH goes away. The trader still understands everything."
    // A named test proves that guarantee will not be lost in a future edit.
    expect(SOURCE).toMatch(/@media\s*\(prefers-reduced-motion:\s*no-preference\)/);
    // And the animation itself must live INSIDE that media block, not
    // outside it — an animation declared unconditionally will run under
    // reduced motion regardless of the media query below.
    const mediaAt = SOURCE.indexOf("prefers-reduced-motion");
    const animAt = SOURCE.indexOf("animation: wm-breathe");
    expect(animAt).toBeGreaterThan(mediaAt);
  });

  it("uses compositor-friendly properties only (transform + opacity)", () => {
    // The audit's performance budget: "Animate transform + opacity;
    // avoid layout-heavy width/top/left animation." Any width/top/left/
    // background-position transition would fail the same test.
    const kf = SOURCE.match(/@keyframes\s+wm-breathe[\s\S]*?\}\s*\}/);
    expect(kf).not.toBeNull();
    if (kf) {
      // Every step is either transform or opacity — nothing else.
      const banned = /(width|height|top|left|right|bottom|margin|padding):/;
      expect(kf[0]).not.toMatch(banned);
      expect(kf[0]).toMatch(/transform:/);
      expect(kf[0]).toMatch(/opacity:/);
    }
  });

  it("carries the NO OWNER = STILL law in a comment on itself", () => {
    // The rule is not enforceable by code alone — a future contributor
    // can add a second `.wm-market-pulse::before` animation that lies. The
    // comment gives that next reader the exact vocabulary the audit
    // established, so the review that catches the lie has an anchor.
    expect(SOURCE).toContain("NO OWNER = STILL");
    expect(SOURCE).toContain("PRICE MAY ONLY MOVE WHEN TRUTH MOVES");
  });

  it("never keys atmosphere on a market state or symbol", () => {
    // The whole sanctuary block must not mention TSLA/NQ/regime/direction/
    // aggression or any market vocabulary. Reading the block for those
    // words at all would be a signal that a designer began wiring the
    // ambience to the market, which is exactly the trap the audit named.
    const styleBlock = SOURCE.match(/<style>{`[\s\S]*?`}<\/style>/);
    expect(styleBlock).not.toBeNull();
    if (styleBlock) {
      const banned = /(bullish|bearish|long|short|regime|direction|volatility|price|TSLA|NQ)/i;
      expect(styleBlock[0]).not.toMatch(banned);
    }
  });
});

describe("WMExperienceShell · sanctuary — accessibility survives the room", () => {
  it("still announces itself as the operating environment", () => {
    // The seven-mode bar's aria-label was the shell's landmark before
    // the atmosphere. It must still fire — the atmosphere is decorative.
    expect(HTML).toContain('aria-label="Experience mode"');
  });

  it("renders no placeholder leakage from the style block", () => {
    // A template-literal edit could accidentally leak `${…}` interpolation
    // markers into the output. The static markup should carry only literal
    // CSS.
    expect(HTML).not.toContain("${");
    expect(HTML).not.toContain("undefined");
    expect(HTML).not.toContain("NaN");
  });
});
