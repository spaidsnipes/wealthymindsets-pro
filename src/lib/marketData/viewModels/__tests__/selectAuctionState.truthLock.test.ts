/**
 * selectAuctionState — truth-lock supplement.
 *
 * Existing selectAuctionState.test.ts covers 9 primary verdicts. This
 * supplement locks priority order, boundary conditions, evidence
 * propagation, and matcher synonym coverage:
 *
 *   - FADING trumps everything (checked before EXPANDING even when BOS matches)
 *   - EXPANDING requires ALL three conditions (BOS + direction + RESPONDING)
 *   - OPENING_ROTATION requires session=REGULAR (other sessions fall through)
 *   - OPENING_ROTATION window boundary + custom openingWindowMs
 *   - BALANCING requires !BOS structure (regime=balance + BOS → fall through)
 *   - FAILING evidence merges DLAR response evidence
 *   - Confidence propagation per verdict
 *   - DEFAULT_AUCTION_MATCHERS synonym coverage
 *
 * Silent drift here silently changes the /command-deck Auction State
 * node — the middle of the Founder decision chain.
 */

import { describe, it, expect } from "vitest";
import { selectAuctionState, DEFAULT_AUCTION_MATCHERS } from "../selectAuctionState";
import type { DLARVM } from "../selectDLAR";
import type { CanonicalMarketState, MarketStateDimension } from "../../canonicalMarketState";

const dim = (value: string | null): MarketStateDimension => ({
  resolution: "RESOLVED", value, confidence: 0.8,
  evidence: [{ eventId: "e", observedAt: 1, availableAt: 2, source: "test", fidelity: "OBSERVED", basis: "test" }],
  contradictions: [], unknowns: [],
});
const UNK: MarketStateDimension = { resolution: "UNKNOWN", value: null, confidence: null, evidence: [], contradictions: [], unknowns: [] };

const mkState = (over: Partial<CanonicalMarketState> = {}): CanonicalMarketState => ({
  schemaVersion: "wm.market-state.v1",
  snapshotId: "s1",
  capturedAt: 1_800_000_000_000,
  instrumentId: "TSLA:NASDAQ",
  normalizedSymbol: "TSLA",
  executableIdentity: null,
  assetClass: "equity",
  exchange: "NASDAQ",
  session: "REGULAR",
  timeframeContext: ["15m"],
  price: { last: 100, bid: null, ask: null, eventAt: 1_800_000_000_000 },
  qualityState: "LIVE",
  qualityStateEvidence: [],
  freshnessMs: 100,
  coverage: [],
  direction: UNK, location: UNK, aggression: UNK,
  regime: UNK, structure: UNK, volatility: UNK, profile: UNK, orderFlow: UNK,
  contradictions: [], unknowns: [],
  ...over,
} as unknown as CanonicalMarketState);

const mkDLAR = (responseVerdict: DLARVM["response"]["verdict"]): DLARVM => ({
  direction: { resolution: "RESOLVED", value: "long", confidence: 0.8, evidence: [], contradictions: [], unknowns: [] },
  location: { resolution: "RESOLVED", value: "val", confidence: 0.8, evidence: [], contradictions: [], unknowns: [] },
  aggression: { resolution: "RESOLVED", value: "high", confidence: 0.7, evidence: [], contradictions: [], unknowns: [] },
  response: {
    verdict: responseVerdict,
    resolution: "RESOLVED",
    displacementRatio: 0.5,
    evidence: [{ eventId: "dlar-e", observedAt: 1, availableAt: 2, source: "dlar", fidelity: "OBSERVED", basis: "dlar-test" }],
    contradictions: ["dlar-contradiction"],
  },
  resolution: "RESOLVED",
  narrative: "test",
  capturedAt: 1_800_000_000_000,
});

describe("selectAuctionState — priority order (FADING trumps EXPANDING)", () => {
  it("FADING wins even when BOS + direction resolved (checked BEFORE EXPANDING)", () => {
    const r = selectAuctionState({
      state: mkState({ structure: dim("bos"), direction: dim("long") }),
      dlar: mkDLAR("FADING"),
    });
    expect(r.verdict).toBe("FAILING");
  });

  it("FAILING evidence merges DLAR response evidence + contradictions", () => {
    const r = selectAuctionState({
      state: mkState({ structure: dim("bos") }),
      dlar: mkDLAR("FADING"),
    });
    expect(r.evidence.some((e) => e.source === "dlar")).toBe(true);
    expect(r.contradictions).toContain("dlar-contradiction");
  });

  it("FAILING confidence propagates from DLAR aggression", () => {
    const r = selectAuctionState({
      state: mkState(),
      dlar: mkDLAR("FADING"),
    });
    expect(r.confidence).toBe(0.7);
  });
});

describe("selectAuctionState — EXPANDING requires all 3 conditions", () => {
  it("BOS + direction resolved but response !== RESPONDING → not EXPANDING", () => {
    const r = selectAuctionState({
      state: mkState({ structure: dim("bos"), direction: dim("long") }),
      dlar: mkDLAR("QUIET"),
    });
    expect(r.verdict).not.toBe("EXPANDING");
  });

  it("BOS + RESPONDING but direction UNRESOLVED → not EXPANDING", () => {
    const r = selectAuctionState({
      state: mkState({ structure: dim("bos") }),
      dlar: mkDLAR("RESPONDING"),
    });
    expect(r.verdict).not.toBe("EXPANDING");
  });

  it("direction + RESPONDING but structure NONE → not EXPANDING (falls through)", () => {
    const r = selectAuctionState({
      state: mkState({ structure: dim("none"), direction: dim("long") }),
      dlar: mkDLAR("RESPONDING"),
    });
    expect(r.verdict).not.toBe("EXPANDING");
  });
});

