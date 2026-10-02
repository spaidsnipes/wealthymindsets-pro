/**
 * Garden 18 §VIII — the instrument's context strip, per asset class, and
 * never a dead entry.
 */
import { describe, expect, it } from "vitest";

import { categoryTabsFor } from "./categoryTabsFor";
import { instrumentContextStrip } from "./instrumentContextStrip";

const labels = (cls: Parameters<typeof instrumentContextStrip>[0]) => instrumentContextStrip(cls, "X").map(e => e.label);

describe("instrument context strip", () => {
  it("names each class's context exactly as Garden 18 §VIII lists it", () => {
    expect(labels("equity")).toEqual(["Overview", "Options", "Financials", "News / Research"]);
    expect(labels("etf")).toEqual(["Overview", "Options", "Financials", "News / Research"]);
    expect(labels("futures")).toEqual(["Overview", "Futures Options", "Contract", "News / Research"]);
    expect(labels("crypto")).toEqual(["Overview", "Derivatives", "Market Info", "News / Research"]);
    expect(labels("forex")).toEqual(["Overview", "Market Info", "News / Research"]);
  });

  it("every TAB entry is a view this room renders for that class — no dead button", () => {
    for (const cls of ["equity", "etf", "futures", "crypto", "forex", "options"] as const) {
      const tabs = new Set(categoryTabsFor(cls));
      for (const e of instrumentContextStrip(cls, "X")) {
        if (e.kind === "TAB") expect(tabs.has(e.tab), `${cls} → ${e.label}`).toBe(true);
        if (e.kind === "DISABLED") expect(e.reason.length).toBeGreaterThan(20);
        // Garden 18 §LX: one chain instrument — FUTURES_OPTIONS on a future, OPTIONS on a stock/ETF.
        if (e.kind === "PANEL") expect(e.panel).toBe(cls === "futures" ? "FUTURES_OPTIONS" : cls === "crypto" ? "CRYPTO_OPTIONS" : "OPTIONS");
      }
    }
  });

  it("BTC and ETH open Deribit's view-only chain; other coins say why not (2026-10-01)", () => {
    expect(instrumentContextStrip("crypto", "BTC-USD").find(e => e.id === "derivatives")).toMatchObject({ kind: "PANEL", panel: "CRYPTO_OPTIONS" });
    expect(instrumentContextStrip("crypto", "ETH-USD").find(e => e.id === "derivatives")).toMatchObject({ kind: "PANEL", panel: "CRYPTO_OPTIONS" });
    expect(instrumentContextStrip("crypto", "SOL-USD").find(e => e.id === "derivatives")).toMatchObject({ kind: "DISABLED" });
  });

  it("News / Research lands on the News room scoped to the instrument", () => {
    const n = instrumentContextStrip("equity", "TSLA").find(e => e.id === "news");
    expect(n).toMatchObject({ kind: "ROOM", href: "/news?q=TSLA" });
  });
});
