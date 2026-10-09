/**
 * API audit P1-1 (2026-10-09) — the five credential-probe routes are operator
 * only, same-origin and limited. A guest stays 401, a member is refused in the
 * selling page's own words and NOTHING is sent to the provider; the owner's
 * probe is unchanged.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const BROKERS = ["alpaca", "binance", "coinbase", "kraken", "oanda"] as const;
const OWNER = "owner-1";
let who: string | null = OWNER;

vi.mock("@/lib/requireAuth", () => ({
  requireAuth: async () => (who
    ? { ok: true, user: { sub: who, email: "x@wm.test", iat: 0 } }
    : { ok: false, response: new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 }) }),
}));

const okBody: Record<(typeof BROKERS)[number], unknown> = {
  alpaca: { cash: "100", equity: "100", buying_power: "200", currency: "USD" },
  binance: { balances: [{ asset: "USDT", free: "5", locked: "0" }] },
  coinbase: { accounts: [{ currency: "USD", available_balance: { value: "7", currency: "USD" } }] },
  kraken: { result: { ZUSD: "9" } },
  oanda: { accounts: [{ id: "a1" }], account: { balance: "1", NAV: "1", marginAvailable: "1", currency: "USD" } },
};

const post = (broker: string, headers: Record<string, string> = {}) =>
  new Request(`https://wm.test/api/broker/${broker}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify({ key: "k".repeat(12), secret: "c2VjcmV0c2VjcmV0" }) });

async function call(broker: (typeof BROKERS)[number], headers?: Record<string, string>) {
  const mod = await import(`./${broker}/route`) as { POST: (r: Request) => Promise<Response> };
  return mod.POST(post(broker, headers));
}

let fetchSpy: ReturnType<typeof vi.fn>;
beforeEach(() => {
  who = OWNER;
  vi.resetModules();
  vi.stubEnv("TASTYTRADE_OWNER_USER_ID", OWNER);
  fetchSpy = vi.fn(async (url: string) => {
    const b = BROKERS.find(x => String(url).includes(x === "oanda" ? "oanda" : x === "alpaca" ? "alpaca" : x)) ?? "alpaca";
    return new Response(JSON.stringify(okBody[b]), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchSpy);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe.each(BROKERS)("/api/broker/%s", broker => {
  it("a guest is 401 and nothing is sent to the provider", async () => {
    who = null;
    const res = await call(broker);
    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("a member is 403 in plain words, with a stable code, and nothing is sent to the provider", async () => {
    who = "member-7";
    const res = await call(broker);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Connecting your own broker account is not enabled for members yet.", code: "MEMBER_CONNECTIONS_NOT_ENABLED" });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("the owner's probe is unchanged: the provider is asked and the balance comes back", async () => {
    const res = await call(broker);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(typeof body.balance).toBe("string");
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("a cross-site request is refused before the provider is asked — even for the owner; this site's own origin passes", async () => {
    const cross = await call(broker, { origin: "https://evil.example" });
    expect(cross.status).toBe(403);
    expect((await cross.json() as { code: string }).code).toBe("CROSS_SITE_REFUSED");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect((await call(broker, { origin: "https://wm.test" })).status).toBe(200);
  });

  it("the sixth probe in ten minutes is 429, and the provider is not asked again", async () => {
    for (let i = 0; i < 5; i++) expect((await call(broker)).status, `probe ${i + 1}`).toBe(200);
    const asked = fetchSpy.mock.calls.length;
    const res = await call(broker);
    expect(res.status).toBe(429);
    expect(fetchSpy.mock.calls.length).toBe(asked);
  });
});

describe("plain words, one gate", () => {
  it("kraken never returns the provider's own error text", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: ["EAPI:Invalid key", "EGeneral:Internal error"] }), { status: 200 })));
    const res = await call("kraken");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid credentials" });
  });

  it("every probe route asks the one gate straight after the session check, before it reads the body", () => {
    const files = BROKERS.map(b => path.join(process.cwd(), "src/app/api/broker", b, "route.ts"));
    expect(files.length).toBeGreaterThan(4);
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      expect(src.length, f).toBeGreaterThan(300);
      const gate = src.indexOf("{ const refusal = credentialProbeGate(req, auth.user.sub); if (refusal) return refusal; }");
      expect(gate, f).toBeGreaterThan(src.indexOf("if (!auth.ok) return auth.response;"));
      expect(gate, f).toBeLessThan(src.indexOf("await req.json()"));
      expect(src.match(/credentialProbeGate\(/g), f).toHaveLength(1);
    }
  });

  it("the member refusal is the selling page's sentence about the same fact", async () => {
    const { WHAT_IS_LIVE } = await import("@/lib/marketing/sellingStory");
    const { CREDENTIAL_PROBE_MEMBER_REFUSAL } = await import("@/lib/broker/credentialProbeGate");
    expect(WHAT_IS_LIVE.find(w => w.label === "Broker connection")!.line).toMatch(/not enabled for members yet/);
    expect(CREDENTIAL_PROBE_MEMBER_REFUSAL.error).toMatch(/not enabled for members yet/);
  });
});
