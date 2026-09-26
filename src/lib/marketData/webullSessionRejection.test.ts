import { describe, expect, it, vi } from "vitest";
import {
  EXPIRY_INTERPRETATIONS,
  TOKEN_DISPOSITIONS,
  WEBULL_TOKEN_STATUSES,
  ensureWebullAccessToken,
  inMemoryTokenStore,
  tokenDisposition,
  type WebullAccessToken,
} from "./webullAccessToken";
import { kvTokenStore, type WebullKvNamespace } from "./webullKvTokenStore";
import {
  SESSION_RETIRE_COOLDOWN_MS,
  classifyWebullAuthAnswer,
  retireRejectedWebullSession,
  type SessionRetirementLedger,
} from "./webullSessionRejection";
import { WEBULL_AUTH_MODES, type WebullAuthModeReader } from "@/lib/marketData/webullAuthMode";
const tokenRequired: WebullAuthModeReader = async () => ({ mode: WEBULL_AUTH_MODES.TOKEN_REQUIRED, note: "2FA on", observedAtMs: 0 });

const NOW = 1_700_000_000_000;

const session = (over: Partial<WebullAccessToken> = {}): WebullAccessToken => ({
  token: "held-session",
  status: WEBULL_TOKEN_STATUSES.NORMAL,
  expiresAtMs: NOW + 6 * 3_600_000,
  expiryInterpretation: EXPIRY_INTERPRETATIONS.EPOCH_MILLIS,
  observedAtMs: NOW,
  ...over,
});

const freshLedger = (): SessionRetirementLedger => ({ lastRetiredAtMs: null });

describe("which Webull answers are about the SESSION", () => {
  it("only INVALID_TOKEN on a non-2xx, with a session sent, is a session rejection", () => {
    expect(classifyWebullAuthAnswer({ httpStatus: 401, providerCode: "INVALID_TOKEN", sessionSent: true })).toBe("SESSION_REJECTED");
    expect(classifyWebullAuthAnswer({ httpStatus: 401, providerCode: "invalid_token ", sessionSent: true })).toBe("SESSION_REJECTED");
    expect(classifyWebullAuthAnswer({ httpStatus: 401, providerCode: "INVALID_TOKEN", sessionSent: false })).toBe("NO_SESSION_SENT");
  });

  it("entitlement, socket-id, capacity, server and uncoded answers never touch the session", () => {
    // Each of these has, at some point in this lane's history, been misread as
    // an auth fact. None of them names the session.
    for (const [httpStatus, providerCode] of [
      [403, "MARKET_DATA_NOT_SUBSCRIBED"],
      [417, "INVALID_SESSION"],
      [429, null],
      [500, null],
      [0, null],
      [401, null], // a bare 401 does not say WHICH edge was refused
      [200, "INVALID_TOKEN"],
    ] as const) {
      expect(classifyWebullAuthAnswer({ httpStatus, providerCode, sessionSent: true })).toBe("NOT_SESSION");
    }
  });
});

