/**
 * FOUNDING 500 / FOUNDING 100 — the routes (founding contract 2026-11-06). No real Stripe and no real
 * Passport: `fetch` records what the server WOULD send to Stripe, and the service-role client is a stand-in
 * that records every RPC. Order of calls is one log so "reserve BEFORE the session" is measured, not assumed.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signStripePayload } from "@/lib/billing/webhookSignature";

const USER = "11111111-2222-4333-8444-555555555555", EMAIL = "member@wm.test";
const KEY = "sk_test_" + "k".repeat(24), WH = "whsec_" + "w".repeat(24);
const FOUNDING_PRICE = "price_founding0001";
const DECISION = "wmd_1730900000000-abc123";

type Rpc = (fn: string, args: Record<string, unknown>) => { data: unknown; error: unknown };
const mocks = vi.hoisted(() => ({
  who: null as null | { sub: string; email: string },
  kv: null as null | { store: Map<string, string>; get: (k: string) => Promise<string | null>; put: (k: string, v: string) => Promise<void> },
  rpc: null as null | Rpc,
  admin: true,
}));

vi.mock("@/lib/requireAuth", () => ({
  requireAuth: async () => (mocks.who ? { ok: true, user: { ...mocks.who, iat: 0 } } : { ok: false, response: new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 }) }),
}));
vi.mock("@/lib/billing/billingStore", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/billing/billingStore")>()), billingKv: async () => mocks.kv }));
vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: () => (mocks.admin ? {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      log.push(`rpc:${fn}`); rpcCalls.push({ fn, args });
      return mocks.rpc ? mocks.rpc(fn, args) : { data: null, error: { code: "PGRST202", message: "Could not find the function" } };
    },
  } : null),
}));

interface Sent { method: string; path: string; params: URLSearchParams }
let sent: Sent[] = [];
let log: string[] = [];
let rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];
let stripe: (s: Sent) => { status?: number; body: unknown };

const newKv = () => { const store = new Map<string, string>(); return { store, get: async (k: string) => store.get(k) ?? null, put: async (k: string, v: string) => { store.set(k, v); } }; };

function configure(extra: Record<string, string> = {}) {
  vi.stubEnv("STRIPE_SECRET_KEY", KEY);
  vi.stubEnv("WM_STRIPE_WEBHOOK_SECRET", WH);
  vi.stubEnv("WM_STRIPE_PRICE_PASSPORT", "price_passport001");
  vi.stubEnv("WM_STRIPE_PRICE_FOUNDING", FOUNDING_PRICE);
  vi.stubEnv("WM_FOUNDING_LIVE", "on");
  for (const [k, v] of Object.entries(extra)) vi.stubEnv(k, v);
}

/** A Stripe that knows the founding price, finds no customer, creates one, and returns a session. */
function stripeWith(o: { priceCents?: number; priceActive?: boolean; subscription?: unknown } = {}) {
  stripe = s => {
    if (s.method === "GET" && s.path === `prices/${FOUNDING_PRICE}`) return { body: { id: FOUNDING_PRICE, active: o.priceActive ?? true, currency: "usd", unit_amount: o.priceCents ?? 1000, recurring: { interval: "month", interval_count: 1 } } };
    if (s.method === "GET" && s.path === "customers/search") return { body: { data: [] } };
    if (s.method === "GET" && s.path === "customers") return { body: { data: [] } };
    if (s.method === "POST" && s.path === "customers") return { body: { id: "cus_NEW00001", metadata: { passport_id_ref: USER } } };
    if (s.method === "POST" && s.path === "checkout/sessions") return { body: { id: "cs_test_f", url: "https://checkout.stripe.com/c/pay/cs_test_f", livemode: false } };
    if (s.method === "GET" && s.path.startsWith("subscriptions/")) return o.subscription ? { body: o.subscription } : { status: 404, body: {} };
    return { status: 404, body: {} };
  };
}

