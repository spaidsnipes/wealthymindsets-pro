/**
 * Megazord §5: a trade taken outside WM Pro is still a journal trade, labelled by how WM knows it.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EntryProvenanceLine, TradeVenueField } from "@/components/journal/TradeVenue";
import { hydrateJournalEntry } from "./hydrateJournalEntries";
import { entryProvenance, readTradeVenue, TRADE_VENUES } from "./tradeVenue";

const record = (over: Record<string, unknown> = {}) => ({
  id: "t1", date: "2026-10-20", symbol: "MNQ1!", side: "long", entry: 21000, exit: 21010, size: 1, pnl: 20, result: "win", ...over,
});

describe("venue", () => {
  it("reads only the named venues; anything else is 'not said'", () => {
    for (const v of TRADE_VENUES) expect(readTradeVenue(v.id)).toBe(v.id);
    for (const bad of ["tradingview", "", null, 3, "NINJA"]) expect(readTradeVenue(bad)).toBeUndefined();
  });

  it("survives the one journal hydrator, and an unknown stored venue is dropped", () => {
    expect(hydrateJournalEntry(record({ venue: "TRADINGVIEW" }))?.venue).toBe("TRADINGVIEW");
    expect(hydrateJournalEntry(record({ venue: "SOMEWHERE" }))?.venue).toBeUndefined();
    expect(hydrateJournalEntry(record({}))?.venue).toBeUndefined();
  });
});

describe("provenance", () => {
  it("a typed trade is SELF-REPORTED, with where it was traded or 'not said'", () => {
    expect(entryProvenance({ venue: "TRADINGVIEW", hasBrokerCapture: false })).toMatchObject({
      kind: "SELF_REPORTED", label: "Self-reported",
      detail: "traded on TradingView. Prices, size and result are as you typed them.",
    });
    expect(entryProvenance({ hasBrokerCapture: false }).detail).toMatch(/^where it was traded is not said\./);
  });

  it("broker fill facts outrank a typed venue", () => {
    const p = entryProvenance({ venue: "SIMULATOR", hasBrokerCapture: true });
    expect(p.kind).toBe("BROKER_CONFIRMED");
    expect(p.venue).toBeNull();
  });

  it("the words never grade the trader or call a typed price verified", () => {
    const all = TRADE_VENUES.flatMap(v => [entryProvenance({ venue: v.id, hasBrokerCapture: false }).words]).join(" ");
    expect(all).not.toMatch(/verified|confirmed|mistake|wrong|bad trade/i);
  });
});

describe("on the page", () => {
  it("the form asks where it was traded, optional, and invites outside trades in", () => {
    const html = renderToStaticMarkup(React.createElement(TradeVenueField, { value: undefined, onChange: () => {} }));
    expect(html).toContain("Where was it traded? (optional)");
    expect(html).toContain('<option value="" selected="">Not said</option>');
    expect(html).toContain("Traded somewhere else? Journal it anyway.");
  });

  it("the entry says how WM knows it", () => {
    const html = renderToStaticMarkup(React.createElement(EntryProvenanceLine, { venue: "PROP_PLATFORM", hasBrokerCapture: false }));
    expect(html).toContain('data-kind="SELF_REPORTED"');
    expect(html).toContain("traded on a prop firm&#x27;s platform");
  });

  it("source: the field shows only without broker facts, the detail always carries the line, and save drops a venue beside a capture", () => {
    const page = readFileSync(path.resolve(process.cwd(), "src/app/journal/page.tsx"), "utf8");
    expect(page).toContain(') : <TradeVenueField value={form.venue} onChange={v => setForm(f => ({ ...f, venue: v }))} />}');
    expect(page).toContain("<EntryProvenanceLine venue={selected.venue} hasBrokerCapture={!!selected.capture} />");
    expect(page).toContain("if (e.capture) delete e.venue;");
  });
});