describe("retiring a refused session — compare, retire once, then REAUTHORIZE", () => {
  it("retires the exact session Webull refused, so the next ensure MINTS instead of re-sending it", async () => {
    const store = inMemoryTokenStore(session());
    const verdict = await retireRejectedWebullSession(store, {
      answer: "SESSION_REJECTED", rejectedToken: "held-session", nowMs: NOW, ledger: freshLedger(),
    });
    expect(verdict.kind).toBe("REMINT");
    const held = await store.read();
    expect(held?.status).toBe(WEBULL_TOKEN_STATUSES.INVALID);
    expect(tokenDisposition(held, NOW)).toBe(TOKEN_DISPOSITIONS.NEEDS_MINT);

    // End to end through the real seam: the dead session is NOT served again.
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      calls.push(String(url));
      return new Response(JSON.stringify({ token: "fresh-session", expires: NOW + 3_600_000, status: "NORMAL" }), { status: 200 });
    }) as unknown as typeof fetch;
    const ensured = await ensureWebullAccessToken(
      fetchImpl,
      { appKey: "k", appSecret: "s", now: () => new Date(NOW), nonce: () => "n", authModeReader: tokenRequired },
      store,
    );
    expect(ensured.minted).toBe(true);
    expect(ensured.token?.token).toBe("fresh-session");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("/auth/tokens/create");
  });

  it("without the retirement, the same dead session would be served again (the loop this closes)", async () => {
    const store = inMemoryTokenStore(session());
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const ensured = await ensureWebullAccessToken(
      fetchImpl, { appKey: "k", appSecret: "s", now: () => new Date(NOW) }, store,
    );
    expect(ensured.minted).toBe(false);
    expect(ensured.token?.token).toBe("held-session");
  });

  it("never clobbers a session it did not see refused (another request already re-minted)", async () => {
    const store = inMemoryTokenStore(session({ token: "newer-session" }));
    const verdict = await retireRejectedWebullSession(store, {
      answer: "SESSION_REJECTED", rejectedToken: "held-session", nowMs: NOW, ledger: freshLedger(),
    });
    expect(verdict.kind).toBe("ALREADY_REPLACED");
    expect((await store.read())?.status).toBe(WEBULL_TOKEN_STATUSES.NORMAL);
  });

  it("does nothing for answers that are not about the session", async () => {
    const store = inMemoryTokenStore(session());
    const write = vi.spyOn(store, "write");
    for (const answer of ["NOT_SESSION", "NO_SESSION_SENT"] as const) {
      const verdict = await retireRejectedWebullSession(store, { answer, rejectedToken: "held-session", nowMs: NOW, ledger: freshLedger() });
      expect(verdict.kind).toBe("NOT_SESSION");
    }
    expect(write).not.toHaveBeenCalled();
  });

  it("a freshly minted session refused again inside the cooldown is REAUTHORIZE — no third mint, no prompt storm", async () => {
    const ledger = freshLedger();
    const store = inMemoryTokenStore(session());
    expect((await retireRejectedWebullSession(store, { answer: "SESSION_REJECTED", rejectedToken: "held-session", nowMs: NOW, ledger })).kind).toBe("REMINT");

    // The lane re-mints; Webull refuses the NEW session two minutes later.
    await store.write(session({ token: "second-session" }));
    const second = await retireRejectedWebullSession(store, {
      answer: "SESSION_REJECTED", rejectedToken: "second-session", nowMs: NOW + 120_000, ledger,
    });
    expect(second.kind).toBe("REAUTHORIZE");
    // Held, not retired: nothing re-mints behind the Founder's back.
    expect((await store.read())?.status).toBe(WEBULL_TOKEN_STATUSES.NORMAL);

    // After the window, one more automatic re-mint is allowed.
    const later = await retireRejectedWebullSession(store, {
      answer: "SESSION_REJECTED", rejectedToken: "second-session", nowMs: NOW + SESSION_RETIRE_COOLDOWN_MS + 1, ledger,
    });
    expect(later.kind).toBe("REMINT");
  });

  it("the retirement survives the durable KV store round trip (it is Webull's own INVALID status)", async () => {
    const backing = new Map<string, string>();
    const kv: WebullKvNamespace = {
      get: async (key) => backing.get(key) ?? null,
      put: async (key, value) => { backing.set(key, value); },
    };
    const store = kvTokenStore(kv, () => new Date(NOW));
    await store.write(session());
    const verdict = await retireRejectedWebullSession(store, {
      answer: "SESSION_REJECTED", rejectedToken: "held-session", nowMs: NOW, ledger: freshLedger(),
    });
    expect(verdict.kind).toBe("REMINT");
    expect(tokenDisposition(await store.read(), NOW)).toBe(TOKEN_DISPOSITIONS.NEEDS_MINT);
  });

  it("no verdict note ever carries the session value", async () => {
    const ledger = freshLedger();
    const store = inMemoryTokenStore(session());
    const notes = [
      await retireRejectedWebullSession(store, { answer: "SESSION_REJECTED", rejectedToken: "held-session", nowMs: NOW, ledger }),
      await retireRejectedWebullSession(store, { answer: "SESSION_REJECTED", rejectedToken: "tok-Q7x", nowMs: NOW, ledger }),
      await retireRejectedWebullSession(inMemoryTokenStore(session()), { answer: "SESSION_REJECTED", rejectedToken: "held-session", nowMs: NOW + 1, ledger }),
    ].map((verdict) => verdict.note);
    for (const note of notes) expect(note).not.toMatch(/held-session|tok-Q7x/);
  });
});