const passportWith = (answers: Record<string, unknown>) => {
  mocks.rpc = (fn) => (fn in answers ? { data: answers[fn], error: null } : { data: null, error: { code: "PGRST202" } });
};

beforeEach(() => {
  vi.resetModules(); vi.unstubAllEnvs();
  for (const k of ["STRIPE_SECRET_KEY", "WM_STRIPE_WEBHOOK_SECRET", "WM_BILLING_LIVE", "WM_STRIPE_PRICE_APP", "WM_STRIPE_PRICE_PASSPORT", "WM_STRIPE_PRICE_OS", "WM_STRIPE_PRICE_AUTOTRADE", "WM_STRIPE_PRICE_FOUNDING", "WM_FOUNDING_LIVE", "WOW_REALM_KEY"]) vi.stubEnv(k, "");
  mocks.who = { sub: USER, email: EMAIL };
  mocks.kv = newKv();
  mocks.rpc = null; mocks.admin = true;
  sent = []; log = []; rpcCalls = [];
  stripe = () => ({ status: 404, body: {} });
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const u = new URL(String(url));
    if (u.host !== "api.stripe.com") throw new Error(`unexpected host ${u.host}`);
    const s: Sent = { method: init?.method ?? "GET", path: u.pathname.replace("/v1/", ""), params: init?.method === "POST" ? new URLSearchParams(String(init.body ?? "")) : u.searchParams };
    sent.push(s); log.push(`stripe:${s.method} ${s.path}`);
    const r = stripe(s);
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200 });
  }));
  for (const m of ["log", "warn", "error", "info"] as const) vi.spyOn(console, m).mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

