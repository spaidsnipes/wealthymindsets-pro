/** No invented social proof or scarcity in the concept catalog (no-fake-data law). */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const SRC = readFileSync("src/app/shop/page.tsx", "utf8");

describe("shop concept catalog", () => {
  it("carries no invented ratings, review counts, sales badges or scarcity claims", () => {
    expect(SRC).not.toMatch(/stars:\s*\d/);
    expect(SRC).not.toMatch(/reviews:\s*\d/);
    expect(SRC).not.toMatch(/BESTSELLER|"HOT"|Limited to \d+ units/);
  });
  it("still says checkout is not connected", () => {
    expect(SRC).toContain("checkout not connected");
  });
});
