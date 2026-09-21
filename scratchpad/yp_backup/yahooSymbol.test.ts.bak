import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { YF_CRYPTO_PINS, YF_MAP, toYahooSymbol } from "./yahooSymbol";
import { canonicalAssetClass } from "./marketData/canonicalIdentity";

/**
 * Yahoo symbol-resolution Sentinel.
 *
 * The defect: of the 88 distinct symbols the product's own pickers offer under
 * the "Crypto" category, 71 resolved no Yahoo ticker. `YF_MAP` gave a pair-form
 * alias to exactly three coins (BTCUSD / ETHUSD / SOLUSD), so every other pair
 * form, every venue form, and 48 bare bases were handed to Yahoo verbatim and
 * came back empty. A symbol the product offers must resolve to something the
 * provider can actually answer.
 *
 * Expectations below are RE-DERIVED from the picker sources rather than
 * restated, so adding a coin to a picker without teaching the identity layer
 * fails here by name instead of shipping a silently dead symbol. The positive
 * controls come first because a source-scraping suite whose regex matches
 * nothing passes vacuously and proves nothing at all.
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

/**
 * The crypto rows again, but carrying the NAME the picker prints and the file
 * that printed it. Separate from `pickerRows` because the name is what makes a
 * ticker collision visible: `SUI-USD` resolving is not the question, whether it
 * resolves to the coin the screen CALLS "Sui" is.
 */
function pickerCryptoNames(src: string): Array<{ base: string; name: string }> {
  const rows: Array<{ base: string; name: string }> = [];
  const re = /\{\s*sym:\s*"([^"]+)"[^}]*?(?:name|label):\s*"([^"]*)"[^}]*?cat:\s*"([A-Za-z]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m[3] !== "Crypto" || m[1].includes(".")) continue;   // venue rows carry no distinct name
    rows.push({ base: m[1].replace(/(?:USDT|USDC|USD)$/, "") || m[1], name: m[2] });
  }
  return rows;
}

/** base → the set of distinct names the pickers give it, one entry per spelling. */
const CRYPTO_NAMES_BY_BASE = new Map<string, Set<string>>();
for (const p of PICKERS) {
  for (const { base, name } of pickerCryptoNames(read(p))) {
    if (!CRYPTO_NAMES_BY_BASE.has(base)) CRYPTO_NAMES_BY_BASE.set(base, new Set());
    CRYPTO_NAMES_BY_BASE.get(base)!.add(name);
  }
}

/**
 * Compare two names for WHICH COIN they mean. Yahoo suffixes every crypto
 * longName with " USD" and the pickers spell the pair "Sui / USD"; neither is a
 * disagreement about identity, so both are stripped.
 */
