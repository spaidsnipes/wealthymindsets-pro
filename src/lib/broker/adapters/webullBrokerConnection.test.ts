import { afterEach, describe, expect, it, vi } from "vitest";
import {
  probeWebullBrokerConnection,
  webullBrokerConfigFromEnv,
} from "./webullBrokerConnection";
import {
  EXPIRY_INTERPRETATIONS,
  WEBULL_TOKEN_STATUSES,
  inMemoryTokenStore,
  type WebullAccessToken,
} from "@/lib/marketData/webullAccessToken";

/**
 * `mintSession: false` is stated OUT LOUD in these fixtures rather than
 * inherited silently. Every one of these cases is about the account-list
 * request itself, and a test that also minted a session would be measuring two
 * round trips while asserting on one. The minting behaviour has its own
 * describe block below.
 */
const config = {
  appKey: "test-app-key",
  appSecret: "test-app-secret",
  apiHost: "api.webull.test",
  now: () => new Date("2026-09-02T08:00:00.000Z"),
  nonce: () => "fixednonce",
  mintSession: false,
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
    expect(headers).toMatchObject({
      "x-signature": "cmSClhmGvEzqBUc/jXwOKqSfT7g=",
      "x-signature-algorithm": "HMAC-SHA1", "x-signature-version": "1.0",
      "x-signature-nonce": "fixednonce", "x-timestamp": "2026-09-02T08:00:00Z", "x-version": "v2",
    });
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

/**
 * The three-month defect, locked shut.
 *
 * WM Pro read `WEBULL_ACCESS_TOKEN` out of the environment and sent whatever
 * was sitting there. Webull's token expires and is 2FA-gated, so that value
 * went stale on its own and every rung answered 401 — including this one,
 * which needs no market-data package at all. The Founder was then told to
 * check his credentials and his subscription, and re-pasting appeared to fix
 * it until the next expiry.
 */
describe("the account lane carries a LIVING session, not a pasted one", () => {
  const minting = {
    appKey: "test-app-key",
    appSecret: "test-app-secret",
    apiHost: "api.webull.test",
    now: () => new Date("2026-09-02T08:00:00.000Z"),
    nonce: () => "fixednonce",
  };
  const nowMs = new Date("2026-09-02T08:00:00.000Z").getTime();

  const storedToken = (over: Partial<WebullAccessToken> = {}): WebullAccessToken => ({
    token: "minted-session-value",
    status: WEBULL_TOKEN_STATUSES.NORMAL,
    expiresAtMs: nowMs + 60 * 60_000,
    expiryInterpretation: EXPIRY_INTERPRETATIONS.EPOCH_MILLIS,
    observedAtMs: nowMs,
    ...over,
  });

  it("sends the stored session and does not go minting when one is still good", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([
      { account_id: "private-1", account_type: "MARGIN" },
    ]), { status: 200 }));
    const receipt = await probeWebullBrokerConnection(fetchImpl as unknown as typeof fetch, {
      ...minting, tokenStore: inMemoryTokenStore(storedToken()),
    });
    expect(receipt.state).toBe("CONNECTED");
    // One round trip: the account read. No mint, because none was needed.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = (fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>)[0];
    expect((init.headers as Record<string, string>)["x-access-token"]).toBe("minted-session-value");
  });

  it("does NOT let a stale env token override a freshly minted session", async () => {
    // This is the exact swap that kept the loop alive: a value the Founder
    // pasted months ago outranking the one WM Pro can mint on demand.
    const fetchImpl = vi.fn(async () => new Response("[]", { status: 200 }));
    await probeWebullBrokerConnection(fetchImpl as unknown as typeof fetch, {
      ...minting, accessToken: "stale-pasted-token", tokenStore: inMemoryTokenStore(storedToken()),
    });
    const [, init] = (fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>)[0];
    expect((init.headers as Record<string, string>)["x-access-token"]).toBe("minted-session-value");
  });

  it("reports a 2FA tap as a 2FA tap — and never sends the request", async () => {
    // A PENDING session would earn a 401, and the old code called that a
    // credential fault. The Founder's actual next action is one tap in the
    // Webull app; anything else sends him shopping for a subscription.
    // Answers the session check with "still PENDING", so the lane stays in the
    // 2FA state and the account request below must still never be sent.
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ token: "t", expires: 3600, status: "PENDING" }), { status: 200 }));
    const receipt = await probeWebullBrokerConnection(fetchImpl as unknown as typeof fetch, {
      ...minting,
      tokenStore: inMemoryTokenStore(storedToken({ status: WEBULL_TOKEN_STATUSES.PENDING })),
    });
    // Its OWN state, not BLOCKED_AUTH. The two have opposite next actions —
    // "tap approve" vs "inspect a credential" — and a surface that cannot tell
    // them apart can only render the wrong one of those sentences.
    expect(receipt.state).toBe("AWAITING_2FA");
    expect(receipt.connected).toBe(false);
    expect(receipt.note).toMatch(/webull app/i);
    expect(receipt.note).toMatch(/2fa/i);
    // "Never sends THE request" means the ACCOUNT request — the one that would
    // earn a 401 and get narrated as a credential fault. Asking Webull whether
    // the tap landed is a different question and must still be asked, or the
    // Founder's approval has no route into this runtime at all.
    const paths = fetchImpl.mock.calls.map((c) => String((c as unknown[])[0]));
    expect(paths).toEqual(["https://api.webull.test/auth/tokens/check"]);
    expect(paths.some((p) => p.includes("/trading/accounts/list"))).toBe(false);
  });

  it("never blames a subscription or a missing secret when a 401 comes back", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 401 }));
    const receipt = await probeWebullBrokerConnection(fetchImpl as unknown as typeof fetch, {
      ...minting, tokenStore: inMemoryTokenStore(storedToken()),
    });
    expect(receipt.state).toBe("BLOCKED_AUTH");
    expect(receipt.note).not.toMatch(/subscri|entitle|market data|paste|verify the openapi key pair/i);
  });

  it("never leaks the session value into anything a surface can render", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 401 }));
    const receipt = await probeWebullBrokerConnection(fetchImpl as unknown as typeof fetch, {
      ...minting, tokenStore: inMemoryTokenStore(storedToken()),
    });
    expect(JSON.stringify(receipt)).not.toContain("minted-session-value");
    expect(JSON.stringify(receipt)).not.toContain("test-app-secret");
  });

  /**
   * GARDEN 11 — the account lane must not re-send a session Webull refused.
   * Measured shape: every rung 401 INVALID_TOKEN while the store still held
   * the session as NORMAL-and-unexpired. The next probe must MINT.
   */
  it("retires a session Webull refused with INVALID_TOKEN, so the next probe mints instead of re-sending it", async () => {
    const store = inMemoryTokenStore(storedToken());
    const refused = vi.fn(async () => new Response(JSON.stringify({ code: "INVALID_TOKEN" }), { status: 401 }));
    const first = await probeWebullBrokerConnection(refused as unknown as typeof fetch, { ...minting, tokenStore: store });
    expect(first.state).toBe("BLOCKED_AUTH");
    expect((await store.read())?.status).toBe(WEBULL_TOKEN_STATUSES.INVALID);
    expect(JSON.stringify(first)).not.toContain("minted-session-value");

    const urls: string[] = [];
    const healthy = vi.fn(async (url: RequestInfo | URL) => {
      urls.push(String(url));
      return String(url).includes("/auth/tokens/create")
        ? new Response(JSON.stringify({ token: "fresh-session", expires: nowMs + 3_600_000, status: "NORMAL" }), { status: 200 })
        : new Response(JSON.stringify([{ account_id: "private-1", account_type: "MARGIN" }]), { status: 200 });
    });
    const second = await probeWebullBrokerConnection(healthy as unknown as typeof fetch, { ...minting, tokenStore: store });
    expect(urls[0]).toContain("/auth/tokens/create");
    expect(second.state).toBe("CONNECTED");
  });

  it("keeps the session on a 401 that does not name it", async () => {
    const store = inMemoryTokenStore(storedToken());
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 401 }));
    await probeWebullBrokerConnection(fetchImpl as unknown as typeof fetch, { ...minting, tokenStore: store });
    expect((await store.read())?.status).toBe(WEBULL_TOKEN_STATUSES.NORMAL);
  });

  it("mints when the store is empty rather than asking anyone for a value", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) =>
      String(url).includes("/auth/tokens/create")
        ? new Response(JSON.stringify({ data: { access_token: "fresh", expires: nowMs + 3_600_000, status: 1 } }), { status: 200 })
        : new Response(JSON.stringify([{ account_id: "private-1", account_type: "MARGIN" }]), { status: 200 }));
    const receipt = await probeWebullBrokerConnection(fetchImpl as unknown as typeof fetch, {
      ...minting, tokenStore: inMemoryTokenStore(null),
    });
    const urls = (fetchImpl.mock.calls as unknown as Array<[string]>).map(([u]) => String(u));
    expect(urls[0]).toContain("/auth/tokens/create");
    expect(urls[1]).toContain("/trading/accounts/list");
    expect(receipt.state).toBe("CONNECTED");
  });
});
