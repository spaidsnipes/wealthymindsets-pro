/**
 * WM PRO BILLING — the pure owners (Garden 19 Supermax §11). Fail-closed:
 * the client cannot choose a price; NOT_CONFIGURED sells nothing; an unsigned,
 * stale or wrong-mode event changes nothing; a replay changes nothing; a
 * refund or a dispute ends the entitlement; no secret leaves these modules.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  BILLING_PRODUCT, HANDLED_EVENT_TYPES, emptyEntitlement, memberTierOf, readEntitlement, readStripeEvent, reduceBillingEvent, withChargeLink,
  type BillingEventFacts, type EntitlementRecord,
} from "./entitlement";
import { BILLING_ENV_NAMES, billingStanding } from "./standing";
import { BILLING_BUNDLES, PAID_TIERS, STANDARD_TIER, TIER_SPEC, billingPriceEnvNames, paidTierByName, tierForPriceId, tierPriceId, tiersOnSale } from "./tiers";
import { signStripePayload, verifyStripeSignature } from "./webhookSignature";

const read = (f: string) => readFileSync(path.join(process.cwd(), "src/lib/billing", f), "utf8");
const KEY_TEST = "sk_test_" + "x".repeat(24), KEY_LIVE = "sk_live_" + "y".repeat(24), WH = "whsec_" + "z".repeat(24);
const PRICES = { WM_STRIPE_PRICE_APP: "price_app0000001", WM_STRIPE_PRICE_PASSPORT: "price_passport001", WM_STRIPE_PRICE_OS: "price_os00000001" };
const ENV = { STRIPE_SECRET_KEY: KEY_TEST, WM_STRIPE_WEBHOOK_SECRET: WH, ...PRICES };

describe("the tier map — the client never chooses a price", () => {
  it("four tiers at the page's prices; $20 is the standard; each paid tier names ONE env var for its price id", () => {
    expect(Object.values(TIER_SPEC).map(t => [t.tier, t.monthlyCents, t.priceEnv])).toEqual([
      ["FREE", 0, null], ["APP", 1000, "WM_STRIPE_PRICE_APP"], ["PASSPORT", 2000, "WM_STRIPE_PRICE_PASSPORT"], ["OS", 5000, "WM_STRIPE_PRICE_OS"],
    ]);
    expect(STANDARD_TIER).toBe("PASSPORT");
    expect(billingPriceEnvNames()).toEqual(["WM_STRIPE_PRICE_APP", "WM_STRIPE_PRICE_PASSPORT", "WM_STRIPE_PRICE_OS"]);
  });

  it("a request names a tier and nothing else: a price id, an amount, FREE or junk is not a tier", () => {
    for (const ok of ["APP", "passport", " OS "]) expect(paidTierByName(ok)).not.toBeNull();
    for (const bad of ["FREE", "price_passport001", "2000", 2000, "$20", "", null, undefined, { tier: "OS" }, "OS;DROP"]) expect(paidTierByName(bad), String(bad)).toBeNull();
  });

  it("a tier is on sale only when its own price id is configured and looks like one", () => {
    expect(tiersOnSale({})).toEqual([]);
    expect(tiersOnSale(ENV)).toEqual(PAID_TIERS);
    expect(tiersOnSale({ WM_STRIPE_PRICE_PASSPORT: "price_passport001" })).toEqual(["PASSPORT"]);
    for (const junk of ["", "  ", "prod_abc12345", "20", "price_", "https://x", "price_ab cd1234"]) expect(tierPriceId("PASSPORT", { WM_STRIPE_PRICE_PASSPORT: junk }), junk).toBeNull();
  });

  it("only WM Pro's own price ids grant a tier; the bundle slot is typed and EMPTY", () => {
    expect(BILLING_BUNDLES).toEqual([]);
    expect(tierForPriceId("price_os00000001", ENV)).toBe("OS");
    expect(tierForPriceId("price_worldpass001", ENV)).toBeNull();         // another product on the same account
    expect(tierForPriceId(undefined, ENV)).toBeNull();
  });
});

describe("billingStanding — NOT_CONFIGURED sells nothing", () => {
  it.each([
    [{}, "NO_KEY"],
    [{ STRIPE_SECRET_KEY: "pk_test_abc" }, "KEY_UNRECOGNIZED"],
    [{ STRIPE_SECRET_KEY: WH }, "KEY_UNRECOGNIZED"],
    [{ STRIPE_SECRET_KEY: KEY_LIVE, WM_STRIPE_WEBHOOK_SECRET: WH }, "LIVE_KEY_NOT_ARMED"],
    [{ STRIPE_SECRET_KEY: KEY_LIVE, WM_STRIPE_WEBHOOK_SECRET: WH, WM_BILLING_LIVE: "armed" }, "LIVE_KEY_NOT_ARMED"],
    [{ STRIPE_SECRET_KEY: KEY_TEST }, "NO_WEBHOOK_SECRET"],
    [{ STRIPE_SECRET_KEY: KEY_TEST, WM_STRIPE_WEBHOOK_SECRET: "we_123" }, "NO_WEBHOOK_SECRET"],
  ])("%j → NOT_CONFIGURED (%s)", (env, reason) => {
    expect(billingStanding(env as Record<string, string>)).toEqual({ mode: "NOT_CONFIGURED", reason });
  });

  it("TEST and LIVE (armed on purpose) — and the result never carries the key or the secret", () => {
    expect(billingStanding(ENV)).toEqual({ mode: "TEST", live: false });
    const live = billingStanding({ STRIPE_SECRET_KEY: KEY_LIVE, WM_STRIPE_WEBHOOK_SECRET: WH, WM_BILLING_LIVE: "ARMED" });
    expect(live).toEqual({ mode: "LIVE", live: true });
    for (const st of [billingStanding(ENV), live, billingStanding({ STRIPE_SECRET_KEY: KEY_LIVE })]) {
      expect(JSON.stringify(st)).not.toMatch(/sk_|rk_|whsec_|xxxx|yyyy|zzzz/);
    }
    expect(BILLING_ENV_NAMES).toEqual(["STRIPE_SECRET_KEY", "WM_STRIPE_WEBHOOK_SECRET", "WM_BILLING_LIVE"]);
  });
});

describe("the webhook signature", () => {
  const BODY = '{"id":"evt_1","type":"checkout.session.completed"}';
  const NOW = 1_791_500_000;

  it("a true signature inside the tolerance verifies; the raw body is what is signed", async () => {
    const h = await signStripePayload(BODY, WH, NOW);
    expect(await verifyStripeSignature(BODY, h, WH, NOW)).toBe(true);
    expect(await verifyStripeSignature(BODY, h, WH, NOW + 299)).toBe(true);
    expect(await verifyStripeSignature(BODY + " ", h, WH, NOW)).toBe(false);          // one byte different
    expect(await verifyStripeSignature(JSON.stringify(JSON.parse(BODY), null, 1), h, WH, NOW)).toBe(false);
  });

  it("unsigned, stale, future, wrong secret, malformed → refused", async () => {
    const h = await signStripePayload(BODY, WH, NOW);
    expect(await verifyStripeSignature(BODY, null, WH, NOW)).toBe(false);
    expect(await verifyStripeSignature(BODY, "", WH, NOW)).toBe(false);
    expect(await verifyStripeSignature(BODY, h, "", NOW)).toBe(false);
    expect(await verifyStripeSignature(BODY, h, "whsec_other_secret_value_000", NOW)).toBe(false);
    expect(await verifyStripeSignature(BODY, h, WH, NOW + 301)).toBe(false);           // stale (replay)
    expect(await verifyStripeSignature(BODY, h, WH, NOW - 301)).toBe(false);           // from the future
    expect(await verifyStripeSignature(BODY, `t=${NOW},v1=deadbeef`, WH, NOW)).toBe(false);
    expect(await verifyStripeSignature(BODY, h.replace(/^t=\d+/, "t=abc"), WH, NOW)).toBe(false);
    expect(await verifyStripeSignature(BODY, `v1=${h.split("v1=")[1]}`, WH, NOW)).toBe(false);   // no timestamp
  });

  it("a rotated secret's second v1 is accepted; the compare has no early exit and no ==", async () => {
    const good = (await signStripePayload(BODY, WH, NOW)).split("v1=")[1]!;
    expect(await verifyStripeSignature(BODY, `t=${NOW},v1=${"0".repeat(64)},v1=${good}`, WH, NOW)).toBe(true);
    const src = read("webhookSignature.ts").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
    expect(src).toContain("diff |= a.charCodeAt(i) ^ b.charCodeAt(i)");
    expect(src).not.toMatch(/c === mac|mac === c|\.some\(/);
    expect(src).toContain("crypto.subtle");
    expect(src).not.toMatch(/from "stripe"|require\(/);
  });
});

/* ── the reducer ──────────────────────────────────────────────────────── */
const USER = "user-7", CUS = "cus_A1", SUB = "sub_A1";
const ctx = { serverLive: false, env: ENV };
const ev = (o: Partial<BillingEventFacts> & { id: string; type: string; createdSec: number }): BillingEventFacts => ({
  livemode: false, userId: null, product: null, customerId: null, subscriptionId: null, chargeId: null, tierName: null, legalShown: null, priceId: null,
  sessionMode: null, paymentStatus: null, subscriptionStatus: null, periodEndSec: null, fullyRefunded: false, ...o,
});
const checkout = (id = "evt_c1", at = 1000, tier = "PASSPORT") => ev({ id, type: "checkout.session.completed", createdSec: at, userId: USER, product: BILLING_PRODUCT, customerId: CUS, subscriptionId: SUB, tierName: tier, sessionMode: "subscription", paymentStatus: "paid" });
const active = (): EntitlementRecord => reduceBillingEvent(emptyEntitlement(USER, false), checkout(), ctx).record;

