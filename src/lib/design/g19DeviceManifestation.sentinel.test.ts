import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * GARDEN 19 §22 — DESKTOP · TABLET · PHONE.
 *
 * The geometry was MEASURED (Playwright, installed Chrome, DSF 3, /charts at
 * 390x844, 430x932, 375x667, 834x1112, 1180x820, 1024x1366 — proofs in
 * ~/wm-held/proof/g19-charts-*.png). These assertions pin the stylesheet
 * decisions that geometry depended on, so a later edit cannot quietly undo
 * them:
 *   - phones and portrait tablets had NO Trade door (the context strip was
 *     hidden at <=900 while the device pass was phase-gated);
 *   - on a phone the strip is a bottom thumb bar with Trade first, and the
 *     market pane gives the bar its height back;
 *   - Inspect on a phone is a bottom sheet of the camera, not a 228px card
 *     over the candles;
 *   - touch screens get 44px targets on the strip and the Inspect close;
 *   - an EMPTY orientation strip takes no row on tablet landscape.
 */
const CSS = readFileSync(path.resolve(__dirname, "..", "..", "app", "globals.css"), "utf8");
const block = CSS.slice(CSS.indexOf("GARDEN 19 §22 — DESKTOP · TABLET · PHONE"));

describe("Garden 19 §22 device manifestation", () => {
  it("is present in the stylesheet", () => {
    expect(CSS).toContain("GARDEN 19 §22 — DESKTOP · TABLET · PHONE");
  });

  it("brings the context strip (Trade, Watchlist, Indicators) back to portrait tablets", () => {
    expect(block).toMatch(/@media \(min-width: 640px\) and \(max-width: 900px\) and \(min-height: 521px\) \{\s*\.wm-instrument-context-strip \{ display: flex !important; \}/);
  });

  it("pins the strip under the thumb on a phone, Trade first, and the pane gives the bar its height back", () => {
    const phone = block.slice(block.indexOf("@media (max-width: 639px) and (min-height: 521px)"));
    expect(phone).toMatch(/\.wm-instrument-context-strip \{[^}]*position: fixed !important;[^}]*bottom: 0 !important;/);
    expect(phone).toMatch(/\[data-testid="context-trade"\] \{ order: -3;/);
    expect(phone).toMatch(/\.wm-chart-market-pane\[data-market-primary="true"\] \{[^}]*- 52px - (?:var\(--wm-g19-plaque, 0px\) - )?env\(safe-area-inset-bottom\)/);
  });

  it("opens Trade on a phone as an edge-to-edge sheet above the thumb bar", () => {
    expect(block).toMatch(/\[data-testid="trade-panel"\] \{[^}]*left: 8px !important;[^}]*right: 8px !important;[^}]*bottom: calc\(56px/);
  });

  it("opens Inspect on a phone as a bottom sheet of the camera, never a card over the candles", () => {
    expect(block).toMatch(/\.wm-chart-market-pane \[data-testid="chart-inspect-ticket"\] \{[^}]*top: auto !important;[^}]*bottom: 8px !important;[^}]*max-height: 46% !important;/);
  });

  it("gives every touch screen 44px targets on the strip and the Inspect close", () => {
    expect(block).toMatch(/@media \(pointer: coarse\) \{\s*\.wm-instrument-context-strip \{ min-height: 48px !important; \}/);
    expect(block).toMatch(/button\[aria-label="Close the inspect ticket"\] \{\s*min-width: 44px !important;\s*min-height: 44px !important;/);
  });

  it("an empty orientation strip takes no row beside the tablet market", () => {
    expect(block).toContain(".wm-chart-room-header--market-home > .wm-chart-orientation-strip:not(:has(:not(.wm-chart-orientation-context, .wm-chart-orientation-actions)))");
  });

  it("the symbol row's verdict wraps on the whole phone band — canon words, never clipped", () => {
    expect(block).toMatch(/\.wm-chart-market-summary \.wm-fidelity-badge--chrome \{[^}]*white-space: normal !important;/);
  });
  it("the phone thumb bar is exactly the height the pane reserves, on every pointer", () => {
    const phone = block.slice(block.indexOf("@media (max-width: 639px) and (min-height: 521px)"));
    expect(phone).toMatch(/\.wm-instrument-context-strip \{[^}]*box-sizing: border-box !important;[^}]*height: calc\(52px \+ env\(safe-area-inset-bottom\)\) !important;/);
  });

  it("a phone turned sideways keeps a Trade door — pills at the lower left, never over the newest candles", () => {
    const land = block.slice(block.indexOf("@media (max-height: 520px) and (max-width: 1023px)"));
    expect(land).toMatch(/\.wm-instrument-context-strip \{[^}]*position: fixed !important;[^}]*left: calc\(8px/);
    expect(land).not.toMatch(/\.wm-instrument-context-strip \{[^}]*right: (?!auto)/);
    expect(land).toMatch(/\[data-testid="context-trade"\],[\s\S]*?min-height: 44px !important;/);
    expect(land).toMatch(/\[data-testid="context-trade"\] \{ order: -3;/);
  });
  it("a phone on its side gets a one-row market masthead: monogram, doors, utilities, the verdict as a chip", () => {
    const m = block.slice(block.indexOf("PHONE LANDSCAPE: THE MASTHEAD IS ONE ROW"));
    expect(m).toMatch(/@media \(max-height: 520px\) and \(max-width: 1023px\) \{\s*body:has\(\.wm-chart-market-pane\[data-market-primary="true"\]\) \.wm-os-masthead\.wm-os-masthead \{/);
    // Only a LIVE, established verdict folds its detail; any other tone keeps it.
    expect(m).toContain('.wm-os-feed-standing[data-tone="LIVE"][data-established="true"] [data-testid="os-feed-standing-detail"]');
    expect(m).not.toMatch(/\.wm-os-feed-standing(?!\[data-tone="LIVE"\])[^{]*\{[^}]*display: none/);
    // The tap floor is never what pays for the height.
    expect(m).not.toMatch(/min-height: (?:[0-3]\d|4[0-3])px/);
  });
});
