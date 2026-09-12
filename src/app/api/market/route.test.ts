/**
 * /api/market must ask the SAME question /api/finnhub asks.
 *
 * MEASURED on the live host 2026-09-12, before this fix:
 *
 *   /api/market?symbol=W        → 98.57     (Wayfair, the EQUITY)
 *   /api/finnhub?sym=W          → 0.00983   (BINANCE:WUSDT, the COIN)
 *   /api/market?symbol=BTC-USD  → 404 "No data"
 *   /api/finnhub?sym=BTC-USD    → 77,282    (BINANCE:BTCUSDT)
 *
 * Two routes, one symbol, a ten-thousand-fold difference in the number. The
 * cause was a private twelve-entry `CRYPTO_SYMS` set in this route — a sixth
 * copy of a fact `toFinnhubSym` owns, and the copy was wrong in both
 * directions: it missed every coin outside its twelve, and it could not see
 * the SUI / W / WEN equity collisions the owner exists to refuse.
 *
 * These tests pin the ASK — the exact string handed to the vendor — because
 * that is where the divergence lived. A test that only checked the response
 * shape would have passed on every day this bug was in production.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { stripComments } from "@/lib/sourceScan";
import { GET } from "./route";

const okQuote = { c: 100, o: 99, h: 101, l: 98, pc: 99 };

function quoteResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(quoteResponse(okQuote));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function askedSymbol(): string {
  const url = new URL(String(fetchMock.mock.calls[0][0]));
  return url.searchParams.get("symbol") ?? "";
}

async function get(symbol: string) {
  const response = await GET(new Request(`http://localhost/api/market?symbol=${encodeURIComponent(symbol)}`));
  return { status: response.status, body: await response.json() };
}

describe("the vendor is asked the question the symbol owner resolves", () => {
  it("resolves a bare coin to its Binance pair instead of an equity of the same name", async () => {
    await get("BTC");
    expect(askedSymbol()).toBe("BINANCE:BTCUSDT");
  });

  it("resolves a coin the old private set never carried", async () => {
    // `BTC-USD` was absent from CRYPTO_SYMS, so it was asked of the equity
    // vendor as the literal string "BTC-USD" and came back "No data" — while
    // /api/finnhub priced the same request at 77,282 the same minute.
    await get("BTC-USD");
    expect(askedSymbol()).toBe("BINANCE:BTCUSDT");
  });

  it("does not price a coin's ticker from the equity of the same name", async () => {
    // `W` is Wayfair on the US tape AND a coin in the product's own picker.
    // The owner decides which one this lane means; this route may not.
    await get("W");
    const { toFinnhubSym } = await import("@/lib/finnhubSymbol");
    expect(askedSymbol()).toBe(toFinnhubSym("W"));
  });

  it("passes a plain equity through unchanged", async () => {
    await get("AAPL");
    expect(askedSymbol()).toBe("AAPL");
  });

  it("discloses the market the number came from", async () => {
    const { body } = await get("BTC");
    // §8 is symmetric — withholding an established fact is as much a violation
    // as inventing one. A USD request answered from a USDT market must say so.
    expect(body.providerSymbol).toBe("BINANCE:BTCUSDT");
    expect(body.symbol).toBe("BTC");
  });
});

describe("a refusal names which kind of absence it is", () => {
  it("refuses a venue-pinned row rather than answering from another exchange", async () => {
    const { body } = await get("BTC.COINBASE");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(body.price).toBeNull();
    expect(body.edge).toBe("NOT CARRIED HERE");
    expect(body.error.toLowerCase()).toContain("venue");
  });

  it("tells an index reader it is a coverage boundary, not an outage", async () => {
    // MEASURED 2026-09-12: ^GSPC, ^DJI, ^IXIC and ^VIX all returned an empty
    // quote inside the same window that priced AAPL, SPY, IWM, GLD and NVDA.
    // "No data" sent that reader looking for an outage that does not exist.
    fetchMock.mockResolvedValue(quoteResponse({ c: 0 }));
    const { status, body } = await get("^GSPC");
    expect(status).toBe(404);
    expect(body.edge).toBe("NOT CARRIED HERE");
    expect(body.error).not.toBe("No data");
    expect(body.error.toLowerCase()).toContain("index");
  });

  it("still calls an empty equity quote an absent observation, not a coverage boundary", async () => {
    // The index sentence must not swallow the honest case. An equity that
    // returns nothing IS a gap, and saying "not carried here" about AAPL would
    // be the same lie pointed the other way.
    fetchMock.mockResolvedValue(quoteResponse({ c: 0 }));
    const { status, body } = await get("AAPL");
    expect(status).toBe(404);
    expect(body.edge).toBe("NO OBSERVATION");
    expect(body.error.toLowerCase()).toContain("empty quote");
  });

  it("refuses futures and forex by class, before the vendor is called", async () => {
    for (const symbol of ["ES=F", "EURUSD=X"]) {
      fetchMock.mockClear();
      const { body } = await get(symbol);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(body.error.toLowerCase()).toContain("not carried");
    }
  });
});

/**
 * THE ENVELOPE IS PART OF THE ANSWER.
 *
 * `edge` is not decoration. Consumers across the product branch on it and
 * render it as the chip beside the sentence — `OptionsChain` prints
 * `<strong>{error.edge}</strong> · {error.message}`, and `optionsChainRead`
 * dispatches on exact edge strings.
 *
 * MEASURED on prod 2026-09-12 from the Founder's own authenticated session:
 *
 *   ^GSPC         404  edge "NOT CARRIED HERE"
 *   BTC.COINBASE  200  edge "NOT CARRIED HERE"
 *   NQ=F          200  edge ABSENT
 *   EURUSD=X      200  edge ABSENT
 *
 * Futures and forex are the two classes `unsupportedAssetClassReason` was built
 * for, and theirs was the ONE branch that never said its own name in
 * machine-readable form. A consumer showing the chip rendered `undefined` beside
 * a perfectly correct sentence. The prose being right the whole time is exactly
 * what kept it invisible — which is why this block asserts over EVERY priceless
 * response rather than over a hand-picked example.
 */
