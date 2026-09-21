import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FH_MAP, toFinnhubSym } from "./finnhubSymbol";
import { canonicalAssetClass } from "./marketData/canonicalIdentity";

/**
 * Finnhub symbol-resolution Sentinel.
 *
 * The defect: `toFinnhubSym` ended in `return up` — "plain stock/ETF, use
 * as-is" — so every crypto symbol missing from its thirteen-row table was
 * asked of Finnhub AS AN EQUITY. Finnhub is the real-time US equity provider,
 * and the product's own Crypto picker offers tickers that are also live US
 * equities. That is not a dead symbol, it is a wrong one.
 *
 * The equity collisions are asserted BY NAME below rather than described,
 * because "some coins collide with equities" is not a test — the specific
 * collision is what makes the fall-through indefensible.
 */

const PICKERS = [
  "../components/ui/SymbolSearch.tsx",
  "../components/layout/MainLayout.tsx",
  "../components/chart/ChartToolbar.tsx",
] as const;

const read = (rel: string): string => readFileSync(resolve(__dirname, rel), "utf8");

function pickerRows(src: string): Array<{ sym: string; cat: string }> {
  const rows: Array<{ sym: string; cat: string }> = [];
  const re = /\{\s*sym:\s*"([^"]+)"[^}]*?cat:\s*"([A-Za-z]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) rows.push({ sym: m[1], cat: m[2] });
  return rows;
}

const ALL_ROWS = PICKERS.flatMap((p) => pickerRows(read(p)));

const symbolsInCategory = (pred: (cat: string) => boolean): string[] =>
  [...new Set(ALL_ROWS.filter((r) => pred(r.cat)).map((r) => r.sym))].sort();

const CRYPTO_SYMBOLS = symbolsInCategory((c) => c === "Crypto");
const EQUITY_SYMBOLS = symbolsInCategory((c) => c === "Stock" || c === "Stocks");

/** A crypto row is venue-pinned when it names an exchange: "BTC.COINBASE". */
const isVenuePinned = (s: string): boolean => s.includes(".");

/**
 * Coins the product offers whose bare ticker is ALSO a live US equity. These
 * are the symbols the old fall-through actually mispriced, so they are written
 * out by hand: deriving them from the thing under test would prove nothing,
 * and the whole point of the list is that a human checked each one.
 *
 *   SUI  — Sun Communities Inc (NYSE), a residential REIT
 *   W    — Wayfair Inc (NYSE)
 *   WEN  — The Wendy's Company (Nasdaq)
 *   ACT  — Enact Holdings Inc (Nasdaq)
 *   ALT  — Altimmune Inc (Nasdaq)
 */
const COIN_TICKERS_THAT_ARE_ALSO_EQUITIES = ["SUI", "W", "WEN", "ACT", "ALT"] as const;

/**
 * The crypto rows `FH_MAP` used to carry verbatim, before they were derived.
 * Hand-written on purpose — its only job is to prove the derivation reproduces
 * the retired table exactly, which a derived list could not do.
 */
const RETIRED_FH_MAP_CRYPTO: ReadonlyArray<readonly [string, string]> = [
  ["BTC", "BINANCE:BTCUSDT"], ["BTCUSD", "BINANCE:BTCUSDT"],
  ["ETH", "BINANCE:ETHUSDT"], ["ETHUSD", "BINANCE:ETHUSDT"],
  ["SOL", "BINANCE:SOLUSDT"], ["SOLUSD", "BINANCE:SOLUSDT"],
  ["BNB", "BINANCE:BNBUSDT"],
  ["XRP", "BINANCE:XRPUSDT"],
  ["DOGE", "BINANCE:DOGEUSDT"],
  ["ADA", "BINANCE:ADAUSDT"],
  ["AVAX", "BINANCE:AVAXUSDT"],
  ["LINK", "BINANCE:LINKUSDT"],
  ["DOT", "BINANCE:DOTUSDT"],
  ["LTC", "BINANCE:LTCUSDT"],
  ["ATOM", "BINANCE:ATOMUSDT"],
  ["UNI", "BINANCE:UNIUSDT"],
];

describe("picker extraction — the positive control comes first", () => {
  it("PROOF each picker source really yields rows", () => {
    for (const p of PICKERS) {
      expect(pickerRows(read(p)).length, `${p} yielded no rows`).toBeGreaterThan(5);
    }
  });

  it("PROOF the crypto union is the large set the defect was about", () => {
    expect(CRYPTO_SYMBOLS.length).toBeGreaterThanOrEqual(80);
    expect(CRYPTO_SYMBOLS).toContain("SUI");
    expect(CRYPTO_SYMBOLS).toContain("BTC.COINBASE");
  });

  it("PROOF the equity-colliding coins are genuinely offered as Crypto", () => {
    // If a rename ever removes one of these from the picker, the collision
    // assertion below would pass vacuously. Prove the input exists first.
    for (const s of COIN_TICKERS_THAT_ARE_ALSO_EQUITIES) {
      expect(CRYPTO_SYMBOLS, `${s} is no longer offered under Crypto`).toContain(s);
    }
  });
});

