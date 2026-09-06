import { describe, it, expect } from "vitest";

import {
  PAPER_LEDGER_SOURCE,
  exposureIncreasingWorkingOrders,
  linkVerifiedFrom,
  netQtyFor,
  paperSceneSignals,
  type PaperLedgerView,
  type PaperOrderView,
} from "./paperSceneSignals";
import { compileScene } from "./compileScene";

const NOW = 1_757_000_000_000;

function ledger(over: Partial<PaperLedgerView> = {}): PaperLedgerView {
  return {
    hydrated: true,
    persistence: "PERSISTED",
    positions: [],
    orders: [],
    ...over,
  };
}

function order(over: Partial<PaperOrderView> = {}): PaperOrderView {
  return { symbol: "TSLA", side: "buy", status: "pending", ...over };
}

describe("netQtyFor", () => {
  it("sums only the focused symbol and preserves sign", () => {
    const positions = [
      { symbol: "TSLA", qty: 10 },
      { symbol: "AAPL", qty: 99 },
      { symbol: "tsla", qty: -4 },
    ];
    expect(netQtyFor(positions, "TSLA")).toBe(6);
  });

  it("ignores non-finite quantities rather than treating them as zero", () => {
    const positions = [
      { symbol: "TSLA", qty: Number.NaN },
      { symbol: "TSLA", qty: 3 },
    ];
    expect(netQtyFor(positions, "TSLA")).toBe(3);
  });
});

describe("exposureIncreasingWorkingOrders — §B14 direction", () => {
  it("counts a pending BUY while flat (it opens exposure)", () => {
    expect(exposureIncreasingWorkingOrders([order({ side: "buy" })], "TSLA", 0)).toBe(1);
  });

  it("counts a pending SELL while flat (it opens a short)", () => {
    expect(exposureIncreasingWorkingOrders([order({ side: "sell" })], "TSLA", 0)).toBe(1);
  });

  it("does NOT count a pending SELL against a long — that reduces risk", () => {
    // The §21 failure this prevents: counting the exit as exposure would pin
    // the screen to 'NOT DONE' while the trader is actually closing out.
    expect(exposureIncreasingWorkingOrders([order({ side: "sell" })], "TSLA", 10)).toBe(0);
  });

  it("does NOT count a pending BUY against a short — that reduces risk", () => {
    expect(exposureIncreasingWorkingOrders([order({ side: "buy" })], "TSLA", -10)).toBe(0);
  });

  it("counts a pending BUY that adds to an existing long", () => {
    expect(exposureIncreasingWorkingOrders([order({ side: "buy" })], "TSLA", 10)).toBe(1);
  });

  it("ignores terminal statuses — they cannot reopen exposure", () => {
    const orders: PaperOrderView[] = [
      order({ status: "filled" }),
      order({ status: "cancelled" }),
      order({ status: "rejected" }),
    ];
    expect(exposureIncreasingWorkingOrders(orders, "TSLA", 0)).toBe(0);
  });

  it("ignores other symbols", () => {
    expect(exposureIncreasingWorkingOrders([order({ symbol: "AAPL" })], "TSLA", 0)).toBe(0);
  });
});

describe("linkVerifiedFrom", () => {
  it("PERSISTED is verified", () => {
    expect(linkVerifiedFrom("PERSISTED")).toBe(true);
  });

  it("CONFLICT and FAILED are NOT verified — a lost write cannot prove the book", () => {
    expect(linkVerifiedFrom("CONFLICT")).toBe(false);
    expect(linkVerifiedFrom("FAILED")).toBe(false);
  });

  it("UNKNOWN stays null — nothing written yet proves nothing either way", () => {
    expect(linkVerifiedFrom("UNKNOWN")).toBeNull();
  });
});

