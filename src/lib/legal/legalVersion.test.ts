/**
 * The legal-version owner (Supermax §11): the policy pages and the purchase
 * record read ONE set of constants, so they cannot disagree.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { LEGAL_INDEX_VERSION, RISK_DISCLOSURE_VERSION, TERMS_PRIVACY_STATE, TERMS_PRIVACY_VERSION, legalShownAtPurchase, termsPrivacyInEffect } from "./legalVersion";

const read = (p: string) => readFileSync(path.join(process.cwd(), "src", p), "utf8");

describe("legal version", () => {
  // 2026-10-17: published (Founder: "turn payments on — this needs to be guest ready").
  it("today: the Terms and Privacy Policy are IN EFFECT, dated, and the purchase line names that date", () => {
    expect(TERMS_PRIVACY_STATE).toBe("IN_EFFECT");
    expect(TERMS_PRIVACY_VERSION).toBe("2026-10-17");
    expect(termsPrivacyInEffect()).toBe(true);
    expect(legalShownAtPurchase()).toBe(`policies ${LEGAL_INDEX_VERSION} · risk ${RISK_DISCLOSURE_VERSION} · terms+privacy 2026-10-17 IN EFFECT`);
    expect(legalShownAtPurchase().length).toBeLessThanOrEqual(200);
    for (const v of [LEGAL_INDEX_VERSION, RISK_DISCLOSURE_VERSION]) expect(v).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("the three policy pages print the owner's dates — none carries a date of its own", () => {
    const pages: [string, string][] = [["app/legal/page.tsx", "version={LEGAL_INDEX_VERSION}"], ["app/legal/risk/page.tsx", "version={RISK_DISCLOSURE_VERSION}"], ["app/legal/market-data/page.tsx", "version={MARKET_DATA_DISCLOSURE_VERSION}"]];
    expect(pages.length).toBeGreaterThan(2);
    for (const [f, prop] of pages) {
      const src = read(f);
      expect(src.length, f).toBeGreaterThan(300);
      expect(src, f).toContain(prop);
      expect(src, f).not.toMatch(/version="\d{4}-\d{2}-\d{2}"/);
    }
  });

  it("the policy index shows 'not in effect yet' from the owner's state, and only while that is the state", () => {
    const idx = read("app/legal/page.tsx");
    expect(idx).toContain("{termsPrivacyInEffect() ? null : (<>");
    expect(idx).toContain("data-state={TERMS_PRIVACY_STATE}");
    expect(idx).toContain("<strong>not in effect yet</strong>");
  });

  it("the checkout writes the same line onto the Stripe session and the member's record", () => {
    const route = read("app/api/billing/checkout/route.ts");
    expect(route).toContain("const legalShown = legalShownAtPurchase();");
    expect(route).toContain("wm_tier: tier, legal_shown: legalShown");
    expect(route).toContain("customerMatch: customer.match, legalShown: legalShownAtPurchase() });");
  });
});
