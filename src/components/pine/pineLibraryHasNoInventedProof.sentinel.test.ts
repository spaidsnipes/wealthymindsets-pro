/** The Pine library is WM-curated: no invented stars, forks, views, verified badges or recency. */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const SRC = readFileSync("src/components/pine/PineCommunityLibrary.tsx", "utf8");

describe("pine library", () => {
  it("carries no fabricated social proof", () => {
    expect(SRC).not.toMatch(/stars:\s*\d|forks:\s*\d|views:\s*\d|verified:\s*(true|false)|updatedDays:\s*\d/);
    expect(SRC).not.toMatch(/Community-built & reviewed|verified indicators|Most Stars|Most Viewed/);
  });
});