describe("paperSceneSignals — the capital column is OBSERVED, never defaulted", () => {
  it("reports POSITION UNCONFIRMED / UNOBSERVED before the ledger hydrates", () => {
    // §14.1: the initial empty positions array is the absence of an
    // observation, not the observation of an absence.
    const p = paperSceneSignals({
      session: "RTH",
      rightOfWay: "WAIT",
      symbol: "TSLA",
      ledger: ledger({ hydrated: false }),
      now: NOW,
    });
    expect(p.signals.position).toBe("POSITION UNCONFIRMED");
    expect(p.signals.positionConfidence).toBe("UNOBSERVED");
    expect(p.provenance.POSITION).toBe("UNOBSERVED");
    expect(p.provenance.ORDERS).toBe("UNOBSERVED");
  });

  it("reports UNOBSERVED when no symbol is in focus (§H8) rather than summing a book", () => {
    const p = paperSceneSignals({
      session: "RTH",
      rightOfWay: "WAIT",
      symbol: null,
      ledger: ledger({ positions: [{ symbol: "TSLA", qty: 10 }] }),
      now: NOW,
    });
    expect(p.signals.position).toBe("POSITION UNCONFIRMED");
    expect(p.provenance.POSITION).toBe("UNOBSERVED");
  });

  it("reports FLAT / CONFIRMED only from an actually-read ledger", () => {
    const p = paperSceneSignals({
      session: "RTH",
      rightOfWay: "WAIT",
      symbol: "TSLA",
      ledger: ledger(),
      now: NOW,
    });
    expect(p.signals.position).toBe("FLAT");
    expect(p.signals.positionConfidence).toBe("CONFIRMED");
    expect(p.provenance.POSITION).toBe("OBSERVED");
  });

  it("reports LONG for a positive net and SHORT for a negative one", () => {
    const long = paperSceneSignals({
      session: "RTH", rightOfWay: "WAIT", symbol: "TSLA", now: NOW,
      ledger: ledger({ positions: [{ symbol: "TSLA", qty: 5 }] }),
    });
    expect(long.signals.position).toBe("LONG");

    const short = paperSceneSignals({
      session: "RTH", rightOfWay: "WAIT", symbol: "TSLA", now: NOW,
      ledger: ledger({ positions: [{ symbol: "TSLA", qty: -5 }] }),
    });
    expect(short.signals.position).toBe("SHORT");
  });

  it("never claims a capital event or a written receipt — no DECISION_ID exists", () => {
    const p = paperSceneSignals({
      session: "RTH", rightOfWay: "WAIT", symbol: "TSLA", now: NOW,
      ledger: ledger({ positions: [{ symbol: "TSLA", qty: 5 }] }),
    });
    expect(p.signals.hadCapitalEvent).toBe(false);
    expect(p.signals.receiptWritten).toBe(false);
  });

  it("never claims an intent is in flight — paper has no broker round-trip", () => {
    const p = paperSceneSignals({
      session: "RTH", rightOfWay: "WAIT", symbol: "TSLA", now: NOW,
      ledger: ledger({ orders: [order()] }),
    });
    expect(p.signals.intentInFlight).toBe(false);
  });

  it("counts observed signal groups honestly", () => {
    const p = paperSceneSignals({
      session: "RTH", rightOfWay: "WAIT", symbol: "TSLA", now: NOW,
      ledger: ledger(),
    });
    // SESSION + DECISION + POSITION + ORDERS + LINK
    expect(p.observedCount).toBe(5);
    expect(p.totalCount).toBe(5);
  });

  it("drops POSITION/ORDERS/LINK from the observed count when the ledger is unread", () => {
    const p = paperSceneSignals({
      session: "RTH", rightOfWay: "WAIT", symbol: "TSLA", now: NOW,
      ledger: null,
    });
    expect(p.observedCount).toBe(2);
    expect(p.provenance.LINK).toBe("UNOBSERVED");
  });

  it("names the paper ledger as the reporting source", () => {
    expect(PAPER_LEDGER_SOURCE).toBe("paper-ledger");
  });
});

