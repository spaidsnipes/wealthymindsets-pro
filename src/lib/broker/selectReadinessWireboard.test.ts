import { describe, it, expect } from "vitest";
import { selectReadinessWireboard, type ReadinessPayload } from "./selectReadinessWireboard";
import type { ProviderReadiness } from "./providerReadiness";

const ready: ProviderReadiness = {
  provider: "alpaca-live",
  label: "Alpaca (live)",
  lane: "broker",
  status: "READY",
  missing: [],
  missingRecommended: [],
  note: "Live-account key/secret pair.",
};

const blocked: ProviderReadiness = {
  provider: "webull-data",
  label: "Webull market data",
  lane: "market-data",
  status: "BLOCKED",
  missing: ["WEBULL_API_HOST"],
  missingRecommended: ["WEBULL_DATA_URL", "WEBULL_CANARY_SYMBOL"],
  note: "Signed tick reads.",
};

const payload = (providers: ProviderReadiness[]): ReadinessPayload => ({
  surface: "broker-readiness",
  providers,
  envPresence: [
    { name: "ALPACA_KEY", present: true },
    { name: "ALPACA_SECRET", present: true },
    { name: "WEBULL_API_HOST", present: false },
  ],
});

describe("selectReadinessWireboard", () => {
  it("maps providers to rows preserving identity, lane, and status", () => {
    const wb = selectReadinessWireboard(payload([ready, blocked]));
    expect(wb.rows).toHaveLength(2);
    expect(wb.rows[0]).toMatchObject({ provider: "alpaca-live", lane: "broker", status: "READY" });
    expect(wb.rows[1]).toMatchObject({ provider: "webull-data", lane: "market-data", status: "BLOCKED" });
  });

  it("labels a BLOCKED provider as NOT CONFIGURED and names the exact missing var — never entitlement", () => {
    const wb = selectReadinessWireboard(payload([blocked]));
    const row = wb.rows[0];
    expect(row.blockerClass).toBe("NOT CONFIGURED");
    expect(row.blockerDetail).toContain("WEBULL_API_HOST");
    expect(row.blockerDetail).toContain("NOT CONFIGURED");
    // Monday Test 2 law: presence-only readiness must NEVER fabricate an
    // entitlement/delay blocker.
    expect(row.blockerDetail.toUpperCase()).not.toContain("ENTITLEMENT");
    expect(row.blockerDetail.toUpperCase()).not.toContain("DELAYED");
  });

  it("labels a READY provider honestly as not-yet-connected, never certified", () => {
    const wb = selectReadinessWireboard(payload([ready]));
    const row = wb.rows[0];
    expect(row.blockerClass).toBe("READY");
    expect(row.blockerDetail.toLowerCase()).toContain("not yet connected");
    expect(row.blockerDetail.toLowerCase()).not.toContain("certified — ");
  });

  it("surfaces a fidelity gap for a READY provider missing recommended vars, without blocking it", () => {
    const readyWithGap: ProviderReadiness = { ...ready, missingRecommended: ["ALPACA_FEED"] };
    const wb = selectReadinessWireboard(payload([readyWithGap]));
    expect(wb.rows[0].status).toBe("READY");
    expect(wb.rows[0].blockerDetail).toContain("ALPACA_FEED");
    expect(wb.rows[0].blockerDetail.toLowerCase()).toContain("fidelity gap");
  });

  it("pluralizes the missing-variables sentence correctly", () => {
    const twoMissing: ProviderReadiness = { ...blocked, missing: ["A", "B"] };
    const oneMissing: ProviderReadiness = { ...blocked, missing: ["A"] };
    expect(selectReadinessWireboard(payload([twoMissing])).rows[0].blockerDetail).toContain("variables: A, B");
    expect(selectReadinessWireboard(payload([oneMissing])).rows[0].blockerDetail).toContain("variable: A");
  });

  it("computes a value-free headline summary and ready count", () => {
    const wb = selectReadinessWireboard(payload([ready, blocked]));
    expect(wb.summary).toBe("1/2 providers READY");
    expect(wb.readyCount).toBe(1);
    expect(wb.totalCount).toBe(2);
  });

  it("counts env presence without leaking any value", () => {
    const wb = selectReadinessWireboard(payload([ready]));
    expect(wb.envPresentCount).toBe(2);
    expect(wb.envTotalCount).toBe(3);
  });

  it("treats a null / empty payload as empty, never throwing", () => {
    expect(selectReadinessWireboard(null).empty).toBe(true);
    expect(selectReadinessWireboard(undefined).rows).toEqual([]);
    expect(selectReadinessWireboard({}).summary).toBe("0/0 providers READY");
  });
});
