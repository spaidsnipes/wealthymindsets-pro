import { describe, it, expect } from "vitest";
import {
  isTerminal,
  canTransition,
  statusAfter,
  transitionOrder,
  type OrderLifecycleStatus,
} from "./paperOrderLifecycle";

interface Ord {
  id: string;
  status: OrderLifecycleStatus;
  fillPx?: number;
}
const pending = (): Ord => ({ id: "o-1", status: "pending" });

describe("isTerminal / canTransition / statusAfter", () => {
  it("only pending is non-terminal", () => {
    expect(isTerminal("pending")).toBe(false);
    expect(isTerminal("filled")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal("rejected")).toBe(true);
  });

  it("pending may fill / cancel / reject; terminal states may not", () => {
    expect(canTransition("pending", "FILL")).toBe(true);
    expect(canTransition("pending", "CANCEL")).toBe(true);
    expect(canTransition("pending", "REJECT")).toBe(true);
    expect(canTransition("filled", "CANCEL")).toBe(false);
    expect(canTransition("cancelled", "FILL")).toBe(false);
    expect(canTransition("rejected", "FILL")).toBe(false);
  });

  it("maps each event to its resulting status", () => {
    expect(statusAfter("FILL")).toBe("filled");
    expect(statusAfter("CANCEL")).toBe("cancelled");
    expect(statusAfter("REJECT")).toBe("rejected");
  });
});

describe("transitionOrder — legal transitions produce a NEW order", () => {
  it("fills a pending order without mutating the input", () => {
    const o = pending();
    const r = transitionOrder(o, "FILL", { fillPx: 101.5 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order.status).toBe("filled");
    expect(r.order.fillPx).toBe(101.5);
    expect(r.order).not.toBe(o); // new object
    expect(o.status).toBe("pending"); // input untouched
    expect(o.fillPx).toBeUndefined();
  });

  it("cancels a pending order", () => {
    const r = transitionOrder(pending(), "CANCEL");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.order.status).toBe("cancelled");
  });
});

describe("transitionOrder — illegal transitions refuse, never corrupt", () => {
  it("refuses to re-fill an already-filled order (no double fill)", () => {
    const filled = transitionOrder(pending(), "FILL", { fillPx: 100 });
    expect(filled.ok).toBe(true);
    if (!filled.ok) return;
    const again = transitionOrder(filled.order, "FILL", { fillPx: 999 });
    expect(again.ok).toBe(false);
    expect(again.order).toBe(filled.order); // unchanged, same reference
    expect(again.order.fillPx).toBe(100); // NOT overwritten by 999
    if (!again.ok) expect(again.reason).toMatch(/terminal|already filled/i);
  });

  it("refuses to fill a cancelled order (no resurrection)", () => {
    const cancelled = transitionOrder(pending(), "CANCEL");
    if (!cancelled.ok) throw new Error("setup");
    const r = transitionOrder(cancelled.order, "FILL", { fillPx: 50 });
    expect(r.ok).toBe(false);
    expect(r.order.status).toBe("cancelled");
    expect(r.order.fillPx).toBeUndefined();
  });

  it("refuses to cancel an order that already filled", () => {
    const filled = transitionOrder(pending(), "FILL", { fillPx: 100 });
    if (!filled.ok) throw new Error("setup");
    const r = transitionOrder(filled.order, "CANCEL");
    expect(r.ok).toBe(false);
    expect(r.order.status).toBe("filled");
  });

  it("gives an explainable reason on refusal (canon §11)", () => {
    const cancelled = transitionOrder(pending(), "CANCEL");
    if (!cancelled.ok) throw new Error("setup");
    const r = transitionOrder(cancelled.order, "FILL");
    if (r.ok) throw new Error("expected refusal");
    expect(r.reason).toBeTypeOf("string");
    expect(r.reason.length).toBeGreaterThan(0);
  });
});
