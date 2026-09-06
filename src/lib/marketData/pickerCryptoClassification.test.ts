import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  SESSION_TOKEN_CLOSED,
  SESSION_TOKEN_CONTINUOUS,
  canonicalAssetClass,
  cryptoBaseTicker,
  forexPairCodes,
  provenSessionClosure,
  selectCanonicalSessionToken,
} from "./canonicalIdentity";

/**
 * pickerCryptoClassification — what the product OFFERS and what the identity
 * layer BELIEVES must be the same set.
 *
 * ── The live defect ─────────────────────────────────────────────────────────
 *
 * `CRYPTO_TICKERS` held 20 bare bases. The three symbol pickers offered 88
 * crypto symbols, nearly all of them in pair form ("BTCUSD") or venue form
 * ("BTC.COINBASE"). So `canonicalAssetClass("BTCUSD")` answered "equity",
 * `provenSessionClosure` read Saturday and returned `false` = PROVEN CLOSED,
 * and the deck compiled "SESSION CLOSED — LAST VERIFIED. Nothing is streaming."
 * over Bitcoin, mid-trade, on the weekend. That is the §8 overreach inverted:
 * withholding an established fact is as much a violation as inventing one.
 *
 * ── Why this file re-derives the list instead of restating it ───────────────
 *
 * The standing lesson in this repo, now recorded nine times, is a check written
 * against the shape the data has when it is CONVENIENT rather than the shape it
 * has in production. A hand-written list of 62 tickers here would be a second
 * copy of the same claim, free to drift from the pickers the moment someone
 * adds a coin — which is exactly how the original 20-vs-88 gap opened.
 *
 * So the expectations below are EXTRACTED from the picker sources at run time.
 * Add a coin to any picker without teaching the identity layer and this file
 * fails, naming the symbol. That is the whole point of it.
 */

const PICKERS = [
  "../../components/ui/SymbolSearch.tsx",
  "../../components/layout/MainLayout.tsx",
  "../../components/chart/ChartToolbar.tsx",
] as const;

const read = (rel: string): string => readFileSync(resolve(__dirname, rel), "utf8");

/** Every `{ sym:"X", … cat:"<category>" }` row in one picker source. */
function pickerRows(src: string): Array<{ sym: string; cat: string }> {
  const rows: Array<{ sym: string; cat: string }> = [];
  const re = /\{\s*sym:\s*"([^"]+)"[^}]*?cat:\s*"([A-Za-z]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) rows.push({ sym: m[1], cat: m[2] });
  return rows;
}

function symbolsInCategory(match: (cat: string) => boolean): string[] {
  const out = new Set<string>();
  for (const rel of PICKERS) {
    for (const row of pickerRows(read(rel))) {
      if (match(row.cat)) out.add(row.sym);
    }
  }
  return [...out].sort();
}

const CRYPTO_SYMBOLS = symbolsInCategory((c) => c === "Crypto");
const FOREX_SYMBOLS = symbolsInCategory((c) => c === "Forex");
/** The pickers spell the same category both ways — "Stock" and "Stocks". */
const EQUITY_SYMBOLS = symbolsInCategory((c) => c === "Stock" || c === "Stocks");

