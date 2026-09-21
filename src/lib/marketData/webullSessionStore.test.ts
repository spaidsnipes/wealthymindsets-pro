/**
 * The seam that decides whether a Webull session can outlive one isolate.
 *
 * Two properties matter here and they pull against each other. Durability is
 * the point — an isolate-local session is the loop that made the Founder's 2FA
 * tap unobservable. But an unprovisioned KV namespace must cost DURABILITY, not
 * AVAILABILITY: the lanes still have to answer honestly on a laptop and in
 * vitest, they just cannot remember across a restart. Both are pinned below.
 */
import { describe, expect, it } from "vitest";
import {
  WEBULL_SESSION_KV_BINDING,
  webullSessionDurability,
  webullSessionIsDurable,
  webullSessionStore,
  resolveWebullSessionToken,
  webullWorkerEnv,
} from "./webullSessionStore";
import { WEBULL_SESSION_KEY } from "./webullKvTokenStore";
import { EXPIRY_INTERPRETATIONS, WEBULL_TOKEN_STATUSES } from "./webullAccessToken";

const NOW_MS = Date.UTC(2026, 8, 21, 5, 2, 9);

function fakeKvEnv() {
  const cells = new Map<string, string>();
  return {
    cells,
    env: {
      [WEBULL_SESSION_KV_BINDING]: {
        async get(key: string) {
          return cells.get(key) ?? null;
        },
        async put(key: string, value: string) {
          cells.set(key, value);
        },
      },
    },
  };
}

describe("webullSessionStore", () => {
  it("writes through to KV when the namespace is bound", async () => {
    const { env, cells } = fakeKvEnv();

    await webullSessionStore(env).write({
      token: "sess-abc",
      status: WEBULL_TOKEN_STATUSES.PENDING,
      expiresAtMs: NOW_MS + 3_600_000,
      expiryInterpretation: EXPIRY_INTERPRETATIONS.EPOCH_MILLIS,
      observedAtMs: NOW_MS,
    });

    expect(cells.get(WEBULL_SESSION_KEY)).toBeTypeOf("string");
    expect(webullSessionIsDurable(env)).toBe(true);
  });

  it("falls back to the isolate rather than failing when nothing is bound", async () => {
    // An unprovisioned namespace is a durability debt, not an outage. The lane
    // must still answer — it just cannot remember past an eviction.
    const store = webullSessionStore(undefined);

    await store.write({
      token: "sess-local",
      status: WEBULL_TOKEN_STATUSES.NORMAL,
      expiresAtMs: NOW_MS + 3_600_000,
      expiryInterpretation: EXPIRY_INTERPRETATIONS.EPOCH_MILLIS,
      observedAtMs: NOW_MS,
    });

    expect((await store.read())?.token).toBe("sess-local");
    expect(webullSessionIsDurable(undefined)).toBe(false);
  });

  it("treats a binding of the WRONG TYPE as absent instead of blowing up mid-request", async () => {
    // A stray var or an R2 bucket bound under this name must read as "no KV".
    // Discovering the mismatch by throwing inside a request handler turns a
    // configuration typo into a 500 on a page that only wanted to report state.
    const wrong = { [WEBULL_SESSION_KV_BINDING]: { get: "not-a-function" } };

    expect(webullSessionIsDurable(wrong)).toBe(false);
    await expect(webullSessionStore(wrong).read()).resolves.toBeDefined();
  });

  it("reports absence for a non-object env without throwing", async () => {
    for (const env of [null, "WEBULL_SESSION", 7]) {
      expect(webullSessionIsDurable(env)).toBe(false);
    }
  });

  it("describes durability from the binding, not from a hard-coded belief", async () => {
    // A fixed sentence could only be true in one of the two worlds. Whichever
    // one it was written for, it would start lying the day the other arrived.
    const { env } = fakeKvEnv();

    // The discriminator is the PROMISE each sentence makes about tapping, so
    // the negative assertion below is checked against a string that really does
    // contain it — it cannot pass vacuously.
    const isolate = webullSessionDurability(undefined);
    const durable = webullSessionDurability(env);

    expect(isolate).toMatch(/may ask you to approve it once/i);
    expect(durable).toMatch(/survives this server instance being recycled/i);
    expect(durable).not.toMatch(/may ask you to approve it once/i);
  });

  it("returns undefined for the Worker env when there is no Workers runtime", async () => {
    // Under vitest `getCloudflareContext` throws. Letting that escape would
    // mean a route that works in production 500s on a laptop.
    await expect(webullWorkerEnv()).resolves.toBeUndefined();
  });
});

/**
 * THE SEAM EVERY WEBULL LANE SIGNS THROUGH.
 *
 * The entitlement probe learned to mint a session months before the data lane
 * did. For that whole gap the chart's tick read signed with whatever string
 * sat in `WEBULL_ACCESS_TOKEN` — a value with an expiry — so the two lanes
 * could report different things about one account, and the data lane's 401
 * would read to any human as "market data is not subscribed".
 *
 * These pin the three behaviours that make that impossible to reintroduce
 * quietly: it mints, it names the 2FA wait as itself, and it never invents a
 * session out of half a credential pair.
 */
describe("resolveWebullSessionToken — one session seam for every lane", () => {
  const creds = { appKey: "public-test-key", appSecret: "public-test-secret" };
  const store = () => {
    let held: unknown = null;
    return { read: async () => held as never, write: async (t: unknown) => { held = t; } };
  };

  it("mints a session rather than trusting a pasted value", async () => {
    const paths: string[] = [];
    const fetchImpl = (async (url: URL | string) => {
      paths.push(new URL(String(url)).pathname);
      return new Response(JSON.stringify({
        token: "minted-session-value", expires: 4102444800000, status: WEBULL_TOKEN_STATUSES.NORMAL,
      }), { status: 200 });
    }) as unknown as typeof fetch;

    const session = await resolveWebullSessionToken(fetchImpl, creds, store());

    expect(paths).toContain("/auth/tokens/create");
    expect(session.accessToken).toBe("minted-session-value");
    expect(session.awaiting2fa).toBe(false);
  });

  it("reports a 2FA wait as itself, with no token to sign with", async () => {
    // A wait for the Founder's tap is ONE human step. Signing anyway would
    // produce a 401 that reads as an entitlement problem, which is the exact
    // misreading that cost this project three months.
    const fetchImpl = (async () => new Response(JSON.stringify({
      token: "pending-session", expires: 4102444800000, status: WEBULL_TOKEN_STATUSES.PENDING,
    }), { status: 200 })) as unknown as typeof fetch;

    const session = await resolveWebullSessionToken(fetchImpl, creds, store());

    expect(session.awaiting2fa).toBe(true);
    expect(session.accessToken).toBeUndefined();
    expect(session.note).toBeTruthy();
  });

  it("never calls the provider when the key/secret pair is incomplete", async () => {
    // Half a credential pair cannot mint anything. Calling out anyway earns a
    // provider error that would then be read as a fact about the account.
    const fetchImpl = (async () => { throw new Error("must not be called"); }) as unknown as typeof fetch;

    for (const partial of [{ appKey: "k" }, { appSecret: "s" }, {}, { appKey: "  ", appSecret: "  " }]) {
      const session = await resolveWebullSessionToken(fetchImpl, partial, store());
      expect(session.accessToken).toBeUndefined();
      expect(session.awaiting2fa).toBe(false);
      expect(session.note).toMatch(/not both configured/i);
    }
  });
});
