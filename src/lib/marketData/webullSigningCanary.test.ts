import { describe, expect, it } from "vitest";
import { failedWebullCanaryReceipt, summarizeWebullCanaryReceipt } from "./webullSigningCanary";

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
