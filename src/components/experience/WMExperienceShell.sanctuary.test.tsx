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

  it("owns one viewport and delegates long-form scrolling to its main plane", () => {
    // The law is about THE ROOT: the sanctuary is exactly one viewport tall and
    // never grows. It used to be checked by asserting the whole document
    // contained no `min-height:100%` ANYWHERE — a proxy that stopped meaning
    // what it said once the sanctuary began COMPOSING the OS frame, which
    // legitimately declares `min-height:100%` to fill whatever it sits in.
    // So the assertion now reads the root's own style, and adds the half the
    // proxy never covered: something inside must actually be the scroller.
    const rootStyle = /<div[^>]*class="wm-sanctuary[^"]*"[^>]*style="([^"]*)"/.exec(HTML)?.[1];
    expect(rootStyle, "sanctuary root not found").toBeDefined();
    expect(rootStyle).toContain("height:100dvh");
    expect(rootStyle).toContain("overflow:hidden");
    expect(rootStyle, "a root that can grow is a second scrollbar").not.toContain("min-height:100%");
    // Delegation: with nothing inside scrolling, the `overflow:hidden` above
    // does not delegate long-form content — it AMPUTATES it.
    expect(HTML, "no scroll owner inside the one viewport").toContain("overflow:auto");
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

  it("T-REDUCED-MOTION: the safety net under the room covers the room's CHILDREN too", () => {
    // WATER-BREATH gating itself (above) only covers the ONE animation this
    // shell declares. The repo-wide kill switch that covers everything a
    // CHILD declares was written for the July shell and scoped to
    // `.wm-universe` — a class the Founder route deliberately does not carry
    // (see MainLayout.founderRoute.render.test.tsx). Without `.wm-sanctuary`
    // in that selector list, every transition inside the operating room runs
    // at full speed for a trader who asked their OS for stillness.
    const css = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");
    const block = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\}\s*\}/);
    expect(block).not.toBeNull();
    const rule = block![0];
    expect(rule).toContain(".wm-sanctuary *");
    expect(rule).toContain(".wm-sanctuary *::before");
    expect(rule).toContain(".wm-sanctuary *::after");
    // One owner, both houses — never two near-identical blocks that can
    // drift into disagreeing about what "reduced" means.
    expect(rule).toContain(".wm-universe *");
    expect(css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)/g)?.length).toBe(1);
    for (const decl of [
      "animation-duration: .01ms !important",
      "animation-iteration-count: 1 !important",
      "transition-duration: .01ms !important",
    ]) {
      expect(rule).toContain(decl);
    }
  });

  it("gives keyboard focus a ring the room actually owns", () => {
    // Without this rule the room falls back to the browser's 1px system-blue
    // default — measured, in Chrome, against the built stylesheet. The deck's
    // disclosures are <summary list-style:none> and its actions are
    // transparent borderless <button>s, so a keyboard trader with no ring
    // cannot tell which control they are on.
    const css = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");
    const rule = css.match(/\.wm-sanctuary :is\([^)]*\):focus-visible\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    const text = rule![0];
    for (const target of ["button", "a", "summary", "[tabindex]"]) {
      expect(text).toContain(target);
    }
    expect(text).toMatch(/outline:\s*2px solid/);
    expect(text).toMatch(/outline-offset:\s*2px/);
    // The token must come from :root, never from a shell class — that scoping
    // trap is the entire reason this rule had to be written.
    expect(text).toContain("var(--wm-gold-hero,");
    expect(css).toMatch(/:root[\s\S]*?--wm-gold-hero:\s*#d4af37/);
    // And it must carry a literal fallback: an outline shorthand whose var
    // fails to resolve is invalid at computed-value time, so the ring
    // DISAPPEARS rather than degrading. That is worse than the default.
    expect(text).toContain("#d4af37)");
  });

  it("T-REDUCED-MOTION: the room the switch protects is really the shell root", () => {
    // The kill switch reaches CHILDREN of `.wm-sanctuary`. If that class ever
    // moved off the outermost element — onto an inner atmosphere div, say —
    // the selector would still match something and the switch would silently
    // stop covering the header and the market itself.
    const rootAt = SOURCE.indexOf("wm-sanctuary");
    expect(rootAt).toBeGreaterThan(0);
    expect(SOURCE).toContain("className={`wm-sanctuary ${className ?? \"\"}`}");
    // …and the children really do render inside it. The sanctuary no longer
    // types its own <main> — the ONE OS frame owns that element now — so the
    // check follows the children to where they are actually handed off.
    expect(SOURCE).toMatch(/<WMOperatingSystem[^]*?>\s*\{children\}\s*<\/WMOperatingSystem>/);
    // And that handoff must happen INSIDE the named root, or the kill switch
    // stops reaching the room it exists to protect.
    expect(SOURCE.indexOf("<WMOperatingSystem")).toBeGreaterThan(rootAt);
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

describe("WMExperienceShell · sanctuary — mode-keyed (never market-keyed) intensity", () => {
  it("dims WATER-BREATH in WAIT (the audit's 'very quiet' mode)", () => {
    // Mode is USER INTENT — a self-report through the seven-mode bar
    // with source=user — not a market fact. Keying atmosphere by mode
    // is honest ("I am in WAIT, hush the room"); keying by market is
    // the lie the previous test bans.
    const styleBlock = SOURCE.match(/<style>{`[\s\S]*?`}<\/style>/);
    expect(styleBlock).not.toBeNull();
    if (styleBlock) {
      expect(styleBlock[0]).toMatch(
        /\.wm-sanctuary\[data-mode="WAIT"\]\s*>\s*\.wm-water-breath\s*\{[^}]*opacity:\s*0\.5\d?\b/,
      );
    }
  });

  it("keeps WATER-BREATH steady in EXECUTE", () => {
    const styleBlock = SOURCE.match(/<style>{`[\s\S]*?`}<\/style>/);
    if (styleBlock) {
      expect(styleBlock[0]).toMatch(
        /\.wm-sanctuary\[data-mode="EXECUTE"\]\s*>\s*\.wm-water-breath\s*\{[^}]*opacity:\s*1\b/,
      );
    }
  });

  it("slows the WAIT cycle to half-speed (52s vs 26s)", () => {
    const styleBlock = SOURCE.match(/<style>{`[\s\S]*?`}<\/style>/);
    if (styleBlock) {
      expect(styleBlock[0]).toMatch(/animation-duration:\s*52s/);
    }
  });

  it("still gates every mode override under prefers-reduced-motion", () => {
    // The WAIT-slow rule sits INSIDE the same @media
    // (prefers-reduced-motion: no-preference) block. A rule that lived
    // outside would keep animating under reduced motion — which is the
    // exact failure the earlier gate on wm-breathe already covers, but
    // it must extend to the WAIT override too.
    const mediaBlockRe = /@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{[\s\S]*?\}\s*\}/;
    const mediaMatch = SOURCE.match(mediaBlockRe);
    expect(mediaMatch).not.toBeNull();
    if (mediaMatch) {
      expect(mediaMatch[0]).toMatch(/animation-duration:\s*52s/);
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

describe("the breathing layer never overhangs the sanctuary", () => {
  // Serving /charts, 2026-09-25: focusing the chart's INSPECT button scrolled
  // the overflow:hidden sanctuary 20px sideways (scrollWidth 1947 > 1920),
  // because the drifting water-breath layer overhung it. Its inset must cover
  // the animation's full travel.
  const src = require("node:fs").readFileSync(require("node:path").join(process.cwd(), "src/components/experience/WMExperienceShell.tsx"), "utf8") as string;
  it("insets the layer by the keyframes' scale and translate", () => {
    expect(src).toMatch(/50%\s+\{ transform: translate3d\(8px, 4px, 0\) scale\(1\.02\);/);
    expect(src).toContain("inset: 1% calc(1% + 8px) calc(1% + 4px) 1%;");
  });
});
