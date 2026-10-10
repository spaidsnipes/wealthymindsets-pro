/**
 * WM PRO BILLING — the routes (Garden 19 Supermax §11). Fail-closed, and no
 * checkout is ever run against Stripe here: `fetch` is a stand-in that records
 * what the server WOULD send.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signStripePayload } from "@/lib/billing/webhookSignature";

const USER = "user-0007-abcd", EMAIL = "dave@wm.test";
const KEY = "sk_test_" + "k".repeat(24), WH = "whsec_" + "w".repeat(24);
const mocks = vi.hoisted(() => ({ who: null as null | { sub: string; email: string }, kv: null as null | { store: Map<string, string>; get: (k: string) => Promise<string | null>; put: (k: string, v: string) => Promise<void> } }));

vi.mock("@/lib/requireAuth", () => ({
  requireAuth: async () => (mocks.who ? { ok: true, user: { ...mocks.who, iat: 0 } } : { ok: false, response: new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 }) }),
}));
vi.mock("@/lib/billing/billingStore", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/billing/billingStore")>()), billingKv: async () => mocks.kv }));

interface Sent { method: string; path: string; params: URLSearchParams; idem: string | null; auth: string | null }
let sent: Sent[] = [];
let stripe: (s: Sent) => { status?: number; body: unknown };
const logs: string[] = [];

function configure(extra: Record<string, string> = {}) {
  vi.stubEnv("STRIPE_SECRET_KEY", KEY);
  vi.stubEnv("WM_STRIPE_WEBHOOK_SECRET", WH);
  vi.stubEnv("WM_STRIPE_PRICE_PASSPORT", "price_passport001");
  for (const [k, v] of Object.entries(extra)) vi.stubEnv(k, v);
}
const newKv = () => { const store = new Map<string, string>(); return { store, get: async (k: string) => store.get(k) ?? null, put: vi.fn(async (k: string, v: string) => { store.set(k, v); }) as unknown as (k: string, v: string) => Promise<void> }; };

beforeEach(() => {
  vi.resetModules(); vi.unstubAllEnvs();
  for (const k of ["STRIPE_SECRET_KEY", "WM_STRIPE_WEBHOOK_SECRET", "WM_BILLING_LIVE", "WM_STRIPE_PRICE_APP", "WM_STRIPE_PRICE_PASSPORT", "WM_STRIPE_PRICE_OS"]) vi.stubEnv(k, "");
  mocks.who = { sub: USER, email: EMAIL };
  mocks.kv = newKv();
  sent = []; logs.length = 0;
  stripe = () => ({ body: {} });
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const u = new URL(String(url));
    if (u.host !== "api.stripe.com") throw new Error(`unexpected host ${u.host}`);
    const s: Sent = { method: init?.method ?? "GET", path: u.pathname.replace("/v1/", ""), params: init?.method === "POST" ? new URLSearchParams(String(init.body ?? "")) : u.searchParams, idem: (init?.headers as Record<string, string>)?.["Idempotency-Key"] ?? null, auth: (init?.headers as Record<string, string>)?.Authorization ?? null };
    sent.push(s);
    const r = stripe(s);
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200 });
  }));
  for (const m of ["log", "warn", "error", "info"] as const) vi.spyOn(console, m).mockImplementation((...a: unknown[]) => { logs.push(a.map(String).join(" ")); });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

const post = (path: string, body: unknown, headers: Record<string, string> = {}) => new Request(`https://wealthymindsetspro.com/api/billing/${path}`, { method: "POST", headers: { "content-type": "application/json", origin: "https://wealthymindsetspro.com", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
const checkout = async (body: unknown = { tier: "PASSPORT" }, headers?: Record<string, string>) => (await import("./checkout/route")).POST(post("checkout", body, headers));
const noSecret = (text: string) => { expect(text).not.toContain(KEY); expect(text).not.toContain(WH); expect(text).not.toMatch(/sk_test_|whsec_|price_passport001|STRIPE_SECRET_KEY|WM_STRIPE/); };

/** A Stripe that knows one customer search answer and returns a session. */
function stripeWith(o: { tagged?: unknown[]; byEmail?: unknown[]; stored?: unknown; sessionLive?: boolean } = {}) {
  stripe = s => {
    if (s.method === "GET" && s.path === "customers/search") return { body: { data: o.tagged ?? [] } };
    if (s.method === "GET" && s.path === "customers") return { body: { data: o.byEmail ?? [] } };
    if (s.method === "GET" && s.path.startsWith("customers/")) return o.stored ? { body: o.stored } : { status: 404, body: { error: { type: "invalid_request_error" } } };
    if (s.method === "POST" && s.path === "customers") return { body: { id: "cus_NEW00001", metadata: { passport_id_ref: USER } } };
    if (s.method === "POST" && s.path.startsWith("customers/")) return { body: { id: s.path.split("/")[1] } };
    if (s.method === "POST" && s.path === "checkout/sessions") return { body: { id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1", livemode: o.sessionLive ?? false } };
    if (s.method === "POST" && s.path === "billing_portal/sessions") return { body: { url: "https://billing.stripe.com/p/session/x" } };
    return { status: 404, body: {} };
  };
}

describe("GET /api/billing/tiers — public, booleans and one word", () => {
  const get = async () => (await import("./tiers/route")).GET(new Request("https://wealthymindsetspro.com/api/billing/tiers", { headers: { "cf-connecting-ip": "203.0.113.5" } }));

  it("nothing configured → NOT_CONFIGURED and every tier false, for a guest too", async () => {
    mocks.who = null;
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ mode: "NOT_CONFIGURED", tiers: { APP: false, PASSPORT: false, OS: false } });
  });

  it("configured → only the tiers with a price id are on sale; no id, no key information in the body", async () => {
    configure();
    const res = await get();
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ mode: "TEST", tiers: { APP: false, PASSPORT: true, OS: false } });
    noSecret(text);
  });

  it("a price id set while billing is NOT configured still sells nothing", async () => {
    vi.stubEnv("WM_STRIPE_PRICE_PASSPORT", "price_passport001");
    expect(await (await get()).json()).toEqual({ mode: "NOT_CONFIGURED", tiers: { APP: false, PASSPORT: false, OS: false } });
  });
});

