import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  getTastytradeAccounts: vi.fn(),
  dryRunTastytradeOrder: vi.fn(),
  submitTastytradeOrder: vi.fn(),
  kv: new Map<string, string>(),
}));

vi.mock("@/lib/requireAuth", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/lib/tastytrade", () => ({
  tastytradeConfigStatus: () => ({ configured: true, env: "production" }),
  getTastytradeAccounts: mocks.getTastytradeAccounts,
  dryRunTastytradeOrder: mocks.dryRunTastytradeOrder,
  submitTastytradeOrder: mocks.submitTastytradeOrder,
}));
vi.mock("@/lib/marketData/webullSessionStore", () => ({
  WEBULL_SESSION_KV_BINDING: "WEBULL_SESSION",
  webullWorkerEnv: async () => ({ WEBULL_SESSION: { get: async (k: string) => mocks.kv.get(k) ?? null, put: async (k: string, v: string) => { mocks.kv.set(k, v); } } }),
}));

import { POST } from "./route";
import { serverLimitsKey } from "@/lib/execution/serverOrderLimitsStore";

const LIMITS = { armed: true, killSwitch: false, maxContractsPerOrder: 2, maxSharesPerOrder: 100, maxNotionalUsdPerOrder: 100_000, maxLossUsdPerOrder: 300, maxQuoteAgeMs: 5_000, maxOrdersPerMinute: 5, maxOrdersPerDay: 50, updatedAtMs: 1 };
const body = () => ({
  instrumentType: "Future", symbol: "/MNQZ6", action: "Buy to Open", qty: 1, type: "Limit", limitPx: 30_000, decisionId: "wmd_preview",
  accountIndex: 1, environment: "production", protectiveStopPx: 29_950, quote: { bid: 29_999.75, ask: 30_000, atMs: Date.now() },
});
const post = (b: unknown) => POST(new NextRequest("http://localhost/api/broker/tastytrade/order-dry-run", { method: "POST", body: JSON.stringify(b) }));

describe("PREVIEW (Garden 19 §23): tastytrade's dry run plus the server's own gate — never a send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("WEBULL_OWNER_USER_ID", "owner-1");
    mocks.requireAuth.mockResolvedValue({ ok: true, user: { sub: "owner-1" } });
    mocks.getTastytradeAccounts.mockResolvedValue([{ accountNumber: "5WI96649", isFuturesApproved: false }, { accountNumber: "5WI95019", isFuturesApproved: true }]);
    mocks.dryRunTastytradeOrder.mockResolvedValue({ "buying-power-effect": {} });
    mocks.kv.clear();
    mocks.kv.set(serverLimitsKey("owner-1"), JSON.stringify(LIMITS));
  });

  it("answers the gate's pass beside the dry run, with the loss at the stop", async () => {
    const j = await (await post(body())).json();
    expect(j).toMatchObject({ state: "DRY_RUN_OK", preflight: { ok: true, lossAtStopUsd: 100, protection: "BROKER-NATIVE" } });
    expect(mocks.submitTastytradeOrder).not.toHaveBeenCalled();
  });

  it("answers what the send WOULD refuse (unset limits, no stop) — the dry run itself still places nothing", async () => {
    mocks.kv.clear();
    const j = await (await post({ ...body(), protectiveStopPx: undefined })).json();
    expect(j.state).toBe("DRY_RUN_OK");
    expect(j.preflight.ok).toBe(false);
    expect(j.preflight.refusals.map((r: { code: string }) => r.code)).toEqual(expect.arrayContaining(["LIMITS_UNSET", "NO_PROTECTION"]));
    expect(mocks.submitTastytradeOrder).not.toHaveBeenCalled();
  });

  it("an account the server chose by default is not an explicit account", async () => {
    const j = await (await post({ ...body(), accountIndex: undefined })).json();
    expect(j.preflight.refusals.map((r: { code: string }) => r.code)).toContain("ACCOUNT_UNSTATED");
  });

  it("a broker refusal still carries the gate's answer (measured on prod 2026-10-07: 422 buying power hid it)", async () => {
    mocks.dryRunTastytradeOrder.mockRejectedValue(new Error("HTTP 422: insufficient buying power"));
    const j = await (await post(body())).json();
    expect(j).toMatchObject({ state: "REJECTED", preflight: { ok: true, lossAtStopUsd: 100 } });
    expect(j.reason).toMatch(/buying power/);
  });
});
