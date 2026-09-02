import { describe, it, expect, vi } from "vitest";
import { NextResponse } from "next/server";

// Route gated behind requireAuth so the per-provider infra status isn't
// public recon. Tests stub the auth so the existing assertions still cover
// the truthful-status behavior; a separate test proves the 401 path.
vi.mock("@/lib/requireAuth", () => ({
  requireAuth: vi.fn(async () => ({ ok: true, user: { sub: "u1" } })),
}));

import { GET } from "./route";
import { requireAuth } from "@/lib/requireAuth";

function req(): Request {
  return new Request("http://localhost/api/broker/webull/status");
}

describe("/api/broker/webull/status — canon §12 truth", () => {
  it("returns the unconfigured live probe honestly (never claims wired)", async () => {
    const res = await GET(req());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.provider).toBe("webull");
    expect(body.implemented).toBe(true);
    expect(body.configured).toBe(false);
    expect(body.connected).toBe(false);
    expect(body.state).toBe("UNCONFIGURED");
    expect(body.accountCount).toBe(0);
    expect(body.note).toContain("not configured");
    expect(typeof body.checkedAt).toBe("string");
    const s = JSON.stringify(body);
    expect(s.toLowerCase()).not.toContain("token");
    expect(s.toLowerCase()).not.toContain("secret");
    expect(s.toLowerCase()).not.toContain("password");
  });

  it("never caches — no-store", async () => {
    const res = await GET(req());
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("gates behind requireAuth — infra recon isn't public", async () => {
    (requireAuth as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    });
    const res = await GET(req());
    expect(res.status).toBe(401);
  });
});