describe("the entitlement reducer", () => {
  it("a paid WM Pro checkout activates the tier the SERVER wrote into the session", () => {
    const r = reduceBillingEvent(emptyEntitlement(USER, false), checkout(), ctx);
    expect(r).toMatchObject({ outcome: "ACTIVATED", changed: true });
    expect(r.record).toMatchObject({ userId: USER, customerId: CUS, subscriptionId: SUB, tier: "PASSPORT", status: "active", livemode: false, lastEventId: "evt_c1", lastEventAt: 1000 });
    expect(memberTierOf(r.record, false)).toBe("PASSPORT");
  });

  it("REPLAY = no change (idempotent by event id), however many times", () => {
    const first = active();
    for (let i = 0; i < 3; i++) {
      const again = reduceBillingEvent(first, checkout(), ctx);
      expect(again).toEqual({ record: first, outcome: "REPLAYED", changed: false });
    }
  });

  it("WRONG MODE changes nothing: a live event on a test server, a test event on a live server, a live event on a test record", () => {
    const liveEv = { ...checkout(), livemode: true };
    expect(reduceBillingEvent(emptyEntitlement(USER, false), liveEv, ctx)).toMatchObject({ outcome: "WRONG_MODE", changed: false });
    expect(reduceBillingEvent(emptyEntitlement(USER, true), checkout(), { ...ctx, serverLive: true })).toMatchObject({ outcome: "WRONG_MODE", changed: false });
    expect(reduceBillingEvent(active(), { ...checkout("evt_c2", 2000), livemode: true }, { ...ctx, serverLive: true })).toMatchObject({ outcome: "WRONG_MODE", changed: false });
    // …and a test record grants nothing once the server is live.
    expect(memberTierOf(active(), true)).toBe("FREE");
    expect(memberTierOf(active(), null)).toBe("FREE");
  });

  it("ORDER-SAFE: an older event delivered late is remembered and changes nothing", () => {
    const canceled = reduceBillingEvent(active(), ev({ id: "evt_s2", type: "customer.subscription.deleted", createdSec: 3000, subscriptionId: SUB, customerId: CUS }), ctx).record;
    expect(canceled.status).toBe("canceled");
    const late = reduceBillingEvent(canceled, ev({ id: "evt_s1", type: "customer.subscription.updated", createdSec: 2000, subscriptionId: SUB, customerId: CUS, subscriptionStatus: "active" }), ctx);
    expect(late).toMatchObject({ outcome: "STALE", changed: false });
    expect(late.record.status).toBe("canceled");
    expect(late.record.seenEventIds).toContain("evt_s1");
    expect(memberTierOf(late.record, false)).toBe("FREE");
  });

  it("renewal / past due / cancel follow the subscription's own status, and the period end is kept", () => {
    const upd = (id: string, at: number, status: string, end: number | null = null) => ev({ id, type: "customer.subscription.updated", createdSec: at, subscriptionId: SUB, customerId: CUS, subscriptionStatus: status, periodEndSec: end, product: BILLING_PRODUCT, userId: USER });
    let r = reduceBillingEvent(active(), upd("e2", 2000, "active", 1_800_000_000), ctx).record;
    expect(r).toMatchObject({ status: "active", currentPeriodEnd: "2027-01-15T08:00:00.000Z" });
    r = reduceBillingEvent(r, upd("e3", 3000, "past_due"), ctx).record;
    expect(r.status).toBe("past_due");
    expect(memberTierOf(r, false)).toBe("FREE");
    r = reduceBillingEvent(r, upd("e4", 4000, "active"), ctx).record;
    expect(memberTierOf(r, false)).toBe("PASSPORT");
    r = reduceBillingEvent(r, upd("e5", 5000, "canceled"), ctx).record;
    expect(r.status).toBe("canceled");
    expect(r.currentPeriodEnd).toBe("2027-01-15T08:00:00.000Z");
  });

  it("a plan change is read from the subscription's price id — only one of WM Pro's own", () => {
    const r = reduceBillingEvent(active(), ev({ id: "e2", type: "customer.subscription.updated", createdSec: 2000, subscriptionId: SUB, customerId: CUS, subscriptionStatus: "active", priceId: "price_os00000001" }), ctx).record;
    expect(r.tier).toBe("OS");
    const unknown = reduceBillingEvent(r, ev({ id: "e3", type: "customer.subscription.updated", createdSec: 3000, subscriptionId: SUB, customerId: CUS, subscriptionStatus: "active", priceId: "price_someoneelse1" }), ctx).record;
    expect(unknown.tier).toBe("OS");
  });

  it("invoice.payment_failed on THIS subscription → past due", () => {
    const r = reduceBillingEvent(active(), ev({ id: "e2", type: "invoice.payment_failed", createdSec: 2000, customerId: CUS, subscriptionId: SUB }), ctx);
    expect(r).toMatchObject({ outcome: "PAST_DUE", changed: true });
    expect(memberTierOf(r.record, false)).toBe("FREE");
  });

  it("A FULL REFUND ENDS THE ENTITLEMENT — and a later 'active' update does not bring it back; only a new paid checkout does", () => {
    const refund = withChargeLink(ev({ id: "e2", type: "charge.refunded", createdSec: 2000, customerId: CUS, chargeId: "ch_1", fullyRefunded: true }), { subscriptionId: SUB, customerId: CUS });
    const r = reduceBillingEvent(active(), refund, ctx);
    expect(r).toMatchObject({ outcome: "REFUNDED", changed: true });
    expect(r.record.status).toBe("refunded");
    expect(memberTierOf(r.record, false)).toBe("FREE");
    const revive = reduceBillingEvent(r.record, ev({ id: "e3", type: "customer.subscription.updated", createdSec: 3000, subscriptionId: SUB, customerId: CUS, subscriptionStatus: "active" }), ctx);
    expect(revive).toMatchObject({ outcome: "ENDED_BY_REFUND_OR_DISPUTE", changed: false });
    expect(memberTierOf(revive.record, false)).toBe("FREE");
    const again = reduceBillingEvent(revive.record, { ...checkout("evt_c9", 9000), subscriptionId: "sub_B2" }, ctx);
    expect(again.outcome).toBe("ACTIVATED");
    expect(memberTierOf(again.record, false)).toBe("PASSPORT");
  });

  it("A DISPUTE ENDS THE ENTITLEMENT; a partial refund does not", () => {
    const dispute = withChargeLink(ev({ id: "e2", type: "charge.dispute.created", createdSec: 2000, chargeId: "ch_1" }), { subscriptionId: SUB, customerId: CUS });
    const r = reduceBillingEvent(active(), dispute, ctx);
    expect(r).toMatchObject({ outcome: "DISPUTED", changed: true });
    expect(memberTierOf(r.record, false)).toBe("FREE");
    const partial = withChargeLink(ev({ id: "e3", type: "charge.refunded", createdSec: 2000, customerId: CUS, chargeId: "ch_1", fullyRefunded: false }), { subscriptionId: SUB, customerId: CUS });
    expect(reduceBillingEvent(active(), partial, ctx)).toMatchObject({ outcome: "PARTIAL_REFUND", changed: false });
  });

  it("ONE CUSTOMER, SEVERAL PRODUCTS: another product's checkout, subscription, failed invoice, refund or dispute never touches WM Pro", () => {
    const base = active();
    const others: BillingEventFacts[] = [
      { ...checkout("o1", 2000), product: "WOW_CONNECT", subscriptionId: "sub_WP" },
      ev({ id: "o2", type: "customer.subscription.deleted", createdSec: 2000, subscriptionId: "sub_WP", customerId: CUS, product: "WOW_CONNECT", userId: USER }),
      ev({ id: "o3", type: "invoice.payment_failed", createdSec: 2000, customerId: CUS, subscriptionId: "sub_WP" }),
      withChargeLink(ev({ id: "o4", type: "charge.refunded", createdSec: 2000, customerId: CUS, chargeId: "ch_wp", fullyRefunded: true }), { subscriptionId: "sub_WP", customerId: CUS }),
      withChargeLink(ev({ id: "o5", type: "charge.dispute.created", createdSec: 2000, chargeId: "ch_wp" }), { subscriptionId: "sub_WP", customerId: CUS }),
      ev({ id: "o6", type: "charge.refunded", createdSec: 2000, customerId: CUS, chargeId: "ch_x", fullyRefunded: true }),                // the charge's subscription could not be resolved
      ev({ id: "o7", type: "invoice.payment_failed", createdSec: 2000, customerId: "cus_someone_else", subscriptionId: SUB }),
    ];
    let rec = base;
    for (const o of others) {
      const r = reduceBillingEvent(rec, o, ctx);
      expect(r.changed, `${o.id} ${r.outcome}`).toBe(false);
      rec = r.record;
    }
    expect(memberTierOf(rec, false)).toBe("PASSPORT");
    expect(rec.status).toBe("active");
  });

  it("an event for another user, an unpaid checkout, an unknown tier, an unhandled type — no change", () => {
    const e0 = emptyEntitlement(USER, false);
    expect(reduceBillingEvent(e0, { ...checkout(), userId: "someone-else" }, ctx)).toMatchObject({ outcome: "NOT_THIS_USER", changed: false });
    expect(reduceBillingEvent(e0, { ...checkout(), paymentStatus: "unpaid" }, ctx)).toMatchObject({ outcome: "NOT_PAID", changed: false });
    expect(reduceBillingEvent(e0, { ...checkout(), tierName: "price_passport001" }, ctx)).toMatchObject({ outcome: "UNKNOWN_TIER", changed: false });
    expect(reduceBillingEvent(e0, { ...checkout(), sessionMode: "payment" }, ctx)).toMatchObject({ outcome: "NOT_PAID", changed: false });
    expect(reduceBillingEvent(e0, ev({ id: "x", type: "customer.created", createdSec: 1 }), ctx)).toMatchObject({ outcome: "NOT_HANDLED", changed: false });
    expect(reduceBillingEvent(e0, ev({ id: "y", type: "invoice.payment_failed", createdSec: 1, customerId: CUS, subscriptionId: SUB }), ctx)).toMatchObject({ outcome: "NO_RECORD", changed: false });
    expect(HANDLED_EVENT_TYPES).toHaveLength(6);
  });

  it("the seen list is bounded, and a stored record is read fail-closed", () => {
    let rec = active();
    for (let i = 0; i < 250; i++) rec = reduceBillingEvent(rec, ev({ id: `n${i}`, type: "customer.created", createdSec: 2000 + i }), ctx).record;
    expect(rec.seenEventIds.length).toBeLessThanOrEqual(100);
    expect(readEntitlement(JSON.stringify(rec))).toEqual(rec);
    for (const bad of [null, "", "{", "[]", JSON.stringify({ v: 2, userId: USER, livemode: false }), JSON.stringify({ v: 1, userId: "", livemode: false }), JSON.stringify({ v: 1, userId: USER })]) expect(readEntitlement(bad)).toBeNull();
    expect(readEntitlement(JSON.stringify({ v: 1, userId: USER, livemode: false, status: "vip", tier: "GOLD" }))).toMatchObject({ status: null, tier: null });
    expect(memberTierOf(null, false)).toBe("FREE");
  });
});

