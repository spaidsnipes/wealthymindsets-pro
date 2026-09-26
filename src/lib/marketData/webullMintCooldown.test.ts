/**
 * THE FOUNDER'S PHONE IS NOT INFRASTRUCTURE (GP12 §14). Every CREATE texts a
 * code; measured 2026-09-26, each /charts load with a dead session minted one.
 * WM Pro now starts a session on its own at most once per AUTO_MINT_COOLDOWN_MS.
 */

import { describe, expect, it, vi } from "vitest";

import {
  AUTO_MINT_COOLDOWN_MS,
  TOKEN_DISPOSITIONS,
  ensureWebullAccessToken,
  inMemoryTokenStore,
  sessionAwaitsHuman,
  type WebullAccessToken,
} from "./webullAccessToken";
import { WEBULL_AUTH_MODES, type WebullAuthModeReader } from "./webullAuthMode";
import { WEBULL_SDK_CONTRACT } from "./webullSdkContract";
import { WEBULL_AUTO_MINT_KEY, kvTokenStore, type WebullKvNamespace } from "./webullKvTokenStore";
import { probeWebullBrokerConnection } from "@/lib/broker/adapters/webullBrokerConnection";

const T0 = Date.UTC(2026, 8, 26, 3, 30, 0);
const twoFaOn: WebullAuthModeReader = async () => ({ mode: WEBULL_AUTH_MODES.TOKEN_REQUIRED, note: "", observedAtMs: T0 });
const cfg = (nowMs: number) => ({ appKey: "k", appSecret: "s", nonce: () => "n", now: () => new Date(nowMs), authModeReader: twoFaOn });

const answering = (body: unknown, status = 200) =>
  vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
const paths = (f: ReturnType<typeof vi.fn>) => f.mock.calls.map(([u]) => new URL(String(u)).pathname);

const tok = (over: Partial<WebullAccessToken> = {}): WebullAccessToken => ({
  token: "t", status: "INVALID", expiresAtMs: 0, expiryInterpretation: "EPOCH_MILLIS", observedAtMs: T0, ...over,
});

