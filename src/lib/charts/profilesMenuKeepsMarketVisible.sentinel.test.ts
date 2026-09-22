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
    /*
     * RE-AIMED 2026-09-21 (D-702) — THE WINDOW WAS A BYTE COUNT, AND IT MOVED.
     *
     * This matched `id="chart-equipment-sheet"[\s\S]{0,600}?width=\{(\d+)\}`.
     * A fixed 600-byte window is two defects in one: it goes RED when the
     * element's own props grow past it (which is what happened — the drawer's
     * accessible `description` gained the four controls that arrived from the
     * demolished band, and `width={420}` fell off the end), and it can
     * OVERREACH past the tag's closing `>` and let a SIBLING element answer a
     * question asked about this one.
     *
     * The window is now MEASURED to the element instead of guessed in bytes:
     * from `<ShellModalDrawer` to the newline-`>` that closes its opening tag.
     * Every assertion below reads that slice only, so no sibling can satisfy
     * them and no amount of prose in this tag can break them. Strictly
     * stronger: the old regex would have been satisfied by a `width={420}` on
     * a completely different drawer 500 bytes downstream.
     */
    const idAt = TOOLBAR.indexOf('id="chart-equipment-sheet"');
    expect(idAt, "the equipment drawer is gone from ChartToolbar").toBeGreaterThan(-1);
    const tagAt = TOOLBAR.lastIndexOf("<ShellModalDrawer", idAt);
    expect(tagAt, "`chart-equipment-sheet` is not on a ShellModalDrawer").toBeGreaterThan(-1);
    const rest = TOOLBAR.slice(tagAt);
    const closeAt = rest.search(/\n\s*>\s*\n/);
    expect(closeAt, "the equipment drawer's opening tag never closes").toBeGreaterThan(-1);
    const tag = rest.slice(0, closeAt);
    // ANCHOR: a slice that came back empty or truncated would make the
    // `not.toMatch` below pass vacuously.
    expect(tag.length, "the drawer tag read as empty").toBeGreaterThan(120);
    expect(tag, "the window overran into a sibling element").not.toContain("</");

    const width = tag.match(/width=\{(\d+)\}/);
    expect(width, "the equipment drawer no longer declares a width").not.toBeNull();
    const px = Number(width![1]);
    expect(px, "the profiles drawer is wide enough to be a second screen").toBeLessThanOrEqual(456);
    expect(px, "the profiles drawer is too narrow for a two-column instrument grid")
      .toBeGreaterThanOrEqual(320);
    expect(tag, "the drawer went full-bleed").not.toMatch(/width=\{?["']?100/);
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
