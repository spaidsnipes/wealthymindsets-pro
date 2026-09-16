import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { WM } from "@/lib/design/wmTokens";

const page = fs.readFileSync(
  path.join(process.cwd(), "src/app/heatmaps/page.tsx"),
  "utf8",
);
const stockTileSection = page.slice(page.indexOf("{/* Stock tiles grid */"));

describe("Heat Map stock tile accessibility and missing-row truth", () => {
  it("uses native, named chart actions with keyboard and touch-sized targets", () => {
    expect(page).toContain('<button\n                            key={st.sym}\n                            type="button"');
    expect(page).toContain('className="wm-heatmap-stock-tile"');
    expect(page).toContain('aria-label={`${st.name}, ${st.sym}, ${activeTF} ${changeText}. Open chart`}');
    expect(page).toContain("minWidth: tileWeight < 0.05 ? 44 : 52");
    expect(page).toContain("minHeight: tileWeight > 0.35 ? 80 : tileWeight > 0.15 ? 56 : 44");
    expect(page).toContain('touchAction: "manipulation"');
    expect(page).toContain(".wm-heatmap-stock-tile:focus-visible");
    // The focus ring used to be pinned to the literal #f0b429. It is now the
    // brass token, so the pin follows the design system instead of freezing a
    // value the system no longer owns. What matters and is still asserted: the
    // ring is 3px, solid, and drawn in identity metal.
    expect(page).toContain("outline: 3px solid ${WM.gold.mark}");
    expect(WM.gold.mark).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("shows unavailable data neutrally instead of fabricating a green zero", () => {
    expect(page).toContain("const p = readObservedChange(pcts, st.sym)");
    // Previously pinned to #252B36, a slate the design system did not own.
    // The requirement was never that colour — it was that an unreadable tile
    // is painted NEUTRAL rather than the green a fabricated 0% would produce.
    expect(page).toContain("p === null ? WM.surface.raised : pctColor(p)");
    const [r, g, b] = (WM.surface.raised.match(/[0-9a-f]{2}/gi) ?? []).map(h => parseInt(h, 16));
    expect(g, "the unavailable fill must not be green-dominant").toBeLessThanOrEqual(Math.max(r, b));
    expect(page).toContain('? "change unavailable"');
    expect(page).toContain('{p === null ? "—"');
    expect(stockTileSection).not.toContain("const p = pcts[st.sym] ?? 0;");
  });

  it("keeps the heat map reachable while preserving the canonical chart owner", () => {
    expect(page).toContain('overflow: "auto"');
    expect(page).toContain('overscrollBehavior: "contain"');
    expect(page).toContain('WebkitOverflowScrolling: "touch"');
    expect(page).toContain('touchAction: "pan-x pan-y"');
    expect(page).toContain("setActiveSymbol(sym)");
    // Canonical chart route is still the ONLY navigation owner. The symbol is
    // now carried in the query so the resulting chart is shareable and survives
    // reload (Founding Contract §13 Scanner → Deck → Chart continuity).
    expect(page).toMatch(/router\.push\(`\/charts\?symbol=\$\{encodeURIComponent\(sym\)\}`\)/);
    expect(page).toContain("onClick={() => goToChart(st.sym)}");
  });
});
