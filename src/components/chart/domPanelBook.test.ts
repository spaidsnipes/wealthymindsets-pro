/**
 * Founder decision 2026-10-09: the Depth ladder just shows the order book —
 * for BTC-USD and the other crypto pairs too — with no label of where WM Pro
 * gets it.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { depthBookSymbol } from "./DOMPanel";

const SRC = readFileSync("src/components/chart/DOMPanel.tsx", "utf8");

describe("the depth panel reads the book for every spelling of a crypto market", () => {
  it("BTC-USD, BTC/USD, BTCUSD and BTC are one book", () => {
    for (const s of ["BTC", "BTC-USD", "BTC/USD", "BTCUSD", "btc-usd"]) expect(depthBookSymbol(s), s).toBe("BTC");
    expect(depthBookSymbol("ETH-USD")).toBe("ETH");
    expect(depthBookSymbol("SOL-USD")).toBe("SOL");
  });
  it("a non-crypto market has no book here", () => {
    for (const s of ["SPY", "NQ1!", "EURUSD", "AAPL", ""]) expect(depthBookSymbol(s), s).toBeNull();
  });
  it("every read is keyed by the book's symbol", () => {
    expect(SRC).toContain("const sym    = depthBookSymbol(symbol) ?? symbol.toUpperCase();");
  });
});

describe("the panel names no venue, vendor or transport on the glass", () => {
  // Rendered text = JSX text nodes and string literals in JSX expressions; imports,
  // identifiers and comments are code, not glass.
  const noComments = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const glass = [...noComments.matchAll(/>([^<>{}]+)</g)].map(m => m[1].trim()).filter(Boolean)
    .concat([...noComments.matchAll(/\?\s*"([^"]+)"\s*:\s*"([^"]+)"/g)].flatMap(m => [m[1], m[2]]));

  it("the scan found the panel's words", () => {
    expect(glass.length).toBeGreaterThan(8);
    expect(glass).toContain("Depth");
  });
  it("no source words", () => {
    const hits = glass.filter(t => /kraken|coinbase|binance|tastytrade|webull|\bREST\b|websocket|\bWS\b/i.test(t));
    expect(hits).toEqual([]);
  });
  it("the book's state is a state word", () => {
    expect(SRC).toContain('{realConnected ? "● LIVE" : "○ SNAPSHOT"}');
  });
  it("both branches carry a way out", () => {
    expect((SRC.match(/aria-label="Close market depth panel"/g) ?? []).length).toBe(2);
  });
});
