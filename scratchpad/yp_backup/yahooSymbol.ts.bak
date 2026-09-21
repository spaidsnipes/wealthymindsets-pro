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
 *
 * ── The defect that closure CREATED, and this table closes ──────────────────
 *
 * Deriving `${base}-USD` made those 48 bare bases resolve. It did not make them
 * resolve to the RIGHT COIN. Yahoo's crypto namespace has collisions, and the
 * bare ticker is held by whichever token Yahoo listed first — usually not the
 * one a trader means. Asked for the eleven bases below, Yahoo answered with a
 * different asset every time: `SUI-USD` is Salmonation, `APT-USD` is Apricot
 * Finance, `UNI-USD` is UNICORN Token, `PEPE-USD` is PEPEGOLD.
 *
 * That is the SAME LIVING-PIXEL violation the crypto derivation was written to
 * fix — the label and the number owned by different assets — just moved one
 * layer down, from equity-vs-coin to coin-vs-coin. It is strictly worse than
 * the empty response it replaced: an absent price is honestly absent, while
 * Salmonation's price under the word "Sui" is a wrong number that looks right.
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

/**
 * One coin whose Yahoo ticker is NOT `{BASE}-USD`, with the evidence that made
 * the pin defensible. Every field is a RECORDED OBSERVATION, not a belief.
 */
export interface YahooCryptoPin {
  /** The Yahoo ticker that returns the coin the product actually offers. */
  readonly ticker: string;
  /** Yahoo's own `meta.longName` for `ticker`, minus its " USD" suffix. */
  readonly yahooName: string;
  /** Yahoo's name for the naive `{BASE}-USD` — the wrong coin this pin displaces. */
  readonly displacedName: string;
}

/**
 * Crypto bases whose bare Yahoo ticker belongs to a DIFFERENT coin.
 *
 * Yahoo disambiguates by appending a numeric listing id, so the coin a trader
 * means is `SUI20947-USD` while `SUI-USD` is an unrelated token. There is no
 * rule that derives the id — it must be looked up and checked by a human — so
 * this is a table, and each row carries the two names that justify it.
 *
 * ── How the rows were established, and what they do NOT claim ───────────────
 *
 * Each base offered under the pickers' "Crypto" category was fetched from
 * Yahoo as `{BASE}-USD` and its `meta.longName` compared to the name the picker
 * prints. Eleven disagreed; each was then re-looked-up through Yahoo's own
 * search and the replacement confirmed by name. Observed 2026-09-05.
 *
 * This table is therefore COMPLETE FOR WHAT WAS MEASURED and nothing more. It
 * does not claim Yahoo has no other collision, and a coin listed after that
 * date can collide without appearing here. Re-running the comparison is the
 * only way to know; a passing test suite is not evidence of a new coin's
 * correctness. The Sentinel proves these rows are right, not that they are all.
 */
export const YF_CRYPTO_PINS: Readonly<Record<string, YahooCryptoPin>> = {
  ACT:     { ticker: "ACT33566-USD",     yahooName: "Act I : The AI Prophecy", displacedName: "Achain" },
  ALT:     { ticker: "ALT29073-USD",     yahooName: "Altlayer",                displacedName: "Alt.Estate token" },
  APT:     { ticker: "APT21794-USD",     yahooName: "Aptos",                   displacedName: "Apricot Finance" },
  MELANIA: { ticker: "MELANIA35347-USD", yahooName: "Official Melania Meme",   displacedName: "Melania Trump Parody (melania.world)" },
  MEME:    { ticker: "MEME28301-USD",    yahooName: "Memecoin",                displacedName: "Memetic / PepeCoin" },
  PEPE:    { ticker: "PEPE24478-USD",    yahooName: "Pepe",                    displacedName: "PEPEGOLD" },
  STRK:    { ticker: "STRK22691-USD",    yahooName: "Starknet",                displacedName: "Strike" },
  SUI:     { ticker: "SUI20947-USD",     yahooName: "Sui",                     displacedName: "Salmonation" },
  TON:     { ticker: "TON11419-USD",     yahooName: "Toncoin",                 displacedName: "TON Token" },
  TRUMP:   { ticker: "TRUMP35336-USD",   yahooName: "OFFICIAL TRUMP",          displacedName: "FreeTrump" },
  UNI:     { ticker: "UNI7083-USD",      yahooName: "Uniswap",                 displacedName: "UNICORN Token" },
};

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
    if (base) {
      // A pinned base is one whose bare `{BASE}-USD` belongs to a different
      // coin. The pin must win over the derivation, or the screen prints one
      // coin's name over another coin's price.
      return YF_CRYPTO_PINS[base]?.ticker ?? `${base}-USD`;
    }
  }

  // Forex pairs: Yahoo uses the "EURUSD=X" format (no slash).
  // Handles "EUR/USD", "GBP/JPY", and also bare 6-letter pairs like "EURUSD".
  if (up.includes("/")) return `${up.replace("/", "")}=X`;
  if (/^(EUR|GBP|USD|JPY|AUD|NZD|CAD|CHF|CNH)(USD|JPY|EUR|GBP|AUD|NZD|CAD|CHF|CNH)$/.test(up)) return `${up}=X`;

  return up;
}
