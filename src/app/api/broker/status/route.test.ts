import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, buildBrokerStatus } from "./route";

function clearBrokerEnv(): void {
  for (const k of [
    "TASTYTRADE_CLIENT_ID", "TASTYTRADE_CLIENT_SECRET", "TASTYTRADE_REFRESH_TOKEN", "TASTYTRADE_ENV",
    "ALPACA_KEY", "ALPACA_SECRET", "ALPACA_PAPER_KEY", "ALPACA_PAPER_SECRET",
    "GEMINI_API_KEY",
  ]) delete process.env[k];
}

describe("/api/broker/status — canon §12 truthful aggregate", () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of [
      "TASTYTRADE_CLIENT_ID", "TASTYTRADE_CLIENT_SECRET", "TASTYTRADE_REFRESH_TOKEN",
      "ALPACA_KEY", "ALPACA_SECRET", "ALPACA_PAPER_KEY", "ALPACA_PAPER_SECRET",
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

  it("reports 4 providers with stable order", () => {
    const s = buildBrokerStatus();
    expect(s.providers.map(p => p.provider)).toEqual(["webull", "tastytrade", "alpaca", "gemini"]);
  });

  it("Webull is always implemented=false regardless of env presence", () => {
    process.env.WEBULL_CLIENT_ID = "any"; // shouldn't matter
    const s = buildBrokerStatus();
    const w = s.providers.find(p => p.provider === "webull")!;
    expect(w.implemented).toBe(false);
    expect(w.envConfigured).toBe(false); // no code reads WEBULL_*
    expect(w.note).toContain("not implemented");
  });

  it("Tastytrade envConfigured only when ALL required names present", () => {
    process.env.TASTYTRADE_CLIENT_ID = "x";
    process.env.TASTYTRADE_CLIENT_SECRET = "y";
    // missing TASTYTRADE_REFRESH_TOKEN
    let s = buildBrokerStatus();
    expect(s.providers.find(p => p.provider === "tastytrade")!.envConfigured).toBe(false);

    process.env.TASTYTRADE_REFRESH_TOKEN = "z";
    s = buildBrokerStatus();
    expect(s.providers.find(p => p.provider === "tastytrade")!.envConfigured).toBe(true);
  });

  it("Alpaca envConfigured true if paper OR live keys present", () => {
    process.env.ALPACA_PAPER_KEY = "p";
    process.env.ALPACA_PAPER_SECRET = "s";
    let s = buildBrokerStatus();
    let a = s.providers.find(p => p.provider === "alpaca")!;
    expect(a.envConfigured).toBe(true);
    expect(a.note).toContain("Paper");

    delete process.env.ALPACA_PAPER_KEY;
    delete process.env.ALPACA_PAPER_SECRET;
    process.env.ALPACA_KEY = "k";
    process.env.ALPACA_SECRET = "kk";
    s = buildBrokerStatus();
    a = s.providers.find(p => p.provider === "alpaca")!;
    expect(a.envConfigured).toBe(true);
    expect(a.note).toContain("Live");
  });

  it("Gemini reports honestly when key absent vs present (note now sourced from canonical AIAdapter)", () => {
    let s = buildBrokerStatus();
    let g = s.providers.find(p => p.provider === "gemini")!;
    expect(g.envConfigured).toBe(false);
    // Note delegates to geminiAdapter.health() — reflects env absence honestly.
    expect(g.note).toMatch(/absent|missing|unconfigured/i);

    process.env.GEMINI_API_KEY = "k";
    s = buildBrokerStatus();
    g = s.providers.find(p => p.provider === "gemini")!;
    expect(g.envConfigured).toBe(true);
    // Wired/active when the key is present.
    expect(g.note).toMatch(/wired|active|present/i);
  });

  it("aggregate counts reflect implemented / envConfigured totals", () => {
    process.env.TASTYTRADE_CLIENT_ID = "x";
    process.env.TASTYTRADE_CLIENT_SECRET = "y";
    process.env.TASTYTRADE_REFRESH_TOKEN = "z";
    process.env.GEMINI_API_KEY = "k";
    const s = buildBrokerStatus();
    // 3 implemented (tastytrade, alpaca, gemini); webull is not
    expect(s.implementedCount).toBe(3);
    // 2 envConfigured in this setup (tastytrade + gemini)
    expect(s.envConfiguredCount).toBe(2);
  });

  it("GET returns 200 with no-store and never leaks token/secret text", async () => {
    process.env.TASTYTRADE_CLIENT_SECRET = "very-secret-value-xyz";
    process.env.GEMINI_API_KEY = "very-secret-gemini-abc";
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const s = JSON.stringify(await res.json());
    expect(s).not.toContain("very-secret-value-xyz");
    expect(s).not.toContain("very-secret-gemini-abc");
  });

  it("generatedAt is a valid ISO 8601 timestamp", () => {
    const s = buildBrokerStatus();
    expect(new Date(s.generatedAt).toISOString()).toBe(s.generatedAt);
  });
});
