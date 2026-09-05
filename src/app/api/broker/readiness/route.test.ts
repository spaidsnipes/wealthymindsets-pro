import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/requireAuth", () => ({ requireAuth: mocks.requireAuth }));

import { GET } from "./route";

describe("GET /api/broker/readiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ ok: true, user: { sub: "u1" } });
  });

  it("requires a WM session before revealing the config surface", async () => {
    mocks.requireAuth.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const response = await GET(new Request("http://localhost/api/broker/readiness"));
    expect(response.status).toBe(401);
  });

  it("returns the presence-only readiness receipt for an authenticated session, no-store", async () => {
    const response = await GET(new Request("http://localhost/api/broker/readiness"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.surface).toBe("broker-readiness");
    expect(Array.isArray(body.providers)).toBe(true);
    expect(Array.isArray(body.envPresence)).toBe(true);
    expect(typeof body.accountService.configured).toBe("boolean");
    expect(Array.isArray(body.accountService.missing)).toBe(true);
    expect(typeof body.summary).toBe("string");
  });

  it("never returns a secret VALUE — envPresence carries only name + boolean", async () => {
    const response = await GET(new Request("http://localhost/api/broker/readiness"));
    const body = await response.json();
    for (const entry of body.envPresence) {
      expect(Object.keys(entry).sort()).toEqual(["name", "present"]);
      expect(typeof entry.name).toBe("string");
      expect(typeof entry.present).toBe("boolean");
    }
    // Providers expose status/missing NAMES only — never a value field.
    for (const p of body.providers) {
      expect(p).not.toHaveProperty("value");
      expect(p).not.toHaveProperty("secret");
    }
    expect(Object.keys(body.accountService).sort()).toEqual(["configured", "missing"]);
  });
});
