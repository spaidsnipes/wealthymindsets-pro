import { describe, expect, it } from "vitest";
import { APPROVAL_POLL_MS, MAX_ATTEMPTS, MAX_DELAY_MS, backoffDelay, initialReconnectState, nextStep, observe, recordAttempt, schedulesReopen } from "./webullReconnectPolicy";

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
  it("a 403 on the subscribe leg is HELD, not retried — the same request gets the same answer", () => {
    // MEASURED 2026-09-21: CONNACK 0 → 403 MARKET_DATA_NOT_SUBSCRIBED on every
    // subType × category. Before this, that answer bought eight reconnects in
    // a row under a "Reconnecting…" label.
    let s = observe(initialReconnectState, { kind: "opening" });
    s = observe(s, { kind: "handshake", accepted: true, credentialRejected: false });
    s = observe(s, { kind: "subscribe", subscribed: false, status: 403, providerCode: "MARKET_DATA_NOT_SUBSCRIBED" });
    s = observe(s, { kind: "ended", upMs: 300 });
    const n = nextStep(s, false);
    expect(n.kind).toBe("HELD");
    expect(schedulesReopen(n)).toBe(false);
    if (n.kind !== "HELD") throw new Error(n.kind);
    expect(n.note).toContain("MARKET_DATA_NOT_SUBSCRIBED");
    // Not an auth verdict, and never a purchase instruction.
    expect(n.note).not.toMatch(/reauthori/i);
    expect(n.note).not.toMatch(/\b(go|must|need to|should)\s+(buy|purchase|upgrade|subscribe)\b/i);
  });

  it("lifecycle and transient subscribe refusals stay on the bounded RETRY path", () => {
    for (const [status, providerCode] of [[417, "INVALID_SESSION"], [401, "INVALID_TOKEN"], [429, null], [503, null], [0, null]] as const) {
      let s = observe(initialReconnectState, { kind: "opening" });
      s = observe(s, { kind: "subscribe", subscribed: false, status, providerCode });
      s = observe(s, { kind: "ended", upMs: 200 });
      expect(nextStep(s, false).kind).toBe("RETRY");
    }
  });

  it("a refused session is retried with a fresh one; only a refused FRESH session is REAUTHORIZE", () => {
    let s = observe(initialReconnectState, { kind: "subscribe", subscribed: false, status: 401, providerCode: "INVALID_TOKEN" });
    s = observe(s, { kind: "session", verdict: "REMINT" });
    expect(nextStep(observe(s, { kind: "ended", upMs: 100 }), false).kind).toBe("RETRY");
    s = observe(recordAttempt(s), { kind: "opening" });
    s = observe(s, { kind: "subscribe", subscribed: false, status: 401, providerCode: "INVALID_TOKEN" });
    s = observe(s, { kind: "session", verdict: "REAUTHORIZE" });
    expect(nextStep(observe(s, { kind: "ended", upMs: 100 }), false).kind).toBe("REAUTHORIZE");
  });

  it("a 2FA wait re-asks slowly and calmly, bounded by the same cap — it is not a fault", () => {
    let s = observe(initialReconnectState, { kind: "gate", gate: "AWAITING_2FA" });
    s = observe(s, { kind: "ended", upMs: 50 });
    const n = nextStep(s, false);
    expect(n.kind).toBe("AWAITING_APPROVAL");
    if (n.kind !== "AWAITING_APPROVAL") throw new Error(n.kind);
    expect(n.delayMs).toBeGreaterThanOrEqual(APPROVAL_POLL_MS);
    expect(schedulesReopen(n)).toBe(true);
    for (let i = 0; i < MAX_ATTEMPTS; i++) s = recordAttempt(s);
    expect(nextStep(s, false).kind).toBe("PAUSED");
  });

  it("a deployment gate is HELD — nothing reconnects into a missing key pair or socket", () => {
    for (const gate of ["UNCONFIGURED", "NO_SOCKETS"] as const) {
      const s = observe(initialReconnectState, { kind: "gate", gate });
      expect(nextStep(s, false).kind).toBe("HELD");
    }
  });

  it("each new connection is judged on its own answers", () => {
    let s = observe(initialReconnectState, { kind: "subscribe", subscribed: false, status: 403, providerCode: null });
    s = observe(s, { kind: "opening" });
    expect(s.refusal).toBeNull();
    expect(nextStep(s, false).kind).toBe("RETRY");
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
