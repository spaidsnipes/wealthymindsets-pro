/**
 * CLOSE from the position strip + the position line's P&L (2026-10-10).
 *  · CLOSE only ASKS the one ticket to load FLATTEN; it reaches no route and is consumed once.
 *  · The POSITION line's open P&L is from the broker's readback (tastytrade's average open price and
 *    held quantity) and a live mark — never from what the ticket sent; a working order is never a fill.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { selectBrokerOrderLines, type BrokerReadback } from "./brokerOrderLines";
import { CLOSE_REQUEST_TTL_MS, closeRequestFor, consumeCloseRequest, requestClose } from "./closeRequest";

const T = 1_000_000;
const pos = { symbol: "/MNQZ6", quantity: 2, direction: "Long" as const, averageOpenPrice: 21000, instrumentType: "Future" };
const rb = (o: Partial<BrokerReadback> = {}): BrokerReadback => ({ asOfMs: T, ok: true, orders: [], positions: [pos], ...o });

describe("position line P&L — broker readback only", () => {
  it("open P&L = (mark − broker average) × held qty × point value", () => {
    const r = selectBrokerOrderLines(rb(), "/MNQZ6", 21010, 2, T + 1_000);
    expect(r.position?.pnlUsd).toBeCloseTo(40, 6);
    expect(r.lines.find(l => l.role === "POSITION")?.pnlUsd).toBeCloseTo(40, 6);
  });
  it("no live mark, or a stale readback → no P&L number (never a guess)", () => {
    expect(selectBrokerOrderLines(rb(), "/MNQZ6", null, 2, T + 1_000).position?.pnlUsd).toBeNull();
    const stale = selectBrokerOrderLines(rb(), "/MNQZ6", 21010, 2, T + 60_000);
    expect(stale.position?.pnlUsd).toBeNull();
    expect(stale.lines.find(l => l.role === "POSITION")?.status).toBe("RECONCILING");
  });
  it("a working order with no broker position draws no POSITION line and no P&L", () => {
    const working = { id: "1", status: "Live", state: "WORKING", symbol: "/MNQZ6", action: "Buy to Open", quantity: 1, filled: 0, price: "21000", stopTrigger: null, orderType: "Limit", externalId: null, cancellable: true, rejectReason: null, updatedAt: null } as unknown as BrokerReadback["orders"][number];
    const r = selectBrokerOrderLines(rb({ positions: [], orders: [working] }), "/MNQZ6", 21010, 2, T + 1_000);
    expect(r.position).toBeNull();
    expect(r.lines.some(l => l.role === "POSITION")).toBe(false);
  });
});

describe("CLOSE from the strip — a request to the one ticket, never a send", () => {
  it("is per symbol, consumed once, and expires", () => {
    requestClose("mnq1!", T);
    const r = closeRequestFor("MNQ1!", T + 1);
    expect(r).not.toBeNull();
    expect(closeRequestFor("ES1!", T + 1)).toBeNull();
    expect(closeRequestFor("MNQ1!", T + CLOSE_REQUEST_TTL_MS + 1)).toBeNull();
    consumeCloseRequest(r!.seq);
    expect(closeRequestFor("MNQ1!", T + 2)).toBeNull();
  });
  it("the strip's CLOSE and the store reach no route; the ticket loads FLATTEN only when LOADABLE", () => {
    const strip = readFileSync(path.join(process.cwd(), "src/components/chart/ChartBookStrip.tsx"), "utf8");
    const store = readFileSync(path.join(process.cwd(), "src/lib/execution/closeRequest.ts"), "utf8");
    const panel = readFileSync(path.join(process.cwd(), "src/components/chart/TradePanel.tsx"), "utf8");
    expect(strip.length).toBeGreaterThan(2000);
    expect(store.length).toBeGreaterThan(500);
    expect(store).not.toMatch(/fetch\(|\/api\//);
    expect(strip).toMatch(/onClick=\{\(\) => \{ requestClose\(symbol\); onOpenTicket\(\); \}\}/);
    expect(panel).toMatch(/if \(!f \|\| book\.flatten\.state !== "LOADABLE"\) return;/);
    expect(panel).toMatch(/data-testid="trade-reverse-not-built"/);
  });
});

describe("phone CLOSE (Founder ruling 2026-10-10): never behind a sideways scroll, never over UNPROTECTED", () => {
  const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
  const panel = readFileSync(path.join(process.cwd(), "src/components/chart/TradePanel.tsx"), "utf8");
  it("the strip's CLOSE is not drawn at ≤767px; it travels with the strip below 1280px", () => {
    expect(css.length).toBeGreaterThan(10_000);
    expect(css).toMatch(/@media \(max-width: 767px\) \{\s*\.wm-instrument-context-strip > \.wm-book-close \{ display: none !important; \}/);
    expect(css).toMatch(/@media \(max-width: 1279px\) \{\s*\.wm-instrument-context-strip > \.wm-book-close \{ order: -3; \}/);
  });
  it("on the phone ticket, CLOSE is the header's first control when holding — the same request", () => {
    expect(panel).toMatch(/compact && owner && book\.position\.state === "HOLDING" \? <button type="button" data-testid="trade-header-close" onClick=\{\(\) => requestClose\(symbol\)\}/);
    const header = panel.slice(panel.indexOf('data-testid="trade-header"'));
    expect(header.indexOf("trade-header-close")).toBeLessThan(header.indexOf("trade-live-arm"));
  });
});