describe("POST /api/billing/checkout", () => {
  it("a guest is 401; a cross-site request is 403; neither reaches Stripe", async () => {
    configure(); stripeWith();
    mocks.who = null;
    expect((await checkout()).status).toBe(401);
    mocks.who = { sub: USER, email: EMAIL };
    expect((await checkout({ tier: "PASSPORT" }, { origin: "https://evil.example" })).status).toBe(403);
    expect(sent).toEqual([]);
  });

  it("NOT_CONFIGURED sells nothing: 503 in plain words, no Stripe call, no record written", async () => {
    const res = await checkout();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Paid plans are not on sale yet.", code: "NOT_CONFIGURED" });
    expect(sent).toEqual([]);
    expect(mocks.kv!.store.size).toBe(0);
  });

  it("a live key that is not armed, or no webhook secret → still nothing", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_" + "L".repeat(24)); vi.stubEnv("WM_STRIPE_WEBHOOK_SECRET", WH); vi.stubEnv("WM_STRIPE_PRICE_PASSPORT", "price_passport001");
    expect((await checkout()).status).toBe(503);
    vi.stubEnv("STRIPE_SECRET_KEY", KEY); vi.stubEnv("WM_STRIPE_WEBHOOK_SECRET", "");
    expect((await checkout()).status).toBe(503);
    expect(sent).toEqual([]);
  });

  it("THE CLIENT CANNOT CHOOSE THE PRICE: a price id, an amount or junk as the tier is 400; extra fields are ignored", async () => {
    configure(); stripeWith();
    for (const bad of [{ tier: "price_passport001" }, { tier: 2000 }, { price: "price_os00000001", amount: 1 }, "not json"]) expect((await checkout(bad)).status, JSON.stringify(bad)).toBe(400);
    expect(sent).toEqual([]);
    const res = await checkout({ tier: "PASSPORT", price: "price_attacker0001", amount: 1, unit_amount: 1, customer: "cus_ATTACKER1", success_url: "https://evil.example/x" });
    expect(res.status).toBe(201);
    const session = sent.find(s => s.path === "checkout/sessions")!;
    expect(session.params.get("line_items[0][price]")).toBe("price_passport001");
    expect(session.params.get("line_items[0][quantity]")).toBe("1");
    expect(session.params.get("mode")).toBe("subscription");
    expect([...session.params.keys()].some(k => /amount|price_data/.test(k))).toBe(false);
    expect(session.params.get("customer")).toBe("cus_NEW00001");
    expect(session.params.get("success_url")).toBe("https://wealthymindsetspro.com/pricing?billing=success");
    expect(session.params.get("cancel_url")).toBe("https://wealthymindsetspro.com/pricing?billing=cancelled");
    expect(session.params.get("metadata[product]")).toBe("WM_PRO");
    expect(session.params.get("metadata[wm_tier]")).toBe("PASSPORT");
    expect(session.params.get("metadata[passport_id_ref]")).toBe(USER);
    expect(session.params.get("subscription_data[metadata][passport_id_ref]")).toBe(USER);
  });

  it("a tier with no price id configured is not on sale (503), and Stripe is not asked", async () => {
    configure(); stripeWith();
    const res = await checkout({ tier: "OS" });
    expect(res.status).toBe(503);
    expect((await res.json() as { code: string }).code).toBe("TIER_NOT_ON_SALE");
    expect(sent).toEqual([]);
  });

  it("ONE CUSTOMER PER IDENTITY — a customer already tagged with this Passport id is reused; none is created", async () => {
    configure(); stripeWith({ tagged: [{ id: "cus_PASSPORT1", metadata: { passport_id_ref: USER } }] });
    expect((await checkout()).status).toBe(201);
    expect(sent.some(s => s.method === "POST" && s.path === "customers")).toBe(false);
    expect(sent.find(s => s.path === "customers/search")!.params.get("query")).toBe(`metadata['passport_id_ref']:'${USER}'`);
    expect(sent.find(s => s.path === "checkout/sessions")!.params.get("customer")).toBe("cus_PASSPORT1");
    expect(JSON.parse(mocks.kv!.store.get(`billing:v1:user:${USER}`)!)).toMatchObject({ customerId: "cus_PASSPORT1", customerMatch: "METADATA", status: null, tier: null });
    expect(mocks.kv!.store.get("billing:v1:customer:cus_PASSPORT1")).toBe(USER);
  });

  it("…the Passport's existing customer found by EMAIL is reused, tagged with the id, and FLAGGED for review", async () => {
    configure(); stripeWith({ byEmail: [{ id: "cus_WORLDPASS", email: EMAIL, metadata: {} }] });
    expect((await checkout()).status).toBe(201);
    expect(sent.some(s => s.method === "POST" && s.path === "customers")).toBe(false);
    const tag = sent.find(s => s.method === "POST" && s.path === "customers/cus_WORLDPASS")!;
    expect(tag.params.get("metadata[passport_id_ref]")).toBe(USER);
    expect(JSON.parse(mocks.kv!.store.get(`billing:v1:user:${USER}`)!)).toMatchObject({ customerId: "cus_WORLDPASS", customerMatch: "EMAIL" });
  });

  it("…two candidates are never guessed between: checkout is held for review, nothing is created, nothing is charged", async () => {
    configure(); stripeWith({ byEmail: [{ id: "cus_AAAAAA01", metadata: {} }, { id: "cus_BBBBBB02", metadata: {} }] });
    const res = await checkout();
    expect(res.status).toBe(409);
    expect((await res.json() as { code: string }).code).toBe("NEEDS_REVIEW");
    expect(sent.some(s => s.method === "POST")).toBe(false);
    configure(); stripeWith({ byEmail: [{ id: "cus_OTHERID1", metadata: { passport_id_ref: "someone-else-01" } }] });
    expect((await checkout()).status).toBe(409);                      // the email's customer belongs to another identity
    expect(sent.some(s => s.method === "POST")).toBe(false);
  });

  it("…none exists → exactly one is created, tagged, under a key a retry repeats", async () => {
    configure(); stripeWith();
    expect((await checkout()).status).toBe(201);
    const made = sent.filter(s => s.method === "POST" && s.path === "customers");
    expect(made).toHaveLength(1);
    expect(made[0]!.idem).toBe(`wmpro-customer-TEST-${USER}`);
    expect(made[0]!.params.get("metadata[passport_id_ref]")).toBe(USER);
    expect(made[0]!.params.get("email")).toBe(EMAIL);
    // The second time, the stored id is read back and reused — no search, no create.
    sent = []; stripeWith({ stored: { id: "cus_NEW00001", metadata: { passport_id_ref: USER } } });
    expect((await checkout()).status).toBe(201);
    expect(sent.map(s => `${s.method} ${s.path}`)).toEqual(["GET customers/cus_NEW00001", "POST checkout/sessions"]);
  });

  it("the session's idempotency key is the member and the tier — not the clock", async () => {
    configure(); stripeWith();
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-09T10:00:00Z"));
    await checkout();
    vi.setSystemTime(new Date("2026-10-11T23:00:00Z"));
    await checkout();
    vi.useRealTimers();
    const keys = sent.filter(s => s.path === "checkout/sessions").map(s => s.idem);
    expect(keys).toEqual([`wmpro-checkout-TEST-${USER}-PASSPORT`, `wmpro-checkout-TEST-${USER}-PASSPORT`]);
  });

  it("an active plan cannot be bought twice (409, no Stripe call)", async () => {
    configure(); stripeWith();
    mocks.kv!.store.set(`billing:v1:user:${USER}`, JSON.stringify({ v: 1, userId: USER, customerId: "cus_NEW00001", subscriptionId: "sub_1", tier: "PASSPORT", status: "active", currentPeriodEnd: null, livemode: false, lastEventId: "e", lastEventAt: 1, seenEventIds: ["e"], customerMatch: "CREATED" }));
    const res = await checkout();
    expect(res.status).toBe(409);
    expect((await res.json() as { code: string }).code).toBe("ALREADY_ACTIVE");
    expect(sent).toEqual([]);
  });

  it("a session in the wrong mode is not handed out; Stripe's failure is plain words; no store → nothing sells", async () => {
    configure(); stripeWith({ sessionLive: true });
    expect((await checkout()).status).toBe(503);
    configure(); stripe = s => (s.path === "checkout/sessions" ? { status: 402, body: { error: { type: "card_error", message: `No such price: 'price_passport001' (key ${KEY})` } } } : s.path === "customers/search" ? { body: { data: [{ id: "cus_PASSPORT1", metadata: { passport_id_ref: USER } }] } } : { body: { data: [] } });
    const failed = await checkout();
    expect(failed.status).toBe(502);
    noSecret(await failed.text());
    mocks.kv = null;
    expect((await checkout()).status).toBe(503);
  });

  it("NO SECRET in any response or log line across every outcome above; the key rides only in the Authorization header", async () => {
    configure(); stripeWith();
    const ok = await checkout();
    noSecret(await ok.text());
    expect(sent.every(s => s.auth === `Bearer ${KEY}`)).toBe(true);
    expect(sent.every(s => !s.params.toString().includes(KEY))).toBe(true);
    for (const line of logs) noSecret(line);
  });

  it("the sixth start in ten minutes is 429", async () => {
    configure(); stripeWith();
    for (let i = 0; i < 5; i++) expect((await (await import("./checkout/route")).POST(post("checkout", { tier: "PASSPORT" }))).status).toBe(201);
    const { POST } = await import("./checkout/route");
    const res = await POST(post("checkout", { tier: "PASSPORT" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
  });
});

describe("POST /api/billing/webhook", () => {
  const NOW = () => Math.floor(Date.now() / 1000);
  const event = (o: Record<string, unknown>) => JSON.stringify({ id: "evt_1", created: NOW(), livemode: false, ...o });
  const hook = async (payload: string, header: string | null) => (await import("./webhook/route")).POST(new Request("https://wealthymindsetspro.com/api/billing/webhook", { method: "POST", headers: header ? { "stripe-signature": header } : {}, body: payload }));
  const signed = async (payload: string, t = NOW()) => hook(payload, await signStripePayload(payload, WH, t));
  const paid = (id = "evt_1", extra: Record<string, unknown> = {}) => event({ id, type: "checkout.session.completed", data: { object: { mode: "subscription", payment_status: "paid", customer: "cus_NEW00001", subscription: "sub_WM1", client_reference_id: USER, metadata: { passport_id_ref: USER, product: "WM_PRO", wm_tier: "PASSPORT" } } }, ...extra });
  const record = () => JSON.parse(mocks.kv!.store.get(`billing:v1:user:${USER}`) ?? "null") as Record<string, unknown> | null;

  it("UNSIGNED, wrongly signed or STALE → 400, and nothing is read or written", async () => {
    configure();
    expect((await hook(paid(), null)).status).toBe(400);
    expect((await hook(paid(), "t=1,v1=" + "0".repeat(64))).status).toBe(400);
    expect((await hook(paid(), await signStripePayload(paid(), "whsec_someone_elses_secret_0000", NOW()))).status).toBe(400);
    expect((await signed(paid(), NOW() - 301)).status).toBe(400);
    const tampered = paid().replace("PASSPORT", "OS");
    expect((await hook(tampered, await signStripePayload(paid(), WH, NOW()))).status).toBe(400);
    expect(mocks.kv!.store.size).toBe(0);
    expect(sent).toEqual([]);
  });

  it("no webhook secret configured → every delivery is 400 (nothing can be forged into an empty secret)", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", KEY);
    expect((await hook(paid(), await signStripePayload(paid(), WH, NOW()))).status).toBe(400);
    expect((await hook(paid(), `t=${NOW()},v1=${"a".repeat(64)}`)).status).toBe(400);
  });

  it("WRONG MODE (a live event while the server is in test) → 200, no change", async () => {
    configure();
    const res = await signed(paid("evt_live", { livemode: true }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ outcome: "WRONG_MODE" });
    expect(record()).toBeNull();
  });

  it("a signed, paid WM Pro checkout activates the member's tier — and a REPLAY changes nothing", async () => {
    configure();
    const first = await signed(paid());
    expect(await first.json()).toEqual({ outcome: "ACTIVATED", changed: true });
    expect(record()).toMatchObject({ userId: USER, customerId: "cus_NEW00001", subscriptionId: "sub_WM1", tier: "PASSPORT", status: "active", lastEventId: "evt_1" });
    const snapshot = mocks.kv!.store.get(`billing:v1:user:${USER}`);
    const puts = (mocks.kv!.put as unknown as { mock: { calls: unknown[] } }).mock.calls.length;
    for (let i = 0; i < 3; i++) expect(await (await signed(paid())).json()).toEqual({ outcome: "REPLAYED", changed: false });
    expect(mocks.kv!.store.get(`billing:v1:user:${USER}`)).toBe(snapshot);
    expect((mocks.kv!.put as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(puts);
    const { memberTier } = await import("@/lib/billing/billingStore");
    expect(await memberTier(USER, process.env, async () => mocks.kv)).toBe("PASSPORT");
  });

  it("a FULL REFUND of this subscription's charge ends the entitlement; so does a DISPUTE", async () => {
    configure();
    await signed(paid());
    stripe = s => (s.path === "charges/ch_WM000001" ? { body: { id: "ch_WM000001", customer: "cus_NEW00001", invoice: { id: "in_1", subscription: "sub_WM1" } } } : { status: 404, body: {} });
    const refund = event({ id: "evt_2", type: "charge.refunded", data: { object: { id: "ch_WM000001", customer: "cus_NEW00001", refunded: true } } });
    expect(await (await signed(refund)).json()).toEqual({ outcome: "REFUNDED", changed: true });
    expect(record()).toMatchObject({ status: "refunded" });
    const { memberTier } = await import("@/lib/billing/billingStore");
    expect(await memberTier(USER, process.env, async () => mocks.kv)).toBe("FREE");

    mocks.kv = newKv();
    await signed(paid("evt_10"));
    const dispute = event({ id: "evt_11", type: "charge.dispute.created", data: { object: { id: "dp_1", charge: "ch_WM000001" } } });
    expect(await (await signed(dispute)).json()).toEqual({ outcome: "DISPUTED", changed: true });
    expect(record()).toMatchObject({ status: "disputed" });
  });

  it("ANOTHER product's refund on the same shared customer does not touch WM Pro", async () => {
    configure();
    await signed(paid());
    stripe = s => (s.path === "charges/ch_WORLDPASS" ? { body: { id: "ch_WORLDPASS", customer: "cus_NEW00001", invoice: { id: "in_9", subscription: "sub_WORLDPASS" } } } : { status: 404, body: {} });
    const refund = event({ id: "evt_3", type: "charge.refunded", data: { object: { id: "ch_WORLDPASS", customer: "cus_NEW00001", refunded: true } } });
    expect(await (await signed(refund)).json()).toEqual({ outcome: "DIFFERENT_SUBSCRIPTION", changed: false });
    expect(record()).toMatchObject({ status: "active", tier: "PASSPORT" });
  });

  it("a charge that cannot be read yet, or no record store → 503 so Stripe delivers again", async () => {
    configure();
    await signed(paid());
    stripe = () => ({ status: 500, body: {} });
    expect((await signed(event({ id: "evt_4", type: "charge.refunded", data: { object: { id: "ch_WM000001", customer: "cus_NEW00001", refunded: true } } }))).status).toBe(503);
    mocks.kv = null;
    expect((await signed(paid("evt_5"))).status).toBe(503);
  });

  it("an event that names no known member is answered 200 and stored nowhere", async () => {
    configure();
    const res = await signed(event({ id: "evt_6", type: "invoice.payment_failed", data: { object: { customer: "cus_STRANGER", subscription: "sub_X" } } }));
    expect(await res.json()).toEqual({ outcome: "NO_RECORD" });
    expect(mocks.kv!.store.size).toBe(0);
  });
});

describe("GET /api/billing/standing and POST /api/billing/portal", () => {
  const standing = async () => (await import("./standing/route")).GET(new Request("https://wealthymindsetspro.com/api/billing/standing"));
  const portal = async (headers?: Record<string, string>) => (await import("./portal/route")).POST(post("portal", {}, headers));
  const ACTIVE = { v: 1, userId: USER, customerId: "cus_NEW00001", subscriptionId: "sub_WM1", tier: "PASSPORT", status: "active", currentPeriodEnd: "2026-11-09T00:00:00.000Z", livemode: false, lastEventId: "e", lastEventAt: 1, seenEventIds: ["e"], customerMatch: "CREATED" };

  it("standing: a guest is 401; a member with no record is FREE; with an active record it is their own tier", async () => {
    configure();
    mocks.who = null;
    expect((await standing()).status).toBe(401);
    mocks.who = { sub: USER, email: EMAIL };
    expect(await (await standing()).json()).toMatchObject({ mode: "TEST", tiers: { APP: false, PASSPORT: true, OS: false }, tier: "FREE", status: null, canManage: false, store: "READ" });
    mocks.kv!.store.set(`billing:v1:user:${USER}`, JSON.stringify(ACTIVE));
    const res = await standing();
    const text = await res.text();
    expect(JSON.parse(text)).toMatchObject({ tier: "PASSPORT", status: "active", currentPeriodEnd: "2026-11-09T00:00:00.000Z", canManage: true });
    expect(text).not.toMatch(/cus_|sub_|price_|sk_|whsec_/);              // ids stay on the server
    // Another member never reads this record.
    mocks.who = { sub: "user-0008-efgh", email: "x@wm.test" };
    expect(await (await standing()).json()).toMatchObject({ tier: "FREE", status: null });
  });

  it("standing while NOT configured: FREE, nothing on sale — even with a stored record", async () => {
    mocks.kv!.store.set(`billing:v1:user:${USER}`, JSON.stringify(ACTIVE));
    expect(await (await standing()).json()).toMatchObject({ mode: "NOT_CONFIGURED", tiers: { APP: false, PASSPORT: false, OS: false }, tier: "FREE", status: null });
  });

  it("portal: guest 401, cross-site 403, no plan 404; with a plan it opens Stripe's page for the member's OWN customer", async () => {
    configure(); stripeWith();
    mocks.who = null;
    expect((await portal()).status).toBe(401);
    mocks.who = { sub: USER, email: EMAIL };
    expect((await portal({ origin: "https://evil.example" })).status).toBe(403);
    expect((await portal()).status).toBe(404);
    mocks.kv!.store.set(`billing:v1:user:${USER}`, JSON.stringify(ACTIVE));
    const res = await portal();
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ url: "https://billing.stripe.com/p/session/x" });
    const call = sent.find(s => s.path === "billing_portal/sessions")!;
    expect(call.params.get("customer")).toBe("cus_NEW00001");
    expect(call.params.get("return_url")).toBe("https://wealthymindsetspro.com/pricing");
  });
});
