import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const page = fs.readFileSync(
  path.join(process.cwd(), "src/app/nectar/page.tsx"),
  "utf8",
);

describe("coverage activity vocabulary", () => {
  it("counts canonical COLLECTING channels as observing", () => {
    expect(page).toContain('c.coverageState === "COLLECTING"');
    expect(page).toContain('label="CHANNELS OBSERVING"');
  });

  it("never invents a LIVE coverage state", () => {
    expect(page).not.toContain('c.coverageState === "LIVE"');
    expect(page).not.toContain('label="CHANNELS LIVE"');
  });

  it("keeps stale, unavailable, and gap truth visible", () => {
    expect(page).toContain('c.coverageState === "STALE"');
    expect(page).toContain('c.coverageState === "UNAVAILABLE"');
    expect(page).toContain('label="COVERAGE GAPS"');
  });
});
