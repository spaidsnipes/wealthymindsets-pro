/** The ticket's keyboard (order §6): B / S, Esc, ↑ / ↓ — and Enter never sends. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { stepPriceText, ticketKeyAction, type TicketKey } from "./ticketKeys";

const T = readFileSync(path.resolve(process.cwd(), "src/components/chart/TradePanel.tsx"), "utf8");
it("the scanned source is not empty", () => { expect(T.length).toBeGreaterThan(5000); });

const k = (over: Partial<TicketKey>): TicketKey => ({ key: "x", tag: "DIV", label: null, preSend: true, ...over });

describe("Enter NEVER sends", () => {
  it("is swallowed everywhere in the ticket — on a focused Send / Preview button, in a field, in flight or not", () => {
    for (const tag of ["BUTTON", "INPUT", "DIV", "SELECT"]) for (const preSend of [true, false]) {
      expect(ticketKeyAction(k({ key: "Enter", tag, preSend }))).toEqual({ kind: "SWALLOW_ENTER" });
      expect(ticketKeyAction(k({ key: "Enter", tag, preSend, ctrl: true, meta: true }))).toEqual({ kind: "SWALLOW_ENTER" });
    }
  });
  it("source: the panel handles the key, prevents its default, and no action of the keyboard can send", () => {
    expect(T).toContain("onKeyDown={onTicketKey}");
    const body = T.slice(T.indexOf("const onTicketKey ="), T.indexOf("};", T.indexOf("const onTicketKey =")));
    expect(body).toContain("e.preventDefault();");
    expect(body).toContain('if (a.kind === "SWALLOW_ENTER") return;');
    expect(body.replace(/preSend/g, "")).not.toMatch(/send|submit|fetch\(|preview|confirm|setReviewing/i);
  });
});

describe("B / S, Esc, arrows", () => {
  it("B / S choose a side only outside text fields, only before a send, never with a modifier", () => {
    expect(ticketKeyAction(k({ key: "b" }))).toEqual({ kind: "SIDE", side: "BUY" });
    expect(ticketKeyAction(k({ key: "S", tag: "BUTTON" }))).toEqual({ kind: "SIDE", side: "SELL" });
    expect(ticketKeyAction(k({ key: "b", tag: "INPUT", label: "Quantity" }))).toBeNull();
    expect(ticketKeyAction(k({ key: "s", preSend: false }))).toBeNull();
    expect(ticketKeyAction(k({ key: "s", meta: true }))).toBeNull();
    expect(ticketKeyAction(k({ key: "b", composing: true }))).toBeNull();
  });
  it("Esc closes — but never while an order is in flight", () => {
    expect(ticketKeyAction(k({ key: "Escape" }))).toEqual({ kind: "CLOSE" });
    expect(ticketKeyAction(k({ key: "Escape", preSend: false }))).toBeNull();
  });
  it("↑ / ↓ step only a focused PRICE field, one tick, snapped", () => {
    expect(ticketKeyAction(k({ key: "ArrowUp", tag: "INPUT", label: "Limit price" }))).toEqual({ kind: "STEP", field: "LIMIT", dir: 1 });
    expect(ticketKeyAction(k({ key: "ArrowDown", tag: "INPUT", label: "Stop price" }))).toEqual({ kind: "STEP", field: "STOP", dir: -1 });
    expect(ticketKeyAction(k({ key: "ArrowUp", tag: "INPUT", label: "Target price" }))).toEqual({ kind: "STEP", field: "TARGET", dir: 1 });
    expect(ticketKeyAction(k({ key: "ArrowUp", tag: "INPUT", label: "Entry stop trigger" }))).toEqual({ kind: "STEP", field: "TRIGGER", dir: 1 });
    expect(ticketKeyAction(k({ key: "ArrowUp", tag: "INPUT", label: "Quantity" }))).toBeNull();
    expect(stepPriceText("21000.25", 1, 0.25, 2)).toBe("21000.50");
    expect(stepPriceText("21000.30", -1, 0.25, 2)).toBe("21000.00");
    expect(stepPriceText("", 1, 0.25, 2)).toBeNull();
    expect(stepPriceText("21000", 1, null, 2)).toBeNull();
    expect(stepPriceText("0.25", -1, 0.25, 2)).toBeNull();
  });
});
