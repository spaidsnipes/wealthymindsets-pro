/**
 * The measured loop this store closes, restated so a reader of the TESTS knows
 * what is being protected:
 *
 *   05:02:09  accessToken:true   "Session minted and PENDING your 2FA approval"
 *   -- Founder approves in the Webull app --
 *   05:04:46  accessToken:FALSE  "Session minted and PENDING your 2FA approval"
 *
 * The isolate holding the session he approved was evicted before the next
 * request arrived, so his tap landed on a session that no longer existed. These
 * tests pin the two properties that make that impossible to repeat: a session
 * SURVIVES the store instance, and a storage failure degrades to "nothing held"
 * rather than to an exception in the Founder's request path.
 */
import { describe, expect, it, vi } from "vitest";
import {
  MAX_KV_TTL_SECONDS,
  MIN_KV_TTL_SECONDS,
  WEBULL_SESSION_KEY,
  kvTokenStore,
  kvTtlSeconds,
  type WebullKvNamespace,
} from "./webullKvTokenStore";
import {
  EXPIRY_INTERPRETATIONS,
  WEBULL_TOKEN_STATUSES,
  type WebullAccessToken,
} from "./webullAccessToken";

const NOW_MS = Date.UTC(2026, 8, 21, 5, 2, 9);

/** A KV namespace that actually stores, so a round trip can be observed. */
function fakeKv(seed?: Record<string, string>) {
  const cells = new Map<string, string>(Object.entries(seed ?? {}));
  const puts: Array<{ key: string; value: string; ttl?: number }> = [];
  const kv: WebullKvNamespace = {
    async get(key) {
      return cells.get(key) ?? null;
    },
    async put(key, value, options) {
      cells.set(key, value);
      puts.push({ key, value, ttl: options?.expirationTtl });
    },
  };
  return { kv, cells, puts };
}

function pendingToken(overrides: Partial<WebullAccessToken> = {}): WebullAccessToken {
  return {
    token: "sess-abc",
    status: WEBULL_TOKEN_STATUSES.PENDING,
    expiresAtMs: NOW_MS + 3_600_000,
    expiryInterpretation: EXPIRY_INTERPRETATIONS.EPOCH_MILLIS,
    observedAtMs: NOW_MS,
    ...overrides,
  };
}

