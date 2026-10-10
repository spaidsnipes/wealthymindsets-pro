/**
 * Garden 19 §66 — GET /api/broker/order-gate: owner only, read only. A guest is
 * 401, a member 403; the owner reads what the server gate would say right now.
 * No broker is contacted and nothing is written.
 */
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const OWNER = "owner-1";
const mocks = vi.hoisted(() => ({ requireAuth: vi.fn(), kv: { get: vi.fn(), put: vi.fn(), delete: vi.fn() } as Record<string, ReturnType<typeof vi.fn>> | null }));

vi.mock("@/lib/requireAuth", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/marketData/webullSessionStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/marketData/webullSessionStore")>();
  return { ...actual, webullWorkerEnv: async () => ({ [actual.WEBULL_SESSION_KV_BINDING]: mocks.kv }) };
});
vi.mock("@/lib/tastytrade", () => ({ tastytradeConfigStatus: () => ({ configured: true, env: "production", missing: [] }) }));

const get = async (broker?: string) => {
  const { GET } = await import("./route");
  return GET(new NextRequest(`https://wm.test/api/broker/order-gate${broker === undefined ? "" : `?broker=${broker}`}`));
};
const stored = (o: Record<string, unknown>) => JSON.stringify({ armed: true, killSwitch: false, maxContractsPerOrder: 2, maxSharesPerOrder: 100, maxNotionalUsdPerOrder: 5000, maxLossUsdPerOrder: 500, maxOrdersPerMinute: 5, maxOrdersPerDay: 50, updatedAtMs: Date.now() - 1000, ...o });

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv("WEBULL_OWNER_USER_ID", OWNER);
  vi.stubEnv("TASTYTRADE_OWNER_USER_ID", OWNER);
  mocks.kv = { get: vi.fn(async () => null), put: vi.fn(), delete: vi.fn() };
  mocks.requireAuth.mockReset();
  mocks.requireAuth.mockResolvedValue({ ok: true, user: { sub: OWNER } });
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("the gate read must not call out"); }));
});

describe("GET /api/broker/order-gate", () => {
  it("a guest is 401", async () => {
    mocks.requireAuth.mockResolvedValue({ ok: false, response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) });
    expect((await get("webull")).status).toBe(401);
  });

  it.each(["webull", "tastytrade"])("a member is 403 with the owner refusal for %s, and reads nothing about the gate", async broker => {
    mocks.requireAuth.mockResolvedValue({ ok: true, user: { sub: "member-7" } });
    const res = await get(broker);
    expect(res.status).toBe(403);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe("BROKER_ACCOUNT_NOT_AUTHORIZED");
    expect(body).not.toHaveProperty("sentence");
    expect(body).not.toHaveProperty("killSwitch");
    expect(mocks.kv!.get).not.toHaveBeenCalled();
  });

  it("no owner configured → nobody reads it (fail closed)", async () => {
    vi.stubEnv("WEBULL_OWNER_USER_ID", "");
    vi.stubEnv("TASTYTRADE_OWNER_USER_ID", "");
    expect((await get("webull")).status).toBe(403);
    expect((await get("tastytrade")).status).toBe(403);
  });

  it("an unknown or missing broker is 400", async () => {
    expect((await get("moomoo")).status).toBe(400);
    expect((await get()).status).toBe(400);
  });

  it("owner, no limits stored → would refuse (limits unset); no write, no outbound call", async () => {
    const res = await get("webull");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json() as Record<string, unknown>;
    expect(body).toMatchObject({ state: "OK", broker: "webull", limits: "UNSET", verdict: "WOULD_REFUSE", sent: false, limitsRead: "READ" });
    expect(String(body.sentence)).toBe("would refuse: No server-held order limits are set. Set them in Settings › Execution; until then nothing live can be sent.");
    expect(body.orderRate).toMatchObject({ perMinute: null, perDay: null, usedToday: 0, remainingToday: null });
    expect(typeof body.asOf).toBe("string");
    // The limits record, then the order-rate counters (today, this minute) — reads only (2026-10-10).
    expect(mocks.kv!.get).toHaveBeenCalledTimes(3);
    expect(mocks.kv!.put).not.toHaveBeenCalled();
    expect(mocks.kv!.delete).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("owner, disarmed / kill switch / armed-and-set → the sentence the submit door would return", async () => {
    mocks.kv!.get = vi.fn(async () => stored({ armed: false }));
    expect(String((await (await get("tastytrade")).json() as { sentence: string }).sentence)).toBe("would refuse: Live trading is DISARMED on the server. Arm it in Settings › Execution.");
    mocks.kv!.get = vi.fn(async () => stored({ killSwitch: true }));
    const killed = await (await get("webull")).json() as { sentence: string; killSwitch: string };
    expect(killed.killSwitch).toBe("ENGAGED");
    expect(killed.sentence).toMatch(/^would refuse: The kill switch is engaged\./);
    mocks.kv!.get = vi.fn(async () => stored({}));
    const open = await (await get("webull")).json() as { verdict: string; sentence: string; serverArmed: boolean };
    expect(open).toMatchObject({ verdict: "NO_STANDING_REFUSAL", serverArmed: true });
    expect(open.sentence).toMatch(/^would pass the server gate's standing checks; .*broker checks still apply$/);
    expect(mocks.kv!.put).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("no store bound, or an unreadable store → fail closed (would refuse), and it says which", async () => {
    mocks.kv = null;
    const none = await (await get("webull")).json() as { verdict: string; limitsRead: string };
    expect(none).toMatchObject({ verdict: "WOULD_REFUSE", limitsRead: "NO_STORE" });
    mocks.kv = { get: vi.fn(async () => { throw new Error("kv down"); }), put: vi.fn(), delete: vi.fn() };
    const bad = await (await get("webull")).json() as { verdict: string; limitsRead: string };
    expect(bad).toMatchObject({ verdict: "WOULD_REFUSE", limitsRead: "UNREADABLE" });
  });
});
