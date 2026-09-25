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
  /**
   * Offered by the pickers, and named by the spot-metal refusal below as the
   * lawful alternative ("Open PL1! for Platinum futures"), but absent from this
   * table — so they reached Yahoo verbatim as "PL1!" and 404'd. MEASURED
   * 2026-09-25: Yahoo lists each `=F` below as instrumentType FUTURE on the
   * named exchange (PL/PA NY Mercantile; 6E/6J/6B CME). Same contract, Yahoo's
   * name — an identity, like every other row here.
   */
  "PL1!":  "PL=F",
  "PA1!":  "PA=F",
  "6E1!":  "6E=F",
  "6J1!":  "6J=F",
  "6B1!":  "6B=F",
  /**
   * "VX1!" → "^VIX" WAS HERE, and it is GONE (GP12 §26, 2026-09-25). VX1! is
   * VIX FUTURES (CFE); ^VIX is the CASH index — Yahoo's own meta calls it
   * instrumentType INDEX, "Cboe Indices". Serving it under a futures symbol is
   * the XAUUSD defect in the other direction: a different market (no term
   * structure, no roll, not tradable) wearing a contract's name. MEASURED the
   * same day: Yahoo lists no VIX futures (`VX=F` → "No data found"), so there is
   * no lawful mapping to write. `resolveYahooSymbol` refuses VX1! and names the
   * index a trader can open instead.
   */

  /**
   * CASH INDICES — the SAME instrument under Yahoo's name, not a proxy.
   * `^GSPC` is the S&P 500 index itself; SPX asked Yahoo for "SPX" and got a
   * 404, so the index chart read NO BAR HISTORY (serving, 2026-09-25). This is
   * an identity, which is why it is allowed while the CFD rows below
   * (US500, US30…) stay refused: those are different instruments.
   */
  "SPX":   "^GSPC",
  "NDX":   "^NDX",
  "DJI":   "^DJI",
  "DJIA":  "^DJI",
  "RUT":   "^RUT",
  "VIX":   "^VIX",
  "IXIC":  "^IXIC",
  "COMP":  "^IXIC",

  /**
   * NOT MAPPED, on purpose: US30, US500, US100, USOIL, UKOIL, DXY.
   *
   * These were mapped to ^DJI / ^GSPC / ^NDX / CL=F / BZ=F during this session
   * because the pickers offer them and /api/yahoo answers {"error":"No data"}
   * for every one — measurably dead rows in a live dropdown. The mapping was
   * REVERTED the same hour: the negative control in this module's test spells
   * out why, and it is right. A CFD proxy is not the index it tracks, and a
   * spot oil row is not the front-month contract. Filling a blank chart by
   * quietly serving a near-neighbour replaces an absence the trader can see
   * with a substitution they cannot.
   *
   * The gap is real and stays DISCLOSED rather than papered over. Fixing it
   * means either sourcing the actual instrument or withdrawing the rows — not
   * renaming a different market.
   */
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

/**
 * A SYMBOL THIS MODULE WILL NOT SEND TO YAHOO, AND WHY.
 *
 * ── THE MISATTRIBUTION THIS TYPE EXISTS TO END ──────────────────────────────
 *
 * `toYahooSymbol` returns its input verbatim when nothing resolves. That is a
 * safe default for a string function and a dishonest one for a request: the
 * caller then ASKS Yahoo for `BTCUSDT`, Yahoo says 404, and the chart prints
 *
 *     Yahoo was asked and refused — Error: Yahoo HTTP 404.
 *
 * Measured on the serving host, BTCUSDT · 5m, 2026-09-20. Every word of that
 * sentence is true and the sentence is wrong. Yahoo did not refuse a judgement
 * call; WM declined, several frames earlier, to substitute a USD market for a
 * USDT one — a deliberate rule with an owner — and then let the vendor take
 * the blame for it by sending the request anyway.
 *
 * That is the SAME FAILURE SHAPE as the Webull three-month bug documented in
 * `marketData/webullSdkContract.ts`: a provider's error code read as evidence
 * about the provider, when it was only ever the provider's view of OUR
 * request. There the cost was three months of telling the Founder to buy data
 * he already owned. Here the cost is a trader distrusting a vendor that
 * answered correctly.
 *
 * `compileBarHistoryRefusal.ts` already holds the right distinction —
 * NOT_ASKED ("a rule in this product stopped the request before the wire...
 * must be owned out loud, never dressed up as the vendor's silence") versus
 * REFUSED. It could not be used on this path because the rule did not survive
 * as a value. Now it does.
 */
