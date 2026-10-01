import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { webullPreviewScope } from "./webullPreviewScope";
import { classifySymbol } from "@/lib/marketData/symbolAssetClass";
import { stripComments } from "@/lib/sourceScan";

/*
  The four symbols the /charts audit (2026-09-26, at 3ff5cd7) found offering an
  ENABLED "Preview buy 1 <SYM>" at Webull — each is a class the preview cannot
  price, and each now gets the refusal in words.
*/
describe("webullPreviewScope — only US equities get a preview", () => {
  it.each([
    ["ES1!", "FUTURES", "Equities only — this preview cannot price futures (ES1!). Nothing is sent to Webull."],
    ["GC1!", "FUTURES", "Equities only — this preview cannot price futures (GC1!). Nothing is sent to Webull."],
    ["BTCUSD", "CRYPTO", "Equities only — this preview cannot price crypto (BTCUSD). Nothing is sent to Webull."],
    ["SPX", "INDEX", "Equities only — this preview cannot price an index (SPX). Nothing is sent to Webull."],
    // Spot metals: classifySymbol files them under FOREX, but the noun comes
    // from the owner (equityVendorSkipNoun) — never "forex" for spot gold.
    ["XAUUSD", "FOREX", "Equities only — this preview cannot price spot metals (XAUUSD). Nothing is sent to Webull."],
    ["XAGUSD", "FOREX", "Equities only — this preview cannot price spot metals (XAGUSD). Nothing is sent to Webull."],
  ] as const)("%s is %s and is refused by name", (symbol, cls, words) => {
    const scope = webullPreviewScope(symbol);
    expect(scope.eligible).toBe(false);
    if (scope.eligible) return;
    expect(scope.assetClass).toBe(cls);
    expect(scope.refusal).toBe(words);
  });

  it("equities are eligible, and the order word is derived, not typed", () => {
    for (const symbol of ["TSLA", "AAPL", "spy", " nvda "]) {
      const scope = webullPreviewScope(symbol);
      expect(scope, symbol).toEqual({ eligible: true, assetClass: "EQUITY", orderAssetClass: "equity" });
    }
  });

  it("forex and unclassifiable symbols are refused too — UNKNOWN is not a stock", () => {
    const fx = webullPreviewScope("EURUSD=X");
    expect(fx.eligible).toBe(false);
    if (!fx.eligible) expect(fx.refusal).toMatch(/cannot price forex/);
    const unknown = webullPreviewScope("BRK.B.X9");
    expect(unknown.eligible).toBe(false);
    if (!unknown.eligible) expect(unknown.refusal).toMatch(/cannot price a symbol it cannot classify/);
    const empty = webullPreviewScope("");
    expect(empty.eligible).toBe(false);
  });

  it("READS the class owner rather than restating it — every class agrees with classifySymbol", () => {
    for (const symbol of ["ES1!", "GC1!", "BTCUSD", "SPX", "TSLA", "EURUSD=X", "NQ=F", "/ES", "ETH-USD", "^VIX"]) {
      expect(webullPreviewScope(symbol).assetClass, symbol).toBe(classifySymbol(symbol));
    }
    const src = readFileSync(resolve(__dirname, "webullPreviewScope.ts"), "utf8");
    expect(src).toContain("classifySymbol(symbol)");
    // The noun is the owner's where the owner has one, not a local literal.
    expect(stripComments(src)).toContain("equityVendorSkipNoun(symbol)");
    expect(stripComments(src)).not.toMatch(/FOREX:\s*"forex"|FUTURES:\s*"futures"/);
  });

  it("the route derives the intent's class from this scope — the literal is gone", () => {
    const route = readFileSync(
      resolve(__dirname, "../../app/api/broker/webull/order-preview/route.ts"),
      "utf8",
    );
    // CODE ONLY: the route's own comment quotes the old literal to date the
    // defect, and a scan that trips on its own history gets deleted.
    const code = stripComments(route);
    expect(code).toContain("webullPreviewScope(symbolIn)");
    // Garden 18 §XCIII (2026-10-01): an option is the one other class, and only
    // with its parsed OSI contract; every other intent still takes the scope's class.
    expect(code).toContain('assetClass: contract ? "option" : scope.orderAssetClass,');
    expect(code).not.toMatch(/assetClass:\s*"equity"/);
  });
});
