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
// The server-held limits (2026-10-09: this door now runs the same preflight as
// tastytrade's). `limitsRecord` is what the KV holds for the owner's limits key.
const ARMED_LIMITS = { armed: true, killSwitch: false, maxContractsPerOrder: 5, maxSharesPerOrder: 100, maxNotionalUsdPerOrder: 5000, maxLossUsdPerOrder: 2000, maxQuoteAgeMs: 5000, updatedAtMs: 1 };
const store: { limitsRecord: string | null; puts: [string, string][] } = { limitsRecord: JSON.stringify(ARMED_LIMITS), puts: [] };
const KV = {
  get: vi.fn(async (key: string) => (key.startsWith("wm:execution-limits:") ? store.limitsRecord : null)),
  put: vi.fn(async (key: string, value: string) => { store.puts.push([key, value]); }),
};

const TSLA_CALL = {
  optionOsi: "TSLA261016C00305000", positionIntent: "BUY_TO_OPEN", qty: 1, type: "limit", limitPx: 12.5, tif: "day",
  decisionId: "wmd_test_decision", clientOrderId: "wmo0123456789abcdef", accountIndex: 0, confirmLive: true,
  // What the ticket showed: the environment and the touch it priced against.
  environment: "production", quote: { bid: 12.4, ask: 12.5, atMs: Date.now() },
};
const post = (body: unknown) => POST(new Request("http://localhost/api/broker/webull/order-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));

describe("POST /api/broker/webull/order-submit — the firewall refuses before money moves", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.limitsRecord = JSON.stringify(ARMED_LIMITS);
    store.puts = [];
    TSLA_CALL.quote = { bid: 12.4, ask: 12.5, atMs: Date.now() };
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
    // 2026-10-09: with no store there are no server-held limits either, and the
    // server gate (earlier in the firewall) answers first. Either way nothing is sent.
    const j = await (await post(TSLA_CALL)).json();
    expect(["LIMITS_UNSET", "NO_DURABLE_LEDGER"]).toContain(j.state);
    expect(mocks.previewWebullOrder).not.toHaveBeenCalled();
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

describe("POST /api/broker/webull/order-submit — the SERVER gate stands before any call to Webull (2026-10-09)", () => {
  const noWebullCall = () => {
    expect(mocks.resolveWebullSessionToken).not.toHaveBeenCalled();
    expect(mocks.listWebullAccounts).not.toHaveBeenCalled();
    expect(mocks.previewWebullOrder).not.toHaveBeenCalled();
    expect(mocks.submitWebullOrderOnce).not.toHaveBeenCalled();
  };
  beforeEach(() => {
    vi.clearAllMocks();
    store.limitsRecord = JSON.stringify(ARMED_LIMITS);
    store.puts = [];
    TSLA_CALL.quote = { bid: 12.4, ask: 12.5, atMs: Date.now() };
    process.env.WEBULL_OWNER_USER_ID = OWNER;
    mocks.requireAuth.mockResolvedValue({ ok: true, user: { sub: OWNER } });
    mocks.workerEnv.mockResolvedValue({ WEBULL_SESSION: KV });
    mocks.resolveWebullSessionToken.mockResolvedValue({ accessToken: "tok", tokenless: false, awaiting2fa: false });
    mocks.listWebullAccounts.mockResolvedValue({ state: "OK", accounts: [{ accountId: "ACC000012345", accountType: "MARGIN" }] });
    mocks.previewWebullOrder.mockResolvedValue({ state: "PREVIEWED", payload: {} });
    mocks.submitWebullOrderOnce.mockResolvedValue({ outcome: "ACKNOWLEDGED", clientOrderId: TSLA_CALL.clientOrderId, brokerOrderId: "WB1", note: "ok", sent: true });
  });

  it("kill switch on → refused in the tastytrade door's own words, before any Webull call; the refusal is written down", async () => {
    store.limitsRecord = JSON.stringify({ ...ARMED_LIMITS, killSwitch: true });
    const r = await post(TSLA_CALL);
    expect(r.status).toBe(422);
    const j = await r.json();
    expect(j.state).toBe("KILL_SWITCH");
    expect(j.reason).toContain("The kill switch is engaged. No new live order can be sent until you release it in Settings › Execution.");
    expect(j.reason).not.toMatch(/[A-Z]{3,}_[A-Z_]{3,}/); // no env var or code in the trader's sentence
    noWebullCall();
    const refusal = store.puts.find(([k]) => k.startsWith("wm:order-refusal:v1:webull:"));
    expect(refusal).toBeDefined();
    expect(JSON.parse(refusal![1])).toMatchObject({ broker: "webull", clientOrderId: TSLA_CALL.clientOrderId, decisionId: "wmd_test_decision", qty: 1, action: "Buy to Open" });
    expect(JSON.parse(refusal![1]).codes).toContain("KILL_SWITCH");
  });

  it("server arm off → refused before any Webull call", async () => {
    store.limitsRecord = JSON.stringify({ ...ARMED_LIMITS, armed: false });
    const j = await (await post(TSLA_CALL)).json();
    expect(j.state).toBe("REFUSED_PREFLIGHT");
    expect(j.reason).toContain("Live trading is DISARMED on the server. Arm it in Settings › Execution.");
    noWebullCall();
  });

  it("limits never set, unreadable, or the store throwing → refused (fail closed)", async () => {
    store.limitsRecord = null;
    expect((await (await post(TSLA_CALL)).json()).state).toBe("LIMITS_UNSET");
    noWebullCall();
    store.limitsRecord = "{not json";
    const j = await (await post(TSLA_CALL)).json();
    expect(["LIMITS_UNSET", "REFUSED_PREFLIGHT"]).toContain(j.state);
    noWebullCall();
    KV.get.mockRejectedValueOnce(new Error("kv down"));
    expect((await (await post(TSLA_CALL)).json()).state).toBe("LIMITS_UNSET");
    noWebullCall();
  });

  it("over the contracts cap, or an unset cap → refused", async () => {
    expect((await (await post({ ...TSLA_CALL, qty: 6 })).json()).reason).toContain("6 contracts is above your 5-contract ceiling.");
    store.limitsRecord = JSON.stringify({ ...ARMED_LIMITS, maxNotionalUsdPerOrder: null });
    expect((await (await post(TSLA_CALL)).json()).reason).toContain("Set a maximum notional per order on the server");
    noWebullCall();
  });

  it("what the ticket did not state refuses: no environment, a cert ticket, no quote or a stale one for a risk-increasing order", async () => {
    expect((await (await post({ ...TSLA_CALL, environment: undefined })).json()).reason).toContain("The ticket did not state an environment");
    expect((await (await post({ ...TSLA_CALL, environment: "cert" })).json()).reason).toContain("the server trades PRODUCTION");
    expect((await (await post({ ...TSLA_CALL, quote: undefined })).json()).reason).toContain("No live quote for this contract");
    expect((await (await post({ ...TSLA_CALL, quote: { bid: 12.4, ask: 12.5, atMs: Date.now() - 60_000 } })).json()).reason).toMatch(/The quote is \d+\.\ds old/);
    noWebullCall();
  });

  it("no stop rail on Webull: an opening STOCK order (or one that does not say open / close) and a sold-to-open option are refused; closing stays open", async () => {
    const stock = { symbol: "TSLA", side: "buy", qty: 1, type: "limit", limitPx: 300, tif: "day", decisionId: "wmd_x", clientOrderId: "wmo1", accountIndex: 0, confirmLive: true, environment: "production", quote: { bid: 299.9, ask: 300, atMs: Date.now() } };
    expect((await (await post(stock)).json()).reason).toContain("No verified protection for Equity");
    expect((await (await post({ ...TSLA_CALL, positionIntent: "SELL_TO_OPEN" })).json()).reason).toContain("Selling options to open (undefined risk) is not supported");
    noWebullCall();
    // Exit is easier than entry: a closing limit needs no quote and passes the gate.
    const close = await (await post({ ...TSLA_CALL, positionIntent: "SELL_TO_CLOSE", quote: undefined })).json();
    expect(close.state).toBe("ACKNOWLEDGED");
  });

  it("a passing order still previews, then places once — nothing became more permissive", async () => {
    const j = await (await post(TSLA_CALL)).json();
    expect(j.state).toBe("ACKNOWLEDGED");
    expect(mocks.previewWebullOrder).toHaveBeenCalledBefore(mocks.submitWebullOrderOnce);
    expect(mocks.submitWebullOrderOnce).toHaveBeenCalledTimes(1);
    expect(store.puts.some(([k]) => k.startsWith("wm:order-refusal:"))).toBe(false);
  });
});
