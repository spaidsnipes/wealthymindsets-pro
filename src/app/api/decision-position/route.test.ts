import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), auth: vi.fn() }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdmin: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/requireAuth", () => ({ requireAuth: mocks.auth }));
import { GET, POST } from "./route";

const request = () => new Request("http://localhost/api/decision-position", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ decisionId: "decision-one", baseReconVersion: 0, role: "CLIENT_INTENT", intent: "WAIT" }),
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ ok: true, user: { sub: "owner-one" } });
});

describe("shared position transport truth", () => {
  it("does not call an unavailable store an absent table", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "network" } });
    const result = await GET(new Request("http://localhost/api/decision-position"));
    const body = await result.json();
    expect(body.serverAuthority).toBeNull();
    expect(body.note).toContain("availability is unverified");
    expect(body.note).not.toContain("has not been created");
  });

  it("does not convert an unreadable version into a new version-zero write", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "network" } });
    const result = await POST(request());
    expect(result.status).toBe(503);
    expect((await result.json()).verdict).toBe("UNVERIFIED");
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it("does not call a database write failure a competing-device conflict", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [], error: null });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "network" } });
    const result = await POST(request());
    expect(result.status).toBe(503);
    expect((await result.json()).verdict).toBe("UNVERIFIED");
  });

  it("preserves a proven atomic conflict and a successful retry", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [], error: null });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    expect((await POST(request())).status).toBe(409);
    mocks.rpc.mockResolvedValueOnce({ data: [], error: null });
    mocks.rpc.mockResolvedValueOnce({ data: 1, error: null });
    const result = await POST(request());
    expect(result.status).toBe(200);
    expect((await result.json()).nextReconVersion).toBe(1);
  });

  it("contains rejected transport promises without claiming a write outcome", async () => {
    mocks.rpc.mockRejectedValueOnce(new Error("offline"));
    expect((await POST(request())).status).toBe(503);
    mocks.rpc.mockResolvedValueOnce({ data: [], error: null });
    mocks.rpc.mockRejectedValueOnce(new Error("response lost"));
    expect((await POST(request())).status).toBe(503);
  });

  it.each([null, {}, "", "garbage", -1, Number.MAX_SAFE_INTEGER + 1])("rejects malformed stored version %s", async (value) => {
    mocks.rpc.mockResolvedValue({ data: [{ recon_version: value }], error: null });
    expect((await POST(request())).status).toBe(503);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
});
