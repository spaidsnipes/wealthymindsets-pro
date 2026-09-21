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

describe("classifyWebullTickSnapshot · awaiting 2FA", () => {
  /**
   * MEASURED 2026-09-21 on /command-deck: the strip read
   * "webull: Unknown. The Webull tick route returned no classified receipt."
   * while /api/market-data/webull/ticks?symbol=SPY answered
   * BLOCKED_AUTH · awaiting2fa: true with a note naming the exact step.
   */
  it("names the pending approval instead of reporting a generic auth block", () => {
    const status = classifyWebullTickSnapshot({
      ...snapshot("BLOCKED_AUTH", 0, "Session minted and PENDING your 2FA approval in the Webull app."),
      awaiting2fa: true,
    });
    expect(status.label).toBe("AWAITING 2FA");
    // The distinction is the whole point: "auth blocked" sends a human to
    // debug a credential; this state is a prompt already waiting on a phone.
    expect(status.label).not.toBe("AUTH BLOCKED");
    expect(status.detail).toBe("Session minted and PENDING your 2FA approval in the Webull app.");
    expect(status.receiving).toBe(false);
    expect(status.eventCount).toBe(0);
  });

  it("never reads as receiving, even if the provider returned prints alongside it", () => {
    const status = classifyWebullTickSnapshot({ ...snapshot("BLOCKED_AUTH", 5), awaiting2fa: true });
    expect(status.receiving).toBe(false);
    expect(status.eventCount).toBe(0);
  });

  it("leaves every other snapshot untouched when the flag is absent or false", () => {
    expect(classifyWebullTickSnapshot(snapshot("BLOCKED_AUTH")).label).toBe("AUTH BLOCKED");
    expect(classifyWebullTickSnapshot({ ...snapshot("BLOCKED_AUTH"), awaiting2fa: false }).label).toBe("AUTH BLOCKED");
    expect(classifyWebullTickSnapshot({ ...snapshot("OBSERVED", 2), awaiting2fa: false }).label).toBe("RECEIVING");
  });
});
