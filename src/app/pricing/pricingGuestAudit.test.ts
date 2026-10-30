import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buyButtonState } from "@/lib/billing/buyButtonState";

/**
 * GUEST AUDIT 2026-10-25 (390 / 834 / desktop, signed out). Three things a first-time visitor met on /pricing:
 * the first price stood three phone screens down, the holiday special was only inside the $20 card, and a
 * brand-new visitor was told "Sign in to buy" — a door that opens on "Welcome back".
 */
const read = (f: string) => readFileSync(path.join(process.cwd(), f), "utf8");
const PRICING = read("src/app/pricing/page.tsx");

describe("pricing tells a guest the prices first", () => {
  it("every plan is named with its price at the top, jumping to the plans", () => {
    const glance = PRICING.indexOf('data-testid="plans-at-a-glance"');
    expect(glance).toBeGreaterThan(0);
    expect(glance).toBeLessThan(PRICING.indexOf('<SellingStory variant="compact"'));
    expect(PRICING).toContain('href="#plans"');
    expect(PRICING).toContain('<div id="plans"');
  });
  it("no offer is said anywhere on the page: the holiday special is retired (Founder 2026-10-30)", () => {
    expect(PRICING).not.toContain("holiday-special-banner");
    expect(PRICING).not.toContain("passport-intro-offer");
    expect(PRICING.toLowerCase()).not.toMatch(/half off|holiday|first month|free month|discount|coupon/);
  });
  it("no trials anywhere on the page (Founder 2026-10-25)", () => {
    expect(PRICING.toLowerCase()).not.toContain("trial");
  });
  it("a signed-out visitor is offered BOTH doors: sign in or create an account", () => {
    const b = buyButtonState({ tier: "PASSPORT", onSale: { APP: true, PASSPORT: true, OS: true }, mode: "LIVE", signedIn: false, memberTier: null, worldPassTier: null });
    expect(b.kind).toBe("SIGN_IN");
    expect(b.label).toBe("Sign in or create an account to buy");
  });
});

describe("public pages name themselves in the tab", () => {
  const PAGES: Array<[string, string]> = [
    ["src/app/pricing/layout.tsx", "Pricing"],
    ["src/app/welcome/layout.tsx", "See how it works"],
    ["src/app/login/layout.tsx", "Sign in or create an account"],
    
    ["src/app/legal/terms/layout.tsx", "Terms of Service"],
    ["src/app/legal/privacy/layout.tsx", "Privacy Policy"],
    ["src/app/legal/risk/layout.tsx", "Risk disclosure"],
    ["src/app/legal/market-data/layout.tsx", "Market-data disclosure"],
  ];
  it("the policies index keeps the product name on its child pages (a nested layout resets the root template)", () => {
    expect(read("src/app/legal/layout.tsx")).toContain('title: { default: "Policies", template: "%s · WealthyMindsets Pro" }');
  });
  for (const [file, title] of PAGES) {
    it(`${file} → "${title}"`, () => {
      expect(existsSync(path.join(process.cwd(), file))).toBe(true);
      expect(read(file)).toContain(`export const metadata: Metadata = { title: "${title}" };`);
    });
  }
});
