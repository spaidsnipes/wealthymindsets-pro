/**
 * The operator's billing readiness (Supermax §11): names present / absent and
 * never a value; operator only; a member reads none of it.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { noteWebhookVerified, readBillingOps, saveEntitlement, type BillingKv } from "./billingStore";
import { emptyEntitlement } from "./entitlement";
import { billingReadiness } from "./readiness";

const KEY = "sk_test_" + "k".repeat(24), WH = "whsec_" + "w".repeat(24);
const NOW = Date.UTC(2026, 9, 10, 0, 20, 0);
const kvOf = () => { const m = new Map<string, string>(); return { m, kv: { get: async (k: string) => m.get(k) ?? null, put: async (k: string, v: string) => { m.set(k, v); } } as BillingKv }; };

describe("billingReadiness", () => {
  it("nothing set: NOT_CONFIGURED, 0 of 6 names, nothing on sale, no webhook, no records — and it says why", () => {
    const r = billingReadiness({}, { store: "READ", lastWebhook: null, counts: {} }, NOW);
    expect(r.mode).toBe("NOT_CONFIGURED");
    expect(r.names).toEqual(["STRIPE_SECRET_KEY", "WM_STRIPE_WEBHOOK_SECRET", "WM_BILLING_LIVE", "WM_STRIPE_PRICE_APP", "WM_STRIPE_PRICE_PASSPORT", "WM_STRIPE_PRICE_OS"].map(name => ({ name, present: false })));
    expect(r.line).toBe("billing: NOT_CONFIGURED — no Stripe secret key is set · 0 of 6 setup names present · nothing on sale · no verified webhook event yet · no billing records");
    expect(r.asOf).toBe("2026-10-10T00:20:00.000Z");
  });

  it("configured in test: the names read PRESENT / ABSENT only — no value, no prefix, anywhere in the answer", () => {
    const env = { STRIPE_SECRET_KEY: KEY, WM_STRIPE_WEBHOOK_SECRET: WH, WM_STRIPE_PRICE_PASSPORT: "price_passport001" };
    const r = billingReadiness(env, { store: "READ", lastWebhook: { atMs: NOW - 60_000, type: "checkout.session.completed", outcome: "ACTIVATED", livemode: false }, counts: { "test:active": 2, "test:none": 1 } }, NOW);
    expect(r.mode).toBe("TEST");
    expect(r.names.filter(n => n.present).map(n => n.name)).toEqual(["STRIPE_SECRET_KEY", "WM_STRIPE_WEBHOOK_SECRET", "WM_STRIPE_PRICE_PASSPORT"]);
    expect(r.line).toBe("billing: TEST · 3 of 6 setup names present · on sale: PASSPORT · last verified webhook: checkout.session.completed → ACTIVATED · 2 test active, 1 test none");
    const text = JSON.stringify(r);
    for (const secret of [KEY, WH, "sk_test_", "whsec_", "price_passport001", "kkkk", "wwww"]) expect(text, secret).not.toContain(secret);
  });

  it("each reason nothing sells is said in operator words; a store that is not bound is said", () => {
    expect(billingReadiness({ STRIPE_SECRET_KEY: "sk_live_" + "L".repeat(24), WM_STRIPE_WEBHOOK_SECRET: WH }, { store: "NO_STORE", lastWebhook: null, counts: {} }, NOW).line)
      .toBe("billing: NOT_CONFIGURED — a LIVE key is set but live billing is not armed · 2 of 6 setup names present · nothing on sale · no verified webhook event yet · record store not bound");
    expect(billingReadiness({ STRIPE_SECRET_KEY: KEY }, { store: "UNREADABLE", lastWebhook: null, counts: {} }, NOW).reason).toBe("no webhook signing secret is set");
  });
});

describe("the operator's facts in the store", () => {
  it("records are counted by mode and status as they are saved; the last verified webhook is noted without its body", async () => {
    const { m, kv } = kvOf();
    await saveEntitlement(kv, { ...emptyEntitlement("user-000001", false), customerId: "cus_AAAAAA01" });
    await saveEntitlement(kv, { ...emptyEntitlement("user-000002", false), customerId: "cus_BBBBBB02", status: "active", tier: "PASSPORT" });
    await saveEntitlement(kv, { ...emptyEntitlement("user-000002", false), customerId: "cus_BBBBBB02", status: "canceled", tier: "PASSPORT" });
    await noteWebhookVerified(kv, { atMs: NOW, type: "customer.subscription.deleted", outcome: "STATUS_UPDATED", livemode: false });
    expect(await readBillingOps(kv)).toEqual({ store: "READ", lastWebhook: { atMs: NOW, type: "customer.subscription.deleted", outcome: "STATUS_UPDATED", livemode: false }, counts: { "test:none": 1, "test:canceled": 1 } });
    // The index and the note hold no customer id, no email, no secret.
    const ops = `${m.get("billing:v1:index")} ${m.get("billing:v1:webhook:last")}`;
    expect(ops).not.toMatch(/cus_|@|sk_|whsec_|price_/);
    expect(await readBillingOps(null)).toEqual({ store: "NO_STORE", lastWebhook: null, counts: {} });
  });

  it("a failing index never fails a billing write", async () => {
    const m = new Map<string, string>();
    const kv: BillingKv = { get: async k => { if (k === "billing:v1:index") throw new Error("kv hiccup"); return m.get(k) ?? null; }, put: async (k, v) => { m.set(k, v); } };
    await expect(saveEntitlement(kv, { ...emptyEntitlement("user-000003", false), customerId: "cus_CCCCCC03" })).resolves.toBeUndefined();
    expect(m.has("billing:v1:user:user-000003")).toBe(true);
  });
});

describe("GET /api/billing/readiness — operator only", () => {
  let who: string | null = null;
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/lib/requireAuth", () => ({ requireAuth: async () => (who ? { ok: true, user: { sub: who } } : { ok: false, response: new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 }) }) }));
    vi.doMock("@/lib/billing/billingStore", async (orig) => ({ ...(await orig<typeof import("./billingStore")>()), billingKv: async () => null }));
    vi.stubEnv("TASTYTRADE_OWNER_USER_ID", "owner-1");
    vi.stubEnv("STRIPE_SECRET_KEY", KEY);
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.doUnmock("@/lib/requireAuth"); vi.doUnmock("@/lib/billing/billingStore"); });
  const get = async () => (await import("@/app/api/billing/readiness/route")).GET(new Request("https://wm.test/api/billing/readiness"));

  it("a guest is 401; a member is 403 in plain words and reads no name, no standing, no count", async () => {
    who = null;
    expect((await get()).status).toBe(401);
    who = "member-7";
    const res = await get();
    expect(res.status).toBe(403);
    const text = await res.text();
    expect(text).toBe(JSON.stringify({ error: "This tool is for the WM operator." }));
    expect(text).not.toMatch(/STRIPE|WM_|NOT_CONFIGURED|names|counts/);
  });

  it("the operator reads the line — and never a value", async () => {
    who = "owner-1";
    const res = await get();
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(JSON.parse(text)).toMatchObject({ mode: "NOT_CONFIGURED", reason: "no webhook signing secret is set", store: "NO_STORE" });
    expect(text).not.toContain(KEY);
    expect(text).not.toContain("sk_test_");
  });

  it("the Settings › Connections view asks for it only for the owner and prints present / absent", () => {
    const view = readFileSync(path.join(process.cwd(), "src/components/settings/CapabilityLedgerView.tsx"), "utf8");
    const effect = view.slice(view.indexOf("const [billing, setBilling]"), view.indexOf("return (\n    <section data-testid=\"capability-ledger\""));
    expect(effect.length).toBeGreaterThan(200);
    expect(effect).toContain("if (guest) return;");
    expect(effect).toContain('fetch("/api/billing/readiness", { cache: "no-store" })');
    expect(view).toContain("{!guest && billing ? (");
    expect(view).toContain('{n.present ? "present" : "absent"}');
  });
});
