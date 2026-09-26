/**
 * DELETE /api/alpaca-trading — a cancel can name one order and nothing else.
 *
 * Found 2026-09-26 (Lane S audit, confirmed by a skeptic at 3ff5cd7): the
 * handler put the `id` query value straight into `${base}/v2/orders/${id}`.
 * URL parsing resolves dot segments, so `id=../positions` reached Alpaca as
 * `DELETE /v2/positions` — close every paper position. The first test below
 * pins that platform fact, so the reason for the guard stays measurable.
 *
 * These drive the real handler with `fetch` stubbed: a refused id must be
 * refused BEFORE any request leaves, and a real order id must still cancel.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/requireAuth", () => ({ requireAuth: mocks.requireAuth }));

const OWNER = "owner-1";
const ORDER_ID = "61e69015-8549-4bfd-b9c3-01e75843f47d";
const PAPER = "https://paper-api.alpaca.markets";

const realFetch = globalThis.fetch;

async function loadRoute() {
  vi.resetModules();
  return import("./route");
}

/** `rawQuery` goes onto the URL exactly as written, so encodings reach the parser. */
const del = (rawQuery: string) =>
  new Request(`http://localhost/api/alpaca-trading?action=order${rawQuery}`, { method: "DELETE" });

beforeEach(() => {
  mocks.requireAuth.mockResolvedValue({ ok: true, user: { sub: OWNER } });
  vi.stubEnv("ALPACA_OWNER_USER_ID", OWNER);
  vi.stubEnv("ALPACA_PAPER_KEY", "paper-key");
  vi.stubEnv("ALPACA_PAPER_SECRET", "paper-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  globalThis.fetch = realFetch;
});

describe("DELETE /api/alpaca-trading — the order id is validated before any fetch", () => {
  it("the hole was real: a dot segment in the id resolves to /v2/positions", () => {
    for (const id of ["../positions", "%2e%2e/positions", "..\\positions", "x/../../positions"]) {
      expect(new URL(`${PAPER}/v2/orders/${id}`).pathname, id).toBe("/v2/positions");
    }
  });

  it.each([
    ["plain traversal", "&id=../positions"],
    ["encoded slash", "&id=..%2Fpositions"],
    ["encoded dots and slash", "&id=%2e%2e%2fpositions"],
    ["double-encoded", "&id=%252e%252e%252fpositions"],
    ["backslash", "&id=..%5Cpositions"],
    ["uuid then traversal", `&id=${ORDER_ID}/../../positions`],
    ["uuid then encoded traversal", `&id=${ORDER_ID}%2F..%2F..%2Fpositions`],
    ["uuid then query", `&id=${ORDER_ID}%3Fstatus%3Dall`],
    ["leading space", `&id=%20${ORDER_ID}`],
    ["bare collection name", "&id=positions"],
  ])("refuses %s with 400 and sends nothing", async (_name, q) => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { DELETE } = await loadRoute();
    const res = await DELETE(del(q));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "INVALID_ORDER_ID" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["empty id", "&id="],
    ["missing id", ""],
  ])("refuses an %s with 400 and sends nothing", async (_name, q) => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { DELETE } = await loadRoute();
    const res = await DELETE(del(q));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Order id required" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("a real Alpaca order id still cancels exactly that order on the paper host", async () => {
    const calls: Array<{ url: string; method: string | undefined }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), method: init?.method });
      return new Response(null, { status: 204 });
    }));
    const { DELETE } = await loadRoute();
    const res = await DELETE(del(`&id=${ORDER_ID}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cancelled: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("DELETE");
    expect(calls[0].url).toBe(`${PAPER}/v2/orders/${ORDER_ID}`);
    expect(new URL(calls[0].url).pathname).toBe(`/v2/orders/${ORDER_ID}`);
  });

  it("the owner gate still answers first: a non-owner gets 403 whatever the id", async () => {
    mocks.requireAuth.mockResolvedValue({ ok: true, user: { sub: "someone-else" } });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { DELETE } = await loadRoute();
    const res = await DELETE(del("&id=../positions"));
    expect(res.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
