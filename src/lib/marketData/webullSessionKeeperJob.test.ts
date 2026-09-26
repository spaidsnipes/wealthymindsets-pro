/**
 * THE SCHEDULED JOB PROVES THE LANE, NOT JUST THE SESSION — and never starts
 * a 2FA cycle doing it. Its KV record is how production is measured without
 * anyone's browser (`wrangler kv key get webull:keeper:last:v1`).
 */

import { describe, expect, it, vi } from "vitest";

import { runWebullSessionKeeper, readWebullKeeperRecord } from "./webullSessionKeeperJob";
import { KEEPER_OUTCOMES, WEBULL_KEEPER_RECORD_KEY } from "./webullSessionKeeper";
import { WEBULL_SESSION_KEY, type WebullKvNamespace } from "./webullKvTokenStore";
import { WEBULL_SDK_CONTRACT } from "./webullSdkContract";

function fakeKv(initial: Record<string, string> = {}): WebullKvNamespace & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    async get(key) {
      return key in data ? data[key] : null;
    },
    async put(key, value) {
      data[key] = value;
    },
  };
}

type Route = (init?: RequestInit) => Response;
function webull(routes: Record<string, Route>) {
  const seen: { path: string; token?: string }[] = [];
  const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(url)).pathname;
    seen.push({ path, token: (init?.headers as Record<string, string> | undefined)?.["x-access-token"] });
    const route = routes[path];
    return route ? route(init) : new Response(JSON.stringify({ code: "UNROUTED" }), { status: 404 });
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, seen };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const keys = { WEBULL_API_KEY: "key", WEBULL_API_SECRET: "secret" };

describe("2FA off: the job records TOKEN_NOT_REQUIRED and a CONNECTED broker lane", () => {
  it("signs the account read with the key pair alone and records the count only", async () => {
    const kv = fakeKv();
    const { fetchImpl, seen } = webull({
      [WEBULL_SDK_CONTRACT.APP_CONFIG.path]: () => json({ token_check_enabled: false }),
      [WEBULL_SDK_CONTRACT.ACCOUNT_LIST.path]: () => json([{ account_id: "a-1" }, { account_id: "a-2" }, { account_id: "a-3" }]),
    });
    const result = await runWebullSessionKeeper({ ...keys, WEBULL_SESSION: kv }, fetchImpl);

    expect(result?.outcome).toBe(KEEPER_OUTCOMES.TOKEN_NOT_REQUIRED);
    expect(result?.broker).toMatchObject({ state: "CONNECTED", accountCount: 3 });
    expect(seen.map((s) => s.path)).toEqual([WEBULL_SDK_CONTRACT.APP_CONFIG.path, WEBULL_SDK_CONTRACT.ACCOUNT_LIST.path]);
    expect(seen.every((s) => s.token === undefined)).toBe(true);

    const stored = kv.data[WEBULL_KEEPER_RECORD_KEY];
    expect(stored).toBeTruthy();
    expect(stored).not.toContain("a-1");
    const read = await readWebullKeeperRecord({ WEBULL_SESSION: kv });
    expect(read?.outcome).toBe(KEEPER_OUTCOMES.TOKEN_NOT_REQUIRED);
    expect(read?.broker?.accountCount).toBe(3);
  });
});

describe("2FA on and the session dead: nothing is minted, nothing is probed", () => {
  it("records REAUTH_REQUIRED with the mode, and never calls CREATE or the account list", async () => {
    const kv = fakeKv({
      [WEBULL_SESSION_KEY]: JSON.stringify({ token: "dead-session", expires: 0, status: "INVALID" }),
    });
    const { fetchImpl, seen } = webull({
      [WEBULL_SDK_CONTRACT.APP_CONFIG.path]: () => json({ token_check_enabled: true }),
      [WEBULL_SDK_CONTRACT.CREATE_TOKEN.path]: () => json({ token: "new", expires: 1, status: "PENDING" }),
      [WEBULL_SDK_CONTRACT.ACCOUNT_LIST.path]: () => json([{ account_id: "a-1" }]),
    });
    const result = await runWebullSessionKeeper({ ...keys, WEBULL_SESSION: kv }, fetchImpl);

    expect(result?.outcome).toBe(KEEPER_OUTCOMES.REAUTH_REQUIRED);
    expect(result?.authMode).toBe("TOKEN_REQUIRED");
    expect(result?.broker).toBeUndefined();
    const paths = seen.map((s) => s.path);
    expect(paths).not.toContain(WEBULL_SDK_CONTRACT.CREATE_TOKEN.path);
    expect(paths).not.toContain(WEBULL_SDK_CONTRACT.ACCOUNT_LIST.path);
    expect(kv.data[WEBULL_KEEPER_RECORD_KEY]).not.toContain("dead-session");
  });
});
