import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const DESK = readFileSync("src/components/desk/DeskShell.tsx", "utf8");
// Serving TSLA desk screen, 2026-10-01: RTH-only → STALE PIPELINE after the close.
describe("desk screens read /charts' session preference", () => {
  it("passes extendedHours from wm_extHours (default ON)", () => {
    expect(DESK).toContain('localStorage.getItem("wm_extHours")');
    expect(DESK).toContain("extendedHours={extendedHours}");
  });
});