const nameKey = (s: string): string =>
  s.replace(/\s*\/?\s*USD$/i, "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const offeredNameKey = (base: string): string =>
  nameKey([...(CRYPTO_NAMES_BY_BASE.get(base) ?? [])][0] ?? "");

const symbolsInCategory = (pred: (cat: string) => boolean): string[] =>
  [...new Set(ALL_ROWS.filter((r) => pred(r.cat)).map((r) => r.sym))].sort();

const CRYPTO_SYMBOLS = symbolsInCategory((c) => c === "Crypto");
const FOREX_SYMBOLS = symbolsInCategory((c) => c === "Forex");
/** The pickers spell the same category both ways — "Stock" and "Stocks". */
const EQUITY_SYMBOLS = symbolsInCategory((c) => c === "Stock" || c === "Stocks");

/**
 * The crypto rows `YF_MAP` used to carry verbatim, before they were derived
 * from the identity layer. Hand-written on purpose: this is the one assertion
 * in the file that must NOT be re-derived, because its whole job is to prove
 * the new derivation reproduces the old table exactly. Deriving it from the
 * thing under test would prove nothing.
 *
 * ── One row deliberately no longer matches ──────────────────────────────────
 *
 * `UNI` used to resolve to `UNI-USD`, and `UNI-USD` is UNICORN Token — not the
 * Uniswap the picker names. So this table was never a CORRECTNESS baseline; it
 * was a BEHAVIOUR baseline, and it froze a defect alongside the fifteen rows it
 * froze correctly. Its expectation is changed here on purpose, with the reason
 * written down, because a Sentinel that pins prior behaviour will defend a bug
 * as loyally as it defends a fix.
 */
const RETIRED_YF_MAP_CRYPTO: ReadonlyArray<readonly [string, string]> = [
  ["BTC", "BTC-USD"], ["BTCUSD", "BTC-USD"],
  ["ETH", "ETH-USD"], ["ETHUSD", "ETH-USD"],
  ["SOL", "SOL-USD"], ["SOLUSD", "SOL-USD"],
  ["BNB", "BNB-USD"],
  ["XRP", "XRP-USD"],
  ["DOGE", "DOGE-USD"],
  ["ADA", "ADA-USD"],
  ["AVAX", "AVAX-USD"],
  ["LINK", "LINK-USD"],
  ["DOT", "DOT-USD"],
  ["MATIC", "MATIC-USD"],
  ["LTC", "LTC-USD"],
  ["ATOM", "ATOM-USD"],
  // CHANGED, not preserved — see the note above. `UNI-USD` is UNICORN Token.
  ["UNI", "UNI7083-USD"],
];

describe("picker extraction — the positive control comes first", () => {
  it("PROOF each picker source really yields rows", () => {
    for (const p of PICKERS) {
      expect(pickerRows(read(p)).length, `${p} yielded no rows`).toBeGreaterThan(5);
    }
  });

  it("PROOF the crypto union is the large set the defect was about", () => {
    expect(CRYPTO_SYMBOLS.length).toBeGreaterThanOrEqual(80);
    expect(CRYPTO_SYMBOLS).toContain("BTCUSD");
    expect(CRYPTO_SYMBOLS).toContain("DOGEUSD");
    expect(CRYPTO_SYMBOLS).toContain("BTC.COINBASE");
  });

  it("PROOF the extractor discriminates by category, not by file", () => {
    expect(EQUITY_SYMBOLS.length).toBeGreaterThan(10);
    expect(FOREX_SYMBOLS.length).toBeGreaterThan(10);
    for (const s of CRYPTO_SYMBOLS) expect(EQUITY_SYMBOLS).not.toContain(s);
  });
});

describe("no offered crypto symbol is a dead symbol", () => {
  it("THE CORE REGRESSION: every crypto symbol the pickers offer resolves to a Yahoo pair", () => {
    const dead = CRYPTO_SYMBOLS.filter((s) => !/-USD$/.test(toYahooSymbol(s)));
    expect(dead, `these resolve no Yahoo ticker: ${dead.join(" ")}`).toEqual([]);
  });

  it("the pair form and the bare base resolve to the same ticker", () => {
    expect(toYahooSymbol("DOGEUSD")).toBe(toYahooSymbol("DOGE"));
    expect(toYahooSymbol("XRPUSD")).toBe("XRP-USD");
  });

  it("venue-pinned rows resolve to the base, not to the venue", () => {
    expect(toYahooSymbol("BTC.COINBASE")).toBe("BTC-USD");
    expect(toYahooSymbol("ETH.KRAKEN")).toBe("ETH-USD");
  });

  it("a slashed crypto pair is crypto, not a currency pair", () => {
    // "BTCUSD=X" is a forex ticker Yahoo does not have. Crypto must be
    // resolved before the slash branch, exactly as canonicalAssetClass orders it.
    expect(toYahooSymbol("BTC/USD")).toBe("BTC-USD");
  });

  it("resolution agrees with what the screen says the instrument IS", () => {
    // If canonicalAssetClass calls it crypto and prints 24X7 over it, the
    // transport may not fetch an equity of the same name.
    for (const s of CRYPTO_SYMBOLS) {
      expect(canonicalAssetClass(s), `${s} classified non-crypto`).toBe("crypto");
    }
  });
});

describe("a coin is never served under a different coin's name", () => {
  /**
   * Deriving `${base}-USD` made 48 dead bare bases resolve. It did not make
   * them resolve to the right coin: Yahoo's bare crypto ticker belongs to
   * whichever token it listed first, so `SUI-USD` is Salmonation and `UNI-USD`
   * is UNICORN Token. That is the same label-vs-number split the derivation was
   * written to close, moved from equity-vs-coin down to coin-vs-coin, and it is
   * worse than the empty response it replaced — an absent price is honestly
   * absent, a wrong one looks right.
   *
   * `YF_CRYPTO_PINS` carries two recorded names per row: what Yahoo calls the
   * pinned ticker, and what it calls the bare one the pin displaces. Those two
   * fields are what make each row checkable here instead of merely asserted.
   */
  it("PROOF the name extractor yields names, and every pinned base is really offered", () => {
    // Without these two counts the assertions below pass vacuously: every one
    // of them iterates `YF_CRYPTO_PINS`, so emptying the table would satisfy
    // them all while restoring the exact defect they exist to catch.
    expect(Object.keys(YF_CRYPTO_PINS).length).toBeGreaterThanOrEqual(11);
    expect(CRYPTO_NAMES_BY_BASE.size).toBeGreaterThanOrEqual(60);
    for (const base of Object.keys(YF_CRYPTO_PINS)) {
      expect(CRYPTO_NAMES_BY_BASE.get(base), `${base} is no longer offered under Crypto`).toBeTruthy();
      expect(offeredNameKey(base), `${base} row carries no name`).not.toBe("");
    }
  });

  it("THE CORE REGRESSION: every pinned base resolves to its pin, not to the bare ticker", () => {
    const wrong = Object.entries(YF_CRYPTO_PINS)
      .filter(([base, pin]) => toYahooSymbol(base) !== pin.ticker)
      .map(([base, pin]) => `${base}→${toYahooSymbol(base)} (want ${pin.ticker}, which is "${pin.yahooName}")`);
    expect(wrong, wrong.join("; ")).toEqual([]);
  });

  it("THE NAMED COLLISION: the pinned ticker carries the name the screen prints", () => {
    // Containment, not equality: Yahoo prefixes some listings ("Official
    // Melania Meme" for a row the picker calls "MELANIA meme"). A prefix is a
    // more specific spelling of the same coin, not a different one.
    for (const [base, pin] of Object.entries(YF_CRYPTO_PINS)) {
      const offered = offeredNameKey(base);
      const resolved = nameKey(pin.yahooName);
      expect(
        resolved.includes(offered) || offered.includes(resolved),
        `${base}: picker prints "${offered}" but ${pin.ticker} is "${pin.yahooName}"`,
      ).toBe(true);
    }
  });

  it("THE DISPLACED COIN: every pin displaces a genuinely different coin", () => {
    // Exact inequality, NOT containment — "PEPEGOLD" contains "PEPE", so a
    // containment test here would call the collision a match and license the
    // very row it is meant to justify. A displaced coin only has to differ.
    for (const [base, pin] of Object.entries(YF_CRYPTO_PINS)) {
      expect(
        nameKey(pin.displacedName),
        `${base}: the pin displaces nothing — "${pin.displacedName}" is the coin we offer`,
      ).not.toBe(offeredNameKey(base));
    }
  });

  it("a pin equal to the derivation would be dead weight", () => {
    for (const [base, pin] of Object.entries(YF_CRYPTO_PINS)) {
      expect(pin.ticker, `${base} pins the naive ticker`).not.toBe(`${base}-USD`);
    }
  });

  it("the pair and slashed forms reach the pin, not just the bare base", () => {
    expect(toYahooSymbol("SUIUSD")).toBe("SUI20947-USD");
    expect(toYahooSymbol("SUI/USD")).toBe("SUI20947-USD");
    expect(toYahooSymbol("PEPEUSD")).toBe("PEPE24478-USD");
    expect(toYahooSymbol("UNIUSD")).toBe("UNI7083-USD");
  });

  it("the pickers agree with each other on what every coin is CALLED", () => {
    // Two owners of one label is this same defect one layer up. ChartToolbar
    // called PEPE "Pepe" while SymbolSearch and MainLayout called it "Pepe
    // Coin" — and Yahoo lists both as real, distinct tokens. A pin cannot be
    // verified against a name the product does not agree on with itself.
    const split = [...CRYPTO_NAMES_BY_BASE.entries()]
      .filter(([, names]) => new Set([...names].map(nameKey)).size > 1)
      .map(([base, names]) => `${base}: ${[...names].map((n) => `"${n}"`).join(" vs ")}`);
    expect(split, split.join("; ")).toEqual([]);
  });

  it("an unpinned coin still derives the bare ticker", () => {
    // Negative control: the pin lookup must not have widened into a rewrite of
    // every crypto symbol.
    expect(YF_CRYPTO_PINS.BTC).toBeUndefined();
    expect(toYahooSymbol("BTC")).toBe("BTC-USD");
    expect(toYahooSymbol("DOGE")).toBe("DOGE-USD");
    expect(toYahooSymbol("SHIB")).toBe("SHIB-USD");
  });
});

describe("nothing that used to resolve stopped resolving", () => {
  it("THE ANTI-REGRESSION: every retired YF_MAP crypto row derives identically", () => {
    for (const [sym, expected] of RETIRED_YF_MAP_CRYPTO) {
      expect(toYahooSymbol(sym), `${sym} changed`).toBe(expected);
    }
  });

  it("PROOF those rows really are gone from the table", () => {
    for (const [sym] of RETIRED_YF_MAP_CRYPTO) {
      expect(YF_MAP[sym], `${sym} is still hand-tabulated`).toBeUndefined();
    }
  });

  it("futures still come from the explicit table", () => {
    expect(toYahooSymbol("NQ1!")).toBe("NQ=F");
    expect(toYahooSymbol("MES1!")).toBe("MES=F");
    expect(toYahooSymbol("VX1!")).toBe("^VIX");
  });

  it("metals spot still maps to the continuous contract", () => {
    expect(toYahooSymbol("XAUUSD")).toBe("GC=F");
    expect(toYahooSymbol("XAGUSD")).toBe("SI=F");
    expect(toYahooSymbol("XPTUSD")).toBe("PL=F");
  });

  it("currency pairs still resolve to the =X form, both spellings", () => {
    expect(toYahooSymbol("EUR/USD")).toBe("EURUSD=X");
    expect(toYahooSymbol("EURUSD")).toBe("EURUSD=X");
    expect(toYahooSymbol("GBPJPY")).toBe("GBPJPY=X");
  });
});

describe("the claim stayed narrow — negative controls", () => {
  it("no equity the pickers offer was turned into a crypto pair", () => {
    const stolen = EQUITY_SYMBOLS.filter((s) => /-USD$/.test(toYahooSymbol(s)));
    expect(stolen, `these equities became crypto: ${stolen.join(" ")}`).toEqual([]);
  });

  it("an ordinary equity passes through untouched", () => {
    expect(toYahooSymbol("AAPL")).toBe("AAPL");
    expect(toYahooSymbol("TSLA")).toBe("TSLA");
    expect(toYahooSymbol("BRK.B")).toBe("BRK.B");
  });

  it("a USDT or USDC quote is NOT answered with the USD price", () => {
    // Yahoo lists only the USD pair. Substituting it for a request that named a
    // different quote currency would be answering a question nobody asked.
    expect(toYahooSymbol("BTCUSDT")).not.toBe("BTC-USD");
    expect(toYahooSymbol("ETHUSDC")).not.toBe("ETH-USD");
  });

  it("no currency pair the pickers offer was turned into crypto", () => {
    const stolen = FOREX_SYMBOLS.filter((s) => /-USD$/.test(toYahooSymbol(s)));
    expect(stolen, `these pairs became crypto: ${stolen.join(" ")}`).toEqual([]);
  });

  it("DISCLOSED GAP: the non-pair rows under Forex resolve to no provider ticker", () => {
    // Index and commodity CFD proxies. Yahoo has no equivalent that is the same
    // instrument, and substituting a near-neighbour (^DJI for US30) would be
    // presenting a different market as this one. Named here so the gap is
    // disclosed rather than discovered.
    const unresolved = FOREX_SYMBOLS.filter((s) => !/=X$|=F$/.test(toYahooSymbol(s)));
    expect(unresolved).toEqual(["DXY", "UKOIL", "US100", "US30", "US500", "USOIL"]);
  });
});