/** Bare bases MainChart already resolves to a Polygon crypto ticker. */
const POLYGON_CRYPTO_BASES: string[] = (() => {
  const src = read("../../components/chart/MainChart.tsx");
  const start = src.indexOf("const cryptoMap");
  const end = src.indexOf("if (cryptoMap[s])");
  return [...src.slice(start, end).matchAll(/([A-Z0-9]+)\s*:\s*"X:/g)].map((m) => m[1]);
})();

/** Saturday. 2026-09-05 is the day the contradiction was captured live. */
const SATURDAY = new Date(2026, 8, 5);

describe("picker extraction — the positive control comes first", () => {
  /**
   * §22: an expectation derived from a regex that matches nothing passes
   * vacuously and proves the opposite of what it claims. Rename a picker
   * constant or reshape a row and every assertion below would go green over an
   * empty array. These four tests exist so that cannot happen silently.
   */
  it("PROOF each picker source really yields crypto rows", () => {
    for (const rel of PICKERS) {
      const rows = pickerRows(read(rel)).filter((r) => r.cat === "Crypto");
      expect(rows.length, `${rel} yielded no Crypto rows — the extractor is broken`)
        .toBeGreaterThan(5);
    }
  });

  it("PROOF the union is the large set the defect was about", () => {
    // 88 at the time of writing. Asserting a floor rather than the exact count
    // keeps this from failing on every legitimate picker addition, while still
    // failing loudly if extraction collapses.
    expect(CRYPTO_SYMBOLS.length).toBeGreaterThan(80);
    expect(CRYPTO_SYMBOLS).toContain("BTCUSD");
    expect(CRYPTO_SYMBOLS).toContain("BTC");
    expect(CRYPTO_SYMBOLS).toContain("BTC.COINBASE");
  });

  it("PROOF the extractor discriminates by category, not by file", () => {
    // If `pickerRows` ignored `cat` these sets would overlap. They must not.
    expect(FOREX_SYMBOLS.length).toBeGreaterThan(5);
    expect(EQUITY_SYMBOLS.length).toBeGreaterThan(20);
    const crypto = new Set(CRYPTO_SYMBOLS);
    expect(FOREX_SYMBOLS.filter((s) => crypto.has(s))).toEqual([]);
    expect(EQUITY_SYMBOLS.filter((s) => crypto.has(s))).toEqual([]);
  });

  it("PROOF MainChart's Polygon crypto map was really read", () => {
    expect(POLYGON_CRYPTO_BASES.length).toBeGreaterThan(20);
    expect(POLYGON_CRYPTO_BASES).toContain("BTC");
    expect(POLYGON_CRYPTO_BASES).toContain("AAVE");
  });
});

describe("every symbol the product offers as crypto is classified crypto", () => {
  it("THE CORE REGRESSION: no offered crypto symbol classifies as equity", () => {
    const wrong = CRYPTO_SYMBOLS.filter((s) => canonicalAssetClass(s) !== "crypto");
    expect(wrong, "offered as Crypto but not classified crypto").toEqual([]);
  });

  it("THE CORE REGRESSION: none of them is stamped CLOSED on a Saturday", () => {
    const stamped = CRYPTO_SYMBOLS.filter(
      (s) => selectCanonicalSessionToken({ symbol: s, at: SATURDAY }).token !== SESSION_TOKEN_CONTINUOUS,
    );
    expect(stamped, "a 24/7 market was given a session token other than 24X7").toEqual([]);
  });

  it("closure is never ESTABLISHED for a continuous market, on any day", () => {
    // provenSessionClosure returns `false` for proven-closed and `null` for
    // not-established. Crypto must always be `null` — never provably closed.
    for (const day of [new Date(2026, 8, 5), new Date(2026, 8, 6), new Date(2026, 8, 2)]) {
      const closed = CRYPTO_SYMBOLS.filter((s) => provenSessionClosure(s, day) === false);
      expect(closed, `proven CLOSED on ${day.toDateString()}`).toEqual([]);
    }
  });

  it("MainChart's Polygon map agrees with the identity layer", () => {
    // Two places encode "this bare ticker is crypto". They may not disagree —
    // that disagreement is Canon Weakness #1 at the identity layer.
    const wrong = POLYGON_CRYPTO_BASES.filter((s) => canonicalAssetClass(s) !== "crypto");
    expect(wrong, "resolved as crypto for chart data but not for the session claim").toEqual([]);
  });

  it("the venue-pinned rows resolve to their base, not to a venue", () => {
    expect(cryptoBaseTicker("BTC.COINBASE")).toBe("BTC");
    expect(cryptoBaseTicker("ETH.KRAKEN")).toBe("ETH");
    expect(cryptoBaseTicker("BTCUSDT")).toBe("BTC");
    expect(cryptoBaseTicker("BTC/USD")).toBe("BTC");
  });
});

describe("the claim stayed narrow — negative controls", () => {
  /**
   * The failure mode opposite to the one above: a classifier that answers
   * "crypto" for everything would pass every test in the previous block and be
   * catastrophically wrong. These prove the widening did not happen.
   */
  it("no forex pair the pickers offer became crypto", () => {
    const wrong = FOREX_SYMBOLS.filter((s) => canonicalAssetClass(s) === "crypto");
    expect(wrong).toEqual([]);
    expect(cryptoBaseTicker("EURUSD")).toBeNull();
  });

  it("no equity the pickers offer became crypto", () => {
    const wrong = EQUITY_SYMBOLS.filter((s) => canonicalAssetClass(s) === "crypto");
    expect(wrong).toEqual([]);
  });

  it("equities are STILL proven closed on a Saturday", () => {
    // If this ever goes quiet the weekend heuristic has been broken outright
    // and the block above would pass for the wrong reason.
    expect(canonicalAssetClass("AAPL")).toBe("equity");
    expect(provenSessionClosure("AAPL", SATURDAY)).toBe(false);
    expect(selectCanonicalSessionToken({ symbol: "AAPL", at: SATURDAY }).token)
      .toBe(SESSION_TOKEN_CLOSED);
  });

  it("a dotted equity class suffix is not mistaken for a venue", () => {
    expect(cryptoBaseTicker("BRK.B")).toBeNull();
    expect(canonicalAssetClass("BRK.B")).toBe("equity");
  });

  it("futures keep their own class and are not swallowed by the crypto test", () => {
    expect(canonicalAssetClass("GC1!")).toBe("futures");
    expect(canonicalAssetClass("NQ1!")).toBe("futures");
    expect(cryptoBaseTicker("GC1!")).toBeNull();
  });
});

/**
 * The same defect, one lane over — found by the negative control above rather
 * than by looking for it.
 *
 * `canonicalAssetClass` detected forex only by a slash, but the pickers spell
 * pairs BOTH ways: "EUR/USD" in ChartToolbar, "EURUSD" in SymbolSearch. The
 * compact twelve classified as EQUITY, and `provenSessionClosure` returns
 * `false` — PROVEN CLOSED — for equities on a Sunday. So the screen declared
 * the FX market closed on the evening it reopens, which is the precise
 * overreach that function's own doc comment forbids in writing.
 */
describe("compact currency pairs are pairs, not equities", () => {
  /** Currency pairs the pickers spell without a slash. */
  const COMPACT_PAIRS = FOREX_SYMBOLS.filter(
    (s) => !s.includes("/") && forexPairCodes(s) !== null,
  );

  /**
   * Instruments the pickers file under "Forex" that are NOT currency pairs:
   * a dollar index, two oil CFDs and three index CFDs. Their sessions are not
   * derivable from this seat, so no claim is made about them — they are named
   * here so the gap is DISCLOSED rather than silently mis-stamped.
   */
  const NOT_PAIRS = FOREX_SYMBOLS.filter(
    (s) => !s.includes("/") && forexPairCodes(s) === null,
  );

  it("PROOF the compact pairs really exist in the pickers", () => {
    expect(COMPACT_PAIRS).toContain("EURUSD");
    expect(COMPACT_PAIRS).toContain("USDJPY");
    expect(COMPACT_PAIRS).toContain("XAUUSD");
    expect(COMPACT_PAIRS.length).toBeGreaterThan(8);
  });

  it("THE REGRESSION: every compact pair classifies forex, not equity", () => {
    const wrong = COMPACT_PAIRS.filter((s) => canonicalAssetClass(s) !== "forex");
    expect(wrong, "spelled without a slash and therefore called an equity").toEqual([]);
  });

  it("THE REGRESSION: no currency pair is stamped CLOSED on a Sunday", () => {
    const SUNDAY = new Date(2026, 8, 6);
    const all = FOREX_SYMBOLS.filter((s) => s.includes("/") || forexPairCodes(s) !== null);
    const stamped = all.filter((s) => provenSessionClosure(s, SUNDAY) === false);
    expect(stamped, "FX reopens Sunday evening — closure is not established").toEqual([]);
  });

  it("both spellings of one pair agree with each other", () => {
    // Two spellings, one instrument. If they ever diverge the same page can
    // show two different session claims for the same market — Weakness #1.
    expect(canonicalAssetClass("EURUSD")).toBe(canonicalAssetClass("EUR/USD"));
    expect(canonicalAssetClass("USDJPY")).toBe(canonicalAssetClass("USD/JPY"));
    expect(forexPairCodes("EUR/USD")).toEqual(["EUR", "USD"]);
  });

  it("the pair test stayed narrow — six letters alone is not a pair", () => {
    // Were this shape-only, any six-letter ticker would become forex.
    expect(forexPairCodes("GOOGLE")).toBeNull();
    expect(forexPairCodes("ABCDEF")).toBeNull();
    expect(canonicalAssetClass("SMCIUS")).toBe("equity");
    // Still true of real equities of every length.
    expect(canonicalAssetClass("AAPL")).toBe("equity");
    expect(canonicalAssetClass("NVDA")).toBe("equity");
  });

  it("DISCLOSED GAP: the non-pair rows under Forex are not claimed as pairs", () => {
    // Not a bug being frozen — a boundary being stated. These are CFDs and
    // indices; classifying them from a picker's category label would be a
    // guess. If one is ever given a real session owner, remove it from here.
    expect(NOT_PAIRS.sort()).toEqual(["DXY", "UKOIL", "US100", "US30", "US500", "USOIL"]);
  });
});
