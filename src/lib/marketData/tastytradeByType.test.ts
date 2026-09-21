import { describe, it, expect } from "vitest";
import {
  TASTYTRADE_BY_TYPE_SYMBOL_CAP,
  TASTYTRADE_INSTRUMENT_TYPES,
  compileByTypeOutcome,
  planMarketDataByTypeQuery,
} from "./tastytradeByType";

describe("planMarketDataByTypeQuery — the request we actually send", () => {
  it("uses array-style repeated params, not a comma-joined list", () => {
    const plan = planMarketDataByTypeQuery({ equity: ["AAPL", "TSLA"], index: ["SPX"] });
    expect(plan.path).toBe("/market-data/by-type?equity%5B%5D=AAPL&equity%5B%5D=TSLA&index%5B%5D=SPX");
    expect(plan.path).not.toContain("AAPL%2CTSLA");
  });

  it("returns path null — not an empty request — when nothing was named", () => {
    // The distinction the whole refusal vocabulary rests on: asking for nothing
    // is OUR decision (NOT_ASKED), and must never be dressed up as the
    // provider's silence.
    const plan = planMarketDataByTypeQuery({ equity: ["", "   "] });
    expect(plan.path).toBeNull();
    expect(plan.totalAsked).toBe(0);
  });

  it("PRESERVES option and future symbology instead of upper-casing it", () => {
    // These symbols belong to tastytrade's symbology, not ours. A silent
    // rewrite here would make a correct request look like a provider refusal.
    const plan = planMarketDataByTypeQuery({
      "equity-option": ["SPY 250428P00355000"],
      future: ["/CLM5"],
      cryptocurrency: ["BTC/USD"],
    });
    expect(plan.path).toContain(encodeURIComponent("SPY 250428P00355000"));
    expect(plan.path).toContain(encodeURIComponent("/CLM5"));
    expect(plan.path).toContain(encodeURIComponent("BTC/USD"));
  });

  it("de-duplicates within a group but keeps the same symbol in two groups", () => {
    const plan = planMarketDataByTypeQuery({ equity: ["AAPL", "AAPL"], index: ["AAPL"] });
    expect(plan.asked.equity).toEqual(["AAPL"]);
    expect(plan.asked.index).toEqual(["AAPL"]);
    expect(plan.totalAsked).toBe(2);
  });

  it("caps the COMBINED count across groups and names what it did not ask for", () => {
    const equity = Array.from({ length: 95 }, (_, i) => `E${i}`);
    const index = Array.from({ length: 10 }, (_, i) => `X${i}`);
    const plan = planMarketDataByTypeQuery({ equity, index });
    expect(plan.totalAsked).toBe(TASTYTRADE_BY_TYPE_SYMBOL_CAP);
    // 105 supplied, 100 asked — the 5 absent ones are NAMED, never silently
    // swallowed. A trader must be able to see which symbols are missing.
    expect(plan.droppedOverCap).toEqual(["X5", "X6", "X7", "X8", "X9"]);
  });

  it("asks for everything when the caller stays under the cap", () => {
    // Guards the guard: a planner that always dropped the tail would satisfy
    // the cap test above while being useless.
    const plan = planMarketDataByTypeQuery({
      equity: Array.from({ length: TASTYTRADE_BY_TYPE_SYMBOL_CAP }, (_, i) => `E${i}`),
    });
    expect(plan.droppedOverCap).toEqual([]);
    expect(plan.totalAsked).toBe(TASTYTRADE_BY_TYPE_SYMBOL_CAP);
  });

  it("covers every instrument type tastytrade documents", () => {
    const groups = Object.fromEntries(TASTYTRADE_INSTRUMENT_TYPES.map((t) => [t, ["Z"]]));
    const plan = planMarketDataByTypeQuery(groups);
    for (const t of TASTYTRADE_INSTRUMENT_TYPES) {
      expect(plan.path).toContain(encodeURIComponent(`${t}[]`));
    }
  });
});

describe("compileByTypeOutcome — four words, never collapsed into one", () => {
  it("SERVED counts what arrived", () => {
    const r = compileByTypeOutcome({ items: [{ symbol: "AAPL" }, { symbol: "TSLA" }] });
    expect(r.outcome).toBe("SERVED");
    expect(r.note).toContain("2 quotes");
  });

  it("EMPTY is distinct from REFUSED — answered, carried nothing", () => {
    const r = compileByTypeOutcome({ items: [] });
    expect(r.outcome).toBe("EMPTY");
    expect(r.note).toContain("answered");
  });

  it("NOT_ASKED owns the decision as OURS", () => {
    const r = compileByTypeOutcome({ notAskedReason: "no symbols were supplied." });
    expect(r.outcome).toBe("NOT_ASKED");
    expect(r.note).toContain("WM Pro did not send this request");
  });

  it("REFUSED carries tastytrade's token verbatim and blames no account", () => {
    // This endpoint is funded-accounts-only, which makes a 403 the single most
    // tempting error here to mis-narrate as a verdict on the Founder's account.
    // That guess is the Webull three-month failure in miniature.
    const r = compileByTypeOutcome({ refusedEdge: "tastytrade GET /market-data/by-type failed (HTTP 403)" });
    expect(r.outcome).toBe("REFUSED");
    expect(r.note).toContain("HTTP 403");
    expect(r.note).toContain("not a measured fact about the account");
    expect(r.note).not.toMatch(/not funded|unfunded|your account is/i);
  });

  it("never claims real-time, even on a SERVED answer", () => {
    // The docs say this REST lane is not delayed. A sentence in a document is
    // not a measurement of THIS host's entitlement.
    expect(compileByTypeOutcome({ items: [{ symbol: "AAPL" }] }).realTime).toBeNull();
    expect(compileByTypeOutcome({ refusedEdge: "HTTP 403" }).realTime).toBeNull();
  });

  it("reports over-cap symbols on every outcome, not just success", () => {
    for (const attempt of [
      { items: [{ s: 1 }] },
      { items: [] },
      { refusedEdge: "HTTP 403" },
      { notAskedReason: "nothing named." },
    ]) {
      const r = compileByTypeOutcome({ ...attempt, droppedOverCap: ["ZZZ"] });
      expect(r.note).toContain("ZZZ");
    }
  });

  it("says nothing about a cap when nothing was dropped", () => {
    // Guards the guard above: a note that always mentioned the cap would pass
    // it while telling the trader nothing.
    expect(compileByTypeOutcome({ items: [] }).note).not.toContain("cap");
  });
});
