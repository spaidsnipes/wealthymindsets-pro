import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (): string =>
  readFileSync(resolve(__dirname, "../components/layout/MainLayout.tsx"), "utf8");

describe("Founder operating-room shell", () => {
  it("removes the legacy multi-symbol tape from every Asset-10 family route", () => {
    // The Founder audit 2026-09-13 expanded the Asset-10 family from
    // /command-deck alone to the registry in founderRoomRoutes.ts. The
    // tape suppression follows the same registry — a family route
    // showing the July TickerTape is exactly the kind of "old chrome
    // inside a calm room" the audit flagged.
    const layout = source();
    expect(layout).toContain('const isFounderOperatingRoom = isFounderRoomRoute(pathname);');
    expect(layout).toContain("{isFounderOperatingRoom ? (");
    expect(layout).toContain('data-testid="founder-room-header-space"');
    expect(layout).toContain("<TickerTape />");
  });

  it("keeps the suppression presentational and does not invent replacement market truth", () => {
    const layout = source();
    const start = layout.indexOf("{isFounderOperatingRoom ? (");
    const end = layout.indexOf(")}", start);
    const founderBranch = layout.slice(start, end);
    expect(founderBranch).toContain('aria-hidden="true"');
    expect(founderBranch).not.toMatch(/LIVE|DELAYED|price|source|provider/i);
  });

  /**
   * §30 STEP 2: "Make MARKET the dominant continuous spatial field."
   *
   * The deck's <main> carried `maxWidth: 1280` — a READING measure. Measured
   * live at 1920x847, that capped the room at 1248px and left 672px (35% of
   * the screen) as dead field on the edges while the candle canvas owned 29%
   * of viewport area. Price geometry has no comfortable line length; every
   * pixel the cap refused was structure the trader could not see.
   *
   * Two facts have to hold TOGETHER or the repair silently undoes itself, so
   * they are asserted in one test rather than two. Widening the room while the
   * rail stays proportional (`0.62fr`) just hands ~35% of the new width to a
   * chip, a closed summary line, and a shortlist — none of which read better
   * wide. A bounded rail without the wider room is inert. The pairing IS the
   * invariant.
   */
  it("the deck room is measured for MARKET, and the width it gains is not spent on the rail", () => {
    const raw = readFileSync(
      resolve(__dirname, "../app/command-deck/page.tsx"),
      "utf8",
    );
    // The repair's own comment quotes the value it replaced, so the negative
    // assertion has to read CODE, not prose. A test that a comment can turn
    // red is a test that teaches the next author to stop explaining.
    const deck = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

    expect(deck, "the deck <main> is back on a fixed reading-column cap")
      .toContain('maxWidth: "min(1720px, 100%)"');
    expect(deck, "1280 is a prose measure — it caps the market room, not a paragraph")
      .not.toContain("maxWidth: 1280");

    const workspace = deck.slice(deck.indexOf(".wm-cd-market-workspace {"));
    const columns = workspace.match(/grid-template-columns:\s*([^;]+);/)?.[1];
    expect(columns, "the market workspace lost its column rule").toBeTruthy();
    expect(columns, "MARKET must take the free space")
      .toContain("minmax(0, 1fr)");
    expect(columns, "a fr-sized rail shares every new pixel with MARKET")
      .not.toMatch(/0\.\d+fr/);
  });
});
