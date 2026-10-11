import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A PHONE IS NOT A SMALL DESK (Founder, 2026-10-11): on a phone portrait in the market room the
 * masthead is ONE row (monogram · three doors · four utilities), the LIVE-and-established feed
 * reading stands down (the symbol row says it), and hover-only desk chips leave the glass.
 */
const CSS = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
const block = CSS.slice(CSS.indexOf("/* ══ A PHONE IS NOT A SMALL DESK"));

describe("phone portrait market room", () => {
  it("reads the stylesheet", () => {
    expect(CSS.length).toBeGreaterThan(50_000);
    expect(block.length).toBeGreaterThan(1_000);
  });
  it("is scoped to phone portrait and the market room", () => {
    expect(block).toContain("@media (max-width: 639px) and (min-height: 521px) {");
    expect(block).toContain('body:has(.wm-chart-market-pane[data-market-primary="true"]) .wm-os-masthead.wm-os-masthead {');
  });
  it("one row: the word mark steps back to the monogram, plate marks go, doors keep a 44px target", () => {
    expect(block).toContain('[data-testid="os-identity"] .wm-wordmark span { display: none !important; }');
    expect(block).toContain(".wm-os-equipment-plate-mark { display: none !important; }");
    expect(block).toMatch(/:is\(\.wm-os-equipment-plate, \.wm-os-market-rooms\) \{[^}]*min-height: 44px !important;/);
  });
  it("the feed reading stands down ONLY while LIVE and established; any other tone keeps its row", () => {
    expect(block).toContain('.wm-os-feed-standing[data-tone="LIVE"][data-established="true"] { display: none !important; }');
    expect(block).toContain(".wm-os-feed-standing.wm-os-feed-standing { order: 3; flex: 1 0 100% !important;");
  });
  it("hover-only desk chips leave the phone glass", () => {
    expect(block).toContain('.wm-chart-market-pane[data-market-primary="true"] button[aria-label="Data window"]');
    expect(block).toContain('.wm-chart-market-pane[data-market-primary="true"] .wm-nectar-vault-chip { display: none !important; }');
  });
});
