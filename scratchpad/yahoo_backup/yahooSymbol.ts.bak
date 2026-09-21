/**
 * WM internal symbol → Yahoo Finance ticker.
 *
 * Extracted from `/api/yahoo` so the resolution can be tested directly. A route
 * module cannot export a helper for a test to call, and an untested symbol
 * table is exactly where "the product offers it but nothing resolves it" hides.
 *
 * ── Why crypto is derived and not tabulated ─────────────────────────────────
 *
 * `canonicalIdentity.ts` already owns the question "is this crypto, and what is
 * its base". This module asks it rather than keeping a second hand-written
 * list, because the two answers disagreeing is not a cosmetic problem: if
 * `canonicalAssetClass()` calls a symbol crypto and the screen prints `24X7`
 * over it, this route must not quietly fetch an equity of the same name. That
 * is Canon Weakness #1 — two owners, one pixel, different truths.
 *
 * The gap this closed, measured against the product's own pickers: of the 88
 * distinct symbols offered under the "Crypto" category, **71 resolved no Yahoo
 * ticker** — all 13 USD pair forms (`DOGEUSD`), all 10 venue forms
 * (`BTC.COINBASE`), and 48 bare bases (`PEPE`, `SUI`, `TON`). They were passed
 * to Yahoo verbatim and came back empty.
 */

import { cryptoBaseTicker } from "@/lib/marketData/canonicalIdentity";

/**
 * Explicit overrides. Everything here is a mapping that cannot be derived —
 * futures month-continuation tickers and the crypto bases that predate the
 * derivation below. A hit here wins, so this table can still pin a symbol whose
 * derived answer would be wrong.
 */
export const YF_MAP: Record<string, string> = {
  // Futures
  "NQ1!":  "NQ=F",   "MNQ1!": "MNQ=F",
  "ES1!":  "ES=F",   "MES1!": "MES=F",
  "YM1!":  "YM=F",   "MYM1!": "MYM=F",
  "RTY1!": "RTY=F",  "M2K1!": "M2K=F",
  "GC1!":  "GC=F",   "MGC1!": "MGC=F",
  "SI1!":  "SI=F",
  "CL1!":  "CL=F",   "MCL1!": "MCL=F",
  "NG1!":  "NG=F",
  "HG1!":  "HG=F",
  "ZB1!":  "ZB=F",
  "ZN1!":  "ZN=F",
  "ZF1!":  "ZF=F",
  "ZT1!":  "ZT=F",
  "ZC1!":  "ZC=F",
  "ZW1!":  "ZW=F",
  "ZS1!":  "ZS=F",
  "LE1!":  "LE=F",
  "VX1!":  "^VIX",
};

/**
 * Quote currencies Yahoo does not list a pair for. Answering a `BTCUSDT`
 * request with the `BTC-USD` price would be a silent quote-currency
 * substitution — a different market, presented as if it were the one asked
 * for — so these are left unresolved and the caller reports no data.
 */
const UNLISTED_CRYPTO_QUOTES = /(?:USDT|USDC)$/;

export function toYahooSymbol(sym: string): string {
  const up = sym.trim().toUpperCase();
  if (YF_MAP[up]) return YF_MAP[up];

  // Precious-metals spot (XAUUSD = gold, XAGUSD = silver, etc.) — Yahoo has no
  // spot FX ticker for these, so map to the nearest continuous futures contract.
  const metal = up.replace("/", "");
  if (metal === "XAUUSD" || metal === "XAU") return "GC=F"; // gold
  if (metal === "XAGUSD" || metal === "XAG") return "SI=F"; // silver
  if (metal === "XPTUSD") return "PL=F"; // platinum
  if (metal === "XPDUSD") return "PA=F"; // palladium

  // Crypto is resolved BEFORE forex for the same reason `canonicalAssetClass`
  // orders them that way: "BTC/USD" contains a slash but is not a currency
  // pair, and `BTCUSD=X` is not a ticker Yahoo has.
  if (!UNLISTED_CRYPTO_QUOTES.test(up.replace(/[-/]/g, ""))) {
    const base = cryptoBaseTicker(up);
    if (base) return `${base}-USD`;
  }

  // Forex pairs: Yahoo uses the "EURUSD=X" format (no slash).
  // Handles "EUR/USD", "GBP/JPY", and also bare 6-letter pairs like "EURUSD".
  if (up.includes("/")) return `${up.replace("/", "")}=X`;
  if (/^(EUR|GBP|USD|JPY|AUD|NZD|CAD|CHF|CNH)(USD|JPY|EUR|GBP|AUD|NZD|CAD|CHF|CNH)$/.test(up)) return `${up}=X`;

  return up;
}
