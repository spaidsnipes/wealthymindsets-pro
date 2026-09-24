import { describe, expect, it } from "vitest";
import { MAX_ATTEMPTS, MAX_DELAY_MS, backoffDelay, initialReconnectState, nextStep, observe, recordAttempt } from "./webullReconnectPolicy";

describe("Webull continuity — reconnect policy", () => {
  it("a revoked credential asks to REAUTHORIZE once and never retries", () => {
    const s = observe(initialReconnectState, { kind: "handshake", accepted: false, credentialRejected: true });
    expect(nextStep(s, false).kind).toBe("REAUTHORIZE");
  });
  it("a drop retries with bounded exponential backoff, then pauses — no storm", () => {
    let s = initialReconnectState;
    const delays: number[] = [];
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const n = nextStep(s, false);
      if (n.kind !== "RETRY") throw new Error(n.kind);
      delays.push(n.delayMs);
      s = recordAttempt(s);
    }
    expect(delays[0]).toBe(1000);
    expect(Math.max(...delays)).toBe(MAX_DELAY_MS);
    expect(nextStep(s, false).kind).toBe("PAUSED");
    expect(backoffDelay(50)).toBe(MAX_DELAY_MS);
  });
  it("the trader's Stop is final", () => {
    expect(nextStep(initialReconnectState, true).kind).toBe("STOPPED");
  });
  it("the drop is recorded as a gap — never filled", () => {
    let s = observe(initialReconnectState, { kind: "quote", receivedAt: "T1" });
    s = observe(s, { kind: "ended", upMs: 500 });
    s = observe(s, { kind: "quote", receivedAt: "T9" });
    expect(s.gaps).toEqual([{ from: "T1", to: "T9" }]);
    expect(s.lastQuoteAt).toBe("T9");
  });
  it("backoff keeps growing across short-lived connections; only a stable one resets it", () => {
    let s = recordAttempt(recordAttempt(initialReconnectState));
    s = observe(s, { kind: "quote", receivedAt: "T1" });
    s = observe(s, { kind: "ended", upMs: 900 });
    expect(s.attempts).toBe(2);
    s = observe(s, { kind: "ended", upMs: 45_000 });
    expect(s.attempts).toBe(0);
  });
});
