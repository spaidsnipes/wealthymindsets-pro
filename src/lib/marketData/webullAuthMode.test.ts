/**
 * "IS A SESSION TOKEN REQUIRED AT ALL?" — the question the SDK asks first
 * (`client_initializer.py` → `/openapi/config` → `token_check_enabled`) and
 * WM Pro never asked. These laws pin the three answers and the one owner.
 */

import { describe, expect, it, vi } from "vitest";

import {
  WEBULL_AUTH_MODES,
  cachedWebullAuthModeReader,
  parseTokenCheckEnabled,
  readWebullAuthMode,
  type WebullAuthModeReader,
} from "./webullAuthMode";
import {
  TOKEN_DISPOSITIONS,
  ensureWebullAccessToken,
  inMemoryTokenStore,
  type WebullAccessToken,
} from "./webullAccessToken";
import { WEBULL_SDK_CONTRACT } from "./webullSdkContract";
import { probeWebullBrokerConnection } from "@/lib/broker/adapters/webullBrokerConnection";

const NOW = Date.UTC(2026, 8, 26, 3, 0, 0);
const keys = { appKey: "key", appSecret: "secret", now: () => new Date(NOW), nonce: () => "n" };

const answering = (body: unknown, status = 200) =>
  vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

const reader = (mode: (typeof WEBULL_AUTH_MODES)[keyof typeof WEBULL_AUTH_MODES]): WebullAuthModeReader =>
  vi.fn(async () => ({ mode, note: `mode ${mode}`, observedAtMs: NOW }));

const held = (over: Partial<WebullAccessToken> = {}): WebullAccessToken => ({
  token: "held-session",
  status: "NORMAL",
  expiresAtMs: NOW + 6 * 3600_000,
  expiryInterpretation: "EPOCH_MILLIS",
  observedAtMs: NOW - 60_000,
  ...over,
});

describe("token_check_enabled is read strictly", () => {
  it("accepts booleans and 1/0 only", () => {
    expect(parseTokenCheckEnabled({ token_check_enabled: true })).toBe(true);
    expect(parseTokenCheckEnabled({ token_check_enabled: false })).toBe(false);
    expect(parseTokenCheckEnabled({ token_check_enabled: 1 })).toBe(true);
    expect(parseTokenCheckEnabled({ token_check_enabled: 0 })).toBe(false);
  });

  it("refuses to guess — an absent field or a string is null, never 'off'", () => {
    // The SDK defaults an absent key to False. WM Pro will not: a renamed or
    // wrapped response must never silently drop a credential.
    expect(parseTokenCheckEnabled({})).toBeNull();
    expect(parseTokenCheckEnabled({ token_check_enabled: "false" })).toBeNull();
    expect(parseTokenCheckEnabled({ data: { token_check_enabled: false } })).toBeNull();
    expect(parseTokenCheckEnabled([{ token_check_enabled: false }])).toBeNull();
    expect(parseTokenCheckEnabled(null)).toBeNull();
  });
});

