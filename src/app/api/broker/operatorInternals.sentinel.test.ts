/**
 * SECURITY (Sheriff P1-5, 2026-10-08): operator internals — env-var NAMES,
 * setup paths ("services/moomoo-bridge/README.md"), "code reads X · host has Y"
 * near-misses — are the broker OWNER's. Every broker route that can carry them
 * shapes its body server-side by the one owner gate; a member gets statuses
 * only. Guests get 401 before any of it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/requireAuth", () => ({ requireAuth: mocks.requireAuth }));

/** An env-var-shaped NAME, a repo path, or the near-miss words. */
const INTERNALS = /\b[A-Z][A-Z0-9]{2,}_[A-Z0-9_]{2,}\b|README|services\/|host has|code reads/;

const asUser = (sub: string) => mocks.requireAuth.mockResolvedValue({ ok: true, user: { sub } });
const get = async (mod: Promise<{ GET: (r: Request) => Promise<Response> }>, path: string) => {
  const { GET } = await mod;
  const res = await GET(new Request(`http://localhost${path}`));
  return { status: res.status, text: await res.text() };
};

beforeEach(() => {
  vi.stubEnv("TASTYTRADE_OWNER_USER_ID", "founder-1");
  // Make the adapters' setup notes as revealing as they get (no bridge env).
  vi.stubEnv("MOOMOO_BRIDGE_URL", "");
  vi.stubEnv("MOOMOO_BRIDGE_TOKEN", "");
});
afterEach(() => { vi.unstubAllEnvs(); mocks.requireAuth.mockReset(); });

describe("a MEMBER never receives operator internals", () => {
  it("/api/broker/certification — levels and stages only, every note empty, stamped MEMBER", async () => {
    asUser("member-9");
    const r = await get(import("./certification/route"), "/api/broker/certification");
    expect(r.status).toBe(200);
    const body = JSON.parse(r.text);
    expect(body.audience).toBe("MEMBER");
    expect(body.brokers.length).toBeGreaterThan(0);
    expect(body.brokers.every((b: { note: string }) => b.note === "")).toBe(true);
    expect(r.text).not.toMatch(INTERNALS);
  });

  it("/api/broker/readiness — GUEST shape: no env presence, no near-misses, no missing lists", async () => {
    asUser("member-9");
    const r = await get(import("./readiness/route"), "/api/broker/readiness");
    const body = JSON.parse(r.text);
    expect(body.audience).toBe("GUEST");
    expect(body.envPresence).toEqual([]);
    expect(body.nearMisses).toEqual([]);
    expect(r.text).not.toMatch(/host has|code reads/);
    expect(body.providers.every((p: { missing: unknown[]; note: string }) => p.missing.length === 0 && p.note === "")).toBe(true);
  });

  it("/api/broker/status — provider notes empty for a member", async () => {
    asUser("member-9");
    const r = await get(import("./status/route"), "/api/broker/status");
    const body = JSON.parse(r.text);
    expect(body.providers.every((p: { note: string }) => p.note === "")).toBe(true);
  });

  it("/api/broker/webull/status — refused outright to a non-owner (403)", async () => {
    asUser("member-9");
    vi.stubEnv("WEBULL_OWNER_USER_ID", "founder-1");
    const r = await get(import("./webull/status/route"), "/api/broker/webull/status");
    expect(r.status).toBe(403);
    // The machine `code` is not prose; the sentence the member reads names no env var.
    expect(JSON.parse(r.text).error).not.toMatch(INTERNALS);
    vi.stubEnv("WEBULL_OWNER_USER_ID", "");
    vi.stubEnv("TASTYTRADE_OWNER_USER_ID", "");
    const unset = await get(import("./webull/status/route"), "/api/broker/webull/status");
    expect(JSON.parse(unset.text).error).not.toMatch(INTERNALS);
  });
});

describe("the OWNER still gets the setup detail (the gate is not a deletion)", () => {
  it("/api/broker/certification — stamped OWNER, adapter notes present", async () => {
    asUser("founder-1");
    const r = await get(import("./certification/route"), "/api/broker/certification");
    const body = JSON.parse(r.text);
    expect(body.audience).toBe("OWNER");
    expect(body.brokers.some((b: { note: string }) => b.note.length > 0)).toBe(true);
  });
});

describe("a guest gets 401 before any body", () => {
  it("every operator route answers the auth refusal", async () => {
    const { NextResponse } = await import("next/server");
    mocks.requireAuth.mockImplementation(async () => ({ ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) }));
    for (const [m, p] of [[import("./certification/route"), "/api/broker/certification"], [import("./readiness/route"), "/api/broker/readiness"], [import("./status/route"), "/api/broker/status"]] as const) {
      const r = await get(m, p);
      expect(r.status).toBe(401);
    }
  });
});
