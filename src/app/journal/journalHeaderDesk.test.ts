/**
 * THE JOURNAL HEADER RECOMPOSES ON THE DESK — Garden 16 §51.
 *
 * Measured on the glass 2026-09-26 at 1600: the header was one unwrapping row.
 * The toolbar ran past the right edge (Genome and New Entry at x 1583–1739 of
 * 1600 — New Entry, the page's primary action, unreachable), and the stat
 * chips were crushed into a 92px column beside the title, 264px tall.
 * Reproduced off the page's own classes in Chromium at 901/1024/1280/1440/1600
 * before the repair (New Entry right edge 1739 at every width) and after
 * (≤ viewport − 34 at every width). This test pins the rules and their hooks.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { OS_RAIL_BREAKPOINT_PX } from "@/components/os/WMOperatingSystem";

const CSS = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
const PAGE = readFileSync(path.join(process.cwd(), "src/app/journal/page.tsx"), "utf8");

function deskBlock(): string {
  const open = `@media (min-width: ${OS_RAIL_BREAKPOINT_PX + 1}px) {\n  .wm-journal-header {`;
  const a = CSS.indexOf(open);
  expect(a, "the desk journal-header block is missing, or its breakpoint left the rail's").toBeGreaterThan(-1);
  const b = CSS.indexOf("\n}\n", a);
  return CSS.slice(a, b === -1 ? undefined : b);
}

describe("the /journal header from the rail breakpoint up", () => {
  it("wraps, and drops the phone scroller's edge fade", () => {
    const b = deskBlock();
    expect(b).toMatch(/\.wm-journal-header \{[^}]*flex-wrap: wrap;/);
    expect(b).toMatch(/\.wm-journal-header \{[^}]*mask-image: none;/);
  });

  it("lets the toolbar wrap onto more rows rather than past the edge", () => {
    expect(deskBlock()).toMatch(/\.wm-journal-tools \{[^}]*flex-wrap: wrap;[^}]*min-width: 0;/);
  });

  it("lays the stat chips in a row of their own, not a column beside the title", () => {
    expect(deskBlock()).toMatch(/\.wm-journal-chips \{[^}]*order: 1;[^}]*flex-basis: 100%;/);
  });

  it("never splits a tab name", () => {
    expect(deskBlock()).toMatch(/\.wm-journal-tabs > button \{ white-space: nowrap; \}/);
  });

  it("hides nothing to make the width pass", () => {
    expect(deskBlock()).not.toMatch(/display: none|visibility: hidden|overflow: hidden/);
  });

  it("the page carries the four hooks the rules name, on the right elements", () => {
    expect(PAGE).toContain('className="wm-journal-header flex items-center');
    expect(PAGE).toContain('className="wm-journal-tabs flex gap-1"');
    expect(PAGE).toContain('className="wm-journal-chips flex items-center gap-2 flex-wrap"');
    expect(PAGE).toContain('className="wm-journal-tools ml-auto flex items-center gap-2"');
    // New Entry lives in the tools group, so the tools rule is what keeps it reachable.
    const tools = PAGE.indexOf('className="wm-journal-tools');
    expect(PAGE.indexOf("<Plus size={12} /> New Entry", tools)).toBeGreaterThan(tools);
  });
});
