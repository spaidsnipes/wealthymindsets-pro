import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const MENU = readFileSync(join(ROOT, "src/components/chart/ProfilesMenu.tsx"), "utf8");

describe("Profiles equipment keeps MARKET visible", () => {
  it("uses a compact instrument grid instead of one prose card per reading", () => {
    expect(MENU).toContain('data-profile-layout="instrument-grid"');
    expect(MENU).toContain("grid grid-cols-2");
    expect(MENU).toContain('width={456}');
    expect(MENU).not.toMatch(/className="mt-0\.5 pl-3\.5[^\n]*"[\s\S]*?\{entry\.what\}/);
  });

  it("keeps the compiler-owned explanation in hover and accessibility output", () => {
    expect(MENU).toContain("entry.what");
    expect(MENU).toContain("entry.gestureNote");
    expect(MENU).toContain("entry.availabilityNote");
    expect(MENU).toContain('aria-label={`${entry.label}. ${entry.what}. ${entry.availabilityNote}.`}');
  });

  it("shows one shared silence receipt and a concise state on every instrument", () => {
    expect(MENU).toContain('data-testid="profiles-silence-summary"');
    expect(MENU).toContain("SILENT · TAPE REQUIRED");
    expect(MENU).toContain("WAITING FOR BARS");
    expect(MENU).toContain("Hover a reading for full provenance");
  });
});