export type YahooSymbolResolution =
  | { readonly kind: "RESOLVED"; readonly ticker: string }
  /** `reason` is written for a trader to read on the glass, not for a log. */
  | { readonly kind: "UNRESOLVED"; readonly reason: string };

/**
 * Resolve a WM symbol to a Yahoo ticker, or say — in one sentence a trader can
 * act on — why this product will not ask.
 *
 * WHAT THIS DOES NOT CLAIM: a RESOLVED verdict is not a promise Yahoo holds
 * that ticker. It means no rule HERE stopped the request. Yahoo may still 404,
 * and that 404 is then genuinely Yahoo's answer and belongs to Yahoo.
 */
/**
 * Spot precious metals, and the futures contract that is NOT them. Returned so
 * a refusal can name the lawful alternative; never used to substitute one.
 */
const SPOT_METALS: Readonly<Record<string, { readonly name: string; readonly futures: string }>> = {
  XAUUSD: { name: "Gold", futures: "GC1!" },
  XAGUSD: { name: "Silver", futures: "SI1!" },
  XPTUSD: { name: "Platinum", futures: "PL1!" },
  XPDUSD: { name: "Palladium", futures: "PA1!" },
};

export function spotMetalFutures(sym: string): { readonly name: string; readonly futures: string } | null {
  const compact = sym.trim().toUpperCase().replace(/[-/]/g, "");
  const key = compact === "XAU" ? "XAUUSD" : compact === "XAG" ? "XAGUSD" : compact;
  return SPOT_METALS[key] ?? null;
}

/**
 * Futures contracts no connected feed serves, and the cash index that is NOT
 * them. The mirror of SPOT_METALS: there the only price was a future under a
 * spot name, here the only price is a cash index under a futures name. Returned
 * so a refusal can name the lawful alternative; never used to substitute one.
 */
const FUTURES_WITHOUT_A_SOURCE: Readonly<Record<string, { readonly name: string; readonly cash: string }>> = {
  "VX1!": { name: "VIX", cash: "^VIX" },
};

export function futuresCashStandIn(sym: string): { readonly name: string; readonly cash: string } | null {
  return FUTURES_WITHOUT_A_SOURCE[sym.trim().toUpperCase()] ?? null;
}

export function resolveYahooSymbol(sym: string): YahooSymbolResolution {
  const up = sym.trim().toUpperCase();
  const standIn = futuresCashStandIn(up);
  if (standIn) {
    return {
      kind: "UNRESOLVED",
      reason:
        `No ${standIn.name} futures source is connected, and WM does not show the cash ` +
        `${standIn.name} index under a futures name — they are a different market. Open ` +
        `${standIn.cash} for the cash index.`,
    };
  }
  const metal = spotMetalFutures(up);
  if (metal) {
    return {
      kind: "UNRESOLVED",
      reason:
        `No spot ${metal.name} source is connected, and WM does not show ${metal.futures} ` +
        `futures under a spot name — they are a different market. Open ${metal.futures} for ` +
        `${metal.name} futures.`,
    };
  }
  const compact = up.replace(/[-/]/g, "");
  const unlistedQuote = UNLISTED_CRYPTO_QUOTES.exec(compact)?.[0];
  if (unlistedQuote && !YF_MAP[up] && cryptoBaseTicker(up)) {
    const base = cryptoBaseTicker(up);
    return {
      kind: "UNRESOLVED",
      reason:
        // Phrased to stand alone in the API response AND to read cleanly after
        // compileBarHistoryRefusal's own "Yahoo was not asked — " prefix, which
        // already says who was not asked. Repeating it there was the first
        // draft and it read like the sentence did not trust the reader.
        `Yahoo lists no ${base}/${unlistedQuote} market, and WM does not answer a ` +
        `${unlistedQuote} request with the ${base}/USD price — that is a different ` +
        `market, not a rounding difference.`,
    };
  }
  return { kind: "RESOLVED", ticker: toYahooSymbol(up) };
}

export function toYahooSymbol(sym: string): string {
  const up = sym.trim().toUpperCase();
  if (YF_MAP[up]) return YF_MAP[up];

  // Precious-metals spot (XAUUSD = gold, XAGUSD = silver, etc.) — Yahoo has no
  // spot ticker, so this NOTATION maps to the continuous futures contract for
  // CLASSIFICATION (asset class, playbook routing). It is not a licence to
  // display futures prices under a spot name: `resolveYahooSymbol` — the gate
  // every price request passes — refuses spot metals (GP12 §26).
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
