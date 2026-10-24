import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Founder 2026-10-24 (final, with corrections): real tier names (Basic / Premium · World Pass / OS), never "$10 tier".
// The $20 World Pass = Premium of the chosen app + Basic of every other ATH app + all of WOW OS + Academy + Marketplace,
// future apps included; never the Premium/Pro tier of every app; no trials, no founding discounts.
// thewow.online is WOW OS, never "WOW World".
const PRICING = readFileSync(path.join(process.cwd(), "src/app/pricing/page.tsx"), "utf8");
const PROFILE = readFileSync(path.join(process.cwd(), "src/app/profile/page.tsx"), "utf8");

describe("World Pass copy says the Founder's rule", () => {
  it("names what the pass opens and what it is not", () => {
    for (const w of ["Basic of every other ATH app", "WOW Academy", "Dreamboard", "WOW Marketplace", "not the Premium or Pro tier of every app"]) expect(PRICING, w).toContain(w);
  });
  it("uses tier names, and never excludes future apps or offers a trial", () => {
    for (const w of ["$10 tier", "$20 tier", "Only the apps named at checkout", "not every future app", "trial", "Founding"]) expect(PRICING, w).not.toContain(w);
  });
  it("never says another app's tier is on today when that app does not grant it yet (payment readiness 2026-10-24)", () => {
    // WAVEMOTION reads World Pass status on Passport link but grants no plan from it yet (wav-month app/ui/public-tour.tsx).
    expect(PRICING).not.toContain("WAVEMOTION Starter today");
    expect(PRICING).not.toContain("(40 clips a month) today");
    expect(PRICING).toContain("once WAVEMOTION connects to the World Pass");
  });
  it("the profile calls thewow.online WOW OS", () => {
    expect(PROFILE).not.toContain("opens WOW World");
    expect(PROFILE).not.toContain("WOW World Passport");
  });
});
