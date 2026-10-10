import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  getTastytradeAccounts: vi.fn(),
  getTastytradeLiveOrders: vi.fn(),
  dryRunTastytradeOrder: vi.fn(),
  submitTastytradeOrder: vi.fn(),
  kv: new Map<string, string>(),
}));

vi.mock("@/lib/requireAuth", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/tastytrade", () => ({
  tastytradeConfigStatus: () => ({ configured: true }),
  getTastytradeAccounts: mocks.getTastytradeAccounts,
  getTastytradeLiveOrders: mocks.getTastytradeLiveOrders,
  dryRunTastytradeOrder: mocks.dryRunTastytradeOrder,
  submitTastytradeOrder: mocks.submitTastytradeOrder,
}));

// The deployment's KV store (server-held limits + the order → decision ledger), faked in memory.
vi.mock("@/lib/marketData/webullSessionStore", () => ({
  WEBULL_SESSION_KV_BINDING: "WEBULL_SESSION",
  webullWorkerEnv: async () => ({ WEBULL_SESSION: { get: async (k: string) => mocks.kv.get(k) ?? null, put: async (k: string, v: string) => { mocks.kv.set(k, v); } } }),
}));

import { POST } from "./route";
import { serverLimitsKey } from "@/lib/execution/serverOrderLimitsStore";

const LIMITS = { armed: true, killSwitch: false, maxContractsPerOrder: 2, maxSharesPerOrder: 100, maxNotionalUsdPerOrder: 100_000, maxLossUsdPerOrder: 300, maxQuoteAgeMs: 5_000, maxOrdersPerMinute: 5, maxOrdersPerDay: 50, updatedAtMs: 1 };

// The owner's two real accounts, by shape: …6649 is NOT futures-approved, …5019 is.
const ACCOUNTS = [
  { accountNumber: "5WI96649", isFuturesApproved: false },
  { accountNumber: "5WI95019", isFuturesApproved: true },
];

const MNQ = {
  instrumentType: "Future", symbol: "/MNQZ6", action: "Buy to Open", qty: 1, type: "Limit", limitPx: 30000,
  decisionId: "wmd_test_decision", clientOrderId: "wmo_abcdef123456", accountIndex: 1, confirmLive: true,
  // Garden 19 §23 / P0.3: the environment the ticket showed, the touch it priced at, the protective stop.
  environment: "production", protectiveStopPx: 29_950, quote: { bid: 29_999.75, ask: 30_000, atMs: Date.now() },
};

const post = (body: unknown) => POST(new NextRequest("http://localhost/api/broker/tastytrade/order-submit", { method: "POST", body: JSON.stringify(body) }));

