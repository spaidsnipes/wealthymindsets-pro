/**
 * THE KEEPER'S LAWS — the one that matters most is the one it must never break:
 * a scheduled job may not start a Webull session, because every start pages a
 * human for a 2FA approval.
 */

import { describe, expect, it, vi } from "vitest";

import { inMemoryTokenStore, type WebullAccessToken } from "./webullAccessToken";
import {
  KEEPER_OUTCOMES,
  KEEPER_REFRESH_MARGIN_MS,
  keepWebullSessionAlive,
} from "./webullSessionKeeper";
import { WEBULL_SDK_CONTRACT } from "./webullSdkContract";
import { WEBULL_AUTH_MODES, type WebullAuthModeReader } from "./webullAuthMode";

const NOW = Date.UTC(2026, 8, 25, 8, 0, 0);
const reading = (mode: (typeof WEBULL_AUTH_MODES)[keyof typeof WEBULL_AUTH_MODES]): WebullAuthModeReader =>
  async () => ({ mode, note: `mode ${mode}`, observedAtMs: NOW });
// 2FA ON — the mode every session law below is about.
const config = { appKey: "key", appSecret: "secret", now: () => new Date(NOW), nonce: () => "n", authModeReader: reading(WEBULL_AUTH_MODES.TOKEN_REQUIRED) };

const token = (over: Partial<WebullAccessToken> = {}): WebullAccessToken => ({
  token: "held",
  status: "NORMAL",
  expiresAtMs: NOW + 6 * 3600_000,
  expiryInterpretation: "EPOCH_MILLIS",
  observedAtMs: NOW - 60_000,
  ...over,
});

const answering = (body: unknown, status = 200) =>
  vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

const paths = (fetchImpl: ReturnType<typeof vi.fn>) =>
  fetchImpl.mock.calls.map(([url]) => new URL(String(url)).pathname);

