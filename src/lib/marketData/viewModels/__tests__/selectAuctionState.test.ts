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
