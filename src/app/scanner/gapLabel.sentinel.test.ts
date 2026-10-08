import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("the scanner's fall-through signal makes no fill promise (2026-10-07)", () => {
  const page = readFileSync("src/app/scanner/page.tsx", "utf8");
  it("labels the fall-through key as a range with no trigger", () => {
    expect(page).toMatch(/"gap-fill":\s*\{ label:"Range · no trigger"/);
  });
  it("no visible signal label reads Gap Fill", () => {
    expect(page).not.toMatch(/label:\s*"Gap Fill"/);
  });
});