describe("no offered crypto symbol is asked of Finnhub as an equity", () => {
  it("THE CORE REGRESSION: every crypto symbol resolves to Binance or is refused", () => {
    const leaked = CRYPTO_SYMBOLS.filter((s) => {
      const r = toFinnhubSym(s);
      return r !== null && !r.startsWith("BINANCE:");
    });
    expect(leaked, `these were sent as equities: ${leaked.join(" ")}`).toEqual([]);
  });

  it("THE NAMED COLLISION: a coin whose ticker is a live equity is never sent bare", () => {
    // Before the fix, `toFinnhubSym("SUI")` returned "SUI" and Finnhub answered
    // with Sun Communities' real-time price under a coin's name.
    for (const s of COIN_TICKERS_THAT_ARE_ALSO_EQUITIES) {
      expect(toFinnhubSym(s), `${s} still resolves to the equity`).not.toBe(s);
    }
    expect(toFinnhubSym("SUI")).toBe("BINANCE:SUIUSDT");
    expect(toFinnhubSym("W")).toBe("BINANCE:WUSDT");
    expect(toFinnhubSym("WEN")).toBe("BINANCE:WENUSDT");
  });

  it("the pair form and the bare base resolve to the same instrument", () => {
    expect(toFinnhubSym("DOGEUSD")).toBe(toFinnhubSym("DOGE"));
    expect(toFinnhubSym("PEPEUSD")).toBe("BINANCE:PEPEUSDT");
  });

  it("a slashed crypto pair is crypto, not a currency pair", () => {
    // Resolved before the slash guard, exactly as canonicalAssetClass orders it.
    expect(toFinnhubSym("BTC/USD")).toBe("BINANCE:BTCUSDT");
  });

  it("resolution agrees with what the screen says the instrument IS", () => {
    for (const s of CRYPTO_SYMBOLS) {
      expect(canonicalAssetClass(s), `${s} classified non-crypto`).toBe("crypto");
    }
  });

  it("a venue-pinned row is refused, not re-pointed at Binance", () => {
    // Answering a Coinbase request with a Binance price is a venue
    // substitution. `null` sends the caller to Yahoo instead.
    expect(toFinnhubSym("BTC.COINBASE")).toBeNull();
    expect(toFinnhubSym("ETH.KRAKEN")).toBeNull();
    const venue = CRYPTO_SYMBOLS.filter(isVenuePinned);
    expect(venue.length, "no venue-pinned rows found — control is vacuous").toBeGreaterThan(5);
    for (const s of venue) expect(toFinnhubSym(s), `${s} was re-pointed`).toBeNull();
  });
});

describe("nothing that used to resolve stopped resolving", () => {
  it("THE ANTI-REGRESSION: every retired FH_MAP crypto row derives identically", () => {
    for (const [sym, expected] of RETIRED_FH_MAP_CRYPTO) {
      expect(toFinnhubSym(sym), `${sym} changed`).toBe(expected);
    }
  });

  it("PROOF those rows really are gone from the table", () => {
    for (const [sym] of RETIRED_FH_MAP_CRYPTO) {
      expect(FH_MAP[sym], `${sym} is still hand-tabulated`).toBeUndefined();
    }
  });

  it("futures are still refused so the caller falls back to Yahoo", () => {
    expect(toFinnhubSym("NQ1!")).toBeNull();
    expect(toFinnhubSym("MES1!")).toBeNull();
    expect(toFinnhubSym("GC=F")).toBeNull();
  });

  it("currency pairs are still refused", () => {
    expect(toFinnhubSym("EUR/USD")).toBeNull();
    expect(toFinnhubSym("GBP/JPY")).toBeNull();
  });
});

describe("the claim stayed narrow — negative controls", () => {
  it("no equity the pickers offer was turned into a crypto pair", () => {
    const stolen = EQUITY_SYMBOLS.filter((s) => (toFinnhubSym(s) ?? "").startsWith("BINANCE:"));
    expect(stolen, `these equities became crypto: ${stolen.join(" ")}`).toEqual([]);
  });

  it("an ordinary equity still passes through untouched", () => {
    expect(toFinnhubSym("AAPL")).toBe("AAPL");
    expect(toFinnhubSym("TSLA")).toBe("TSLA");
    // A dotted equity class must not be mistaken for a venue-pinned coin:
    // "BRK.B" strips to "BRK", which is not a declared crypto base.
    expect(toFinnhubSym("BRK.B")).toBe("BRK.B");
  });

  it("DISCLOSED SUBSTITUTION: a USD request is answered from the USDT pair", () => {
    // Finnhub's free crypto tier is Binance, which lists no USD pair. This is a
    // real quote-currency substitution, kept because refusing it would remove
    // crypto from this lane entirely — and disclosed to the caller as
    // `providerSymbol` on the route response rather than hidden. That
    // disclosure is proven against the ROUTE, by the outbound request it makes,
    // in src/app/api/finnhub/route.test.ts — not by a string in this file.
    expect(toFinnhubSym("BTCUSD")).toBe("BINANCE:BTCUSDT");
    expect(toFinnhubSym("BTCUSDT")).toBe("BINANCE:BTCUSDT");
  });
});
