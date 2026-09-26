/**
 * SENTINEL — THREE SURFACES FOUND COLLIDING ON THE GLASS STAY PLACED BY THEIR OWNERS.
 *
 * Local /charts TSLA 15m at 1600x900, real UI path, 2026-09-26 (Garden 16 §44
 * a button that does not reach its intended human state is a defect; §70
 * collision). MEASURED before → after:
 *
 *   1. Tools › Chart tools › [Chart tools] menu: top 892, 8px of 630 visible,
 *      0 of 14 items reachable → opens upward, y 210–840, 14 of 14 reachable,
 *      "Drawing tools" opens the Drawing tools sheet.
 *   2. Workspace › Draw › Drawing style: popover x 1372–1592 covering 9 sheet
 *      buttons, "100%" ending at x 1606 → x 1055–1275 beside the sheet, 0
 *      covered, "100%" at x 1234–1262 inside the popover.
 *   3. Legend "MARKET CLOSED · LAST BAR OPENED 07:45 PM" ending at x 1284
 *      over an axis column starting at x 1268 → band ends x 1262, words 1218.
 *
 * The arithmetic is tested in popoverPlacement.test.ts and
 * priceLegendAxisClearance.test.ts. This file pins that the components USE
 * those owners — a component that re-derives its own `bottom + 4` is how the
 * three defects were born. Source is comment-stripped and length-anchored.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";

const read = (rel: string): string => stripComments(readFileSync(join(process.cwd(), rel), "utf8"));
const TOOLBAR = read("src/components/chart/ChartToolbar.tsx");
const PANEL = read("src/components/chart/DrawingToolsPanel.tsx");
const SIDEBAR = read("src/components/chart/LeftDrawingSidebar.tsx");
const CHART = read("src/components/chart/MainChart.tsx");

/** The slice from `start` to the first `end` after it; fails loudly when either is missing. */
const slice = (src: string, start: string, end: string, min = 200): string => {
  const a = src.indexOf(start);
  expect(a, `anchor not found: ${start}`).toBeGreaterThan(-1);
  const b = src.indexOf(end, a + start.length);
  expect(b, `end anchor not found after ${start}: ${end}`).toBeGreaterThan(a);
  const s = src.slice(a, b);
  expect(s.length).toBeGreaterThan(min);
  return s;
};

