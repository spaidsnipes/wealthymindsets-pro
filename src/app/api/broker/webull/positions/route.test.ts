/**
 * /api/broker/webull/positions — the wire behind the BROKER COST LINE.
 *
 * What these tests pin, in the order a defect would bite:
 *   1. the route is auth-gated (broker recon is never public — 2026-08-31 bug class);
 *   2. an unconfigured runtime answers honestly, never a fake empty book;
 *   3. `?symbol=` narrows positions WITHOUT changing the read's state, so
 *      "you hold nothing in this symbol" and "the read failed" stay separate
 *      sentences;
 *   4. no-store — a positions receipt is a moment, not a cacheable fact.
 *
 * The probe itself (signing, aggregation, honest-price rule, id-stripping)
 * is owned by webullPositions.test.ts against the measured fixtures.
 */

import { describe, it, expect, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/requireAuth", () => ({
  requireAuth: vi.fn(async () => ({ ok: true, user: { sub: "u1" } })),
}));

vi.mock("@/lib/marketData/webullSessionStore", () => ({
  webullWorkerEnv: vi.fn(async () => ({})),
  webullSessionStore: vi.fn(() => ({
    read: async () => null,
    write: async () => undefined,
  })),
}));

import { GET } from "./route";
import { requireAuth } from "@/lib/requireAuth";

function req(query = ""): Request {
  return new Request(`http://localhost/api/broker/webull/positions${query}`);
}

describe("/api/broker/webull/positions — BROKER COST LINE wire", () => {
  it("gates behind requireAuth — a position book is not public recon", async () => {
    (requireAuth as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    });
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("answers an unconfigured runtime honestly — no invented empty book", async () => {
    const res = await GET(req());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.provider).toBe("webull");
    expect(body.state).toBe("UNCONFIGURED");
    expect(body.positions).toEqual([]);
    expect(body.note).toContain("not configured");
    // Anti-value-leak: config gaps never surface secret-holding fields.
    expect(body.appKey).toBeUndefined();
    expect(body.appSecret).toBeUndefined();
    expect(body.accessToken).toBeUndefined();
  });

  it("keeps the read's state when ?symbol= filters everything out", async () => {
    // Even filtered to a symbol nobody holds, the state must describe the
    // READ (here: UNCONFIGURED), never mutate into a different claim.
    const res = await GET(req("?symbol=tsla"));
    const body = await res.json();
    expect(body.state).toBe("UNCONFIGURED");
    expect(body.positions).toEqual([]);
  });

  it("never caches — no-store", async () => {
    const res = await GET(req());
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