const req = (p: string, body: unknown = {}, headers: Record<string, string> = {}) => new Request(`https://wealthymindsetspro.com/api/billing/${p}`, { method: "POST", headers: { "content-type": "application/json", origin: "https://wealthymindsetspro.com", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
const checkout = async (body: unknown = {}) => (await import("./checkout/route")).POST(req("founding/checkout", body));
const trial = async (body: unknown = { decisionIds: [DECISION] }) => (await import("./trial/route")).POST(req("founding/trial", body));
const tiers = async () => (await import("../tiers/route")).GET(new Request("https://wealthymindsetspro.com/api/billing/tiers", { headers: { "cf-connecting-ip": "203.0.113.9" } }));
const standing = async () => (await import("../standing/route")).GET(new Request("https://wealthymindsetspro.com/api/billing/standing"));

describe("flag off ⇒ 404 FOUNDING_OFF, nothing read, nothing called", () => {
  it.each([["unset", ""], ["ON", "ON"], ["true", "true"], ["1", "1"], ["yes", "yes"]])("WM_FOUNDING_LIVE=%s", async (_label, value) => {
    configure({ WM_FOUNDING_LIVE: value }); stripeWith(); passportWith({});
    for (const res of [await checkout(), await trial()]) {
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "FOUNDING_OFF" });
    }
    mocks.who = null;                                         // even signed out: the route does not exist
    expect((await checkout()).status).toBe(404);
    expect(sent).toEqual([]);
    expect(rpcCalls).toEqual([]);
  });

  it("tiers carries no `founding` key and standing reads no Passport grant", async () => {
    configure({ WM_FOUNDING_LIVE: "" }); passportWith({ ath_svc_founding_open: { paid_500: true, promotional_100: true }, ath_svc_entitlements_for: [{ app: "wm_pro", entitlement: "wm_pro.founding_500", expires_at: null }] });
    const t = await (await tiers()).json();
    expect(t).toEqual({ mode: "TEST", tiers: { APP: false, PASSPORT: true, OS: false } });
    const s = await (await standing()).json();
    expect(s).not.toHaveProperty("founding");
    expect(s.tier).toBe("FREE");
    expect(rpcCalls).toEqual([]);
  });
});

describe("GET /api/billing/tiers — FOUNDING booleans only while on", () => {
  it("on + Passport SQL not applied (RPC 404) → no `founding` key (fail closed)", async () => {
    configure();
    expect(await (await tiers()).json()).toEqual({ mode: "TEST", tiers: { APP: false, PASSPORT: true, OS: false } });
  });
  it("on + open → booleans, never a number; FOUNDING 500 shown only when it can be bought", async () => {
    configure(); passportWith({ ath_svc_founding_open: { paid_500: true, promotional_100: true } });
    const j = await (await tiers()).json();
    expect(j.founding).toEqual({ paid500: true, promotional100: true });
    expect(Object.values(j.founding).every(v => typeof v === "boolean")).toBe(true);
    vi.stubEnv("WM_STRIPE_PRICE_FOUNDING", "");
    expect((await (await tiers()).json()).founding).toEqual({ paid500: false, promotional100: true });
  });
});

describe("POST /api/billing/founding/checkout — FOUNDING 500", () => {
  const HELD = { ok: true, reason: "HELD", enrollment_id: "enr_1", hold_until: "2026-11-07T05:00:00Z" };

  it("reserves the seat BEFORE any customer or session is created, then sells the FOUNDING price at $10/month", async () => {
    configure(); stripeWith(); passportWith({ ath_svc_founding500_reserve: HELD });
    const res = await checkout();
    expect(res.status).toBe(201);
    expect((await res.json()).url).toBe("https://checkout.stripe.com/c/pay/cs_test_f");
    const reserveAt = log.indexOf("rpc:ath_svc_founding500_reserve");
    expect(reserveAt).toBeGreaterThan(log.indexOf(`stripe:GET prices/${FOUNDING_PRICE}`));
    expect(reserveAt).toBeLessThan(log.indexOf("stripe:POST customers"));
    expect(reserveAt).toBeLessThan(log.indexOf("stripe:POST checkout/sessions"));
    expect(rpcCalls[0]).toEqual({ fn: "ath_svc_founding500_reserve", args: { p_user: USER, p_app: "wm_pro", p_hold_minutes: 30 } });
    const p = sent.find(s => s.path === "checkout/sessions")!.params;
    expect(p.get("mode")).toBe("subscription");
    expect(p.get("line_items[0][price]")).toBe(FOUNDING_PRICE);
    expect(p.get("line_items[0][quantity]")).toBe("1");
    for (const pre of ["metadata", "subscription_data[metadata]"]) {
      expect(p.get(`${pre}[founding]`)).toBe("paid_500");
      expect(p.get(`${pre}[app]`)).toBe("wm_pro");
      expect(p.get(`${pre}[passport_user_id]`)).toBe(USER);
    }
    // NO promotion codes, NO discounts, NO trial, NO coupon — no key even mentions them.
    for (const k of p.keys()) expect(k).not.toMatch(/promotion|discount|coupon|trial/i);
    const exp = Number(p.get("expires_at"));
    expect(exp).toBeGreaterThanOrEqual(Math.floor(Date.now() / 1000) + 30 * 60);
  });

  it("COHORT_FULL → 409 in plain words, no number, no customer, no session", async () => {
    configure(); stripeWith(); passportWith({ ath_svc_founding500_reserve: { ok: false, reason: "COHORT_FULL", enrollment_id: null, hold_until: null } });
    const res = await checkout();
    expect(res.status).toBe(409);
    const j = await res.json();
    expect(j).toEqual({ error: "FOUNDING 500 is full for WM Pro. Nothing was charged.", code: "COHORT_FULL" });
    expect(j.error.replace("500", "")).not.toMatch(/\d/);
    expect(sent.map(s => s.path)).toEqual([`prices/${FOUNDING_PRICE}`]);
  });

  it("ALREADY_ACTIVE → 'You already hold FOUNDING 500'; PROGRAM_NOT_OPEN → 409; no session either way", async () => {
    configure(); stripeWith();
    passportWith({ ath_svc_founding500_reserve: { ok: false, reason: "ALREADY_ACTIVE" } });
    expect(await (await checkout()).json()).toMatchObject({ error: "You already hold FOUNDING 500.", code: "ALREADY_FOUNDING" });
    passportWith({ ath_svc_founding500_reserve: { ok: false, reason: "PROGRAM_NOT_OPEN" } });
    expect((await checkout()).status).toBe(409);
    expect(sent.some(s => s.path === "checkout/sessions")).toBe(false);
  });

  it("Passport SQL not applied (RPC 404), no service client, or an unreadable answer → 503, no session (fail closed)", async () => {
    configure(); stripeWith();
    expect((await checkout()).status).toBe(503);
    passportWith({ ath_svc_founding500_reserve: { ok: true, reason: "SOMETHING_ELSE" } });
    expect((await checkout()).status).toBe(503);
    mocks.admin = false;
    expect((await checkout()).status).toBe(503);
    expect(sent.some(s => s.path === "checkout/sessions" || s.path === "customers")).toBe(false);
  });

  it("the FOUNDING price must read back as usd / 1000 / month / active — else no reserve, no session", async () => {
    configure(); passportWith({ ath_svc_founding500_reserve: HELD });
    for (const o of [{ priceCents: 2000 }, { priceActive: false }]) {
      stripeWith(o);
      expect((await checkout()).status).toBe(503);
    }
    vi.stubEnv("WM_STRIPE_PRICE_FOUNDING", "");
    expect(await (await checkout()).json()).toMatchObject({ code: "FOUNDING_NOT_ON_SALE" });
    expect(rpcCalls).toEqual([]);
    expect(sent.some(s => s.path === "checkout/sessions")).toBe(false);
  });

  it("guest 401, cross-site 403, an offer in the body 410, billing not configured 503 — none reaches Stripe or the Passport", async () => {
    configure(); stripeWith(); passportWith({ ath_svc_founding500_reserve: HELD });
    mocks.who = null; expect((await checkout()).status).toBe(401);
    mocks.who = { sub: USER, email: EMAIL };
    expect((await (await import("./checkout/route")).POST(req("founding/checkout", {}, { origin: "https://evil.example" }))).status).toBe(403);
    for (const offer of [{ promo: "X" }, { coupon: "" }, { trial_period_days: 30 }, { discount: 1 }]) expect((await checkout(offer)).status).toBe(410);
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect((await checkout()).status).toBe(503);
    expect(sent).toEqual([]); expect(rpcCalls).toEqual([]);
  });

  it("an existing active WM Pro subscriber is refused (no second subscription)", async () => {
    configure(); stripeWith(); passportWith({ ath_svc_founding500_reserve: HELD });
    const { saveEntitlement } = await import("@/lib/billing/billingStore");
    const { emptyEntitlement } = await import("@/lib/billing/entitlement");
    await saveEntitlement(mocks.kv!, { ...emptyEntitlement(USER, false), customerId: "cus_OLD00001", subscriptionId: "sub_OLD00001", tier: "APP", status: "active" });
    expect(await (await checkout()).json()).toMatchObject({ code: "ALREADY_ACTIVE" });
    expect(rpcCalls).toEqual([]);
  });
});

describe("POST /api/billing/webhook — FOUNDING 500 events reach the Passport only verified + re-read", () => {
  const webhook = async (event: unknown, sig?: string) => {
    const payload = JSON.stringify(event);
    const header = sig ?? (await signStripePayload(payload, WH, Math.floor(Date.now() / 1000)));
    return (await import("../webhook/route")).POST(new Request("https://wealthymindsetspro.com/api/billing/webhook", { method: "POST", headers: { "stripe-signature": header }, body: payload }));
  };
  const subEvent = (meta: Record<string, string>, status = "active") => ({
    id: "evt_f1", type: "customer.subscription.updated", created: 1_790_000_000, livemode: false,
    data: { object: { id: "sub_FOUND0001", object: "subscription", customer: "cus_NEW00001", status, metadata: meta, items: { data: [{ price: { id: FOUNDING_PRICE } }] } } },
  });
  const META = { founding: "paid_500", app: "wm_pro", passport_user_id: USER };
  const REREAD = { id: "sub_FOUND0001", object: "subscription", status: "past_due", livemode: false, metadata: META, latest_invoice: { id: "in_1", status: "open" } };

  it("an unsigned or forged event → 400: no Stripe read, no Passport call", async () => {
    configure(); stripeWith({ subscription: REREAD }); passportWith({ ath_svc_founding500_apply_payment_event: { ok: true, outcome: "ACTIVATED" } });
    expect((await webhook(subEvent(META), "t=1,v1=deadbeef")).status).toBe(400);
    expect(sent).toEqual([]); expect(rpcCalls).toEqual([]);
  });

  it("verified → the subscription is RE-READ and the Passport gets the re-read status + paid, not the event's", async () => {
    configure(); stripeWith({ subscription: REREAD }); passportWith({ ath_svc_founding500_apply_payment_event: { ok: true, outcome: "NO_CHANGE_PAST_DUE" } });
    const res = await webhook(subEvent(META, "active"));
    expect(res.status).toBe(200);
    expect((await res.json()).founding).toBe("NO_CHANGE_PAST_DUE");
    const read = sent.find(s => s.path === "subscriptions/sub_FOUND0001")!;
    expect(read.method).toBe("GET");
    expect(read.params.get("expand[0]")).toBe("latest_invoice");
    expect(rpcCalls).toEqual([{ fn: "ath_svc_founding500_apply_payment_event", args: {
      p_provider: "stripe", p_event_id: "evt_f1", p_event_type: "customer.subscription.updated", p_event_created: new Date(1_790_000_000_000).toISOString(),
      p_livemode: false, p_user: USER, p_app: "wm_pro", p_subscription_ref: "sub_FOUND0001", p_subscription_status: "past_due", p_paid: false,
    } }]);
  });

  it("the event claims FOUNDING but the re-read subscription does not → nothing applied", async () => {
    configure(); stripeWith({ subscription: { ...REREAD, metadata: { product: "WM_PRO" } } }); passportWith({});
    const res = await webhook(subEvent(META));
    expect(res.status).toBe(200);
    expect(rpcCalls).toEqual([]);
  });

  it("the Passport cannot be written (SQL not applied) or the re-read fails → 503 so Stripe redelivers", async () => {
    configure(); stripeWith({ subscription: REREAD });
    expect((await webhook(subEvent(META))).status).toBe(503);
    stripeWith();
    expect((await webhook({ ...subEvent(META), id: "evt_f2" })).status).toBe(503);
  });

  it("EXISTING SUBSCRIBERS UNTOUCHED: no FOUNDING price configured → no re-read, no Passport call, same answer as before", async () => {
    configure({ WM_STRIPE_PRICE_FOUNDING: "" }); stripeWith({ subscription: REREAD }); passportWith({});
    const res = await webhook(subEvent(META));
    expect(await res.json()).toEqual({ outcome: "NO_RECORD" });
    expect(sent).toEqual([]); expect(rpcCalls).toEqual([]);
  });

  it("a non-FOUNDING subscription event (its metadata says otherwise) → no re-read even with the price configured", async () => {
    configure(); stripeWith({ subscription: REREAD }); passportWith({});
    const res = await webhook(subEvent({ product: "WM_PRO", wm_tier: "PASSPORT" }));
    expect(await res.json()).toEqual({ outcome: "NO_RECORD" });
    expect(sent).toEqual([]); expect(rpcCalls).toEqual([]);
  });

  it("invoice.paid with no metadata hint → re-read; paid = latest_invoice.status === 'paid'", async () => {
    configure(); stripeWith({ subscription: { ...REREAD, status: "active", latest_invoice: { id: "in_2", status: "paid" } } });
    passportWith({ ath_svc_founding500_apply_payment_event: { ok: true, outcome: "ACTIVATED" } });
    const ev = { id: "evt_inv", type: "invoice.paid", created: 1_790_000_100, livemode: false, data: { object: { id: "in_2", object: "invoice", customer: "cus_NEW00001", subscription: "sub_FOUND0001" } } };
    expect((await (await webhook(ev)).json()).founding).toBe("ACTIVATED");
    expect(rpcCalls[0]!.args).toMatchObject({ p_subscription_status: "active", p_paid: true, p_event_type: "invoice.paid" });
  });
});

describe("POST /api/billing/founding/trial — FOUNDING 100", () => {
  const ROW = { decision_id: DECISION, recon_version: 1, intent: "Breakout continuation", intent_device_id: "d1" };
  const ACTIVATED = { ok: true, reason: "ACTIVATED", enrollment_id: "enr_100", expires_at: "2026-12-07T00:00:00Z" };

  it("a server-verified first save → claim with other_verified + wm_pro:decision:<id>; never touches Stripe", async () => {
    configure(); passportWith({ wm_read_decision_position: [ROW], ath_svc_founding100_claim: ACTIVATED });
    const res = await trial({ decisionIds: ["junk", DECISION] });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, reason: "ACTIVATED", expiresAt: "2026-12-07T00:00:00Z" });
    expect(rpcCalls).toEqual([
      { fn: "wm_read_decision_position", args: { p_owner_id: USER, p_decision_id: DECISION } },
      { fn: "ath_svc_founding100_claim", args: { p_user: USER, p_app: "wm_pro", p_activity_kind: "other_verified", p_evidence_reference: `wm_pro:decision:${DECISION}` } },
    ]);
    expect(sent).toEqual([]);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("no save the server can see → 409, no claim (a client flag or a made-up id verifies nothing)", async () => {
    configure(); passportWith({ wm_read_decision_position: [], ath_svc_founding100_claim: ACTIVATED });
    for (const body of [{}, { decisionIds: [] }, { firstActionDone: true }, { decisionIds: ["not-a-decision"] }, { decisionIds: [DECISION] }]) {
      const res = await trial(body);
      expect(res.status).toBe(409);
      expect((await res.json()).code).toBe("FIRST_SAVE_NOT_FOUND");
    }
    expect(rpcCalls.some(c => c.fn === "ath_svc_founding100_claim")).toBe(false);
  });

  it("a row without a written intent is not a save", async () => {
    configure(); passportWith({ wm_read_decision_position: [{ ...ROW, intent: "  ", recon_version: 0 }], ath_svc_founding100_claim: ACTIVATED });
    expect((await trial()).status).toBe(409);
    expect(rpcCalls.some(c => c.fn === "ath_svc_founding100_claim")).toBe(false);
  });

  it("the decision store or the Passport cannot be asked → 503, nothing claimed (fail closed)", async () => {
    configure();
    expect((await trial()).status).toBe(503);
    passportWith({ wm_read_decision_position: [ROW] });           // claim RPC 404 (SQL not applied)
    expect((await trial()).status).toBe(503);
  });

  it("ALREADY_ENROLLED / COHORT_FULL → 409 in plain words, no number", async () => {
    configure();
    passportWith({ wm_read_decision_position: [ROW], ath_svc_founding100_claim: { ok: false, reason: "COHORT_FULL" } });
    const j = await (await trial()).json();
    expect(j).toEqual({ error: "FOUNDING 100 is full for WM Pro.", code: "COHORT_FULL" });
    expect(j.error.replace("100", "")).not.toMatch(/\d/);
    passportWith({ wm_read_decision_position: [ROW], ath_svc_founding100_claim: { ok: false, reason: "ALREADY_ENROLLED", expires_at: "2026-12-07T00:00:00Z" } });
    expect((await trial()).status).toBe(409);
  });
});

describe("GET /api/billing/standing — FOUNDING grants Premium while on; the trial ends at 30 days", () => {
  const DAY = 86_400_000;
  it.each([
    ["an unexpired FOUNDING 100 trial", [{ source: "founding_100", app: "wm_pro", entitlement: "wm_pro.premium_trial", charge_cents: 0, renews: false, starts_at: new Date(Date.now() - DAY).toISOString(), expires_at: new Date(Date.now() + 29 * DAY).toISOString() }], "PASSPORT"],
    ["an EXPIRED trial", [{ source: "founding_100", app: "wm_pro", entitlement: "wm_pro.premium_trial", expires_at: new Date(Date.now() - 1000).toISOString() }], "FREE"],
    ["a trial with no expiry", [{ source: "founding_100", app: "wm_pro", entitlement: "wm_pro.premium_trial", expires_at: null }], "FREE"],
    ["FOUNDING 500", [{ source: "founding_500", app: "wm_pro", entitlement: "wm_pro.founding_500", charge_cents: 1000, renews: true, expires_at: null }], "PASSPORT"],
    ["another app's grant", [{ source: "founding_500", app: "wavemotion", entitlement: "wavemotion.founding_500", expires_at: null }], "FREE"],
  ])("%s → tier %s", async (_label, rows, tier) => {
    configure(); passportWith({ ath_svc_entitlements_for: rows });
    const j = await (await standing()).json();
    expect(j.tier).toBe(tier);
    expect(j.entitlements.tier).toBe(tier);
    expect(rpcCalls).toEqual([{ fn: "ath_svc_entitlements_for", args: { p_user: USER } }]);
  });
  it("the Passport cannot be read → no grant (FREE), never an error", async () => {
    configure();
    const j = await (await standing()).json();
    expect(j.tier).toBe("FREE");
    expect(j.founding).toBeNull();
  });
});

describe("SENTINELS", () => {
  const src = (f: string) => readFileSync(path.join(process.cwd(), f), "utf8");
  it("the FOUNDING 500 session can never carry allow_promotion_codes, discounts, trial_period_days, trial_end or a coupon", () => {
    const route = src("src/app/api/billing/founding/checkout/route.ts");
    const code = route.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/allow_promotion_codes|discounts|trial_period_days|trial_end|trial_settings|coupon|promotion_code/i);
    expect(code).toContain("bodyAsksForOffer(body)");
  });
  it("FOUNDING copy: the exact Founder words, all caps names, no counts, no scarcity anywhere it is shown", async () => {
    const { FOUNDING_COPY } = await import("@/lib/billing/founding");
    expect(FOUNDING_COPY.paid500).toBe("FOUNDING 500 — $10/month for as long as you stay subscribed.");
    expect(FOUNDING_COPY.promo100).toBe("FOUNDING 100 — a free 30-day Premium trial after your first real save. No card. It never charges.");
    const noComments = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const shown = [noComments(src("src/components/billing/FoundingOffers.tsx")), ...Object.values(FOUNDING_COPY)].join("\n");
    // The pricing page itself names nothing about FOUNDING: it only mounts the block when the server sends it.
    expect(src("src/app/pricing/page.tsx")).not.toMatch(/FOUNDING (500|100)/);
    expect(shown).not.toMatch(/\b(seats?|spots?|left|remaining|only \d|hurry|last chance|limited)\b/i);
    expect(shown).not.toMatch(/\d+\s*(of|\/)\s*(500|100)\b/);
    expect(noComments(src("src/app/api/billing/tiers/route.ts"))).not.toMatch(/count|remaining/i);
  });
  it("no config in the repo turns FOUNDING on", () => {
    expect(src("wrangler.jsonc")).not.toContain("WM_FOUNDING_LIVE");
  });
});
