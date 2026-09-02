import { describe, it, expect } from "vitest";
import { resolveExecutionReady, type ExecutionConnectionReceipt } from "./executionConnectivity";
import type { AuthorizationDecision } from "./executionAuthority";
import type { ProviderReadiness } from "@/lib/broker/providerReadiness";

const authorized: AuthorizationDecision = {
  authorized: true,
  actionClass: "LOW_RISK_ACT",
  requiresHumanApproval: false,
  reasonCode: "AUTHORIZED",
  reason: "Authorized to execute (ACTION).",
};

const denied: AuthorizationDecision = {
  authorized: false,
  actionClass: "HIGH_IMPACT_ACT",
  requiresHumanApproval: true,
  reasonCode: "DENIED_HUMAN_APPROVAL_REQUIRED",
  reason: "Live execution requires explicit human authorization.",
};

const readyProvider: ProviderReadiness = {
  provider: "alpaca-live",
  label: "Alpaca (live)",
  lane: "broker",
  status: "READY",
  missing: [],
  missingRecommended: [],
  note: "Live-account key/secret pair.",
};

const blockedProvider: ProviderReadiness = {
  provider: "tastytrade",
  label: "Tastytrade",
  lane: "broker",
  status: "BLOCKED",
  missing: ["TASTYTRADE_REFRESH_TOKEN"],
  missingRecommended: [],
  note: "Needs the OAuth client pair AND a refresh token.",
};

const liveExecutionReceipt: ExecutionConnectionReceipt = {
  provider: "alpaca-live",
  connected: true,
  executionCapable: true,
  reason: "Authenticated order capability probe passed.",
};

const readOnlyReceipt: ExecutionConnectionReceipt = {
  provider: "alpaca-live",
  connected: true,
  executionCapable: false,
  reason: "Account read succeeded; order capability was not exercised.",
};

describe("resolveExecutionReady", () => {
  it("READY_TO_EXECUTE only when authority, config, connection, and execution capability agree", () => {
    const v = resolveExecutionReady(authorized, readyProvider, liveExecutionReceipt);
    expect(v.state).toBe("READY_TO_EXECUTE");
    expect(v.canReachBroker).toBe(true);
    expect(v.canExecute).toBe(true);
    expect(v.missing).toEqual([]);
  });

  it("does not round configured credentials up to a broker connection", () => {
    const v = resolveExecutionReady(authorized, readyProvider);
    expect(v.state).toBe("AUTHORIZED_CONFIGURED_UNPROVEN");
    expect(v.canReachBroker).toBe(false);
    expect(v.canExecute).toBe(false);
    expect(v.reason).toContain("no matching live connection receipt");
  });

  it("keeps a proven read-only connection below execution readiness", () => {
    const v = resolveExecutionReady(authorized, readyProvider, readOnlyReceipt);
    expect(v.state).toBe("AUTHORIZED_CONNECTED_READ_ONLY");
    expect(v.canReachBroker).toBe(true);
    expect(v.canExecute).toBe(false);
    expect(v.reason).toContain("execution is not proven");
  });

  it("rejects a live receipt from a different provider", () => {
    const v = resolveExecutionReady(authorized, readyProvider, {
      ...liveExecutionReceipt,
      provider: "webull-broker",
    });
    expect(v.state).toBe("AUTHORIZED_CONFIGURED_UNPROVEN");
    expect(v.canExecute).toBe(false);
  });

  it("AUTHORIZED_BUT_DISCONNECTED when authorized but provider BLOCKED — names the missing vars", () => {
    const v = resolveExecutionReady(authorized, blockedProvider);
    expect(v.state).toBe("AUTHORIZED_BUT_DISCONNECTED");
    expect(v.canReachBroker).toBe(false);
    expect(v.canExecute).toBe(false);
    expect(v.missing).toEqual(["TASTYTRADE_REFRESH_TOKEN"]);
    expect(v.reason).toContain("TASTYTRADE_REFRESH_TOKEN");
  });

  it("a DENIED authorization dominates — connectivity is moot even if provider READY", () => {
    const v = resolveExecutionReady(denied, readyProvider);
    expect(v.state).toBe("NOT_AUTHORIZED");
    expect(v.canReachBroker).toBe(false);
    expect(v.canExecute).toBe(false);
    expect(v.reason).toBe(denied.reason);
    expect(v.missing).toEqual([]);
  });

  it("never rounds up: authorized + blocked can never report canReachBroker true", () => {
    const v = resolveExecutionReady(authorized, blockedProvider);
    expect(v.canReachBroker).toBe(false);
  });
});
