import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dashboardRaw = readFileSync(resolve(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");

/**
 * COMMENT-STRIPPED, and this file learned that the hard way.
 *
 * The negative assertions below ban a nested `<details>` inside the Decision
 * Why drawer. The commit that REMOVED that burial left a docblock in its place
 * explaining what had been there and why it may not come back — and the raw
 * read saw the tag name inside that prose and failed the file for the crime it
 * had just fixed.
 *
 * The tempting repair is to reword the comment until the detector is happy,
 * which makes the rule a thing you route around rather than a thing you obey.
 * The honest one is this: a comment is not product depth. A trader cannot press
 * a comment. So the scan reads what SHIPS, matching how every Sentinel in
 * `src/lib/workspace` already reads source.
 */
const dashboard = dashboardRaw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");
const drawer = readFileSync(resolve(process.cwd(), "src/components/layout/ShellModalDrawer.tsx"), "utf8");

describe("chart Market Object Passport transformation", () => {
  it("uses the shared responsive modal owner instead of a narrow desktop-only overlay", () => {
    expect(dashboard).toContain("<ShellModalDrawer");
    expect(dashboard).not.toContain('maxWidth: "42vw"');
    expect(drawer).toContain("max-w-[100vw]");
    expect(drawer).toContain("aria-modal=\"true\"");
  });

  /**
   * WHY THIS RULE CHANGED SHAPE, AND WHY THAT IS NOT A SOFTENING.
   * ------------------------------------------------------------
   * This assertion used to demand a `<details>`/`<summary>` pair here, and it
   * was right to at the time: the passport had previously been a div-with-
   * onClick in a desktop-only overlay, so a NATIVE disclosure with a 44px
   * target was a real improvement, and pinning the exact tags was how that
   * improvement was kept.
   *
   * What the rule was always protecting is the trader's ACCESS to lineage from
   * inside WHY. The `<details>` was the mechanism of the day, not the meaning.
   *
   * The mechanism is now banned by name — "nested `<details>` as product depth,
   * drawer-inside-drawer burial". The trader has already spent a press opening
   * a sheet that asks WHY; charging them a second press, inside the answer, for
   * the evidence is the same burial the deck was cured of. So the disclosure is
   * GONE, not moved, and the lineage renders unconditionally inside the drawer.
   *
   * That is strictly MORE access than a `<details>` gave, so the rule is
   * re-pinned to the meaning and made harder to pass than it was: it now
   * asserts the burial CANNOT come back (a negative the old rule never had),
   * that the panel is still fed the room's own compilation, and that the
   * desktop door — equipment, which the old shape had no equivalent of at all —
   * is registered. Deleting any one of those makes this test red.
   */
  it("renders lineage inside WHY unconditionally — no second press, no nested disclosure", () => {
    const start = dashboard.indexOf('id="chart-decision-why"');
    // Anchored on the drawer's own closing tag, not on the `{/* ── Toolbar */}`
    // banner this used to hunt for: that banner is a comment, and a comment is
    // not a boundary the product owns. It is also a TIGHTER window — the old one
    // ran past the drawer into whatever happened to sit between it and the
    // toolbar, so these rules were being asked about markup they do not govern.
    const end = dashboard.indexOf("</ShellModalDrawer>", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const why = dashboard.slice(start, end);

    expect(why).toContain("fallbackTriggerRef={whyTriggerRef}");

    // The lineage is still HERE, still fed the room's single compilation, and
    // still keyed so switching instruments cannot show the previous object's
    // lineage for a frame.
    expect(why).toContain('id="chart-market-object-passport"');
    expect(why).toContain("<MarketObjectPassportPanel vm={chartPassportVM} />");
    expect(why).toContain('key={`${symbol}:${timeframe}`}');

    // ...and it is NOT behind a second press. This is the assertion the old
    // rule could not make, because the old rule required the thing it bans.
    expect(
      why,
      "the Decision Why drawer must not bury lineage behind a nested disclosure — that is drawer-inside-drawer",
    ).not.toMatch(/<details/);
    expect(why, "a <summary> here means a disclosure came back").not.toMatch(/<summary/);

    // The desktop door. Before this transformation the passport was compiled on
    // every render of this room and reachable through NOTHING on a desktop
    // Chart tab — the WHY trigger itself only renders when
    // `narrowViewport || optionsOpen`. Equipment is that door; if this memo
    // disappears the room silently returns to zero desktop access.
    expect(
      dashboard,
      "the chart room must keep a desktop door to lineage that does not require opening WHY",
    ).toContain("chartPassportEquipment");
    expect(dashboard).toContain('title: "Market object passport"');

    expect(dashboard).not.toContain("passportOpen");
    expect(dashboard).toContain("minHeight: 44");
    expect(dashboard).not.toContain("height: 28,");
  });

  it("inherits Escape, focus containment, and focus restoration", () => {
    expect(drawer).toContain("useShellModalFocus");
    expect(drawer).toContain("onKeyDown={onKeyDown}");
    expect(drawer).toContain("initialFocusRef: closeRef");
    const focus = readFileSync(resolve(process.cwd(), "src/components/layout/useShellModalFocus.ts"), "utf8");
    expect(focus).toContain('"summary"');
  });
});