describe("automatic session starts are rationed", () => {
  it("the first dead-session request texts once and stamps the ledger; the next is HELD, no second text", async () => {
    const store = inMemoryTokenStore(tok());
    const first = answering({ token: "p1", expires: T0 + 300_000, status: "PENDING" });
    const a = await ensureWebullAccessToken(first as unknown as typeof fetch, cfg(T0), store);
    expect(paths(first)).toEqual([WEBULL_SDK_CONTRACT.CREATE_TOKEN.path]);
    expect(a.disposition).toBe(TOKEN_DISPOSITIONS.AWAITING_2FA);
    expect(await store.readLastAutoMintAt!()).toBe(T0);

    // Ten minutes later the code was never entered: Webull says EXPIRED.
    const later = answering({ token: "p1", expires: 0, status: "EXPIRED" });
    const b = await ensureWebullAccessToken(later as unknown as typeof fetch, cfg(T0 + 10 * 60_000), store);
    expect(paths(later)).toEqual([WEBULL_SDK_CONTRACT.CHECK_TOKEN.path]);
    expect(b.disposition).toBe(TOKEN_DISPOSITIONS.REAUTH_HELD);
    expect(b.token).toBeNull();
    expect(b.note).toContain("03:30 UTC");
    expect(b.note).toContain("09:30 UTC");
    expect(b.note).toContain("Enable 2FA Verification");

    // And every page load after that inside the window: not even a CHECK texts, nothing CREATEs.
    const again = answering({ token: "p2", expires: T0, status: "PENDING" });
    const c = await ensureWebullAccessToken(again as unknown as typeof fetch, cfg(T0 + 60 * 60_000), store);
    expect(c.disposition).toBe(TOKEN_DISPOSITIONS.REAUTH_HELD);
    expect(paths(again)).not.toContain(WEBULL_SDK_CONTRACT.CREATE_TOKEN.path);
  });

  it("after the cooldown one more automatic start is allowed", async () => {
    const store = inMemoryTokenStore(tok());
    await store.writeLastAutoMintAt!(T0);
    const f = answering({ token: "p9", expires: T0, status: "PENDING" });
    const r = await ensureWebullAccessToken(f as unknown as typeof fetch, cfg(T0 + AUTO_MINT_COOLDOWN_MS), store);
    expect(paths(f)).toEqual([WEBULL_SDK_CONTRACT.CREATE_TOKEN.path]);
    expect(r.minted).toBe(true);
    expect(await store.readLastAutoMintAt!()).toBe(T0 + AUTO_MINT_COOLDOWN_MS);
  });

  it("extending a living session texts nobody and is never throttled", async () => {
    const store = inMemoryTokenStore(tok({ status: "NORMAL", expiresAtMs: T0 + 60_000 }));
    await store.writeLastAutoMintAt!(T0 - 60_000);
    const f = answering({ token: "t", expires: T0 + 14 * 86_400_000, status: "NORMAL" });
    const r = await ensureWebullAccessToken(f as unknown as typeof fetch, cfg(T0), store);
    expect(paths(f)).toEqual([WEBULL_SDK_CONTRACT.REFRESH_TOKEN.path]);
    expect(r.token?.status).toBe("NORMAL");
  });

  it("a CREATE that comes back NORMAL texted nobody, so it does not spend the ration", async () => {
    const store = inMemoryTokenStore(null);
    const f = answering({ token: "n", expires: T0 + 86_400_000, status: "NORMAL" });
    await ensureWebullAccessToken(f as unknown as typeof fetch, cfg(T0), store);
    expect(await store.readLastAutoMintAt!()).toBeNull();
  });

  it("a ledger stamp from the far future is a clock fault, not a permanent block", async () => {
    const store = inMemoryTokenStore(tok());
    await store.writeLastAutoMintAt!(T0 + 3 * AUTO_MINT_COOLDOWN_MS);
    const f = answering({ token: "p", expires: T0, status: "PENDING" });
    const r = await ensureWebullAccessToken(f as unknown as typeof fetch, cfg(T0), store);
    expect(r.minted).toBe(true);
  });

  it("REAUTH_HELD and AWAITING_2FA both mean a human's step; nothing else does", () => {
    expect(sessionAwaitsHuman(TOKEN_DISPOSITIONS.REAUTH_HELD)).toBe(true);
    expect(sessionAwaitsHuman(TOKEN_DISPOSITIONS.AWAITING_2FA)).toBe(true);
    for (const d of [TOKEN_DISPOSITIONS.USABLE, TOKEN_DISPOSITIONS.NEEDS_MINT, TOKEN_DISPOSITIONS.NOT_REQUIRED]) {
      expect(sessionAwaitsHuman(d)).toBe(false);
    }
  });
});

describe("a held lane sends no doomed request", () => {
  it("the account probe stops at REAUTH_HELD — no account request, the note names the step", async () => {
    const store = inMemoryTokenStore(tok());
    await store.writeLastAutoMintAt!(T0 - 60_000);
    const f = answering([{ account_id: "x" }]);
    const receipt = await probeWebullBrokerConnection(f as unknown as typeof fetch, {
      appKey: "k", appSecret: "s", apiHost: "api.webull.test", now: () => new Date(T0), nonce: () => "n",
      tokenStore: store, authModeReader: twoFaOn,
    });
    expect(paths(f)).not.toContain(WEBULL_SDK_CONTRACT.ACCOUNT_LIST.path);
    expect(paths(f)).not.toContain(WEBULL_SDK_CONTRACT.CREATE_TOKEN.path);
    expect(receipt.state).toBe("AWAITING_2FA");
  });
});

describe("the ledger survives the isolate (KV)", () => {
  it("writes and reads the stamp under its own key, and an unreadable one never blocks", async () => {
    const data: Record<string, string> = {};
    const kv: WebullKvNamespace = {
      async get(k) { return k in data ? data[k] : null; },
      async put(k, v) { data[k] = v; },
    };
    const store = kvTokenStore(kv, () => new Date(T0));
    await store.writeLastAutoMintAt!(T0);
    expect(data[WEBULL_AUTO_MINT_KEY]).toBe(String(T0));
    expect(await store.readLastAutoMintAt!()).toBe(T0);
    data[WEBULL_AUTO_MINT_KEY] = "garbage";
    expect(await store.readLastAutoMintAt!()).toBeNull();
  });
});
