/**
 * THE MASTHEAD HOLDS ITS CONTROLS FROM 901px UP — Garden 16 §11 verifier RED,
 * measured on the glass 2026-09-26 (local /charts, real UI).
 *
 * BEFORE (Command Deck plate at full size in every desktop width): at 1024
 * Search, Notifications, Settings and Profile ended at x 1083–1143 — past the
 * edge; at 901 the Command Deck control too. AFTER (this band): every masthead
 * control inside the viewport at 901, 1024, 1280 and 1600 (Profile ends at 863
 * of 901, 948 of 1280). Frames: scratchpad g16/eyes/deck-{before,after}-mast-*.png.
 *
 * Source read (a breadcrumb; the frames are the proof).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { OS_MASTHEAD_COMPACT_MAX_PX, OS_RAIL_BREAKPOINT_PX } from "./WMOperatingSystem";

const OS = readFileSync(path.join(process.cwd(), "src/components/os/WMOperatingSystem.tsx"), "utf8");

function band(): string {
  const a = OS.indexOf("@media (min-width: ${OS_RAIL_BREAKPOINT_PX + 1}px) and (max-width: ${OS_MASTHEAD_COMPACT_MAX_PX}px) {");
  expect(a, "the compact masthead band is missing").toBeGreaterThan(-1);
  const b = OS.indexOf("\n        }\n", a);
  return OS.slice(a, b);
}

describe("the compact masthead band", () => {
  it("covers the widths the full-size plates overflowed", () => {
    // Measured: 1280 held three full plates only because the utilities moved
    // right; 1024 did not. The band reaches past both.
    expect(OS_MASTHEAD_COMPACT_MAX_PX).toBeGreaterThanOrEqual(1280);
    expect(OS_MASTHEAD_COMPACT_MAX_PX).toBeGreaterThan(OS_RAIL_BREAKPOINT_PX);
  });

  it("comes after the desktop block, so it wins at equal weight", () => {
    const desktop = OS.indexOf("@media (min-width: ${OS_RAIL_BREAKPOINT_PX + 1}px) {");
    expect(desktop).toBeGreaterThan(-1);
    expect(OS.indexOf("and (max-width: ${OS_MASTHEAD_COMPACT_MAX_PX}px)")).toBeGreaterThan(desktop);
  });

  it("narrows the pair and shows the deck by its mark alone — the name stays for assistive tech", () => {
    const b = band();
    const w = /\.wm-os-equipment-plate \{[\s\S]*?width: (\d+)px !important;/.exec(b);
    expect(w, "the pair's width is not set in the band").not.toBeNull();
    expect(Number(w![1])).toBeLessThanOrEqual(118);
    expect(b).toMatch(/\.wm-os-command-deck \.wm-os-equipment-plate-word \{[\s\S]*?position: absolute !important;[\s\S]*?clip: rect\(0 0 0 0\) !important;/);
    // Visually hidden, not display:none — the accessible name must survive.
    expect(b).not.toMatch(/\.wm-os-command-deck[^{]*\{[^}]*display: none/);
    expect(OS).toContain('aria-label="Command Deck"');
  });
});