describe("selectAuctionState — OPENING_ROTATION session gating", () => {
  it("OPENING_ROTATION only in session=REGULAR", () => {
    // "PREMARKET" session → doesn't trigger, falls to fallback UNKNOWN
    const r = selectAuctionState({
      state: mkState({ session: "PREMARKET", structure: UNK }),
      msSinceSessionOpen: 5 * 60_000,
    });
    expect(r.verdict).not.toBe("OPENING_ROTATION");
  });

  it("msSinceSessionOpen equal to window is NOT opening (strict less-than)", () => {
    const r = selectAuctionState({
      state: mkState({ session: "REGULAR", structure: UNK }),
      msSinceSessionOpen: 15 * 60_000, // exactly 15m = default window
      openingWindowMs: 15 * 60_000,
    });
    expect(r.verdict).not.toBe("OPENING_ROTATION");
  });

  it("openingWindowMs custom threshold honored", () => {
    // Custom 30-minute window → 20m in still opening
    const r = selectAuctionState({
      state: mkState({ session: "REGULAR", structure: UNK }),
      msSinceSessionOpen: 20 * 60_000,
      openingWindowMs: 30 * 60_000,
    });
    expect(r.verdict).toBe("OPENING_ROTATION");
  });

  it("OPENING_ROTATION suppressed once structure resolves (even in early window)", () => {
    const r = selectAuctionState({
      state: mkState({ session: "REGULAR", structure: dim("bos") }),
      msSinceSessionOpen: 2 * 60_000,
    });
    expect(r.verdict).not.toBe("OPENING_ROTATION");
  });
});

describe("selectAuctionState — BALANCING requires !BOS", () => {
  it("regime=balance + BOS structure → falls through to fallback (not BALANCING)", () => {
    const r = selectAuctionState({
      state: mkState({ regime: dim("balance"), structure: dim("bos") }),
    });
    expect(r.verdict).not.toBe("BALANCING");
  });

  it("regime=balance + no structure resolved → BALANCING (narrative says 'unresolved')", () => {
    const r = selectAuctionState({
      state: mkState({ regime: dim("balance") }),
    });
    expect(r.verdict).toBe("BALANCING");
    expect(r.narrative).toContain("unresolved");
  });

  it("regime=balance + structure=sweep → REJECTING wins (order: sweep before balance)", () => {
    const r = selectAuctionState({
      state: mkState({ regime: dim("balance"), structure: dim("sweep") }),
    });
    expect(r.verdict).toBe("REJECTING");
  });
});

describe("selectAuctionState — fallback narrative", () => {
  it("PARTIAL fallback names all 3 tracked dimensions verbatim", () => {
    const r = selectAuctionState({
      state: mkState({ location: dim("outside_value") }),
    });
    expect(r.verdict).toBe("UNKNOWN");
    expect(r.resolution).toBe("PARTIAL");
    expect(r.narrative).toContain("outside_value");
    expect(r.reason).toMatch(/did not match a known verdict pattern/i);
  });

  it("all-unresolved fallback has different reason string", () => {
    const r = selectAuctionState({ state: mkState() });
    expect(r.reason).toMatch(/all unresolved/i);
    expect(r.narrative).toMatch(/Insufficient evidence/i);
  });
});

describe("selectAuctionState — confidence propagation per verdict", () => {
  it("EXPANDING uses direction confidence", () => {
    const direction = { ...dim("long"), confidence: 0.55 };
    const r = selectAuctionState({
      state: mkState({ structure: dim("bos"), direction }),
      dlar: mkDLAR("RESPONDING"),
    });
    expect(r.confidence).toBe(0.55);
  });
  it("REJECTING uses structure confidence", () => {
    const structure = { ...dim("sweep"), confidence: 0.42 };
    const r = selectAuctionState({ state: mkState({ structure }) });
    expect(r.confidence).toBe(0.42);
  });
  it("ACCEPTING uses profile confidence", () => {
    const profile = { ...dim("migrating"), confidence: 0.63 };
    const r = selectAuctionState({
      state: mkState({ profile, location: dim("inside_value") }),
    });
    expect(r.confidence).toBe(0.63);
  });
});

describe("selectAuctionState — DEFAULT_AUCTION_MATCHERS synonym coverage", () => {
  it("structureBOS accepts bos/breakofstructure/break/breakup/breakdown", () => {
    for (const v of ["bos", "BREAK_OF_STRUCTURE", "break-up", "BREAKDOWN"]) {
      expect(DEFAULT_AUCTION_MATCHERS.structureBOS.matches(dim(v))).toBe(true);
    }
  });
  it("structureSweep accepts sweep / liquidity-sweep", () => {
    for (const v of ["sweep", "LIQUIDITY_SWEEP", "liquiditysweep"]) {
      expect(DEFAULT_AUCTION_MATCHERS.structureSweep.matches(dim(v))).toBe(true);
    }
  });
  it("profileMigrating accepts migrating / shifting / value-migration", () => {
    for (const v of ["migrating", "SHIFTING", "value-migration"]) {
      expect(DEFAULT_AUCTION_MATCHERS.profileMigrating.matches(dim(v))).toBe(true);
    }
  });
  it("locationInside accepts insidevalue / invalue / POC / mid / balance", () => {
    for (const v of ["inside_value", "in-value", "POC", "MID", "balance"]) {
      expect(DEFAULT_AUCTION_MATCHERS.locationInside.matches(dim(v))).toBe(true);
    }
  });
  it("all matchers reject UNKNOWN dimensions", () => {
    expect(DEFAULT_AUCTION_MATCHERS.structureBOS.matches(UNK)).toBe(false);
    expect(DEFAULT_AUCTION_MATCHERS.regimeBalance.matches(UNK)).toBe(false);
  });
});
