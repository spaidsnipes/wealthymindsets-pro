/**
 * PICKING A DESTINATION PUTS THE EQUIPMENT DOWN (finish-line tour · DEFECT 7).
 *
 * The OS shell outlives route changes. Opening Rooms on /charts and choosing
 * Journal left the Rooms panel open over the Journal, and still covering the
 * chart's left edge after returning to /charts. The shell now closes whatever
 * panel is held when the ADDRESS (pathname — never the query, so a symbol
 * switch keeps the Tools open) changes.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const OS = readFileSync(path.join(process.cwd(), "src/components/os/WMOperatingSystem.tsx"), "utf8");
const SHELL = readFileSync(path.join(process.cwd(), "src/components/experience/WMExperienceShell.tsx"), "utf8");

describe("a new address closes the held panel", () => {
  it("the shell resets its scene panel when activeHref changes, not on mount", () => {
    expect(OS).toMatch(/if \(lastHrefRef\.current === activeHref\) return;\s*lastHrefRef\.current = activeHref;\s*setScenePanel\(null\);/);
  });

  it("activeHref is the pathname (a query change — a symbol switch — keeps the panel)", () => {
    expect(SHELL).toContain("activeHref={pathname ?? \"\"}");
  });
});
