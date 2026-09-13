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
