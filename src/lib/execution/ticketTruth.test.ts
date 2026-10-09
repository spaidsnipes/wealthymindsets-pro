/** Sheriff P1-2 / P2-6 (2026-10-08): what the trade ticket may say about its quote, its prefilled limit and the book. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { traderClock } from "@/components/time/traderClock";
import { bookLine, orderActionLine, prefillNote, quoteStreamLabel } from "./ticketTruth";

const NOW = Date.parse("2026-10-08T18:00:00Z");
const WORDS = { CONNECTING: "connecting", NOT_CONNECTED: "quotes not connected" };
const q = (over: Partial<Parameters<typeof quoteStreamLabel>[0]>) => quoteStreamLabel({ stream: "LIVE", bid: 100, ask: 100.5, quoteAtMs: NOW - 2_000, nowMs: NOW, contract: "BTC/USD", streamWords: WORDS, ...over });

describe("LIVE only with a live quote", () => {
  it("stream open + bid + ask + fresh → LIVE", () => {
    expect(q({})).toEqual({ live: true, text: "LIVE · tastytrade" });
  });
  it("the glass case: stream LIVE, bid — / ask — → not LIVE, says no quote for the contract", () => {
    expect(q({ bid: null, ask: null })).toEqual({ live: false, text: "stream open · no quote for BTC/USD yet" });
    expect(q({ ask: null }).live).toBe(false);
  });
  it("an old quote, or one with no time, is not live — and says its age", () => {
    expect(q({ quoteAtMs: NOW - 45_000 })).toEqual({ live: false, text: "quote 45s old · not live" });
    expect(q({ quoteAtMs: null })).toEqual({ live: false, text: "quote time not reported · not live" });
  });
  it("a stream that is not LIVE uses its own words", () => {
    expect(q({ stream: "CONNECTING" })).toEqual({ live: false, text: "connecting" });
    expect(q({ stream: "SOMETHING_ELSE" }).text).toBe("something else");
  });
});

describe("a prefilled limit names its source and age, and turns STALE when the touch moves", () => {
  const prefill = { px: 774.29, touch: "ASK" as const, atMs: NOW - 12_000, source: "tastytrade" };
  it("unchanged touch: source + local time + age", () => {
    const n = prefillNote({ prefill, limitPx: 774.29, currentTouch: 774.29, tick: 0.01, nowMs: NOW })!;
    expect(n.stale).toBe(false);
    expect(n.text).toBe(`Prefilled from the tastytrade ask 774.29 at ${traderClock(NOW - 12_000, { seconds: true })} (12s ago).`);
  });
  it("the touch moved a tick or more → STALE, with the new touch", () => {
    const n = prefillNote({ prefill, limitPx: 774.29, currentTouch: 774.34, tick: 0.01, nowMs: NOW })!;
    expect(n.stale).toBe(true);
    expect(n.text).toMatch(/^STALE · Prefilled from the tastytrade ask 774\.29 .+ The ask is now 774\.34 — re-check the limit\.$/);
    expect(prefillNote({ prefill, limitPx: 774.29, currentTouch: 774.295, tick: 0.01, nowMs: NOW })!.stale).toBe(false);
  });
  it("no prefill, or the trader typed their own limit → no note", () => {
    expect(prefillNote({ prefill: null, limitPx: 1, currentTouch: 1, tick: 0.01, nowMs: NOW })).toBeNull();
    expect(prefillNote({ prefill, limitPx: 774.1, currentTouch: 774.29, tick: 0.01, nowMs: NOW })).toBeNull();
  });
});

describe("the book line: FLAT is a read, not a default", () => {
  const at = Date.parse("2026-10-08T18:30:00Z");
  it("fresh and flat", () => {
    expect(bookLine({ readback: "FRESH", holding: false, working: 0, asOfMs: at, tails: ["5019", "6649"] }))
      .toBe(`FLAT · 0 working · read ${traderClock(at, { seconds: false })} from …5019, …6649`);
  });
  it("fresh and holding: the working count, no FLAT", () => {
    expect(bookLine({ readback: "FRESH", holding: true, working: 2, asOfMs: at, tails: ["5019"] })).toMatch(/^2 working · read .+ from …5019$/);
  });
  it("never read → nothing assumed flat; stale → the RECONCILING line speaks; no readback → nothing", () => {
    expect(bookLine({ readback: "NEVER_READ", holding: false, working: 0, asOfMs: null, tails: [] })).toBe("Position and working orders: not read from tastytrade yet — nothing is assumed flat.");
    expect(bookLine({ readback: "STALE", holding: false, working: 0, asOfMs: at, tails: [] })).toBeNull();
    expect(bookLine({ readback: null, holding: false, working: 0, asOfMs: null, tails: [] })).toBeNull();
  });
});

describe("the order line never contradicts the checkbox", () => {
  it("each side × open/close", () => {
    expect(orderActionLine(null, false)).toBe("Pick BUY or SELL — nothing is staged until you do.");
    expect(orderActionLine("BUY", false)).toBe("Order: Buy to Open");
    expect(orderActionLine("BUY", true)).toBe("Order: Buy to Close");
    expect(orderActionLine("SELL", false)).toBe("Order: Sell to Open");
    expect(orderActionLine("SELL", true)).toBe("Order: Sell to Close");
  });
});

describe("the ticket is wired to these owners", () => {
  const T = readFileSync(path.resolve(__dirname, "../../components/chart/TradePanel.tsx"), "utf8");
  const D = readFileSync(path.resolve(__dirname, "../../components/chart/ChartsDashboard.tsx"), "utf8");
  it("label, prefill, book line, side, checkbox, header and paper door", () => {
    expect(T.length).toBeGreaterThan(20_000);
    expect(T).toContain('data-live={quoteLabel.live ? "yes" : "no"}');
    expect(T).not.toMatch(/snap\.stream === "LIVE" \? "LIVE · tastytrade"/);
    expect(T).toContain('useState<"BUY" | "SELL" | null>(null)');
    expect(T).not.toMatch(/setLimit\(price\.toFixed/);                                   // no prefill from the chart close
    expect(T).toContain("This closes a position I hold\n");
    expect(T).not.toContain("This closes a position I hold ({action})");
    // §23: the book line now lives in the POSITION STATE row of the book rows (ticketBook → TicketBookRows).
    expect(T).toContain("<TicketBookRows book={book}");
    expect(readFileSync(path.resolve(__dirname, "ticketBook.ts"), "utf8")).toContain("bookLine({ readback: \"FRESH\", holding: false");
    expect(T).toContain('data-testid="trade-prefill-note"');
    expect(T).toContain('flexWrap: "wrap"');
    expect(T).toContain('width: "min(400px, calc(100vw - 48px))"');
    expect(D).toContain("onOpenPaper={() => setPaperOpen(true)}");
    expect(D).not.toContain("onOpenPaper={() => { setTradeOpen(false); setPaperOpen(true); }}");
  });
});