describe("1 · the chart toolbar's menus open inside the viewport", () => {
  it("every dropped menu in ChartToolbar is placed by placeAnchoredMenu — none re-derives `bottom + 4`", () => {
    expect(TOOLBAR.length).toBeGreaterThan(20000);
    expect(TOOLBAR).toMatch(/import \{ placeAnchoredMenu \} from "@\/lib\/ui\/popoverPlacement";/);
    expect((TOOLBAR.match(/placeAnchoredMenu\(\{/g) ?? []).length, "symbol list, indicators, chart tools").toBe(3);
    expect(TOOLBAR, "a menu fixed at trigger.bottom + 4 again — it will open off-screen at the drawer's foot")
      .not.toMatch(/\.bottom\s*\?\?\s*36\)\s*\+\s*4/);
    expect(TOOLBAR, "a literal maxHeight ignores the room the viewport actually has").not.toMatch(/maxHeight:\s*(460|520)\b/);
    expect((TOOLBAR.match(/maxHeight:\s*place\.maxHeight/g) ?? []).length).toBe(3);
  });

  it("the Chart tools menu measures itself, opens on the side it fits, and scrolls what cannot fit", () => {
    const menu = slice(TOOLBAR, "{advancedOpen && (() => {", 'aria-label="More chart tools"');
    expect(menu).toMatch(/placeAnchoredMenu\(\{[\s\S]*menuHeight:\s*advancedMenuH/);
    const style = slice(TOOLBAR, 'aria-label="More chart tools"', "zIndex: 9999", 60);
    expect(style).toMatch(/top:\s*place\.top/);
    expect(style).toMatch(/bottom:\s*place\.bottom/);
    expect(style).toMatch(/maxHeight:\s*place\.maxHeight/);
    expect(style).toMatch(/overflowY:\s*"auto"/);
    expect(TOOLBAR).toMatch(/ref=\{advancedMenuRef\}\s*role="menu"/);
    // Measured before paint, from the menu's own content height.
    expect(TOOLBAR).toMatch(/useLayoutEffect\(\(\) => \{\s*if \(!advancedOpen\)[\s\S]{0,200}?el\.scrollHeight/);
  });
});

describe("2 · the drawing style popover stays beside the controls that summoned it", () => {
  it("the popover places itself with placePanelBeside from its own exported width and measured height", () => {
    expect(PANEL).toMatch(/import \{ placePanelBeside, type ViewportRect \} from "@\/lib\/ui\/popoverPlacement";/);
    expect(PANEL).toMatch(
      /placePanelBeside\(\{[\s\S]{0,200}?anchor: beside\.anchor,\s*avoid: beside\.avoid,\s*panel: \{ width: DRAWING_STYLE_POPOVER_WIDTH_PX, height: measuredH \}/,
    );
    expect(PANEL).toMatch(/left: placed\.left, top: placed\.top, maxHeight: placed\.maxHeight, overflowY: "auto"/);
    // Unmeasured, it is laid out but not painted — no flash over the tools.
    expect(PANEL).toMatch(/visibility: "hidden"/);
  });

  it("the opacity row yields width instead of pushing \"100%\" past the popover's edge", () => {
    const row = slice(PANEL, "OPACITY", "{style.opacity}%");
    expect(row).toMatch(/flex: 1, minWidth: 0, display: "flex"/);
    expect(row).toMatch(/type="range"[\s\S]{0,200}?style=\{\{ flex: 1, minWidth: 0,/);
  });

  it("the sidebar hands it the summoning control and the whole tool group as the rectangle to avoid", () => {
    expect(SIDEBAR).not.toMatch(/anchorFor\(/);
    expect(SIDEBAR).toMatch(/const g = railRef\.current\?\.getBoundingClientRect\(\) \?\? a;/);
    expect(SIDEBAR).toMatch(/avoid: \{ left: g\.left, top: g\.top, right: g\.right, bottom: g\.bottom \}/);
    expect(SIDEBAR).toMatch(/setStyleBeside\(besideFor\(el\)\)/);
    expect(SIDEBAR).toMatch(/setStyleBeside\(besideFor\(e\.currentTarget\)\)/);
    expect(SIDEBAR).toMatch(/beside=\{styleBeside\}/);
  });
});

describe("3 · the price legend ends left of the price-axis column", () => {
  it("the band's right edge is the chart's own axis width, read from the chart", () => {
    expect(CHART.length).toBeGreaterThan(100000);
    expect(CHART).toMatch(/import \{ priceLegendRightInset \} from "@\/lib\/chart\/priceLegendAxisClearance";/);
    expect(CHART).toMatch(
      /<ClearOfOpenDoor\s+style=\{\{\s*position: "absolute", top: 0, left: 0, right: priceLegendInset, height: PRICE_LEGEND_OVERLAY_H,\s*alignItems: "safe center",/,
    );
    const effect = slice(CHART, "const [priceLegendInset, setPriceLegendInset] = useState(0);", "}, [ready]);", 150);
    expect(effect).toMatch(/chart\.priceScale\("right"\)\.width\(\)/);
    expect(effect).toMatch(/priceLegendRightInset\(w\)/);
    // The time scale's width moves exactly when the axis column does.
    expect(effect).toMatch(/ts\?\.subscribeSizeChange\?\.\(read\)/);
    expect(effect).toMatch(/unsubscribeSizeChange\?\.\(read\)/);
  });

  it("the right-hand words may shrink and abbreviate inside the band, never spill past it", () => {
    expect(CHART).toMatch(/<div className="ml-auto flex min-w-0 items-center gap-3" style=\{\{ flexShrink: 2 \}\}>/);
    const recency = slice(CHART, "data-feed-recency-kind={feedRecency.kind}", "aria-label={isFullscreen", 400);
    expect((recency.match(/className="line-clamp-2 text-\[10px\]/g) ?? []).length, "every recency glyph is clamped to two lines").toBe(3);
    expect(recency).toMatch(/title=\{/); // the full sentence survives the abbreviation
    expect(CHART).toMatch(/className="flex self-start items-center justify-center min-w-11 min-h-11 p-3 -m-3/);
  });
});