describe("reading a Stripe event", () => {
  it("takes only the facts billing uses; a non-event is null", () => {
    const raw = { id: "evt_9", type: "checkout.session.completed", created: 1234, livemode: false, data: { object: { mode: "subscription", payment_status: "paid", customer: "cus_Z", subscription: { id: "sub_Z" }, client_reference_id: "user-9", metadata: { passport_id_ref: "user-9", product: "WM_PRO", wm_tier: "OS" }, amount_total: 5000 } } };
    expect(readStripeEvent(raw)).toMatchObject({ id: "evt_9", createdSec: 1234, userId: "user-9", product: "WM_PRO", customerId: "cus_Z", subscriptionId: "sub_Z", tierName: "OS", sessionMode: "subscription", paymentStatus: "paid" });
    expect(readStripeEvent({ id: "evt_s", type: "customer.subscription.updated", created: 5, livemode: true, data: { object: { id: "sub_Q", status: "past_due", customer: "cus_Q", items: { data: [{ price: { id: "price_os00000001" }, current_period_end: 1_800_000_000 }] } } } })).toMatchObject({ subscriptionId: "sub_Q", subscriptionStatus: "past_due", priceId: "price_os00000001", periodEndSec: 1_800_000_000 });
    expect(readStripeEvent({ id: "evt_i", type: "invoice.payment_failed", created: 5, livemode: false, data: { object: { customer: "cus_Q", parent: { subscription_details: { subscription: "sub_Q" } } } } })).toMatchObject({ subscriptionId: "sub_Q" });
    expect(readStripeEvent({ id: "evt_d", type: "charge.dispute.created", created: 5, livemode: false, data: { object: { charge: "ch_7" } } })).toMatchObject({ chargeId: "ch_7", subscriptionId: null });
    for (const bad of [null, {}, { id: "x" }, { id: "x", type: "y", livemode: "no", created: 1 }, "evt"]) expect(readStripeEvent(bad)).toBeNull();
  });
});

describe("no secret leaves the pure owners", () => {
  it("none of them makes a request, logs, or returns a key; the key is only ever tested by prefix", () => {
    const files = ["tiers.ts", "standing.ts", "webhookSignature.ts", "entitlement.ts"];
    expect(files.length).toBeGreaterThan(3);
    for (const f of files) {
      const src = read(f).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
      expect(src.length, f).toBeGreaterThan(400);
      expect(src, f).not.toMatch(/fetch\(|console\.|localStorage|sessionStorage/);
    }
    const standing = read("standing.ts").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
    expect(standing.match(/key\.startsWith\("(?:sk|rk)_(?:test|live)_"\)/g)).toHaveLength(4);
    expect(standing).not.toMatch(/return \{[^}]*\bkey\b/);
  });
});
