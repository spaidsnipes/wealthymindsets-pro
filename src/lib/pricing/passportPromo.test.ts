import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as promo from "./passportPromo";
import { OFFER_RETIRED, PASSPORT_PROMO_OPEN, bodyAsksForOffer } from "./passportPromo";

const read = (f: string) => readFileSync(join(__dirname, "../..", f), "utf8");

describe("NO OFFERS (Founder 2026-10-30): the holiday half-off is retired and cannot come back by config", () => {
  it("the flag is a closed constant", () => {
    expect(PASSPORT_PROMO_OPEN).toBe(false);
    // The old owner is gone: nothing left to compute an offer line or an end date from.
    expect(Object.keys(promo)).not.toContain("passportPromo");
    expect(Object.keys(promo)).not.toContain("passportPromoLine");
    expect(read("lib/pricing/passportPromo.ts")).not.toMatch(/process\.env/);
  });
  it("any body asking for an offer is caught, whatever the value", () => {
    expect(bodyAsksForOffer({ tier: "PASSPORT", promo: "HOLIDAY50" })).toBe(true);
    expect(bodyAsksForOffer({ tier: "PASSPORT", coupon: "" })).toBe(true);
    expect(bodyAsksForOffer({ tier: "PASSPORT", trial_period_days: 30 })).toBe(true);
    expect(bodyAsksForOffer({ tier: "PASSPORT" })).toBe(false);
    expect(bodyAsksForOffer(null)).toBe(false);
    expect(OFFER_RETIRED.code).toBe("OFFER_RETIRED");
  });
  it("no offer words on the pricing page, no coupon in checkout, no coupon env read in tiers", () => {
    const pricing = read("app/pricing/page.tsx").toLowerCase();
    for (const w of ["holiday", "half off", "first month", "trial", "free month", "discount", "promo", "coupon", "$10 (half"]) expect(pricing, w).not.toContain(w);
    const checkout = read("app/api/billing/checkout/route.ts");
    expect(checkout).not.toMatch(/discounts\s*:/);
    expect(checkout).not.toMatch(/allow_promotion_codes|trial_period_days\s*:|trial_end/);
    expect(checkout).not.toContain("WM_STRIPE_COUPON");
    expect(checkout).toContain("bodyAsksForOffer(body)");
    expect(read("lib/billing/tiers.ts")).not.toContain("WM_STRIPE_COUPON_PASSPORT_INTRO");
    expect(read("app/api/billing/tiers/route.ts")).not.toContain("passportIntro");
  });
  it("our pages advertise no trial, even a third party's (guest audit 2026-10-25: the FTMO chip read 'Free trial')", () => {
    const panel = read("components/broker/BrokerConnectPanel.tsx");
    expect(panel).not.toMatch(/free trial|free month/i);
    expect(panel).toContain('"FTMO Challenge"');
  });
});
