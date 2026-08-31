import { describe, it, expect } from "vitest";
import { resolveExecutionReady } from "./executionConnectivity";
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

describe("resolveExecutionReady", () => {
  it("READY_TO_EXECUTE only when authorized AND provider READY", () => {
    const v = resolveExecutionReady(authorized, readyProvider);
    expect(v.state).toBe("READY_TO_EXECUTE");
    expect(v.canReachBroker).toBe(true);
    expect(v.missing).toEqual([]);
  });

  it("AUTHORIZED_BUT_DISCONNECTED when authorized but provider BLOCKED — names the missing vars", () => {
    const v = resolveExecutionReady(authorized, blockedProvider);
    expect(v.state).toBe("AUTHORIZED_BUT_DISCONNECTED");
    expect(v.canReachBroker).toBe(false);
    expect(v.missing).toEqual(["TASTYTRADE_REFRESH_TOKEN"]);
    expect(v.reason).toContain("TASTYTRADE_REFRESH_TOKEN");
  });

  it("a DENIED authorization dominates — connectivity is moot even if provider READY", () => {
    const v = resolveExecutionReady(denied, readyProvider);
    expect(v.state).toBe("NOT_AUTHORIZED");
    expect(v.canReachBroker).toBe(false);
    expect(v.reason).toBe(denied.reason);
    expect(v.missing).toEqual([]);
  });

  it("never rounds up: authorized + blocked can never report canReachBroker true", () => {
    const v = resolveExecutionReady(authorized, blockedProvider);
    expect(v.canReachBroker).toBe(false);
  });
});