describe("readWebullAuthMode asks /openapi/config, signed, exactly as the SDK does", () => {
  it("sends one signed GET to the contract path and never a token", async () => {
    const fetchImpl = answering({ token_check_enabled: true });
    const reading = await readWebullAuthMode(fetchImpl as unknown as typeof fetch, keys);
    expect(reading.mode).toBe(WEBULL_AUTH_MODES.TOKEN_REQUIRED);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://api.webull.com${WEBULL_SDK_CONTRACT.APP_CONFIG.path}`);
    expect(init.method).toBe("GET");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-app-key"]).toBe("key");
    expect(headers["x-version"]).toBe(WEBULL_SDK_CONTRACT.APP_CONFIG.apiVersion);
    expect(headers["x-signature"]).toBeTruthy();
    expect(headers["x-access-token"]).toBeUndefined();
    expect(JSON.stringify(headers)).not.toContain("secret");
  });

  it("2FA off reads TOKENLESS and tells the Founder there is nothing to keep alive", async () => {
    const reading = await readWebullAuthMode(answering({ token_check_enabled: false }) as unknown as typeof fetch, keys);
    expect(reading.mode).toBe(WEBULL_AUTH_MODES.TOKENLESS);
    expect(reading.note).toContain("2FA is OFF");
  });

  it("2FA on names the switch that removes the phone step", async () => {
    const reading = await readWebullAuthMode(answering({ token_check_enabled: true }) as unknown as typeof fetch, keys);
    expect(reading.note).toContain("Enable 2FA Verification");
  });

  it("a refusal, an unreadable body or no answer is UNKNOWN — never TOKENLESS", async () => {
    const refused = await readWebullAuthMode(answering({ code: "NOPE" }, 403) as unknown as typeof fetch, keys);
    expect(refused).toMatchObject({ mode: WEBULL_AUTH_MODES.UNKNOWN, httpStatus: 403 });
    expect(refused.note).toContain("NOPE");
    const unreadable = await readWebullAuthMode(answering({ something: 1 }) as unknown as typeof fetch, keys);
    expect(unreadable.mode).toBe(WEBULL_AUTH_MODES.UNKNOWN);
    const offline = await readWebullAuthMode(vi.fn(async () => { throw new Error("down"); }) as unknown as typeof fetch, keys);
    expect(offline.mode).toBe(WEBULL_AUTH_MODES.UNKNOWN);
  });

  it("asks nothing without both keys", async () => {
    const fetchImpl = answering({ token_check_enabled: false });
    const reading = await readWebullAuthMode(fetchImpl as unknown as typeof fetch, { ...keys, appSecret: " " });
    expect(reading.mode).toBe(WEBULL_AUTH_MODES.UNKNOWN);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("the cached reader asks Webull once per few minutes, per transport", () => {
  it("serves a definite answer for the TTL, then asks again", async () => {
    let t = NOW;
    const cfg = { ...keys, now: () => new Date(t) };
    const inner = vi.fn(async () => ({ mode: WEBULL_AUTH_MODES.TOKENLESS, note: "", observedAtMs: t }));
    const cached = cachedWebullAuthModeReader(inner, 300_000, 60_000);
    const f = vi.fn() as unknown as typeof fetch;
    await cached(f, cfg);
    t += 299_000;
    await cached(f, cfg);
    expect(inner).toHaveBeenCalledTimes(1);
    t += 2_000;
    await cached(f, cfg);
    expect(inner).toHaveBeenCalledTimes(2);
  });

  it("retries an UNKNOWN answer sooner", async () => {
    let t = NOW;
    const cfg = { ...keys, now: () => new Date(t) };
    const inner = vi.fn(async () => ({ mode: WEBULL_AUTH_MODES.UNKNOWN, note: "", observedAtMs: t }));
    const cached = cachedWebullAuthModeReader(inner, 300_000, 60_000);
    const f = vi.fn() as unknown as typeof fetch;
    await cached(f, cfg);
    t += 61_000;
    await cached(f, cfg);
    expect(inner).toHaveBeenCalledTimes(2);
  });

  it("never lends one transport's answer to another", async () => {
    const inner = vi.fn(async () => ({ mode: WEBULL_AUTH_MODES.TOKENLESS, note: "", observedAtMs: NOW }));
    const cached = cachedWebullAuthModeReader(inner);
    await cached(vi.fn() as unknown as typeof fetch, keys);
    await cached(vi.fn() as unknown as typeof fetch, keys);
    expect(inner).toHaveBeenCalledTimes(2);
  });
});

describe("the one token owner obeys the answer", () => {
  it("2FA off + a dead session: NOT_REQUIRED, no token, and nothing minted", async () => {
    for (const status of ["INVALID", "EXPIRED", "PENDING"] as const) {
      const fetchImpl = answering({ token: "fresh", expires: NOW + 3600_000, status: "PENDING" });
      const store = inMemoryTokenStore(held({ status }));
      const result = await ensureWebullAccessToken(
        fetchImpl as unknown as typeof fetch,
        { ...keys, authModeReader: reader(WEBULL_AUTH_MODES.TOKENLESS) },
        store,
      );
      expect(result).toMatchObject({ token: null, disposition: TOKEN_DISPOSITIONS.NOT_REQUIRED, minted: false });
      expect(fetchImpl, status).not.toHaveBeenCalled();
      expect((await store.read())?.status).toBe(status);
    }
  });

  it("2FA off + nothing held: NOT_REQUIRED, and no SMS is ever sent", async () => {
    const fetchImpl = answering({ token: "fresh", expires: NOW + 3600_000, status: "PENDING" });
    const result = await ensureWebullAccessToken(
      fetchImpl as unknown as typeof fetch,
      { ...keys, authModeReader: reader(WEBULL_AUTH_MODES.TOKENLESS) },
      inMemoryTokenStore(null),
    );
    expect(result.disposition).toBe(TOKEN_DISPOSITIONS.NOT_REQUIRED);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("a living session is served without asking — it works in either mode", async () => {
    const ask = reader(WEBULL_AUTH_MODES.TOKENLESS);
    const result = await ensureWebullAccessToken(
      answering({}) as unknown as typeof fetch,
      { ...keys, authModeReader: ask },
      inMemoryTokenStore(held()),
    );
    expect(result.token?.token).toBe("held-session");
    expect(ask).not.toHaveBeenCalled();
  });

  it("UNKNOWN keeps the token path exactly as it was: a dead session is replaced", async () => {
    const fetchImpl = answering({ token: "fresh", expires: NOW + 3600_000, status: "NORMAL" });
    const result = await ensureWebullAccessToken(
      fetchImpl as unknown as typeof fetch,
      { ...keys, authModeReader: reader(WEBULL_AUTH_MODES.UNKNOWN) },
      inMemoryTokenStore(held({ status: "INVALID" })),
    );
    expect(result.minted).toBe(true);
    expect(new URL(String(fetchImpl.mock.calls[0][0])).pathname).toBe(WEBULL_SDK_CONTRACT.CREATE_TOKEN.path);
  });
});

describe("with 2FA off, the broker lane signs with the key pair alone", () => {
  it("reads the account list with no x-access-token and no session minted", async () => {
    const seen: { path: string; token?: string }[] = [];
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      seen.push({
        path: new URL(String(url)).pathname,
        token: (init?.headers as Record<string, string> | undefined)?.["x-access-token"],
      });
      return new Response(JSON.stringify([{ account_id: "a1" }, { account_id: "a2" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const receipt = await probeWebullBrokerConnection(fetchImpl as unknown as typeof fetch, {
      appKey: "key",
      appSecret: "secret",
      apiHost: "api.webull.test",
      now: () => new Date(NOW),
      nonce: () => "fixednonce",
      tokenStore: inMemoryTokenStore(held({ status: "INVALID" })),
      authModeReader: reader(WEBULL_AUTH_MODES.TOKENLESS),
    });
    expect(seen.map((s) => s.path)).toEqual([WEBULL_SDK_CONTRACT.ACCOUNT_LIST.path]);
    expect(seen[0].token).toBeUndefined();
    expect(receipt.state).toBe("CONNECTED");
  });
});
