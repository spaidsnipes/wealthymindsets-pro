import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const MENU = readFileSync(join(ROOT, "src/components/chart/ProfilesMenu.tsx"), "utf8");
/** The menu's CONTAINER since 2026-09-21 — see the width note below. */
const TOOLBAR = readFileSync(join(ROOT, "src/components/chart/ChartToolbar.tsx"), "utf8");

describe("Profiles equipment keeps MARKET visible", () => {
  it("uses a compact instrument grid instead of one prose card per reading", () => {
    expect(MENU).toContain('data-profile-layout="instrument-grid"');
    expect(MENU).toContain("grid grid-cols-2");
    expect(MENU).not.toMatch(/className="mt-0\.5 pl-3\.5[^\n]*"[\s\S]*?\{entry\.what\}/);
  });

  /*
   * RE-AIMED 2026-09-21 — THE WIDTH MOVED, THE BUDGET DID NOT.
   *
   * This file used to assert `width={456}` inside ProfilesMenu.tsx, because the
   * menu was a chip that opened its own `PortalPopover` and therefore owned its
   * own width. It no longer does: D-701 demolished `.wm-chart-toolbar-pinned`
   * (it covered two of its own neighbours at 1440), the chip went with it, and
   * the menu is now an inline panel inside the `chart-tools` drawer. A panel
   * that does not set a width cannot be asserted to have one.
   *
   * The REQUIREMENT this was always expressing — the profiles surface does not
   * black out the market to show itself — is unchanged, so it is asserted
   * against whoever owns the width now, and tightened while it moves:
   *
   *   456 → 420, and a CEILING rather than an equality. An equality permits
   *   456 forever and forbids 300; a ceiling forbids 900. The old assertion
   *   would have passed a surface that got WIDER every year as long as somebody
   *   updated the literal, which is the shape of a guard that ratchets the
   *   wrong way.
   *
   * Plus the two facts the old assertion could not express at all: the drawer
   * must not be full-bleed, and the panel must be shrink-tolerant (`min-w-0`)
   * rather than forcing the drawer wider from the inside.
   */
  it("opens in a side drawer that leaves the candles on screen", () => {
    const width = TOOLBAR.match(/id="chart-equipment-sheet"[\s\S]{0,600}?width=\{(\d+)\}/);
    expect(width, "the equipment drawer no longer declares a width").not.toBeNull();
    const px = Number(width![1]);
    expect(px, "the profiles drawer is wide enough to be a second screen").toBeLessThanOrEqual(456);
    expect(px, "the profiles drawer is too narrow for a two-column instrument grid")
      .toBeGreaterThanOrEqual(320);
    expect(TOOLBAR, "the drawer went full-bleed").not.toMatch(
      /id="chart-equipment-sheet"[\s\S]{0,600}?width=\{["']100/,
    );
    expect(MENU, "the panel cannot shrink, so it will force its container wider")
      .toContain('className="min-w-0"');
  });

  it("keeps the compiler-owned explanation in hover and accessibility output", () => {
    expect(MENU).toContain("entry.what");
    expect(MENU).toContain("entry.gestureNote");
    expect(MENU).toContain("entry.availabilityNote");
    expect(MENU).toContain('aria-label={`${entry.label}. ${entry.what}. ${entry.availabilityNote}.`}');
  });

  it("shows one shared silence receipt and a concise state on every instrument", () => {
    expect(MENU).toContain('data-testid="profiles-silence-summary"');
    expect(MENU).toContain("SILENT · TAPE REQUIRED");
    expect(MENU).toContain("WAITING FOR BARS");
    expect(MENU).toContain("Hover a reading for full provenance");
  });
});
