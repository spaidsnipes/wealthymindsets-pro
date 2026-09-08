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
  it.each([null, undefined, {}, "ok", [{ recon_version: 1 }]])("does not certify a malformed probe receipt %s", async (data) => {
    mocks.rpc.mockResolvedValue({ data, error: null });
    const result = await GET(new Request("http://localhost/api/decision-position"));
    expect((await result.json()).serverAuthority).toBeNull();
  });

  it("accepts the expected empty probe receipt", async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    const result = await GET(new Request("http://localhost/api/decision-position"));
    expect((await result.json()).serverAuthority).not.toBeNull();
  });

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

/* ══════════════════════════════════════════════════════════════════════════
 * PROJECTION — the read arrow that made the authority stop being write-only.
 * These rules exist because the cheapest way to write this endpoint is also
 * the one that turns an outage into "FLAT" and a null quantity into 0.
 * ═══════════════════════════════════════════════════════════════════════ */

const read = (decisionId?: string) =>
  new Request(
    "http://localhost/api/decision-position"
      + (decisionId === undefined ? "" : `?decisionId=${encodeURIComponent(decisionId)}`),
  );

const ROW = {
  decision_id: "decision-one",
  recon_version: 4,
  intent: "GET ME IN NOW",
  intent_device_id: "phone-1",
  quantity_filled: null,
  quantity_protected: null,
  execution_state: null,
  protection_state: null,
};

describe("shared position projection", () => {
  it("projects the record a second device asks for", async () => {
    mocks.rpc.mockResolvedValue({ data: [ROW], error: null });
    const body = await (await GET(read("decision-one"))).json();
    expect(body.status).toBe("PROJECTED");
    expect(body.position.reconVersion).toBe(4);
    expect(body.position.intent).toBe("GET ME IN NOW");
    expect(body.position.decisionId).toBe("decision-one");
  });

  it("scopes the read to the signed-in owner, never to the caller's claim", async () => {
    mocks.rpc.mockResolvedValue({ data: [ROW], error: null });
    await GET(read("decision-one"));
    expect(mocks.rpc).toHaveBeenCalledWith(
      "wm_read_decision_position",
      expect.objectContaining({ p_owner_id: "owner-one", p_decision_id: "decision-one" }),
    );
  });

  it("keeps NOT YET RECONCILED absent instead of defaulting it to zero", async () => {
    mocks.rpc.mockResolvedValue({ data: [ROW], error: null });
    const { position } = await (await GET(read("decision-one"))).json();
    for (const field of ["quantityFilled", "quantityProtected", "executionState", "protectionState"]) {
      expect(position[field], `${field} must stay absent`).toBeNull();
    }
  });

  it("reads a numeric quantity that arrives as a PostgREST string", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ ...ROW, quantity_filled: "3", quantity_protected: "0" }], error: null });
    const { position } = await (await GET(read("decision-one"))).json();
    expect(position.quantityFilled).toBe(3);
    // A REAL zero survives. The rule is "absence is not zero", not "zero is absence".
    expect(position.quantityProtected).toBe(0);
  });

  it.each([
    ["transport error", { data: null, error: { code: "network" } }],
    ["unreadable payload", { data: "ok", error: null }],
    ["unverifiable version", { data: [{ ...ROW, recon_version: "garbage" }], error: null }],
  ])("does not let %s read as a flat position", async (_name, receipt) => {
    mocks.rpc.mockResolvedValue(receipt);
    const result = await GET(read("decision-one"));
    expect(result.status).toBe(503);
    const body = await result.json();
    expect(body.status).toBe("UNVERIFIED");
    expect(body.position).toBeNull();
    expect(body.note).toContain("does not mean the position is flat");
  });

  it("separates a decision the authority has never heard of from an unreachable one", async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    const result = await GET(read("decision-one"));
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.status).toBe("NOT_RECORDED");
    expect(body.position).toBeNull();
    expect(body.note).toContain("not the same as a position of size zero");
  });

  it("still answers the reach probe when no decision is named", async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    for (const url of [read(), read(""), read("   ")]) {
      const body = await (await GET(url)).json();
      expect(body.serverAuthority, `${url.url} must stay a reach probe`).not.toBeNull();
      expect(body.status).toBeUndefined();
    }
  });

  it("refuses to project anything to a caller with no session", async () => {
    mocks.auth.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) });
    expect((await GET(read("decision-one"))).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
