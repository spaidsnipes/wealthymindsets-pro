/**
 * SCENE_FRAGMENTATION guard.
 *
 * Founder Directive 2026-09-13 renamed the enemy: the parent cutover has
 * landed, but the interior still reads as separate apps because each
 * workspace piece wears a full-box brass border.
 *
 *   SCENE_FRAGMENTATION —
 *   the current/new parent exists, but one coherent human job is still
 *   divided across separate screens, cards, permanent chrome, drawers, or
 *   mini-app mental models, forcing the trader to reconstruct one decision
 *   in their head.
 *
 * The five-second silhouette must read MARKET, not "chart card → risk
 * chip → shortlist card". Full-box borders are the exact visual grammar
 * that recreates the old dashboard mental model. This suite pins the
 * absence of that grammar on the three primary workspace pieces.
 *
 * The absence is EXACT — a rename or a subtle rewrite would slip through
 * a soft assertion. Any of these three components regaining a full-box
 * brass border fails this suite before the regression can reach a
 * screenshot.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const READ = (rel: string) => readFileSync(resolve(__dirname, "../..", rel), "utf8");

describe("workspace pieces read as ONE room, not three sheds", () => {
  it("DeckMarketChart carries a hairline, not a full-box brass border", () => {
    const src = READ("components/experience/DeckMarketChart.tsx");
    // The `<section>` container's inline style should carry a borderTop
    // hairline and NOT a full `border:` declaration.
    expect(src).toContain('borderTop: "1px solid rgba(139,106,41,0.20)"');
    expect(src).not.toMatch(/border:\s*"1px solid rgba\(139,106,41/);
    // Background stays transparent so the sanctuary shows through.
    expect(src).toContain('background: "transparent"');
  });

  it("AvailableRChip states its resolution via a left accent, not a box", () => {
    const src = READ("components/experience/AvailableRChip.tsx");
    // The color-shifting decision moved from `border:` to `borderLeft:`.
    // The chip still communicates RESOLVED / PARTIAL / UNKNOWN via
    // colour, but does so as a thin accent — not by drawing a
    // wall around itself.
    expect(src).toContain("borderLeft:");
    expect(src).not.toMatch(/border:\s*`1px solid \$\{/);
    expect(src).toContain('background: "transparent"');
    // The dead borderColor variable is gone too — regressions that
    // introduce a full-box border tend to re-add that variable.
    expect(src).not.toContain("const borderColor =");
  });

  it("HeroTruth carries a state-tint LEFT ACCENT, not a full-box glow", () => {
    // The audit specifically bans "glowing orb" backgrounds and asks
    // for "localized state tint only where semantically owned." HeroTruth
    // now signals qualityState via a 3px left-edge accent — the same
    // grammar AvailableRChip uses — instead of a full colored border,
    // a gradient halo, and a box shadow.
    const src = READ("components/command-deck/HeroTruth.tsx");
    expect(src).toContain("borderLeft: `3px solid ${style.color}`");
    expect(src).not.toMatch(/border:\s*`1px solid \$\{style\.color/);
    // The halo gradient is what made the hero read as a glowing card.
    // Its own dictionary entry says "never a glowing orb"; check for its
    // absence at the wrapper style.
    expect(src).not.toContain("linear-gradient(180deg, ${style.halo}");
    // Box shadow is the third leg of the "app card" grammar; also gone.
    expect(src).not.toContain("boxShadow: `0 0 60px");
    expect(src).toContain('background: "transparent"');
  });

  it("DecisionWhyPanel is an aspect of the current decision, not a WHY app", () => {
    // Founder brief step 5: "Turn WHY / Spaidbot into contextual
    // inspection of the SAME canonical decision." A walled-off WHY
    // panel is the exact "trip to a separate app" the founder is
    // ending.
    const src = READ("components/experience/DecisionWhyPanel.tsx");
    expect(src).toContain("borderTop: `1px solid ${HAIR}`");
    expect(src).not.toMatch(/border:\s*`1px solid \$\{HAIR\}`/);
    expect(src).toContain('background: "transparent"');
  });

  it("MarketCanvasPanel is a continuation of MARKET, not another card below it", () => {
    // The panel renders WHY-NOT / would-invalidate chips immediately
    // beneath the chart. A full-box border made those chips a "second
    // card" — the exact "chart card + evidence card" silhouette the
    // audit flagged. It is one continuous MARKET section now.
    const src = READ("components/experience/MarketCanvasPanel.tsx");
    expect(src).toContain("borderTop: `1px solid ${HAIR}`");
    expect(src).not.toMatch(/border:\s*`1px solid \$\{HAIR\}`/);
    expect(src).toContain('background: "transparent"');
  });

  it("DecisionSpineBand is a strip on the field, not a lifted panel", () => {
    // The lighter-than-sanctuary background made the six-cell summary
    // read as a raised dashboard panel. The strip inherits the
    // sanctuary depth now and is delineated only by hairlines top and
    // bottom.
    const src = READ("components/experience/DecisionSpineBand.tsx");
    expect(src).toContain('background: "transparent"');
    expect(src).not.toContain('background: "#0D0E14"');
  });

  it("DeckExpressionShortlist reads as an aspect, not a separate app", () => {
    const src = READ("components/experience/DeckExpressionShortlist.tsx");
    // Same hairline / transparent-background treatment as the chart —
    // MARKET, RISK, EXPRESSION now share one continuous surface.
    expect(src).toContain('borderTop: "1px solid rgba(139,106,41,0.20)"');
    expect(src).not.toMatch(/border:\s*"1px solid rgba\(139,106,41,0\.25\)"/);
    // Background must not restore the boxed feel — the shortlist is
    // supported by the sanctuary, not a card.
    const sectionStart = src.indexOf("data-testid=\"deck-expression-shortlist\"");
    const sectionEnd = src.indexOf(">", sectionStart);
    const sectionOpen = src.slice(sectionStart, sectionEnd);
    // We don't allow "background: 'rgba(11,11,13'" reappearing at the
    // outer section wrapper. The tile buttons INSIDE the shortlist can
    // still carry their own accent (they represent selectable choices,
    // not walls).
    expect(sectionOpen).not.toMatch(/background:\s*"rgba\(11,11,13/);
  });
});
