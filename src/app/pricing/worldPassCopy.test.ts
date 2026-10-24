import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Founder 2026-10-24 (final, with corrections): real tier names (Basic / Premium · World Pass / OS), never "$10 tier".
// The $20 World Pass = Premium of the chosen app + Basic of every other ATH app + all of WOW OS + Academy + Marketplace,
// future apps included; never the Premium/Pro tier of every app; no trials, no founding discounts.
// thewow.online is WOW OS, never "WOW World".
const PRICING = readFileSync(path.join(process.cwd(), "src/app/pricing/page.tsx"), "utf8");
const PROFILE = readFileSync(path.join(process.cwd(), "src/app/profile/page.tsx"), "utf8");
const read = (f: string) => readFileSync(path.join(process.cwd(), f), "utf8");

describe("World Pass copy says the Founder's rule", () => {
  it("names what the pass opens and what it is not", () => {
    for (const w of ["Basic of every other ATH app", "WOW Academy", "Dreamboard", "WOW Marketplace", "not the Premium or Pro tier of every app"]) expect(PRICING, w).toContain(w);
  });
  it("uses tier names, and never excludes future apps or offers a trial", () => {
    for (const w of ["$10 tier", "$20 tier", "Only the apps named at checkout", "not every future app", "trial", "Founding"]) expect(PRICING, w).not.toContain(w);
  });
  it("the World Pass is sold ONCE, on WOW OS: WM Pro's $20 tier is 'WM Pro Premium' and links to it (decision 2026-10-24)", () => {
    expect(PRICING).toContain('name: "WM Pro Premium", price: "$20"');
    expect(PRICING).not.toContain("WM Pro Premium · World Pass");
    expect(PRICING).toContain("Get the World Pass on WOW OS (pick WM Pro as your Premium app)");
    expect(PRICING).toContain("WORLD_PASS_BUY_URL");
    expect(read("src/lib/billing/worldPass.ts")).toContain('WORLD_PASS_BUY_URL = "https://thewow.online/passport?app=wm_pro#world-pass"');
    expect(read("src/lib/billing/tiers.ts")).toContain('name: "WM Pro Premium", monthlyCents: 2_000, priceEnv: "WM_STRIPE_PRICE_PASSPORT"');
  });
  it("app tiers are live wording now: no 'switch on as each app connects', and the two never stack", () => {
    expect(PRICING).not.toContain("as each app connects");
    expect(PRICING).not.toContain("once WAVEMOTION connects to the World Pass");
    expect(PRICING).toContain("each app switches its tier on from your pass when you open it");
    expect(PRICING).toContain("You&apos;re covered by your World Pass");
    expect(PRICING).toContain("never stacks");
  });
  it("the profile calls thewow.online WOW OS", () => {
    expect(PROFILE).not.toContain("opens WOW World");
    expect(PROFILE).not.toContain("WOW World Passport");
  });
  it("sign-in and the WOW doors name today's ecosystem WOW OS; WOW World stays the future metaverse (Founder 2026-10-24)", () => {
    const src = (f: string) => readFileSync(path.join(process.cwd(), f), "utf8");
    expect(src("src/app/login/page.tsx")).toContain("Sign in to open your WOW OS workspace.");
    expect(src("src/components/os/WMOperatingSystem.tsx")).toContain(">WOW OS ↗<");
    expect(src("src/components/os/WowSurfaceDoor.tsx")).toContain("— opens WOW OS in a new tab");
    for (const f of ["src/app/login/page.tsx", "src/components/os/WowSurfaceDoor.tsx", "src/app/tv/page.tsx", "src/app/radio/page.tsx"]) expect(src(f), f).not.toContain("WOW World");
    expect(src("src/components/os/WMOperatingSystem.tsx")).not.toContain("WOW World ↗");
    expect(PRICING).toContain("WOW World</strong> (the future metaverse) when it opens");
  });
});
