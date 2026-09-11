import { describe, expect, it } from "vitest";
import { classifyWebullTickSnapshot } from "./webullTicksWireStatus";
import type { WebullTickSnapshotResult } from "./webullMarketData";

const snapshot = (
  state: WebullTickSnapshotResult["state"],
  tickCount = 0,
  note = "",
): WebullTickSnapshotResult => ({
  source: "webull",
  state,
  fidelity: state === "OBSERVED" ? "SNAPSHOT" : "NONE",
  symbol: "TSLA",
  requestedAt: "2026-09-11T17:00:00Z",
  signingProfile: "legacy-sha1",
  ticks: Array.from({ length: tickCount }, (_, index) => ({
    symbol: "TSLA",
    price: 300 + index,
    volume: 1,
    observedAtMs: 1_757_610_000_000 + index,
    side: "BUY" as const,
  })),
  note,
});

describe("classifyWebullTickSnapshot", () => {
  it("reports RECEIVING only with real prints", () => {
    const status = classifyWebullTickSnapshot(snapshot("OBSERVED", 3));
    expect(status.label).toBe("RECEIVING");
    expect(status.receiving).toBe(true);
    expect(status.eventCount).toBe(3);
  });

  it("THE ONE THAT MATTERS: OBSERVED with an empty tape is not a proven wire", () => {
    // A call that succeeded and returned nothing has proven the ROUTE, not the
    // feed. Passing this through as RECEIVING beside a zero count is the exact
    // beautiful lie the provider spine bans.
    const status = classifyWebullTickSnapshot(snapshot("OBSERVED", 0));
    expect(status.label).toBe("NO EVENTS RECEIVED");
    expect(status.receiving).toBe(false);
    expect(status.eventCount).toBe(0);
  });

  it("never synthesizes an entitlement claim from a missing configuration", () => {
    // Monday Test 2: ENTITLEMENT may be claimed only when the provider proved
    // entitlement was the failed edge.
    expect(classifyWebullTickSnapshot(snapshot("UNCONFIGURED")).label).toBe("NOT CONFIGURED");
    expect(classifyWebullTickSnapshot(snapshot("NO_EVENTS")).label).toBe("NO EVENTS RECEIVED");
    expect(classifyWebullTickSnapshot(snapshot("BLOCKED_AUTH")).label).toBe("AUTH BLOCKED");
    // …and claims it exactly when the provider DID prove it.
    expect(classifyWebullTickSnapshot(snapshot("BLOCKED_ENTITLEMENT")).label).toBe("ENTITLEMENT BLOCKED");
  });

  it("distinguishes a denied request from an unproven-edge denial", () => {
    // HTTP 403 tells us we were refused, not WHY. Collapsing that into
    // "entitlement" invents the most expensive possible diagnosis.
    expect(classifyWebullTickSnapshot(snapshot("ACCESS_UNPROVEN")).label).toBe("ACCESS UNPROVEN");
  });

  it("never claims events on any non-receiving state", () => {
    const states: WebullTickSnapshotResult["state"][] = [
      "UNCONFIGURED", "BLOCKED_AUTH", "BLOCKED_ENTITLEMENT", "ACCESS_UNPROVEN",
      "RATE_LIMITED", "PROVIDER_ERROR", "NO_EVENTS", "STALE", "CLOCK_INVALID",
      "TIMEOUT", "UNAVAILABLE",
    ];
    for (const state of states) {
      // Deliberately fed a NON-EMPTY tick array: a provider that returns prints
      // alongside a failure state must not have those prints counted as proof.
      const status = classifyWebullTickSnapshot(snapshot(state, 5));
      expect(status.receiving, `${state} must not read as receiving`).toBe(false);
      expect(status.eventCount, `${state} must not report events`).toBe(0);
    }
  });

  it("carries the adapter's own note as the detail rather than inventing prose", () => {
    const status = classifyWebullTickSnapshot(snapshot("BLOCKED_AUTH", 0, "Signature rejected by Webull."));
    expect(status.detail).toBe("Signature rejected by Webull.");
  });
});
