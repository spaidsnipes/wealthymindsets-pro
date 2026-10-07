import { describe, expect, it } from "vitest";

import { canSend, mustReconcileFirst, stepLiveOrder, type LiveOrderEvent, type LiveOrderPhase } from "./liveOrderLifecycle";

const run = (from: LiveOrderPhase, ...events: LiveOrderEvent[]) =>
  events.reduce<{ phase: LiveOrderPhase; refused: string[] }>((acc, e) => {
    const t = stepLiveOrder(acc.phase, e);
    return { phase: t.phase, refused: t.accepted ? acc.refused : [...acc.refused, e.type] };
  }, { phase: from, refused: [] });

describe("chart ticket lifecycle: stage → preview → confirm → send → broker truth", () => {
  it("the happy path ends where the broker's readback says", () => {
    const r = run("DISARMED", { type: "STAGE" }, { type: "PREVIEW" }, { type: "PREVIEW_OK" }, { type: "CONFIRM" }, { type: "SEND" },
      { type: "SUBMIT_ANSWER", state: "ACKNOWLEDGED", order: { state: "ACKNOWLEDGED" } },
      { type: "READBACK", order: { state: "WORKING" } }, { type: "READBACK", order: { state: "PARTIALLY FILLED" } }, { type: "READBACK", order: { state: "FILLED" } });
    expect(r).toEqual({ phase: "FILLED", refused: [] });
  });
  it("a send is only possible from the confirm sheet of a previewed ticket", () => {
    for (const p of ["DISARMED", "STAGED", "PREVIEWING", "PREVIEWED", "REFUSED"] as const) {
      expect(canSend(p)).toBe(false);
      expect(stepLiveOrder(p, { type: "SEND" }).accepted).toBe(false);
    }
    expect(stepLiveOrder("STAGED", { type: "CONFIRM" }).accepted).toBe(false);
  });
});

describe("a timeout is not a rejection; UNKNOWN is never blindly retried", () => {
  it("TIMEOUT during the send → UNKNOWN, never REJECTED", () => {
    expect(stepLiveOrder("SUBMITTING", { type: "TIMEOUT" }).phase).toBe("UNKNOWN");
  });
  it("UNKNOWN refuses SEND and STAGE; only RECONCILE moves it, and only a readback resolves it", () => {
    expect(mustReconcileFirst("UNKNOWN")).toBe(true);
    expect(stepLiveOrder("UNKNOWN", { type: "SEND" })).toMatchObject({ accepted: false, phase: "UNKNOWN" });
    expect(stepLiveOrder("UNKNOWN", { type: "STAGE" })).toMatchObject({ accepted: false, phase: "UNKNOWN" });
    expect(stepLiveOrder("UNKNOWN", { type: "CANCEL" }).accepted).toBe(false);
    expect(run("UNKNOWN", { type: "RECONCILE" }, { type: "READBACK", order: null }).phase).toBe("UNKNOWN");
    expect(run("UNKNOWN", { type: "RECONCILE" }, { type: "READBACK", order: { state: "WORKING" } }).phase).toBe("WORKING");
    expect(stepLiveOrder("RECONCILING", { type: "TIMEOUT" }).phase).toBe("UNKNOWN");
  });
  it("an unknown answer word, or an ack with no order, is UNKNOWN; refusal words are REFUSED", () => {
    expect(stepLiveOrder("SUBMITTING", { type: "SUBMIT_ANSWER", state: "UNKNOWN" }).phase).toBe("UNKNOWN");
    expect(stepLiveOrder("SUBMITTING", { type: "SUBMIT_ANSWER", state: "ACKNOWLEDGED" }).phase).toBe("UNKNOWN");
    expect(stepLiveOrder("SUBMITTING", { type: "SUBMIT_ANSWER", state: "HTTP 502" }).phase).toBe("UNKNOWN");
    for (const s of ["REFUSED_LOCAL", "REFUSED_PREFLIGHT", "NOT_AUTHORIZED", "DRY_RUN_FAILED", "KILL_SWITCH", "LIMITS_UNSET", "NOT_SENT"]) {
      expect(stepLiveOrder("SUBMITTING", { type: "SUBMIT_ANSWER", state: s }).phase).toBe("REFUSED");
    }
  });
  it("a working order that disappears from the readback is UNKNOWN, not gone", () => {
    expect(stepLiveOrder("WORKING", { type: "READBACK", order: null }).phase).toBe("UNKNOWN");
  });
});

describe("kill switch and cancel", () => {
  it("KILL drops anything unsent to DISARMED but never forgets an order at the broker", () => {
    for (const p of ["STAGED", "PREVIEWED", "CONFIRMING"] as const) expect(stepLiveOrder(p, { type: "KILL" }).phase).toBe("DISARMED");
    expect(stepLiveOrder("WORKING", { type: "KILL" })).toMatchObject({ accepted: false, phase: "WORKING" });
  });
  it("cancel is a request (CANCEL_PENDING) until the readback says CANCELED — a fill can race it", () => {
    expect(run("WORKING", { type: "CANCEL" }, { type: "READBACK", order: { state: "CANCELED" } }).phase).toBe("CANCELED");
    expect(run("WORKING", { type: "CANCEL" }, { type: "READBACK", order: { state: "FILLED" } }).phase).toBe("FILLED");
  });
  it("a working ticket cannot be restaged over", () => {
    expect(stepLiveOrder("WORKING", { type: "STAGE" }).accepted).toBe(false);
    expect(stepLiveOrder("FILLED", { type: "STAGE" }).phase).toBe("STAGED");
  });
});