describe("POST /api/broker/tastytrade/order-submit — the firewall refuses before money moves", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mocks.requireAuth.mockResolvedValue({ ok: true, user: { sub: "owner-1" } });
    mocks.kv.clear();
    mocks.kv.set(serverLimitsKey("owner-1"), JSON.stringify(LIMITS));
    vi.stubEnv("WEBULL_OWNER_USER_ID", "owner-1");
    mocks.getTastytradeAccounts.mockResolvedValue(ACCOUNTS);
    mocks.getTastytradeLiveOrders.mockResolvedValue([]);
    mocks.dryRunTastytradeOrder.mockResolvedValue({ "buying-power-effect": {} });
    mocks.submitTastytradeOrder.mockResolvedValue({ order: { id: 777, status: "Received", "external-identifier": MNQ.clientOrderId, legs: [{ symbol: "/MNQZ6", action: "Buy to Open", quantity: 1, "remaining-quantity": 1 }] } });
  });

  it("another user is refused and nothing reaches tastytrade", async () => {
    mocks.requireAuth.mockResolvedValue({ ok: true, user: { sub: "someone-else" } });
    const r = await post(MNQ);
    expect(r.status).toBe(403);
    expect(mocks.submitTastytradeOrder).not.toHaveBeenCalled();
  });

  it("without the human's explicit live confirmation in THIS request, nothing is sent", async () => {
    const r = await post({ ...MNQ, confirmLive: undefined });
    expect(r.status).toBe(403);
    await expect(r.json()).resolves.toMatchObject({ state: "NOT_AUTHORIZED", code: "DENIED_HUMAN_APPROVAL_REQUIRED" });
    expect(mocks.submitTastytradeOrder).not.toHaveBeenCalled();
  });

  it("a continuous symbol, a missing Decision_ID or no named account is refused locally", async () => {
    for (const bad of [{ ...MNQ, symbol: "MNQ1!" }, { ...MNQ, decisionId: "" }, { ...MNQ, accountIndex: undefined }]) {
      const r = await post(bad);
      expect(r.status).toBe(422);
      await expect(r.json()).resolves.toMatchObject({ state: "REFUSED_LOCAL" });
    }
    expect(mocks.submitTastytradeOrder).not.toHaveBeenCalled();
  });

  it("a futures order to the non-futures account is refused in words, never moved to another account", async () => {
    const r = await post({ ...MNQ, accountIndex: 0 });
    expect(r.status).toBe(422);
    const j = await r.json();
    expect(j.reason).toMatch(/…6649 is not futures-enabled/);
    expect(mocks.submitTastytradeOrder).not.toHaveBeenCalled();
  });

  it("an order already at tastytrade with this idempotency key is returned, never sent twice", async () => {
    mocks.getTastytradeLiveOrders.mockResolvedValue([{ id: 555, status: "Live", "external-identifier": MNQ.clientOrderId, legs: [] }]);
    const j = await (await post(MNQ)).json();
    expect(j).toMatchObject({ state: "ALREADY_SENT", order: { id: "555", state: "WORKING" } });
    expect(mocks.submitTastytradeOrder).not.toHaveBeenCalled();
  });

  it("a dry-run rejection is DRY_RUN_FAILED (not placed), never UNKNOWN", async () => {
    mocks.dryRunTastytradeOrder.mockRejectedValue(new Error("tastytrade POST failed (HTTP 422): insufficient buying power"));
    const r = await post(MNQ);
    expect(r.status).toBe(422);
    await expect(r.json()).resolves.toMatchObject({ state: "DRY_RUN_FAILED" });
    expect(mocks.submitTastytradeOrder).not.toHaveBeenCalled();
  });

  it("passes every gate: dry run first, then ONE submit to the named account, acknowledged", async () => {
    const j = await (await post(MNQ)).json();
    expect(mocks.dryRunTastytradeOrder).toHaveBeenCalledBefore(mocks.submitTastytradeOrder);
    expect(mocks.submitTastytradeOrder).toHaveBeenCalledTimes(1);
    expect(mocks.submitTastytradeOrder.mock.calls[0][0]).toBe("5WI95019");
    expect(mocks.submitTastytradeOrder.mock.calls[0][1]).toMatchObject({ "external-identifier": MNQ.clientOrderId, legs: [{ symbol: "/MNQZ6", quantity: 1 }] });
    expect(j).toMatchObject({ state: "ACKNOWLEDGED", account: "5019", order: { id: "777", state: "ACKNOWLEDGED" } });
  });

  it("a failure DURING submission is UNKNOWN with the key to reconcile by — it may have been placed", async () => {
    mocks.submitTastytradeOrder.mockRejectedValue(new Error("network"));
    const j = await (await post(MNQ)).json();
    expect(j).toMatchObject({ state: "UNKNOWN", reconcileBy: MNQ.clientOrderId });
  });

  // ── Garden 19 §23 / P0.3: the server-held limits refuse before tastytrade is asked anything ──
  const nothingReachedTastytrade = () => {
    expect(mocks.getTastytradeAccounts).not.toHaveBeenCalled();
    expect(mocks.dryRunTastytradeOrder).not.toHaveBeenCalled();
    expect(mocks.submitTastytradeOrder).not.toHaveBeenCalled();
  };

  it("no limits stored on the server → LIMITS_UNSET, nothing sent", async () => {
    mocks.kv.clear();
    const r = await post({ ...MNQ, quote: { ...MNQ.quote, atMs: Date.now() } });
    expect(r.status).toBe(422);
    await expect(r.json()).resolves.toMatchObject({ state: "LIMITS_UNSET" });
    nothingReachedTastytrade();
  });

  it("the kill switch refuses a fully confirmed, in-cap order", async () => {
    mocks.kv.set(serverLimitsKey("owner-1"), JSON.stringify({ ...LIMITS, killSwitch: true }));
    const r = await post({ ...MNQ, quote: { ...MNQ.quote, atMs: Date.now() } });
    await expect(r.json()).resolves.toMatchObject({ state: "KILL_SWITCH" });
    nothingReachedTastytrade();
  });

  it("server DISARMED, over a cap, stale quote, no protective stop, wrong environment — each refused, nothing sent", async () => {
    const fresh = () => ({ ...MNQ.quote, atMs: Date.now() });
    const cases: [Record<string, unknown>, string][] = [
      [{ ...MNQ, quote: fresh(), qty: 3 }, "OVER_QTY_CAP"],
      [{ ...MNQ, quote: { ...MNQ.quote, atMs: Date.now() - 60_000 } }, "QUOTE_STALE"],
      [{ ...MNQ, quote: undefined }, "QUOTE_STALE"],
      [{ ...MNQ, quote: fresh(), protectiveStopPx: undefined }, "NO_PROTECTION"],
      [{ ...MNQ, quote: fresh(), protectiveStopPx: 29_000 }, "OVER_LOSS_CAP"],
      [{ ...MNQ, quote: fresh(), environment: "cert" }, "ENVIRONMENT"],
      [{ ...MNQ, quote: fresh(), environment: undefined }, "ENVIRONMENT"],
    ];
    for (const [body, code] of cases) {
      const j = await (await post(body)).json();
      expect(j.state, code).toBe("REFUSED_PREFLIGHT");
      expect(j.refusals.map((x: { code: string }) => x.code), code).toContain(code);
    }
    mocks.kv.set(serverLimitsKey("owner-1"), JSON.stringify({ ...LIMITS, armed: false }));
    const j = await (await post({ ...MNQ, quote: fresh() })).json();
    expect(j.refusals.map((x: { code: string }) => x.code)).toContain("DISARMED");
    nothingReachedTastytrade();
  });

  it("a closing resting stop (protection) is not held hostage to a dead quote", async () => {
    const j = await (await post({ ...MNQ, action: "Sell to Close", type: "Stop", limitPx: undefined, stopPx: 29_950, protectiveStopPx: undefined, quote: undefined, tif: "GTC" })).json();
    expect(j.state).toBe("ACKNOWLEDGED");
  });
});
