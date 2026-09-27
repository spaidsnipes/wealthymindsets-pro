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

  // Garden 16 §51 (2026-09-26, measured): at 901 the feed reading ran to
  // x 1005 of 901, and on every doors room the mode bar folded into a column
  // (masthead 211px tall at 901). The band now lets the row wrap, chosen.
  it("lets the row wrap instead of spilling past the edge", () => {
    expect(band()).toMatch(/\.wm-os-masthead \{[^}]*flex-wrap: wrap !important;/);
  });

  // Verifier RED 2026-09-27: forcing the mode bar onto a row of its own cost
  // /journal 52px at 1360-1399 (73 -> 125) where the seven modes fit inline.
  it("lets the wrap decide where a room's mode bar stands — its one-row width, never shrunk, never reordered", () => {
    const b = band();
    const rule = /\.wm-os-masthead-center:not\(:empty\) \{([^}]*)\}/.exec(b);
    expect(rule, "the band does not size the mode bar").not.toBeNull();
    expect(rule![1]).toContain("flex: 1 0 auto !important;");
    expect(rule![1]).not.toMatch(/100%|order:/);
    expect(b).toMatch(/\.wm-os-masthead-center:empty \{ flex-grow: 0 !important; \}/);
  });

  it("keeps the wordmark and doors at the leading edge when the mode bar wraps below them", () => {
    // Measured without it: safe flex-end slid row one to the wordmark at x 441 of 901.
    expect(band()).toMatch(/\.wm-os-masthead > :has\(\+ \.wm-os-masthead-center\) \{ margin-right: auto !important; \}/);
  });

  it("the feed reading's floor is its own widest phrase and its ceiling one line — never zero", () => {
    const b = band();
    const rule = /\.wm-os-feed-standing \{([^}]*)\}/.exec(b);
    expect(rule, "the band does not size the feed reading").not.toBeNull();
    // min-width 0 is what let the reading shrink to nothing and overflow.
    expect(rule![1]).toContain("min-width: min-content !important;");
    expect(rule![1]).toContain("max-width: max-content !important;");
    expect(rule![1]).not.toMatch(/display: none|visibility: hidden/);
  });

  it("keeps utilities and reading together at the trailing edge", () => {
    expect(band()).toMatch(/\.wm-os-masthead-center \+ \* \{ margin-left: auto !important; \}/);
  });

  it("aligns a wrapped reading right SAFELY — an overflow can never push the wordmark off the left edge", () => {
    // Measured with the wrap removed: plain flex-end put the wordmark at x -90.
    expect(band()).toMatch(/\.wm-os-masthead \{[^}]*justify-content: safe flex-end;/);
  });
});