describe("paperSceneSignals → compileScene — the scenes this unlocks", () => {
  function sceneOf(input: Parameters<typeof paperSceneSignals>[0]) {
    return compileScene(paperSceneSignals(input).signals);
  }

  it("an open long compiles to MANAGE — previously unreachable in the product", () => {
    const c = sceneOf({
      session: "RTH", rightOfWay: "ACTION", symbol: "TSLA", now: NOW,
      ledger: ledger({ positions: [{ symbol: "TSLA", qty: 10 }] }),
    });
    expect(c.scene).toBe("MANAGE");
    expect(c.capitalAtRisk).toBe(true);
    // §9 INTERRUPTION: Academy may not take the room while money is exposed.
    expect(c.admitsAmbient).toBe(false);
    // §9 / §H6: the escape hatch survives.
    expect(c.admits).toContain("OPEN_BROKER");
    expect(c.admits).toContain("FLATTEN_CONFIRM");
  });

  it("a working buy while flat compiles to PENDING with the §21 sentence", () => {
    const c = sceneOf({
      session: "RTH", rightOfWay: "WAIT", symbol: "TSLA", now: NOW,
      ledger: ledger({ orders: [order({ side: "buy" })] }),
    });
    expect(c.scene).toBe("PENDING");
    expect(c.reason).toContain("WORKING BUY 1");
    expect(c.reason).toContain("POTENTIAL EXPOSURE 1");
    expect(c.reason).toContain("NOT DONE");
  });

  it("a lost write while holding a position compiles to DEGRADED, not MANAGE", () => {
    // The failure may reduce capability; it may not increase certainty.
    const c = sceneOf({
      session: "RTH", rightOfWay: "ACTION", symbol: "TSLA", now: NOW,
      ledger: ledger({
        persistence: "CONFLICT",
        positions: [{ symbol: "TSLA", qty: 10 }],
      }),
    });
    expect(c.scene).toBe("DEGRADED");
    expect(c.degraded).toBe(true);
    expect(c.admits).toContain("OPEN_BROKER");
    // Capability is reduced: the story and the shortlist are withheld.
    expect(c.admits).not.toContain("ONE_STORY");
    expect(c.admits).not.toContain("EXPRESSION_CARD");
  });

  it("a failed write with NOTHING at risk does not cry wolf", () => {
    const c = sceneOf({
      session: "RTH", rightOfWay: "WAIT", symbol: "TSLA", now: NOW,
      ledger: ledger({ persistence: "FAILED" }),
    });
    expect(c.scene).not.toBe("DEGRADED");
  });

  it("an unread ledger does not compile to DONE or a confident quiet scene", () => {
    // The exact trap `deckSceneSignals` warns about: tidy defaults compiling to
    // 'nothing is exposed, the day is answered' about a book never read.
    const c = sceneOf({
      session: "CLOSED", rightOfWay: null, symbol: "TSLA", now: NOW,
      ledger: null,
    });
    expect(c.scene).not.toBe("DONE");
  });

  it("a confirmed-flat book with a refused setup reaches DONE honestly", () => {
    const c = sceneOf({
      session: "RTH", rightOfWay: "NO TRADE", symbol: "TSLA", now: NOW,
      ledger: ledger(),
    });
    expect(c.scene).toBe("DONE");
    expect(c.reason).toContain("VALID NO TRADE");
  });

  it("holding risk into a closed session is still MANAGE, never CLOSED", () => {
    const c = sceneOf({
      session: "CLOSED", rightOfWay: null, symbol: "TSLA", now: NOW,
      ledger: ledger({ positions: [{ symbol: "TSLA", qty: 3 }] }),
    });
    expect(c.scene).toBe("MANAGE");
  });

  it("the exit order does not hold the room in PENDING", () => {
    // Long 10 with a working SELL: the trader is closing, not adding.
    const c = sceneOf({
      session: "RTH", rightOfWay: "ACTION", symbol: "TSLA", now: NOW,
      ledger: ledger({
        positions: [{ symbol: "TSLA", qty: 10 }],
        orders: [order({ side: "sell" })],
      }),
    });
    expect(c.scene).toBe("MANAGE");
  });
});
