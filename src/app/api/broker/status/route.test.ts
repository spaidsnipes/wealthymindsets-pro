import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// The route is now WM-session-gated (mirrors /api/broker/readiness) — infra
// recon (which providers are configured on this host) must not be public.
// Tests stub requireAuth so the existing per-provider assertions still cover
// the aggregate shape; a separate test covers the auth-gate itself below.
vi.mock("@/lib/requireAuth", () => ({
  requireAuth: vi.fn(async () => ({ ok: true, user: { sub: "u1" } })),
}));

import { GET, type BrokerStatusResponse } from "./route";
import { requireAuth } from "@/lib/requireAuth";
import { NextResponse } from "next/server";

async function readBrokerStatus(): Promise<BrokerStatusResponse> {
  const response = await GET(new Request("http://localhost/api/broker/status"));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  return await response.json() as BrokerStatusResponse;
}

function clearBrokerEnv(): void {
  for (const k of [
    "TASTYTRADE_CLIENT_ID", "TASTYTRADE_CLIENT_SECRET", "TASTYTRADE_REFRESH_TOKEN", "TASTYTRADE_ENV",
    "ALPACA_KEY", "ALPACA_SECRET", "ALPACA_PAPER_KEY", "ALPACA_PAPER_SECRET",
    "WEBULL_APP_KEY", "WEBULL_APP_SECRET", "WEBULL_API_KEY", "WEBULL_API_SECRET", "WEBULL_ACCESS_TOKEN",
    "GEMINI_API_KEY",
  ]) delete process.env[k];
}

describe("/api/broker/status — canon §12 truthful aggregate", () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of [
      "TASTYTRADE_CLIENT_ID", "TASTYTRADE_CLIENT_SECRET", "TASTYTRADE_REFRESH_TOKEN",
      "ALPACA_KEY", "ALPACA_SECRET", "ALPACA_PAPER_KEY", "ALPACA_PAPER_SECRET",
      "WEBULL_APP_KEY", "WEBULL_APP_SECRET", "WEBULL_API_KEY", "WEBULL_API_SECRET", "WEBULL_ACCESS_TOKEN",
      "GEMINI_API_KEY",
    ]) saved[k] = process.env[k];
    clearBrokerEnv();
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("reports 4 providers with stable order", async () => {
    const s = await readBrokerStatus();
    expect(s.providers.map(p => p.provider)).toEqual(["webull", "tastytrade", "alpaca", "gemini"]);
  });

  it("Webull reports its signed account probe implemented without fabricating configuration", async () => {
    const s = await readBrokerStatus();
    const w = s.providers.find(p => p.provider === "webull")!;
    expect(w.implemented).toBe(true);
    expect(w.envConfigured).toBe(false);
    expect(w.connected).toBe(false);
    expect(w.note).toContain("not configured");
  });

  it("Tastytrade envConfigured only when ALL required names present", async () => {
    process.env.TASTYTRADE_CLIENT_ID = "x";
    process.env.TASTYTRADE_CLIENT_SECRET = "y";
    // missing TASTYTRADE_REFRESH_TOKEN
    let s = await readBrokerStatus();
    expect(s.providers.find(p => p.provider === "tastytrade")!.envConfigured).toBe(false);

    process.env.TASTYTRADE_REFRESH_TOKEN = "z";
    s = await readBrokerStatus();
    expect(s.providers.find(p => p.provider === "tastytrade")!.envConfigured).toBe(true);
  });

  it("Alpaca envConfigured true if paper OR live keys present", async () => {
    process.env.ALPACA_PAPER_KEY = "p";
    process.env.ALPACA_PAPER_SECRET = "s";
    let s = await readBrokerStatus();
    let a = s.providers.find(p => p.provider === "alpaca")!;
    expect(a.envConfigured).toBe(true);
    expect(a.note).toContain("Paper");

    delete process.env.ALPACA_PAPER_KEY;
    delete process.env.ALPACA_PAPER_SECRET;
    process.env.ALPACA_KEY = "k";
    process.env.ALPACA_SECRET = "kk";
    s = await readBrokerStatus();
    a = s.providers.find(p => p.provider === "alpaca")!;
    expect(a.envConfigured).toBe(true);
    expect(a.note).toContain("Live");
  });

  it("Gemini reports honestly when key absent vs present", async () => {
    let s = await readBrokerStatus();
    let g = s.providers.find(p => p.provider === "gemini")!;
    expect(g.envConfigured).toBe(false);
    expect(g.note).toContain("missing");

    process.env.GEMINI_API_KEY = "k";
    s = await readBrokerStatus();
    g = s.providers.find(p => p.provider === "gemini")!;
    expect(g.envConfigured).toBe(true);
    expect(g.note).toContain("Gateway");
  });

  it("aggregate counts reflect implemented / envConfigured totals", async () => {
    process.env.TASTYTRADE_CLIENT_ID = "x";
    process.env.TASTYTRADE_CLIENT_SECRET = "y";
    process.env.TASTYTRADE_REFRESH_TOKEN = "z";
    process.env.GEMINI_API_KEY = "k";
    const s = await readBrokerStatus();
    // All four have an implementation rung; Webull account probing remains
    // unconfigured in this deterministic setup and is never counted connected.
    expect(s.implementedCount).toBe(4);
    // 2 envConfigured in this setup (tastytrade + gemini)
    expect(s.envConfiguredCount).toBe(2);
  });

  it("GET returns 200 with no-store and never leaks token/secret text", async () => {
    process.env.TASTYTRADE_CLIENT_SECRET = "very-secret-value-xyz";
    process.env.GEMINI_API_KEY = "very-secret-gemini-abc";
    const res = await GET(new Request("http://localhost/api/broker/status"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const s = JSON.stringify(await res.json());
    expect(s).not.toContain("very-secret-value-xyz");
    expect(s).not.toContain("very-secret-gemini-abc");
  });

  it("gates behind requireAuth — infra recon isn't public", async () => {
    (requireAuth as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    });
    const res = await GET(new Request("http://localhost/api/broker/status"));
    expect(res.status).toBe(401);
  });

  it("generatedAt is a valid ISO 8601 timestamp", async () => {
    const s = await readBrokerStatus();
    expect(new Date(s.generatedAt).toISOString()).toBe(s.generatedAt);
  });
});
