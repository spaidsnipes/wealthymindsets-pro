import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Pace Mountain names the target it is a rate toward (ruling 2026-10-07)", () => {
  it("states the $1,000,000 target with the canon caveat", () => {
    const page = readFileSync("src/app/proof-lane/page.tsx", "utf8");
    expect(page).toContain('data-testid="pace-target"');
    expect(page).toContain("aspirational, not an earnings promise");
    expect(page).toContain("const TARGET = 1_000_000;");
  });
});
