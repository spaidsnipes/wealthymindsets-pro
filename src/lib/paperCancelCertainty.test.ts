/**
 * Scope, stated honestly.
 *
 * This proves the COUNTS and the SENTENCES — that nothing is said before the
 * first cancel, that a market order cancelled on /paper is called out because a
 * real broker would not have let it happen, that an unreadable `type` is not
 * counted as "market", and that nothing here refuses a cancel.
 *
 * It does not prove that any particular real cancel would have lost its race.
 * It cannot: that depends on latency and on the book at that instant, and this
 * module deliberately refuses to estimate either. The strongest thing asserted
 * below is a statement about /paper's OWN control flow — the cancel resolves
 * before any quote is consulted, which is visible in the page and needs no
 * probability to be true.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  selectCancelCertainty,
  selectCancelledOrderNote,
  type CancelCertaintyInput,
} from "./paperCancelCertainty";

const cancelled = (type?: string): CancelCertaintyInput => ({ status: "cancelled", type });

describe("selectCancelCertainty", () => {
  it("says nothing before the first cancel — a banner nobody earned is wallpaper", () => {
    for (const orders of [[], null, undefined]) {
      const r = selectCancelCertainty(orders as CancelCertaintyInput[]);
      expect(r.cancelledCount).toBe(0);
      expect(r.heading).toBeNull();
      expect(r.sentences).toEqual([]);
    }
  });

  it("ignores orders that were not cancelled", () => {
    const r = selectCancelCertainty([
      { status: "pending", type: "market" },
      { status: "filled", type: "market" },
      { status: "rejected", type: "market" },
    ]);
    expect(r.cancelledCount).toBe(0);
    expect(r.heading).toBeNull();
  });

  it("names the race a /paper cancel can never lose", () => {
    const r = selectCancelCertainty([cancelled("limit")]);
    expect(r.heading).toBe("1 order was cancelled with certainty");
    expect(r.sentences[0]).toMatch(/decided locally, before any quote is consulted/);
    expect(r.sentences[0]).toMatch(/a cancel is a REQUEST/);
  });

  it("agrees with itself in the plural", () => {
    const r = selectCancelCertainty([cancelled("limit"), cancelled("stop")]);
    expect(r.cancelledCount).toBe(2);
    expect(r.heading).toBe("2 orders were cancelled with certainty");
  });

  it("stays silent about market orders when none was cancelled", () => {
    const r = selectCancelCertainty([cancelled("limit"), cancelled("stop-limit")]);
    expect(r.cancelledMarketCount).toBe(0);
    expect(r.sentences).toHaveLength(1);
    expect(JSON.stringify(r)).not.toMatch(/MARKET order/);
  });

  it("calls out a cancelled MARKET order — a real broker had nothing left to cancel", () => {
    const r = selectCancelCertainty([cancelled("market"), cancelled("limit")]);
    expect(r.cancelledCount).toBe(2);
    expect(r.cancelledMarketCount).toBe(1);
    expect(r.sentences).toHaveLength(2);
    expect(r.sentences[1]).toMatch(/^1 of them was a MARKET order/);
    expect(r.sentences[1]).toMatch(/gone the moment you send it/);
  });

  it("agrees with itself in the plural for market orders too", () => {
    const r = selectCancelCertainty([cancelled("market"), cancelled("market")]);
    expect(r.cancelledMarketCount).toBe(2);
    expect(r.sentences[1]).toMatch(/^2 of them were MARKET orders/);
  });

  it("does NOT count an unreadable type as market — absence is not evidence", () => {
    // H1: a missing field is missing. Counting it as "market" would mint a
    // claim about an order whose type nobody recorded.
    const r = selectCancelCertainty([cancelled(undefined), cancelled(""), cancelled("MARKET")]);
    expect(r.cancelledCount).toBe(3);
    expect(r.cancelledMarketCount).toBe(0);
    expect(r.sentences).toHaveLength(1);
  });

  it("survives a null row without throwing", () => {
    const r = selectCancelCertainty([null as unknown as CancelCertaintyInput, cancelled("market")]);
    expect(r.cancelledCount).toBe(1);
    expect(r.cancelledMarketCount).toBe(1);
  });

  it("is a LABEL: it never returns a status, a refusal or a probability", () => {
    const r = selectCancelCertainty([cancelled("market")]);
    expect(Object.keys(r).sort()).toEqual(
      ["cancelledCount", "cancelledMarketCount", "heading", "sentences"].sort(),
    );
    expect(JSON.stringify(r)).not.toMatch(/probability|chance|odds|refused|blocked/i);
  });

  it("grades a book persisted before this existed — no new field is required", () => {
    // `status` and `type` are the only inputs, and every order has carried both
    // since the book was first written.
    const ancient = [{ status: "cancelled", type: "market" }, { status: "cancelled", type: "limit" }];
    expect(selectCancelCertainty(ancient).cancelledMarketCount).toBe(1);
  });
});

describe("selectCancelledOrderNote", () => {
  it("is null for anything that is not a cancelled MARKET order", () => {
    expect(selectCancelledOrderNote(null)).toBeNull();
    expect(selectCancelledOrderNote(undefined)).toBeNull();
    expect(selectCancelledOrderNote({ status: "pending", type: "market" })).toBeNull();
    expect(selectCancelledOrderNote({ status: "filled", type: "market" })).toBeNull();
    expect(selectCancelledOrderNote(cancelled("limit"))).toBeNull();
    expect(selectCancelledOrderNote(cancelled(undefined))).toBeNull();
  });

  it("says the one thing that row makes surprising", () => {
    const s = selectCancelledOrderNote(cancelled("market"));
    expect(s).toMatch(/MARKET order/);
    expect(s).toMatch(/gone the moment it is sent/);
    expect(s).not.toMatch(/cancel(led)? for you|we cancelled|has been refused/i);
  });
});

describe("the owner refuses to refuse a cancel", () => {
  const OWNER = readFileSync(resolve(__dirname, "./paperCancelCertainty.ts"), "utf8");
  const code = OWNER.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("LABEL NOT MODEL: it never writes a status, never reads a clock, never rolls a die", () => {
    expect(code).not.toMatch(/status\s*[:=]\s*["']/);
    expect(code).not.toMatch(/\bDate\.now\s*\(/);
    expect(code).not.toMatch(/Math\.random/);
  });

  it("is pure: no imports, no storage, no side effects", () => {
    expect(code).not.toMatch(/^\s*import\s/m);
    expect(code).not.toMatch(/localStorage|sessionStorage/);
  });
});

describe("/paper renders the disclosure", () => {
  const PAPER_PAGE = readFileSync(resolve(__dirname, "../app/paper/page.tsx"), "utf8");
  const code = PAPER_PAGE
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("POSITIVE CONTROL: the guards below actually read /paper", () => {
    expect(PAPER_PAGE.length).toBeGreaterThan(50_000);
  });

  it("THE DEFECT: the page still creates market orders as pending and cancellable", () => {
    // If this ever stops being true the disclosure becomes a lie, and this
    // guard is where that gets caught. A claim and its justification must fail
    // together.
    expect(code).toMatch(/side,\s*type,\s*qty,\s*status\s*:\s*"pending"/);
  });

  it("the page consults the cancel-certainty owner rather than staying silent", () => {
    expect(code).toContain("selectCancelCertainty");
    expect(code).toContain("selectCancelledOrderNote");
  });

  /**
   * The lesson already paid for twice on this page: consulting a selector is
   * not rendering its answer. A revive that deletes the element while leaving
   * the import and the component declaration intact restores the exact silence
   * this atom closes, so the ELEMENT is what gets asserted.
   */
  it("the per-order note is actually RENDERED, not merely declared", () => {
    expect(code).toContain("<CancelledOrderNote ord={ord} />");
  });

  it("the book-level note is actually RENDERED", () => {
    expect(code).toContain("<CancelCertaintyNote orders={orders} />");
  });

  it("both are rendered in the ORDERS tab, beside the book they describe", () => {
    const ordersTab = code.slice(code.indexOf('tab==="orders"'));
    expect(ordersTab.indexOf("<CancelledOrderNote")).toBeGreaterThan(-1);
    expect(ordersTab.indexOf("<CancelCertaintyNote")).toBeGreaterThan(-1);
  });
});
