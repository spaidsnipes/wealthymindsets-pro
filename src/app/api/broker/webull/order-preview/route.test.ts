import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GARDEN 16 §19 — UNSUPPORTED MAY NEVER LOOK HEALTHY, enforced at the server.
 *
 * Found on /charts 2026-09-26 (audit at 3ff5cd7): this route stamped
 * `assetClass: "equity"` on every intent, so a plan drawn on ES1!, GC1!,
 * BTCUSD or SPX reached Webull's preview as a stock with a share count. The
 * button is fixed too, but a button is not a gate — anything that can POST can
 * skip it. These tests hold the route itself.
 */
const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  resolveWebullSessionToken: vi.fn(),
  listWebullAccounts: vi.fn(),
  previewWebullOrder: vi.fn(),
}));

vi.mock("@/lib/requireAuth", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/broker/adapters/webullBrokerConnection", () => ({
  webullBrokerConfigFromEnv: () => ({ appKey: "test-app-key", appSecret: "test-app-secret", apiHost: "api.webull.test" }),
}));
vi.mock("@/lib/marketData/webullSessionStore", () => ({
  resolveWebullSessionToken: mocks.resolveWebullSessionToken,
  webullSessionStore: () => ({}),
  webullWorkerEnv: async () => undefined,
}));
vi.mock("@/lib/broker/adapters/webullOrders", () => ({
  listWebullAccounts: mocks.listWebullAccounts,
  previewWebullOrder: mocks.previewWebullOrder,
  mintClientOrderId: () => "cid_test_0001",
}));

import { POST } from "./route";

const OWNER = "owner-user-1";

function post(symbol: string): Request {
  return new Request("http://localhost/api/broker/webull/order-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbol, side: "buy", type: "limit", qty: 1, limitPx: 100, tif: "day",
      decisionId: "DEC-1", accountIndex: 0,
    }),
  });
}

describe("POST /api/broker/webull/order-preview — the class is asked, not assumed", () => {
  const previousOwner = process.env.WEBULL_OWNER_USER_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WEBULL_OWNER_USER_ID = OWNER;
    mocks.requireAuth.mockResolvedValue({ ok: true, user: { sub: OWNER } });
    mocks.resolveWebullSessionToken.mockResolvedValue({ accessToken: "tok", tokenless: false, awaiting2fa: false });
    mocks.listWebullAccounts.mockResolvedValue({
      state: "OK",
      accounts: [{ accountId: "ACC000012345", accountType: "MARGIN" }],
    });
    mocks.previewWebullOrder.mockResolvedValue({ state: "PREVIEWED", payload: { estimated_cost: "100" } });
  });

  afterEach(() => {
    if (previousOwner === undefined) delete process.env.WEBULL_OWNER_USER_ID;
    else process.env.WEBULL_OWNER_USER_ID = previousOwner;
  });

  it.each([
    ["ES1!", "futures"],
    ["GC1!", "futures"],
    ["BTCUSD", "crypto"],
    ["SPX", "an index"],
  ])("refuses %s (%s) with 422 BEFORE any Webull session, account or preview call", async (symbol, noun) => {
    const res = await POST(post(symbol));
    expect(res.status).toBe(422);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.state).toBe("REFUSED_LOCAL");
    expect(body.reason).toBe(`Equities only — this preview cannot price ${noun} (${symbol}). Nothing is sent to Webull.`);
    // Nothing downstream was even asked.
    expect(mocks.resolveWebullSessionToken).not.toHaveBeenCalled();
    expect(mocks.listWebullAccounts).not.toHaveBeenCalled();
    expect(mocks.previewWebullOrder).not.toHaveBeenCalled();
  });

  it("an equity still previews, and the intent's class is DERIVED as equity", async () => {
    const res = await POST(post("TSLA"));
    expect(res.status).toBe(200);
    expect(mocks.previewWebullOrder).toHaveBeenCalledTimes(1);
    const intent = mocks.previewWebullOrder.mock.calls[0]![2] as Record<string, unknown>;
    expect(intent.symbol).toBe("TSLA");
    expect(intent.assetClass).toBe("equity");
  });

  it("the owner gate still runs FIRST — a non-owner learns nothing about scope", async () => {
    mocks.requireAuth.mockResolvedValue({ ok: true, user: { sub: "someone-else" } });
    const res = await POST(post("ES1!"));
    expect(res.status).toBe(403);
  });
});
