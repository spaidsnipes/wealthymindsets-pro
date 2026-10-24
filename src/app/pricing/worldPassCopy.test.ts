import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Founder 2026-10-24 (final): the $20 World Pass is a paid pick of ONE app at $20 + the $10 tier of every other ATH app,
// future apps included; never free; never every app's $20/$50 tier. thewow.online is WOW OS, never "WOW World".
const PRICING = readFileSync(path.join(process.cwd(), "src/app/pricing/page.tsx"), "utf8");
const PROFILE = readFileSync(path.join(process.cwd(), "src/app/profile/page.tsx"), "utf8");

describe("World Pass copy says the Founder's rule", () => {
  it("names what it includes and what it is not", () => {
    for (const w of ["The $10 tier of every other ATH app", "Dreamboard", "WOW Academy", "never free", "not the $20 or $50 tier of every app"]) expect(PRICING.toLowerCase(), w).toContain(w.toLowerCase());
  });
  it("never says future apps are excluded, or that the pass is free", () => {
    for (const w of ["Only the apps named at checkout", "not every future app", "World Pass free", "free World Pass"]) expect(PRICING, w).not.toContain(w);
  });
  it("the profile calls thewow.online WOW OS", () => {
    expect(PROFILE).not.toContain("opens WOW World");
    expect(PROFILE).not.toContain("WOW World Passport");
  });
});
