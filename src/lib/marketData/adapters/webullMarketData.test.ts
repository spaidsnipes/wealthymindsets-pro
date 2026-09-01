import { describe, expect, it, vi } from "vitest";
import { parseWebullTickEnvelope, probeWebullMarketData, signWebullRequest, webullDataConfigFromEnv } from "./webullMarketData";

describe("Webull Data API market-data certification", () => {
  it("prefers canonical Webull OpenAPI names and accepts the legacy WM aliases", () => {
    expect(webullDataConfigFromEnv({
      WEBULL_APP_KEY: "canonical-key",
      WEBULL_APP_SECRET: "canonical-secret",
      WEBULL_API_KEY: "legacy-key",
      WEBULL_API_SECRET: "legacy-secret",
    })).toMatchObject({ appKey: "canonical-key", appSecret: "canonical-secret" });
    expect(webullDataConfigFromEnv({
      WEBULL_API_KEY: "legacy-key",
      WEBULL_API_SECRET: "legacy-secret",
    })).toMatchObject({ appKey: "legacy-key", appSecret: "legacy-secret" });
  });

  it("matches Webull's published signature vector", () => {
    expect(signWebullRequest({
      path: "/trade/place_order",
      query: { a1: "webull", a2: "123", a3: "xxx", q1: "yyy" },
      appKey: "776da210ab4a452795d74e726ebd74b6",
      appSecret: "0f50a2e853334a9aae1a783bee120c1f",
      host: "api.webull.com",
      timestamp: "2022-01-04T03:55:31Z",
      nonce: "48ef5afed43d4d91ae514aaeafbc29ba",
      body: '{"k1":123,"k2":"this is the api request body","k3":true,"k4":{"foo":[1,2]}}',
    })).toBe("kvlS6opdZDhEBo5jq40nHYXaLvM=");
  });

  it("rejects symbol mismatch and malformed prints", () => {
    expect(parseWebullTickEnvelope({ symbol: "AAPL", result: [{ time: "1", price: "1", volume: "1" }] }, "TSLA")).toEqual([]);
    expect(parseWebullTickEnvelope({ symbol: "TSLA", result: [{ time: "0", price: "0", volume: "0" }] }, "TSLA")).toEqual([]);
    expect(parseWebullTickEnvelope({ symbol: "TSLA", result: [{ time: "1", price: "351", volume: "1" }] }, "TSLA")).toEqual([]);
    expect(parseWebullTickEnvelope({ symbol: "TSLA", result: [{ time: "99999999999999999", price: "351", volume: "1" }] }, "TSLA")).toEqual([]);
  });

  it("keeps every capability unimplemented with no runtime credentials", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const cert = await probeWebullMarketData(fetchImpl, {});
    expect(cert.rows.every((row) => row.status === "NOT_IMPLEMENTED")).toBe(true);
    expect(cert.certifiedCount).toBe(0);
    expect(cert.cvd).toBe("UNAVAILABLE");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("keeps a legacy bridge fail-closed until its envelope is verified", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const cert = await probeWebullMarketData(fetchImpl, { dataUrl: "https://bridge.example/" });
    expect(cert.certifiedCount).toBe(0);
    expect(cert.rows.find((row) => row.capability === "PRICE")?.note).toMatch(/unproven transport/i);
  });

  it("certifies bounded stock ticks without overclaiming stream or aggressor side", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      symbol: "TSLA",
      result: [
        { time: "1788177423265", price: "346.6321", volume: "1", side: "N", trading_session: "PRE" },
        { time: "1788177423084", price: "346.6841", volume: "4", side: "N", trading_session: "PRE" },
      ],
    }), { status: 200 })) as unknown as typeof fetch;

    const cert = await probeWebullMarketData(fetchImpl, {
      appKey: "app-key",
      appSecret: "app-secret",
      canarySymbol: "tsla",
      now: () => new Date(1788177425265),
      nonce: () => "fixed-nonce",
    });

    expect(cert.rows.find((row) => row.capability === "PRICE")).toMatchObject({ status: "ACTIVE_DEGRADED", fidelity: "SNAPSHOT", stalenessMs: 2000 });
    expect(cert.rows.find((row) => row.capability === "TICKS")).toMatchObject({ status: "ACTIVE_DEGRADED", fidelity: "SNAPSHOT" });
    expect(cert.rows.find((row) => row.capability === "EXECUTED_VOLUME")).toMatchObject({ status: "ACTIVE_DEGRADED", fidelity: "SNAPSHOT" });
    expect(cert.rows.find((row) => row.capability === "AGGRESSOR_SIDE")).toMatchObject({ status: "NOT_IMPLEMENTED", fidelity: "NONE" });
    expect(cert.cvd).toBe("UNAVAILABLE");

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain("/market-data/stocks/ticks/list?");
    expect(String(url)).toContain("symbol=TSLA");
    expect(init.headers["x-app-key"]).toBe("app-key");
    expect(init.headers["x-signature"]).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(init.headers["x-access-token"]).toBeUndefined();
  });

  it("includes an optional 2FA access token without adding it to the signature contract", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      symbol: "TSLA",
      result: [{ time: "1788177423265", price: "346.6321", volume: "1", side: "N" }],
    }), { status: 200 })) as unknown as typeof fetch;
    await probeWebullMarketData(fetchImpl, {
      appKey: "app-key",
      appSecret: "app-secret",
      accessToken: "active-2fa-token",
      now: () => new Date(1788177425265),
      nonce: () => "fixed-nonce",
    });
    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.headers["x-access-token"]).toBe("active-2fa-token");
    expect(init.headers["x-signature"]).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("maps HTTP 401 to auth uncertainty without leaking response bodies or secrets", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("secret provider detail", { status: 401 })) as unknown as typeof fetch;
    const cert = await probeWebullMarketData(fetchImpl, {
      appKey: "app-key",
      appSecret: "app-secret",
      now: () => new Date("2026-08-31T12:00:00Z"),
      nonce: () => "fixed-nonce",
    });
    const ticks = cert.rows.find((row) => row.capability === "TICKS")!;
    expect(ticks.status).toBe("BLOCKED_AUTH");
    expect(ticks.note).toMatch(/no 2FA access token is configured/i);
    expect(JSON.stringify(cert)).not.toContain("app-secret");
    expect(JSON.stringify(cert)).not.toContain("secret provider detail");
  });

  it("distinguishes a configured but rejected Webull access token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("token rejected", { status: 401 })) as unknown as typeof fetch;
    const cert = await probeWebullMarketData(fetchImpl, {
      appKey: "app-key",
      appSecret: "app-secret",
      accessToken: "expired-token",
      now: () => new Date("2026-08-31T12:00:00Z"),
      nonce: () => "fixed-nonce",
    });
    const ticks = cert.rows.find((row) => row.capability === "TICKS")!;
    expect(ticks.status).toBe("BLOCKED_AUTH");
    expect(ticks.note).toMatch(/access token configured/i);
    expect(JSON.stringify(cert)).not.toContain("expired-token");
  });

  it("does not relabel an unproven HTTP 403 as auth or entitlement", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("subscription maybe", { status: 403 })) as unknown as typeof fetch;
    const cert = await probeWebullMarketData(fetchImpl, {
      appKey: "app-key",
      appSecret: "app-secret",
      now: () => new Date("2026-08-31T12:00:00Z"),
      nonce: () => "fixed-nonce",
    });
    const ticks = cert.rows.find((row) => row.capability === "TICKS")!;
    expect(ticks.status).toBe("NOT_IMPLEMENTED");
    expect(ticks.note).toMatch(/failed edge .* not proven/i);
    expect(ticks.note).not.toMatch(/delayed/i);
    expect(JSON.stringify(cert)).not.toContain("subscription maybe");
  });

  it.each([
    [429, "RATE_LIMITED"],
    [500, "PROVIDER_ERROR"],
    [503, "PROVIDER_ERROR"],
  ] as const)("maps HTTP %i to exact runtime state %s", async (status, state) => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("provider detail", { status })) as unknown as typeof fetch;
    const result = await (await import("./webullMarketData")).fetchWebullTickSnapshot(fetchImpl, {
      appKey: "app-key",
      appSecret: "app-secret",
      now: () => new Date("2026-08-31T12:00:00Z"),
      nonce: () => "fixed-nonce",
    });
    expect(result.state).toBe(state);
    expect(JSON.stringify(result)).not.toContain("provider detail");
  });

  it("distinguishes no events from stale events and exposes neither as current", async () => {
    const { fetchWebullTickSnapshot } = await import("./webullMarketData");
    const noEvents = await fetchWebullTickSnapshot(
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ symbol: "TSLA", result: [] }), { status: 200 })) as unknown as typeof fetch,
      { appKey: "k", appSecret: "s", now: () => new Date(1788177425265), nonce: () => "n" },
    );
    expect(noEvents).toMatchObject({ state: "NO_EVENTS", ticks: [] });

    const stale = await fetchWebullTickSnapshot(
      vi.fn().mockResolvedValue(new Response(JSON.stringify({
        symbol: "TSLA",
        result: [{ time: "1788177300000", price: "346.63", volume: "2", side: "N" }],
      }), { status: 200 })) as unknown as typeof fetch,
      { appKey: "k", appSecret: "s", now: () => new Date(1788177425265), nonce: () => "n", maxTickAgeMs: 60_000 },
    );
    expect(stale).toMatchObject({ state: "STALE", ticks: [] });
    expect(stale.note).toMatch(/provider timestamp/i);
  });

  it("rejects malformed envelopes and future provider clocks", async () => {
    const { fetchWebullTickSnapshot } = await import("./webullMarketData");
    const malformed = await fetchWebullTickSnapshot(
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ unexpected: [] }), { status: 200 })) as unknown as typeof fetch,
      { appKey: "k", appSecret: "s", now: () => new Date(1788177425265), nonce: () => "n" },
    );
    expect(malformed).toMatchObject({ state: "PROVIDER_ERROR", ticks: [] });

    const future = await fetchWebullTickSnapshot(
      vi.fn().mockResolvedValue(new Response(JSON.stringify({
        symbol: "TSLA",
        result: [{ time: String(1788177425265 + 6_000), price: "346.63", volume: "2", side: "N" }],
      }), { status: 200 })) as unknown as typeof fetch,
      { appKey: "k", appSecret: "s", now: () => new Date(1788177425265), nonce: () => "n" },
    );
    expect(future).toMatchObject({ state: "CLOCK_INVALID", ticks: [] });
  });

  it("aborts a hung provider read and reports timeout truth", async () => {
    const { fetchWebullTickSnapshot } = await import("./webullMarketData");
    const fetchImpl = vi.fn((_url: URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    })) as unknown as typeof fetch;
    const result = await fetchWebullTickSnapshot(fetchImpl, {
      appKey: "k",
      appSecret: "s",
      nonce: () => "n",
      timeoutMs: 250,
    });
    expect(result).toMatchObject({ state: "TIMEOUT", ticks: [] });
  });
});