describe("kvTokenStore", () => {
  it("hands a session to a store instance that never saw it written", async () => {
    // This is the whole point. The writer stands in for the 05:02 isolate and
    // the reader for the 05:04 one: two objects, no shared memory, one session.
    const { kv } = fakeKv();
    const writer = kvTokenStore(kv, () => new Date(NOW_MS));
    const reader = kvTokenStore(kv, () => new Date(NOW_MS + 157_000));

    await writer.write(pendingToken());
    const recovered = await reader.read();

    expect(recovered?.token).toBe("sess-abc");
    expect(recovered?.status).toBe(WEBULL_TOKEN_STATUSES.PENDING);
  });

  it("reads back the same instant it wrote, not a shifted one", async () => {
    // `expires` is persisted as Webull states it — an instant — so a later read
    // must not re-interpret it as a lifetime counted from the READ. That would
    // quietly extend every session by an hour on each hop between isolates.
    const { kv } = fakeKv();
    const expiresAtMs = NOW_MS + 3_600_000;
    await kvTokenStore(kv, () => new Date(NOW_MS)).write(pendingToken({ expiresAtMs }));

    const later = await kvTokenStore(kv, () => new Date(NOW_MS + 600_000)).read();

    expect(later?.expiresAtMs).toBe(expiresAtMs);
    expect(later?.expiryInterpretation).toBe(EXPIRY_INTERPRETATIONS.EPOCH_MILLIS);
  });

  it("stamps observedAtMs with the READ, because that is when we saw it", async () => {
    const { kv } = fakeKv();
    await kvTokenStore(kv, () => new Date(NOW_MS)).write(pendingToken());

    const later = await kvTokenStore(kv, () => new Date(NOW_MS + 600_000)).read();

    expect(later?.observedAtMs).toBe(NOW_MS + 600_000);
  });

  it("writes Webull's envelope shape, not this module's derived one", async () => {
    // `expiresAtMs` and `expiryInterpretation` are DERIVED. Persisting a
    // derivation as if it were source is how a guess becomes a fact that later
    // readers stop questioning — so only what Webull said goes in.
    const { kv, puts } = fakeKv();
    await kvTokenStore(kv, () => new Date(NOW_MS)).write(pendingToken());

    expect(puts).toHaveLength(1);
    expect(puts[0]!.key).toBe(WEBULL_SESSION_KEY);
    expect(JSON.parse(puts[0]!.value)).toEqual({
      token: "sess-abc",
      expires: NOW_MS + 3_600_000,
      status: WEBULL_TOKEN_STATUSES.PENDING,
    });
  });

  it("reads a half-built record as nothing held", async () => {
    // A record missing `status` is not a token, it is a hazard: a caller that
    // checks only for truthiness would happily sign a request with it.
    const { kv } = fakeKv({
      [WEBULL_SESSION_KEY]: JSON.stringify({ token: "sess-abc", expires: NOW_MS + 1000 }),
    });

    expect(await kvTokenStore(kv, () => new Date(NOW_MS)).read()).toBeNull();
  });

  it("reads unparseable bytes as nothing held rather than throwing", async () => {
    const { kv } = fakeKv({ [WEBULL_SESSION_KEY]: "not json{" });

    expect(await kvTokenStore(kv, () => new Date(NOW_MS)).read()).toBeNull();
  });

  it("degrades a KV read outage to 'no session held', never to an exception", async () => {
    // A storage blip must not 500 a page whose only job was to tell the Founder
    // what his wire is doing. "Nothing held" is honest and self-correcting.
    const kv: WebullKvNamespace = {
      get: vi.fn(async () => {
        throw new Error("KV unreachable");
      }),
      put: vi.fn(async () => {}),
    };

    await expect(kvTokenStore(kv, () => new Date(NOW_MS)).read()).resolves.toBeNull();
  });

  it("swallows a KV write outage so the request the session serves still completes", async () => {
    // Losing durability is bad. Failing the Founder's request because a cache
    // write failed is worse — the session still works for this isolate.
    const kv: WebullKvNamespace = {
      get: vi.fn(async () => null),
      put: vi.fn(async () => {
        throw new Error("KV unreachable");
      }),
    };

    await expect(
      kvTokenStore(kv, () => new Date(NOW_MS)).write(pendingToken()),
    ).resolves.toBeUndefined();
  });
});

describe("kvTtlSeconds", () => {
  it("outlives the session by a pad, so REFRESH can extend it", async () => {
    // Dropping a just-expired token is what forces a brand new 2FA cycle. The
    // pad keeps it addressable long enough for the refresh path to do its job;
    // `tokenDisposition` still decides whether it may be SENT.
    const ttl = kvTtlSeconds(pendingToken({ expiresAtMs: NOW_MS + 600_000 }), NOW_MS);

    expect(ttl).toBe(600 + 3600);
  });

  it("still holds a token that has already expired", async () => {
    const ttl = kvTtlSeconds(pendingToken({ expiresAtMs: NOW_MS - 60_000 }), NOW_MS);

    expect(ttl).toBeGreaterThanOrEqual(MIN_KV_TTL_SECONDS);
  });

  it("never asks KV for a TTL it rejects as too short", async () => {
    // Long-dead tokens would otherwise compute a negative TTL and the `put`
    // would fail — turning an expiry into a durability outage.
    const ttl = kvTtlSeconds(pendingToken({ expiresAtMs: NOW_MS - 10 * 24 * 3600_000 }), NOW_MS);

    expect(ttl).toBe(MIN_KV_TTL_SECONDS);
  });

  it("caps a token whose expiry could not be interpreted", async () => {
    // No expiry means no basis for believing in it for long. A day is the
    // ceiling so an uninterpretable value cannot live forever.
    const ttl = kvTtlSeconds(
      pendingToken({
        expiresAtMs: undefined,
        expiryInterpretation: EXPIRY_INTERPRETATIONS.UNINTERPRETABLE,
      }),
      NOW_MS,
    );

    expect(ttl).toBe(MAX_KV_TTL_SECONDS);
  });

  it("caps a token claiming an implausibly distant expiry", async () => {
    const ttl = kvTtlSeconds(pendingToken({ expiresAtMs: NOW_MS + 365 * 24 * 3600_000 }), NOW_MS);

    expect(ttl).toBe(MAX_KV_TTL_SECONDS);
  });
});
