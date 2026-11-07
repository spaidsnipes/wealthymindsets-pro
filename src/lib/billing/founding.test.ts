import { describe, expect, it } from "vitest";

import {
  FOUNDING_500_GRANTS, FOUNDING_100_GRANTS, eventFoundingHint, foundingEvidenceRef, foundingGrantFrom, foundingGrantTier, foundingLive,
  foundingPriceId, readClaim, readFoundingOpen, readFoundingSubscription, readReserve, reservationHolds,
} from "./founding";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-07T00:00:00Z");
const UUID = "11111111-2222-4333-8444-555555555555";

describe("FOUNDING — the flag and the price", () => {
  it("only the exact word 'on' turns it on", () => {
    expect(foundingLive({ WM_FOUNDING_LIVE: "on" })).toBe(true);
    expect(foundingLive({ WM_FOUNDING_LIVE: " on " })).toBe(true);
    for (const v of [undefined, "", "ON", "true", "1", "yes", "off"]) expect(foundingLive({ WM_FOUNDING_LIVE: v })).toBe(false);
  });
  it("the price id must look like one", () => {
    expect(foundingPriceId({ WM_STRIPE_PRICE_FOUNDING: "price_founding0001" })).toBe("price_founding0001");
    for (const v of [undefined, "", "prod_123456789", "price_"]) expect(foundingPriceId({ WM_STRIPE_PRICE_FOUNDING: v })).toBeNull();
  });
  it("Founder decision default: FOUNDING 500 and FOUNDING 100 both unlock Premium (PASSPORT)", () => {
    expect(FOUNDING_500_GRANTS).toBe("PASSPORT");
    expect(FOUNDING_100_GRANTS).toBe("PASSPORT");
  });
});

describe("FOUNDING 100 grants end at 30 days — and never without an end", () => {
  const trial = (expires: string | null, starts: string | null = new Date(NOW).toISOString()) => [{ source: "founding_100", app: "wm_pro", entitlement: "wm_pro.premium_trial", charge_cents: 0, renews: false, starts_at: starts, expires_at: expires }];
  it("a grant that expires 30 days after it starts holds until that instant and not one millisecond after", () => {
    const rows = trial(new Date(NOW + 30 * DAY).toISOString());
    expect(foundingGrantTier(foundingGrantFrom(rows, NOW + 30 * DAY - 1))).toBe("PASSPORT");
    expect(foundingGrantFrom(rows, NOW + 30 * DAY)).toBeNull();
    expect(foundingGrantFrom(rows, NOW + 31 * DAY)).toBeNull();
  });
  it("no expiry, junk expiry, not started yet, another app, not a list → no grant", () => {
    expect(foundingGrantFrom(trial(null), NOW)).toBeNull();
    expect(foundingGrantFrom(trial("soon"), NOW)).toBeNull();
    expect(foundingGrantFrom(trial(new Date(NOW + DAY).toISOString(), new Date(NOW + 1000).toISOString()), NOW)).toBeNull();
    expect(foundingGrantFrom([{ app: "wow_os", entitlement: "wow_os.premium_trial", expires_at: new Date(NOW + DAY).toISOString() }], NOW)).toBeNull();
    for (const junk of [null, {}, "x", 3]) expect(foundingGrantFrom(junk, NOW)).toBeNull();
  });
  it("FOUNDING 500 (no expiry) wins over a trial", () => {
    const g = foundingGrantFrom([...trial(new Date(NOW + DAY).toISOString()), { source: "founding_500", app: "wm_pro", entitlement: "wm_pro.founding_500", expires_at: null }], NOW);
    expect(g?.source).toBe("founding_500");
  });
});

describe("Passport answers are read fail-closed", () => {
  it("reserve", () => {
    expect(reservationHolds(readReserve({ ok: true, reason: "HELD", enrollment_id: "e", hold_until: "t" }))).toBe(true);
    expect(reservationHolds(readReserve({ ok: true, reason: "HOLD_REFRESHED" }))).toBe(true);
    for (const r of ["COHORT_FULL", "ALREADY_ACTIVE", "PROGRAM_NOT_OPEN", "INVALID_REQUEST"]) expect(reservationHolds(readReserve({ ok: false, reason: r }))).toBe(false);
    expect(readReserve({ ok: true, reason: "MAYBE" })).toBeNull();
    expect(reservationHolds(readReserve(null))).toBe(false);
  });
  it("claim and open", () => {
    expect(readClaim({ ok: true, reason: "ACTIVATED", expires_at: "2026-12-07T00:00:00Z" })?.expiresAt).toBe("2026-12-07T00:00:00Z");
    expect(readClaim({ reason: "ACTIVATED" })).toBeNull();
    expect(readFoundingOpen({ paid_500: true, promotional_100: false })).toEqual({ paid500: true, promotional100: false });
    expect(readFoundingOpen({ paid_500: 3, promotional_100: false })).toBeNull();
  });
  it("evidence reference is 10–512 chars and names the app + kind", () => {
    expect(foundingEvidenceRef("wmd_abc")).toBe("wm_pro:decision:wmd_abc");
    expect(foundingEvidenceRef("w".repeat(600))).toBeNull();
  });
});

describe("the subscription re-read decides, never the event", () => {
  const sub = (meta: Record<string, unknown>, inv: unknown = { status: "paid" }) => ({ id: "sub_ABCDEF01", object: "subscription", status: "active", livemode: false, metadata: meta, latest_invoice: inv });
  it("only founding=paid_500 + app=wm_pro + a Passport uuid is FOUNDING", () => {
    expect(readFoundingSubscription(sub({ founding: "paid_500", app: "wm_pro", passport_user_id: UUID }))).toEqual({ id: "sub_ABCDEF01", status: "active", paid: true, userId: UUID, livemode: false });
    expect(readFoundingSubscription(sub({ founding: "paid_500", app: "wm_pro", passport_user_id: UUID }, "in_123"))?.paid).toBe(false);
    for (const meta of [{}, { founding: "paid_500", app: "wavemotion", passport_user_id: UUID }, { founding: "paid_500", app: "wm_pro", passport_user_id: "dave" }, { founding: "yes", app: "wm_pro", passport_user_id: UUID }]) {
      expect(readFoundingSubscription(sub(meta))).toBeNull();
    }
  });
  it("hints only choose whether to re-read", () => {
    const ev = (type: string, object: unknown) => ({ type, data: { object } });
    expect(eventFoundingHint(ev("customer.subscription.updated", { metadata: { founding: "paid_500" } }), null)).toBe(true);
    expect(eventFoundingHint(ev("customer.subscription.updated", { metadata: { product: "WM_PRO" } }), null)).toBe(false);
    expect(eventFoundingHint(ev("invoice.paid", {}), null)).toBeNull();
    expect(eventFoundingHint(ev("invoice.paid", { parent: { subscription_details: { metadata: { founding: "paid_500" } } } }), null)).toBe(true);
    expect(eventFoundingHint(ev("invoice.paid", { lines: { data: [{ price: { id: "price_founding0001" } }] } }), "price_founding0001")).toBe(true);
    expect(eventFoundingHint(ev("charge.refunded", {}), null)).toBeNull();
  });
});
