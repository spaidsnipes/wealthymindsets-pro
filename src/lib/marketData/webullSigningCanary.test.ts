import { describe, expect, it } from "vitest";
import { failedWebullCanaryReceipt, summarizeWebullCanaryReceipt, webullCanaryObservation } from "./webullSigningCanary";

describe("Webull signing canary receipt", () => {
  it("keeps only the newest non-secret observation fields", () => {
    const receipt = summarizeWebullCanaryReceipt({
      source: "webull",
      state: "OBSERVED",
      fidelity: "SNAPSHOT",
      signingProfile: "sdk-sha256",
      requestedAt: "2026-09-10T01:00:00.000Z",
      note: "raw provider prose must not cross into the scene",
      signature: "secret",
      ticks: [
        { price: 367.1, volume: 2, observedAtMs: Date.parse("2026-09-10T01:00:01.000Z") },
        { price: 367.2, volume: 5, observedAtMs: Date.parse("2026-09-10T01:00:02.000Z") },
      ],
    }, "sdk-sha256");

    expect(receipt).toEqual({
      profile: "sdk-sha256",
      state: "OBSERVED",
      fidelity: "SNAPSHOT",
      requestedAt: "2026-09-10T01:00:00.000Z",
      tickCount: 2,
      newestObservedAt: "2026-09-10T01:00:02.000Z",
      newestPrice: 367.2,
      newestSize: 5,
    });
    expect(receipt).not.toHaveProperty("note");
    expect(receipt).not.toHaveProperty("signature");
  });

  it("fails closed when the returned signing contract does not match the request", () => {
    const receipt = summarizeWebullCanaryReceipt({
      source: "webull",
      state: "OBSERVED",
      fidelity: "SNAPSHOT",
      signingProfile: "legacy-sha1",
      ticks: [],
    }, "sdk-sha256");

    expect(receipt.state).toBe("INVALID_RECEIPT");
    expect(receipt.profile).toBe("sdk-sha256");
  });

  it.each([
    { fidelity: "NONE", ticks: [{ price: 367.2, volume: 5, observedAtMs: 1_799_535_602_000 }] },
    { fidelity: "SNAPSHOT", ticks: [{}] },
    { fidelity: "SNAPSHOT", ticks: [{ price: -1, volume: 5, observedAtMs: 1_799_535_602_000 }] },
    { fidelity: "SNAPSHOT", ticks: [{ price: 367.2, volume: -5, observedAtMs: 1_799_535_602_000 }] },
  ])("fails closed for malformed OBSERVED evidence: %j", ({ fidelity, ticks }) => {
    const receipt = summarizeWebullCanaryReceipt({
      source: "webull",
      state: "OBSERVED",
      fidelity,
      signingProfile: "sdk-sha256",
      ticks,
    }, "sdk-sha256");

    expect(receipt.state).toBe("INVALID_RECEIPT");
    expect(receipt.tickCount).toBe(0);
  });

  it("classifies a transport failure without inventing a provider cause", () => {
    expect(failedWebullCanaryReceipt("legacy-sha1").state).toBe("REQUEST_FAILED");
  });
});

/**
 * THE CORRECTION TO THE 2026-09-18-C BATON.
 *
 * That baton recorded BrokerConnectPanel's unwitnessed `<ProviderWireStrip
 * compact />` as "not a defect (it renders no tape)". The first grep that
 * appeared to confirm it was case-SENSITIVE and returned 0. Re-run
 * case-insensitively it names `receipt.newestPrice` at line 648, which the
 * panel renders as `N prints · $PRICE · size N · time`.
 *
 * A rendered price IS tape. The claim was false, and trusting it would have
 * been the exact failure the same baton records for `09732ba5`: confirming a
 * premise instead of testing it.
 */
describe("webullCanaryObservation — the witness the broker panel was missing", () => {
  const base = {
    profile: "sdk-sha256" as const,
    fidelity: "SNAPSHOT" as const,
    requestedAt: "2026-09-18T01:00:00.000Z",
    newestObservedAt: "2026-09-18T01:00:01.000Z",
    newestSize: 5,
  };

  it("witnesses a quote when the panel actually drew a price", () => {
    expect(
      webullCanaryObservation([{ ...base, state: "OBSERVED", tickCount: 3, newestPrice: 367.2 }]),
    ).toEqual({ source: "webull", quotePresent: true, barsPresent: false });
  });

  it("witnesses nothing when there are no receipts at all", () => {
    expect(webullCanaryObservation([])).toBeNull();
  });

  // THE PREDICATE MUST MATCH THE ONE THE PANEL RENDERS WITH. Each row below is
  // a frame on which BrokerConnectPanel draws NO price line; a witness that
  // spoke for any of them would be describing a frame that does not exist.
  const silent: ReadonlyArray<readonly [string, Partial<Parameters<typeof webullCanaryObservation>[0][number]>]> = [
    ["auth was blocked", { state: "BLOCKED_AUTH", tickCount: 0, newestPrice: null }],
    ["the state is OBSERVED but zero ticks arrived", { state: "OBSERVED", tickCount: 0, newestPrice: null }],
    ["ticks arrived but no price survived validation", { state: "OBSERVED", tickCount: 4, newestPrice: null }],
    ["the price is zero", { state: "OBSERVED", tickCount: 4, newestPrice: 0 }],
    ["the price is negative", { state: "OBSERVED", tickCount: 4, newestPrice: -1 }],
    ["the price is not finite", { state: "OBSERVED", tickCount: 4, newestPrice: Number.POSITIVE_INFINITY }],
    ["the request failed", { state: "REQUEST_FAILED", tickCount: 0, newestPrice: null }],
    ["a price is present but the state is STALE", { state: "STALE", tickCount: 2, newestPrice: 367.2 }],
  ];

  for (const [why, patch] of silent) {
    it(`witnesses nothing when ${why}`, () => {
      expect(
        webullCanaryObservation([{ ...base, state: "OBSERVED", tickCount: 0, newestPrice: null, ...patch }]),
      ).toBeNull();
    });
  }

  it("one observed profile is enough — the profiles are independent reads", () => {
    expect(
      webullCanaryObservation([
        { ...base, profile: "legacy-sha1", state: "BLOCKED_AUTH", tickCount: 0, newestPrice: null },
        { ...base, profile: "sdk-sha256", state: "OBSERVED", tickCount: 1, newestPrice: 367.2 },
      ]),
    ).toEqual({ source: "webull", quotePresent: true, barsPresent: false });
  });

  it("OVER-CORRECTION GUARD: never claims bars — this surface draws no candles", () => {
    const observation = webullCanaryObservation([
      { ...base, state: "OBSERVED", tickCount: 9, newestPrice: 367.2 },
    ]);
    expect(observation?.barsPresent).toBe(false);
    expect(observation?.source).toBe("webull");
  });
});
