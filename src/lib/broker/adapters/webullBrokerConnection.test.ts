import { afterEach, describe, expect, it, vi } from "vitest";
import {
  probeWebullBrokerConnection,
  webullBrokerConfigFromEnv,
} from "./webullBrokerConnection";

const config = {
  appKey: "test-app-key",
  appSecret: "test-app-secret",
  apiHost: "api.webull.test",
  now: () => new Date("2026-09-02T08:00:00.000Z"),
  nonce: () => "fixednonce",
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Webull signed broker connection proof", () => {
  it.each(["headers", "body"])("bounds a stalled %s even if the transport ignores abort", async (edge) => {
    vi.useFakeTimers();
    const never = () => new Promise<never>(() => {});
    const fetchImpl = vi.fn(edge === "headers" ? never : async () => ({
      status: 200, ok: true, json: never,
    }));
    const pending = probeWebullBrokerConnection(fetchImpl as unknown as typeof fetch, { ...config, timeoutMs: 250 });
    await vi.advanceTimersByTimeAsync(250);
    expect(await pending).toMatchObject({ state: "TIMEOUT", connected: false });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cleans up its deadline after a malformed body", async () => {
    vi.useFakeTimers();
    const receipt = await probeWebullBrokerConnection(
      vi.fn(async () => new Response("not json")) as unknown as typeof fetch, config,
    );
    expect(receipt).toMatchObject({ state: "PROVIDER_ERROR", connected: false });
    expect(vi.getTimerCount()).toBe(0);
  });
  it("accepts canonical and legacy key names without exposing values", () => {
    expect(webullBrokerConfigFromEnv({ WEBULL_API_KEY: "k", WEBULL_API_SECRET: "s" })).toMatchObject({ appKey: "k", appSecret: "s" });
  });

  it("fails closed before fetch when the key pair is incomplete", async () => {
    const fetchImpl = vi.fn();
    const receipt = await probeWebullBrokerConnection(fetchImpl as unknown as typeof fetch, { appKey: "only-key" });
    expect(receipt).toMatchObject({ state: "UNCONFIGURED", configured: false, connected: false, accountCount: 0 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("proves account-list access without returning account identifiers", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([
      { account_id: "private-1", account_type: "MARGIN" },
      { account_id: "private-2", account_class: "EVENTS_CASH" },
    ]), { status: 200 }));
    const receipt = await probeWebullBrokerConnection(fetchImpl as unknown as typeof fetch, config);
    expect(receipt).toMatchObject({
      state: "CONNECTED",
      configured: true,
      connected: true,
      accountCount: 2,
      accountTypes: ["MARGIN", "EVENTS_CASH"],
    });
    expect(JSON.stringify(receipt)).not.toContain("private-1");
    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>;
    const [url, init] = calls[0];
    const headers = init.headers as Record<string, string>;
    expect(url).toBe("https://api.webull.test/trading/accounts/list");
    expect(init.method).toBe("GET");
    expect(init.redirect).toBe("manual");
    expect(headers["x-signature"]).toBeTruthy();
    expect(JSON.stringify(headers)).not.toContain("test-app-secret");
  });

  it("does not round an empty account list up to connected", async () => {
    const receipt = await probeWebullBrokerConnection(
      vi.fn(async () => new Response("[]", { status: 200 })) as unknown as typeof fetch,
      config,
    );
    expect(receipt).toMatchObject({ state: "NO_ACCOUNTS", connected: false, accountCount: 0 });
  });

  it.each([301, 302, 303, 307, 308])("does not follow HTTP %i with signed credentials", async (status) => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.redirect).toBe("manual");
      return new Response(null, { status, headers: { Location: "https://untrusted.test/collect" } });
    });
    const receipt = await probeWebullBrokerConnection(fetchImpl as typeof fetch, {
      ...config, accessToken: "test-token",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(receipt).toMatchObject({ state: "UNAVAILABLE", connected: false, accountCount: 0 });
    expect(receipt.note).toContain(`HTTP ${status}`);
    expect(JSON.stringify(receipt)).not.toContain("test-token");
    expect(JSON.stringify(receipt)).not.toContain("untrusted.test");
  });

  it.each([
    [[{}]],
    [{ data: [{ message: "ok" }] }],
    [[{ account_id: "valid-private-id" }, {}]],
    [{ result: [{ account_id: "valid-private-id" }, null] }],
  ])("rejects nonempty envelopes that do not prove an account identifier", async (payload) => {
    const receipt = await probeWebullBrokerConnection(
      vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })) as unknown as typeof fetch,
      config,
    );
    expect(receipt).toMatchObject({ state: "PROVIDER_ERROR", connected: false, accountCount: 0 });
  });

  it.each([
    [401, "BLOCKED_AUTH"],
    [403, "ACCESS_UNPROVEN"],
    [417, "ACCESS_UNPROVEN"],
    [429, "RATE_LIMITED"],
    [500, "PROVIDER_ERROR"],
  ] as const)("maps HTTP %i to %s without claiming entitlement", async (status, state) => {
    const receipt = await probeWebullBrokerConnection(
      vi.fn(async () => new Response("{}", { status })) as unknown as typeof fetch,
      config,
    );
    expect(receipt.state).toBe(state);
    expect(receipt.connected).toBe(false);
    expect(receipt.note.toLowerCase()).not.toContain("entitlement");
  });
});
