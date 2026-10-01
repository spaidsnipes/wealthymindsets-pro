import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  resolveWebullSessionToken: vi.fn(),
  listWebullAccounts: vi.fn(),
  previewWebullOrder: vi.fn(),
  submitWebullOrderOnce: vi.fn(),
  workerEnv: vi.fn(),
}));

vi.mock("@/lib/requireAuth", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/broker/adapters/webullBrokerConnection", () => ({
  webullBrokerConfigFromEnv: () => ({ appKey: "test-app-key", appSecret: "test-app-secret", apiHost: "api.webull.test" }),
}));
vi.mock("@/lib/marketData/webullSessionStore", () => ({
  WEBULL_SESSION_KV_BINDING: "WEBULL_SESSION",
  resolveWebullSessionToken: mocks.resolveWebullSessionToken,
  webullSessionStore: () => ({}),
  webullWorkerEnv: mocks.workerEnv,
}));
vi.mock("@/lib/broker/adapters/webullOrders", async () => {
  const real = await vi.importActual<typeof import("@/lib/broker/adapters/webullOrders")>("@/lib/broker/adapters/webullOrders");
  return { ...real, listWebullAccounts: mocks.listWebullAccounts, previewWebullOrder: mocks.previewWebullOrder, submitWebullOrderOnce: mocks.submitWebullOrderOnce };
});

import { POST } from "./route";

const OWNER = "owner-user-1";
const KV = { get: vi.fn(async () => null), put: vi.fn(async () => {}) };

const TSLA_CALL = {
  optionOsi: "TSLA261016C00305000", positionIntent: "BUY_TO_OPEN", qty: 1, type: "limit", limitPx: 12.5, tif: "day",
  decisionId: "wmd_test_decision", clientOrderId: "wmo0123456789abcdef", accountIndex: 0, confirmLive: true,
};
const post = (body: unknown) => POST(new Request("http://localhost/api/broker/webull/order-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));

describe("POST /api/broker/webull/order-submit — the firewall refuses before money moves", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WEBULL_OWNER_USER_ID = OWNER;
    mocks.requireAuth.mockResolvedValue({ ok: true, user: { sub: OWNER } });
    mocks.workerEnv.mockResolvedValue({ WEBULL_SESSION: KV });
    mocks.resolveWebullSessionToken.mockResolvedValue({ accessToken: "tok", tokenless: false, awaiting2fa: false });
    mocks.listWebullAccounts.mockResolvedValue({ state: "OK", accounts: [{ accountId: "ACC000012345", accountType: "MARGIN" }] });
    mocks.previewWebullOrder.mockResolvedValue({ state: "PREVIEWED", payload: {} });
    mocks.submitWebullOrderOnce.mockResolvedValue({ outcome: "ACKNOWLEDGED", clientOrderId: TSLA_CALL.clientOrderId, brokerOrderId: "WB1", note: "ok", sent: true });
  });

  it("another user is refused and nothing reaches Webull", async () => {
    mocks.requireAuth.mockResolvedValue({ ok: true, user: { sub: "someone-else" } });
    expect((await post(TSLA_CALL)).status).toBe(403);
    expect(mocks.submitWebullOrderOnce).not.toHaveBeenCalled();
  });

  it("without the human's explicit live confirmation, nothing is sent", async () => {
    const r = await post({ ...TSLA_CALL, confirmLive: false });
    expect(r.status).toBe(403);
    await expect(r.json()).resolves.toMatchObject({ state: "NOT_AUTHORIZED", code: "DENIED_HUMAN_APPROVAL_REQUIRED" });
    expect(mocks.previewWebullOrder).not.toHaveBeenCalled();
    expect(mocks.submitWebullOrderOnce).not.toHaveBeenCalled();
  });

  it("a non-OSI contract, a missing open/close intent, an ineligible class or no named account is refused locally", async () => {
    for (const bad of [
      { ...TSLA_CALL, optionOsi: "TSLA-CALL-305" },
      { ...TSLA_CALL, positionIntent: undefined },
      { ...TSLA_CALL, optionOsi: undefined, symbol: "ES1!" },
      { ...TSLA_CALL, accountIndex: undefined },
    ]) {
      const r = await post(bad);
      expect(r.status).toBe(422);
    }
    expect(mocks.submitWebullOrderOnce).not.toHaveBeenCalled();
  });

  it("with no durable ledger bound, live orders are refused — never placed against memory", async () => {
    mocks.workerEnv.mockResolvedValue(undefined);
    await expect((await post(TSLA_CALL)).json()).resolves.toMatchObject({ state: "NO_DURABLE_LEDGER" });
    expect(mocks.submitWebullOrderOnce).not.toHaveBeenCalled();
  });

  it("a refused Webull preview places nothing", async () => {
    mocks.previewWebullOrder.mockResolvedValue({ state: "REJECTED", status: 417, reason: "insufficient buying power" });
    const r = await post(TSLA_CALL);
    expect(r.status).toBe(422);
    await expect(r.json()).resolves.toMatchObject({ state: "PREVIEW_FAILED", reason: "insufficient buying power" });
    expect(mocks.submitWebullOrderOnce).not.toHaveBeenCalled();
  });

  it("passes every gate: the OSI contract, previewed, then placed ONCE with the gate open and the client's own key", async () => {
    const j = await (await post(TSLA_CALL)).json();
    expect(mocks.previewWebullOrder).toHaveBeenCalledBefore(mocks.submitWebullOrderOnce);
    expect(mocks.submitWebullOrderOnce).toHaveBeenCalledTimes(1);
    const [, cfg, , intent] = mocks.submitWebullOrderOnce.mock.calls[0];
    expect(cfg.liveOrdersEnabled).toBe(true);
    expect(intent).toMatchObject({
      clientOrderId: TSLA_CALL.clientOrderId, assetClass: "option", side: "buy", qty: 1, limitPx: 12.5,
      option: { underlying: "TSLA", expiry: "2026-10-16", strike: 305, right: "CALL", positionIntent: "BUY_TO_OPEN" },
    });
    expect(j).toMatchObject({ state: "ACKNOWLEDGED", brokerOrderId: "WB1", account: "2345" });
  });
});
