import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve(__dirname, "../app/command-deck/page.tsx"), "utf8");

describe("Command Deck header responsive contract", () => {
  it("keeps all three primary actions reachable on phone widths", () => {
    expect(page).toContain('className="wm-cd-header"');
    expect(page).toContain('className="wm-cd-header-actions"');
    expect(page.match(/className="wm-cd-header-action"/g)).toHaveLength(3);
    expect(page).toContain("@media (max-width: 640px)");
    expect(page).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(page).toContain("flex: 0 0 100%");
  });

  it("provides touch-size and visible-keyboard-focus guarantees", () => {
    expect(page).toContain(".wm-cd-header-action { min-height: 44px !important; }");
    expect(page).toContain(".wm-cd-header-action:focus-visible");
    expect(page).toContain(".wm-cd-header-back:focus-visible");
    expect(page).toContain("outline: 2px solid #d4af37");
  });

  it("preserves a named navigation target for every action", () => {
    expect(page).toContain('aria-label={showEvidence ? "Hide evidence inspector" : "Show evidence inspector"}');
    expect(page).toContain('aria-label="Open Growth on your Profile"');
    expect(page).toContain('aria-label="Open Journal"');
  });
});