describe("every priceless answer labels itself, not just the ones with prose", () => {
  const PRICELESS = ["ES=F", "NQ=F", "EURUSD=X", "^GSPC", "BTC.COINBASE"];

  it("no response with a null price omits its edge or its source", async () => {
    fetchMock.mockResolvedValue(quoteResponse({ c: 0 }));
    const unlabelled: string[] = [];
    for (const symbol of PRICELESS) {
      const { body } = await get(symbol);
      expect(body.price).toBeNull();
      if (typeof body.edge !== "string" || typeof body.source !== "string") {
        unlabelled.push(`${symbol} (edge=${body.edge}, source=${body.source})`);
      }
    }
    expect(
      unlabelled,
      `These answers carry a null price with no machine-readable label. A consumer ` +
        `rendering the edge chip beside the sentence prints \`undefined\`:\n  ` +
        unlabelled.join("\n  "),
    ).toEqual([]);
  });

  it("the class refusal names the same absence the index refusal does", async () => {
    // Not merely "some string". Futures and forex are the same KIND of absence
    // as a cash index on this lane — the venue never carries the asset class —
    // so they must carry the same word, or two surfaces will style one fact two
    // ways and a reader will infer a distinction that does not exist.
    for (const symbol of ["ES=F", "EURUSD=X"]) {
      const { body } = await get(symbol);
      expect(body.edge).toBe("NOT CARRIED HERE");
      expect(body.source).toBe("finnhub");
    }
  });

  it("an empty EQUITY quote is still the other kind, so the label discriminates", async () => {
    // Vacuity guard on the block above: if everything were stamped
    // "NOT CARRIED HERE" the first test would pass while the label carried no
    // information at all.
    fetchMock.mockResolvedValue(quoteResponse({ c: 0 }));
    const { body } = await get("AAPL");
    expect(body.edge).toBe("NO OBSERVATION");
  });
});

describe("a priced answer says when the MARKET produced it, not when we asked", () => {
  // MEASURED on prod 2026-09-12 08:22 UTC, market closed, Founder's session:
  // AAPL 332.27 carried Finnhub `t` = 2026-09-11T20:00:00Z — 12.38 hours
  // earlier — while this envelope reported the observation as 0.00h old.
  const TRADE_TIME_SECONDS = 1757620800; // 2026-09-11T20:00:00Z

  it("carries the vendor's trade time, not the moment of the request", async () => {
    fetchMock.mockResolvedValue(quoteResponse({ ...okQuote, t: TRADE_TIME_SECONDS }));
    const { body } = await get("AAPL");
    expect(body.observedAt).toBe(TRADE_TIME_SECONDS * 1000);
    // The two clocks must not be the same clock. With the market shut these
    // differ by half a day; the assertion is that they differ at all.
    expect(body.fetchedAt).toBeGreaterThan(body.observedAt);
  });

  it("reports an unknown observation time as null rather than as now", async () => {
    fetchMock.mockResolvedValue(quoteResponse(okQuote)); // no `t`
    const { body } = await get("AAPL");
    expect(body.observedAt).toBeNull();
    // `fetchedAt` is still honest — we DO know when we asked.
    expect(typeof body.fetchedAt).toBe("number");
  });

  it("no longer emits the `timestamp` field that conflated the two", async () => {
    fetchMock.mockResolvedValue(quoteResponse({ ...okQuote, t: TRADE_TIME_SECONDS }));
    const { body } = await get("AAPL");
    expect(body.timestamp).toBeUndefined();
  });
});

describe("the private copy is gone, not merely unused", () => {
  it("this route holds no symbol table of its own", () => {
    // Comments are stripped first. The route's own docblock quotes the deleted
    // set by name to record what it cost, and a raw scan read that prose as the
    // violation — a scan a comment can satisfy or break proves nothing about
    // what runs. (Caught by this very test on its first run, 2026-09-12.)
    const source = stripComments(readFileSync(resolve(__dirname, "route.ts"), "utf8"));
    // A dormant copy is a live copy: the next reader edits the nearest thing
    // that looks authoritative. The ask must come from the owner alone.
    expect(source).not.toContain("CRYPTO_SYMS");
    expect(source).toContain("toFinnhubSym");
  });
});
