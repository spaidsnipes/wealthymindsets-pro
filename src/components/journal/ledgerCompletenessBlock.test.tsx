/** §30 on the Broker Ledger: the completeness block renders the report owner's words. Synthetic data only. */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ledgerCompletenessReport } from "@/lib/broker/ledgerCompleteness";
import { readWebullHistory } from "@/lib/broker/webullLedger";
import type { AccountWalk } from "@/lib/broker/webullLedgerWalk";

import { CompletenessBlock } from "./WebullLifetimeLedger";

const NOW = Date.parse("2026-11-05T23:30:00Z");
const order = (id: string, side: "BUY" | "SELL", at: string, fees: number[] | null) => ({
  client_order_id: `c${id}`, combo_type: "NORMAL",
  orders: [{ order_id: id, symbol: "TSLA", side, status: "FILLED", total_quantity: "1", filled_quantity: "1", filled_price: side === "BUY" ? "400" : "401", filled_time_at: at, place_time_at: at, legs: [], ...(fees ? { fees: fees.map(v => ({ type: "REG", actual_value: String(v) })) } : {}) }],
});
const orders = readWebullHistory([order("1", "BUY", "2026-11-03T15:00:00Z", [0.01]), order("2", "SELL", "2026-11-03T15:05:00Z", null)], "RP2B");
const walk = (over: Partial<AccountWalk>): AccountWalk => ({
  accountId: "RP2B", orders: [...orders, orders[0]], windows: 3, pages: 4, askedBackTo: "2024-01-01", stoppedBecause: "QUIET_YEARS", reason: null,
  cachedMonths: 1, lastYearEmpty: true, splits: 1, throttled: 2, dayWindowsAtCap: [], ...over,
});

describe("CompletenessBlock", () => {
  it("complete read: verdict, duplicates removed, fees UNREPORTED, Model 1/2 UNAVAILABLE with no saved marks", () => {
    const r = ledgerCompletenessReport({ walks: [walk({})], rowsRead: 3, nowMs: NOW, savedModelMarks: null });
    const html = renderToStaticMarkup(<CompletenessBlock r={r} />);
    expect(html).toContain('data-verdict="COMPLETE_FOR_WINDOW_READ"');
    expect(html).toContain("COMPLETE FOR THE WINDOW READ");
    expect(html).toContain("3 rows read → 2 unique orders (1 duplicates removed)");
    expect(html).toContain("1 with fees UNREPORTED (not $0)");
    expect(html).toContain("1 halved · 2 slowed by Webull");
    expect(html).toContain('data-state="UNAVAILABLE"');
    expect(html).toContain("No Model 1 / Model 2 marks are saved");
    expect(html).not.toContain("GAPS:");
  });
  it("a capped day makes it INCOMPLETE and names the day", () => {
    const r = ledgerCompletenessReport({ walks: [walk({ dayWindowsAtCap: ["2026-11-03"] })], nowMs: NOW, savedModelMarks: {} });
    const html = renderToStaticMarkup(<CompletenessBlock r={r} />);
    expect(html).toContain('data-verdict="INCOMPLETE"');
    expect(html).toMatch(/GAPS: 2026-11-03: a one-day window still answered 30\+ rows/);
  });
  it("saved marks on a closed round trip → results from those marks only", () => {
    const id = `RP2B|TSLA|${new Date("2026-11-03T15:00:00Z").toISOString()}`;
    const r = ledgerCompletenessReport({ walks: [walk({})], nowMs: NOW, savedModelMarks: { [id]: "M2" } });
    const html = renderToStaticMarkup(<CompletenessBlock r={r} />);
    expect(html).toContain('data-state="FROM_SAVED_MARKS"');
    expect(html).toContain("from 1 saved mark");
    expect(html).toContain("M2 1 trades");
  });
});
