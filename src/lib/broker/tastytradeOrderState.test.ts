import { describe, expect, it } from "vitest";

import { isTerminal, readTastytradeOrder } from "./tastytradeOrderState";

const order = (status: string, remaining = 1) => ({
  id: 4242, status, "order-type": "Limit", price: "1.25", "external-identifier": "wmo_abc12345", cancellable: status === "Live",
  legs: [{ symbol: "./ESZ6 EW3V6 261016C7900", action: "Buy to Open", quantity: 1, "remaining-quantity": remaining }],
});

describe("tastytrade order status → WM order state", () => {
  it("maps documented statuses and never guesses an unknown one", () => {
    expect(readTastytradeOrder(order("Received"))?.state).toBe("ACKNOWLEDGED");
    expect(readTastytradeOrder(order("Live"))?.state).toBe("WORKING");
    expect(readTastytradeOrder(order("Cancel Requested"))?.state).toBe("CANCEL_PENDING");
    expect(readTastytradeOrder(order("Cancelled"))?.state).toBe("CANCELED");
    expect(readTastytradeOrder(order("Filled", 0))?.state).toBe("FILLED");
    expect(readTastytradeOrder(order("Rejected"))?.state).toBe("REJECTED");
    expect(readTastytradeOrder(order("Teleported"))?.state).toBe("UNKNOWN");
  });

  it("a working order with fills is PARTIALLY FILLED", () => {
    const o = { ...order("Live"), legs: [{ symbol: "/MESZ6", action: "Buy", quantity: 3, "remaining-quantity": 1 }] };
    expect(readTastytradeOrder(o)).toMatchObject({ state: "PARTIALLY FILLED", filled: 2, quantity: 3 });
  });

  it("keeps the external identifier that makes the order reconcilable", () => {
    expect(readTastytradeOrder(order("Live"))).toMatchObject({ id: "4242", externalId: "wmo_abc12345", cancellable: true });
    expect(readTastytradeOrder({})).toBeNull();
  });

  it("terminal states end the lifecycle", () => {
    expect(["FILLED", "CANCELED", "REJECTED", "CLOSED"].every(s => isTerminal(s as never))).toBe(true);
    expect(isTerminal("WORKING")).toBe(false);
  });
});