describe("THE KEEPER NEVER STARTS A SESSION", () => {
  it("does not call CREATE when nothing is held — a start pages a human", async () => {
    const fetchImpl = answering({ token: "new", expires: NOW + 3600_000, status: "PENDING" });
    const result = await keepWebullSessionAlive(fetchImpl as unknown as typeof fetch, config, inMemoryTokenStore());
    expect(result.outcome).toBe(KEEPER_OUTCOMES.REAUTH_REQUIRED);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("does not call CREATE when Webull marked the session INVALID", async () => {
    const fetchImpl = answering({});
    const store = inMemoryTokenStore(token({ status: "INVALID" }));
    const result = await keepWebullSessionAlive(fetchImpl as unknown as typeof fetch, config, store);
    expect(result.outcome).toBe(KEEPER_OUTCOMES.REAUTH_REQUIRED);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("never touches the CREATE path in any branch", async () => {
    const create = WEBULL_SDK_CONTRACT.CREATE_TOKEN.path;
    const cases: WebullAccessToken[] = [
      token(),
      token({ expiresAtMs: NOW + 60_000 }),
      token({ expiresAtMs: NOW - 60_000 }),
      token({ status: "PENDING" }),
      token({ status: "EXPIRED" }),
      token({ expiresAtMs: undefined, expiryInterpretation: "UNINTERPRETABLE" }),
    ];
    for (const held of cases) {
      const fetchImpl = answering({ code: "NOPE" }, 401);
      await keepWebullSessionAlive(fetchImpl as unknown as typeof fetch, config, inMemoryTokenStore(held));
      expect(paths(fetchImpl), held.status).not.toContain(create);
    }
  });
});

describe("a living session is kept living without asking anyone", () => {
  it("leaves a session alone when it outlives three runs — after Webull confirms it, with CHECK only", async () => {
    const fetchImpl = answering({ token: "held", expires: NOW + 6 * 3600_000, status: "NORMAL" });
    const result = await keepWebullSessionAlive(
      fetchImpl as unknown as typeof fetch,
      config,
      inMemoryTokenStore(token({ expiresAtMs: NOW + KEEPER_REFRESH_MARGIN_MS + 60_000 })),
    );
    expect(result.outcome).toBe(KEEPER_OUTCOMES.STILL_FRESH);
    expect(paths(fetchImpl)).toEqual([WEBULL_SDK_CONTRACT.CHECK_TOKEN.path]);
    expect(result.note).toContain("Webull confirmed it");
    expect(result.expiresInMs).toBe(KEEPER_REFRESH_MARGIN_MS + 60_000);
    expect(result.authMode).toBe(WEBULL_AUTH_MODES.TOKEN_REQUIRED);
  });

  it("records the moment Webull kills a session its stored clock still calls live", async () => {
    const fetchImpl = answering({ token: "held", expires: 0, status: "INVALID" });
    const store = inMemoryTokenStore(token({ expiresAtMs: NOW + 14 * 24 * 3600_000 }));
    const result = await keepWebullSessionAlive(fetchImpl as unknown as typeof fetch, config, store);
    expect(result.outcome).toBe(KEEPER_OUTCOMES.REAUTH_REQUIRED);
    expect(result.note).toContain("INVALID");
    expect((await store.read())?.status).toBe("INVALID");
    expect(paths(fetchImpl)).not.toContain(WEBULL_SDK_CONTRACT.CREATE_TOKEN.path);
  });

  it("keeps a live session STILL_FRESH when Webull cannot be asked — silence is not a death", async () => {
    const fetchImpl = vi.fn(async () => { throw new Error("offline"); });
    const store = inMemoryTokenStore(token({ expiresAtMs: NOW + KEEPER_REFRESH_MARGIN_MS + 60_000 }));
    const result = await keepWebullSessionAlive(fetchImpl as unknown as typeof fetch, config, store);
    expect(result.outcome).toBe(KEEPER_OUTCOMES.STILL_FRESH);
    expect(result.note).toContain("could not confirm");
    expect((await store.read())?.status).toBe("NORMAL");
  });

  it("REFRESHES inside the margin, on the refresh path, and stores the result", async () => {
    const renewed = NOW + 12 * 3600_000;
    const fetchImpl = answering({ token: "renewed", expires: renewed, status: "NORMAL" });
    const store = inMemoryTokenStore(token({ expiresAtMs: NOW + 10 * 60_000 }));
    const result = await keepWebullSessionAlive(fetchImpl as unknown as typeof fetch, config, store);
    expect(result.outcome).toBe(KEEPER_OUTCOMES.REFRESHED);
    expect(paths(fetchImpl)).toEqual([WEBULL_SDK_CONTRACT.REFRESH_TOKEN.path]);
    expect((await store.read())?.token).toBe("renewed");
    expect(result.expiresInMs).toBe(renewed - NOW);
  });

  it("tries to EXTEND a NORMAL session whose clock just ran out — a refresh asks no human", async () => {
    const fetchImpl = answering({ token: "renewed", expires: NOW + 3600_000, status: "NORMAL" });
    const store = inMemoryTokenStore(token({ expiresAtMs: NOW - 60_000 }));
    const result = await keepWebullSessionAlive(fetchImpl as unknown as typeof fetch, config, store);
    expect(result.outcome).toBe(KEEPER_OUTCOMES.REFRESHED);
  });

  it("names a lapsed session that Webull will not extend as REAUTH_REQUIRED", async () => {
    const fetchImpl = answering({ code: "TOKEN_EXPIRED" }, 401);
    const store = inMemoryTokenStore(token({ expiresAtMs: NOW - 60_000 }));
    const result = await keepWebullSessionAlive(fetchImpl as unknown as typeof fetch, config, store);
    expect(result.outcome).toBe(KEEPER_OUTCOMES.REAUTH_REQUIRED);
  });

  it("names a failed refresh on a still-living session as REFRESH_FAILED and keeps it", async () => {
    const fetchImpl = answering({ code: "BUSY" }, 503);
    const store = inMemoryTokenStore(token({ expiresAtMs: NOW + 10 * 60_000 }));
    const result = await keepWebullSessionAlive(fetchImpl as unknown as typeof fetch, config, store);
    expect(result.outcome).toBe(KEEPER_OUTCOMES.REFRESH_FAILED);
    expect((await store.read())?.token).toBe("held");
    expect(result.expiresInMs).toBe(10 * 60_000);
  });
});

describe("a pending approval is OBSERVED even when nobody is on the site", () => {
  it("asks CHECK and reports APPROVAL_OBSERVED when the tap has landed", async () => {
    const fetchImpl = answering({ token: "held", expires: NOW + 3600_000, status: "NORMAL" });
    const store = inMemoryTokenStore(token({ status: "PENDING" }));
    const result = await keepWebullSessionAlive(fetchImpl as unknown as typeof fetch, config, store);
    expect(paths(fetchImpl)).toEqual([WEBULL_SDK_CONTRACT.CHECK_TOKEN.path]);
    expect(result.outcome).toBe(KEEPER_OUTCOMES.APPROVAL_OBSERVED);
    expect((await store.read())?.status).toBe("NORMAL");
  });

  it("keeps waiting — without re-minting — while the approval has not landed", async () => {
    const fetchImpl = answering({ token: "held", expires: NOW + 3600_000, status: "PENDING" });
    const result = await keepWebullSessionAlive(
      fetchImpl as unknown as typeof fetch,
      config,
      inMemoryTokenStore(token({ status: "PENDING" })),
    );
    expect(result.outcome).toBe(KEEPER_OUTCOMES.AWAITING_2FA);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("what the keeper publishes", () => {
  it("says NOT_CONFIGURED and asks Webull nothing without the two keys", async () => {
    const fetchImpl = answering({});
    const result = await keepWebullSessionAlive(
      fetchImpl as unknown as typeof fetch,
      { ...config, appSecret: "" },
      inMemoryTokenStore(token()),
    );
    expect(result.outcome).toBe(KEEPER_OUTCOMES.NOT_CONFIGURED);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("never puts a token value in its note", async () => {
    const fetchImpl = answering({ token: "renewed-secret-value", expires: NOW + 3600_000, status: "NORMAL" });
    const result = await keepWebullSessionAlive(
      fetchImpl as unknown as typeof fetch,
      config,
      inMemoryTokenStore(token({ token: "held-secret-value", expiresAtMs: NOW + 60_000 })),
    );
    expect(JSON.stringify(result)).not.toMatch(/secret-value/);
  });
});

describe("2FA OFF on the App Key: there is no session to keep", () => {
  it("reports TOKEN_NOT_REQUIRED and asks Webull nothing about tokens, whatever is held", async () => {
    const tokenless = { ...config, authModeReader: reading(WEBULL_AUTH_MODES.TOKENLESS) };
    for (const held of [null, token({ status: "INVALID" }), token({ status: "PENDING" }), token()]) {
      const fetchImpl = answering({ token: "x", expires: NOW + 3600_000, status: "NORMAL" });
      const result = await keepWebullSessionAlive(fetchImpl as unknown as typeof fetch, tokenless, inMemoryTokenStore(held));
      expect(result.outcome).toBe(KEEPER_OUTCOMES.TOKEN_NOT_REQUIRED);
      expect(result.authMode).toBe(WEBULL_AUTH_MODES.TOKENLESS);
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  });

  it("an UNKNOWN answer keeps every session law exactly as it was", async () => {
    const unknown = { ...config, authModeReader: reading(WEBULL_AUTH_MODES.UNKNOWN) };
    const fetchImpl = answering({});
    const result = await keepWebullSessionAlive(fetchImpl as unknown as typeof fetch, unknown, inMemoryTokenStore(token({ status: "INVALID" })));
    expect(result.outcome).toBe(KEEPER_OUTCOMES.REAUTH_REQUIRED);
    expect(result.authMode).toBe(WEBULL_AUTH_MODES.UNKNOWN);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("by default asks Webull's own /openapi/config, signed, before anything else", async () => {
    const fetchImpl = answering({ token_check_enabled: false });
    const { authModeReader: _omit, ...plain } = config;
    const result = await keepWebullSessionAlive(fetchImpl as unknown as typeof fetch, plain, inMemoryTokenStore(null));
    expect(result.outcome).toBe(KEEPER_OUTCOMES.TOKEN_NOT_REQUIRED);
    expect(paths(fetchImpl)).toEqual([WEBULL_SDK_CONTRACT.APP_CONFIG.path]);
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>)["x-app-key"]).toBe("key");
    expect((init.headers as Record<string, string>)["x-access-token"]).toBeUndefined();
  });
});
