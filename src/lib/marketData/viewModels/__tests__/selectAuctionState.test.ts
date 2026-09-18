import { describe, it, expect } from "vitest";
import { selectAuctionState } from "../selectAuctionState";
import type { DLARVM } from "../selectDLAR";
import type { CanonicalMarketState, MarketStateDimension } from "../../canonicalMarketState";

const dim = (value: string | null): MarketStateDimension => ({
  resolution: "RESOLVED", value, confidence: 0.8, evidence: [], contradictions: [], unknowns: [],
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

const mkDLAR = (responseVerdict: DLARVM["response"]["verdict"], overrides: Partial<DLARVM> = {}): DLARVM => ({
  direction: { resolution: "RESOLVED", value: "long", confidence: 0.8, evidence: [], contradictions: [], unknowns: [] },
  location: { resolution: "RESOLVED", value: "val", confidence: 0.8, evidence: [], contradictions: [], unknowns: [] },
  aggression: { resolution: "RESOLVED", value: "high", confidence: 0.8, evidence: [], contradictions: [], unknowns: [] },
  response: {
    verdict: responseVerdict,
    resolution: "RESOLVED",
    displacementRatio: 0.5,
    evidence: [],
    contradictions: [],
  },
  resolution: "RESOLVED",
  narrative: "test",
  capturedAt: 1_800_000_000_000,
  ...overrides,
});

describe("selectAuctionState", () => {
  it("UNKNOWN when nothing resolved", () => {
    const r = selectAuctionState({ state: mkState() });
    expect(r.verdict).toBe("UNKNOWN");
  });

  it("OPENING_ROTATION in early session with unresolved structure", () => {
    const r = selectAuctionState({
      state: mkState({ session: "REGULAR", structure: UNK }),
      msSinceSessionOpen: 5 * 60_000,
    });
    expect(r.verdict).toBe("OPENING_ROTATION");
  });

  it("FAILING when DLAR response is FADING (regardless of other state)", () => {
    const r = selectAuctionState({
      state: mkState({ structure: dim("bos"), direction: dim("long") }),
      dlar: mkDLAR("FADING"),
    });
    expect(r.verdict).toBe("FAILING");
  });

  it("EXPANDING when BOS + direction resolved + response RESPONDING", () => {
    const r = selectAuctionState({
      state: mkState({ structure: dim("bos"), direction: dim("long") }),
      dlar: mkDLAR("RESPONDING"),
    });
    expect(r.verdict).toBe("EXPANDING");
  });

  it("REJECTING on structure sweep", () => {
    const r = selectAuctionState({
      state: mkState({ structure: dim("sweep") }),
    });
    expect(r.verdict).toBe("REJECTING");
  });

  it("ACCEPTING when profile migrating + location inside value", () => {
    const r = selectAuctionState({
      state: mkState({ profile: dim("migrating"), location: dim("inside_value") }),
    });
    expect(r.verdict).toBe("ACCEPTING");
  });

  it("BALANCING when regime=balance + no BOS", () => {
    const r = selectAuctionState({
      state: mkState({ regime: dim("balance"), structure: dim("none") }),
    });
    expect(r.verdict).toBe("BALANCING");
  });

  it("PARTIAL when some dims resolved but no verdict pattern matches", () => {
    const r = selectAuctionState({
      state: mkState({ location: dim("outside_value") }), // resolved but no pattern
    });
    expect(r.verdict).toBe("UNKNOWN");
    expect(r.resolution).toBe("PARTIAL");
  });

  it("deterministic — capturedAt propagates", () => {
    const s = mkState({ structure: dim("sweep"), capturedAt: 999 });
    const r = selectAuctionState({ state: s });
    expect(r.capturedAt).toBe(999);
  });
});

/**
 * A VALUE PRINTED WITHOUT ITS STANDING READS AS A RESOLVED VALUE.
 *
 * Two auction narratives had the defect:
 *
 *   BALANCING — its structure leg is a NEGATED matcher, and `looseMatch`
 *   requires `resolution === "RESOLVED"`. So the branch is reachable with a
 *   structure that is MEASURED and equally with one never measured at all, and
 *   `${structure.value ?? "unresolved"}` tested NULLISHNESS — which PARTIAL
 *   passes, because PARTIAL is exactly the standing that CARRIES a value.
 *
 *   The fallback — `anyResolved` is true when ONE of four dimensions is
 *   RESOLVED, but the heading said "Some dimensions resolved (…)" and then
 *   listed THREE, and `?? "?"` collapsed MEASURED and MISSING together.
 *
 * Properties, not spellings.
 */
describe("auction narratives name the standing they actually checked", () => {
  const measured = (value: string): MarketStateDimension => ({
    resolution: "PARTIAL", value, confidence: 0.4, evidence: [], contradictions: [], unknowns: [],
  });

  it("BALANCING does not print a MEASURED structure the way it prints a RESOLVED one", () => {
    const m = selectAuctionState({ state: mkState({ regime: dim("balance"), structure: measured("none") }) });
    const r = selectAuctionState({ state: mkState({ regime: dim("balance"), structure: dim("none") }) });
    expect(m.verdict).toBe("BALANCING");
    expect(r.verdict).toBe("BALANCING");
    expect(m.narrative).not.toBe(r.narrative);
    // Shown, not hidden — a measurement that was taken must still be named.
    expect(m.narrative).toContain("none");
    expect(m.narrative.toLowerCase()).toContain("measured");
  });

  it("BALANCING still calls a never-measured structure unresolved", () => {
    const r = selectAuctionState({ state: mkState({ regime: dim("balance"), structure: UNK }) });
    expect(r.narrative).toContain("unresolved");
  });

  it("the fallback does not assert 'resolved' for dimensions it did not check", () => {
    // Only LOCATION is RESOLVED here; structure and regime have no reading at
    // all. The old heading claimed "Some dimensions resolved (structure …,
    // location …, regime …)" — naming three while having checked one.
    const r = selectAuctionState({ state: mkState({ location: dim("outside_value") }) });
    expect(r.verdict).toBe("UNKNOWN");
    expect(r.resolution).toBe("PARTIAL");
    expect(r.narrative).not.toMatch(/dimensions resolved/i);
    expect(r.narrative).toContain("outside_value");
  });

  it("the fallback distinguishes a MEASURED dimension from a MISSING one", () => {
    const withMeasured = selectAuctionState({
      state: mkState({ location: dim("outside_value"), regime: measured("choppy") }),
    }).narrative;
    const withMissing = selectAuctionState({
      state: mkState({ location: dim("outside_value") }),
    }).narrative;
    expect(withMeasured).not.toBe(withMissing);
    expect(withMeasured).toContain("choppy");
    expect(withMeasured.toLowerCase()).toContain("measured");
  });
});
