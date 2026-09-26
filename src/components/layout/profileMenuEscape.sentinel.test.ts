/**
 * THE PROFILE MENU PUTS DOWN ON ESCAPE — Garden 16 §17 / §49, found on the
 * glass 2026-09-26 (control walk, /charts 1440x900): after "Open profile menu"
 * and Escape, a full-screen aria-hidden scrim (z-index 149) still covered the
 * masthead — the menu closed only by clicking the scrim. Both shells that draw
 * the menu now close it on Escape. Source read; the walk is the proof.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (f: string) => readFileSync(path.join(process.cwd(), f), "utf8");

describe("Escape closes the profile menu in both shells", () => {
  it("OS chrome (ShellAccessChrome) closes it and returns focus to the trigger", () => {
    const s = read("src/components/layout/ShellAccessChrome.tsx");
    expect(s).toMatch(/if \(!profileOpen\) return;\s*const onEscape = \(e: KeyboardEvent\) => \{\s*if \(e\.key !== "Escape"\) return;\s*setProfileOpen\(false\);\s*profileTriggerRef\.current\?\.focus\(\);/);
    expect(s).toContain('window.addEventListener("keydown", onEscape);');
  });

  it("the legacy shell (MainLayout) closes it too", () => {
    const s = read("src/components/layout/MainLayout.tsx");
    expect(s).toContain('const onEscape = (e: KeyboardEvent) => { if (e.key === "Escape") setProfileOpen(false); };');
    expect(s).toContain('window.addEventListener("keydown", onEscape);');
  });
});
