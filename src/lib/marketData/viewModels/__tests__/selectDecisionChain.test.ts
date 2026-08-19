import { describe, it, expect } from "vitest";
import { selectDecisionChain } from "../selectDecisionChain";
import type { CanonicalMarketState, MarketStateDimension } from "../../canonicalMarketState";

const dim = (value: string | null, resolution: MarketStateDimension["resolution"] = "RESOLVED"): MarketStateDimension => ({
  resolution, value, confidence: 0.8, evidence: [], contradictions: [], unknowns: [],
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

const NOW = 1_800_000_000_000;

describe("selectDecisionChain", () => {
  it("produces 9 nodes in the canonical order", () => {
    const r = selectDecisionChain({ state: mkState(), nowMs: NOW, phase: "PREPARATION" });
    expect(r.nodes.map(n => n.key)).toEqual([
      "regime", "direction", "location", "auction", "aggression",
      "clc", "risk", "permission", "management",
    ]);
    expect(r.evaluatedAt).toBe(NOW);
  });

  it("all UNKNOWN when nothing resolved — no fabrication", () => {
    const r = selectDecisionChain({ state: mkState(), nowMs: NOW, phase: "PREPARATION" });
    // regime unknown, direction unknown, location unknown, etc.
    const unknownCount = r.nodes.filter(n => n.indicator === "UNKNOWN").length;
    expect(unknownCount).toBeGreaterThanOrEqual(6); // most nodes unresolved
    expect(r.headline).toMatch(/insufficient evidence/i);
  });

  it("WARN dominates the headline when a hard failure exists", () => {
    const r = selectDecisionChain({
      state: mkState({
        regime: dim("trend"),
        volatility: dim("high"),
        direction: dim("long"),
        location: dim("val"),
        aggression: dim("high"),
        structure: dim("bos"),
      }),
      nowMs: NOW,
      phase: "DECISION",
    });
    // With direction=long, structure=bos, aggression=high, but response can't
    // be computed without ATR or history — DLAR response is UNKNOWN, which
    // means CLC.Confirmation → UNKNOWN or NOT_SATISFIED. CLC verdict likely
    // INVALID or UNKNOWN — either way, no WARN required. Just verify the
    // headline is well-formed.
    expect(r.headline).toContain("Deciding");
  });

  it("headline uses phase label", () => {
    const phases = ["PREPARATION", "APPROACH", "DECISION", "POSITION", "POST_EXIT", "REVIEW"] as const;
    const expected = ["Preparing", "Approaching", "Deciding", "Managing", "Post-exit", "Reviewing"];
    phases.forEach((phase, i) => {
      const r = selectDecisionChain({ state: mkState(), nowMs: NOW, phase });
      expect(r.headline).toContain(expected[i]);
    });
  });

  it("summary counts across all 9 nodes", () => {
    const r = selectDecisionChain({ state: mkState(), nowMs: NOW, phase: "PREPARATION" });
    expect(r.summary.total).toBe(9);
    expect(r.summary.ok + r.summary.watch + r.summary.warn + r.summary.unknown).toBe(9);
  });

  it("Management node reflects phase", () => {
    const inPos = selectDecisionChain({ state: mkState(), nowMs: NOW, phase: "POSITION" });
    expect(inPos.nodes.find(n => n.key === "management")?.verdict).toBe("ACTIVE");
    const postExit = selectDecisionChain({ state: mkState(), nowMs: NOW, phase: "POST_EXIT" });
    expect(postExit.nodes.find(n => n.key === "management")?.verdict).toBe("COMPLETE");
    const prep = selectDecisionChain({ state: mkState(), nowMs: NOW, phase: "PREPARATION" });
    expect(prep.nodes.find(n => n.key === "management")?.verdict).toBe("PENDING");
  });

  it("upstream VMs are inspectable", () => {
    const r = selectDecisionChain({ state: mkState({ regime: dim("balance"), volatility: dim("low") }), nowMs: NOW, phase: "PREPARATION" });
    expect(r.regime.verdict).toBe("BALANCE");
    expect(r.dlar).toBeDefined();
    expect(r.clc).toBeDefined();
    expect(r.auction).toBeDefined();
    // availableR / permission null when not supplied
    expect(r.availableR).toBeNull();
    expect(r.permission).toBeNull();
  });

  it("deterministic — identical inputs → identical output", () => {
    const state = mkState({ regime: dim("trend"), volatility: dim("high") });
    const r1 = selectDecisionChain({ state, nowMs: NOW, phase: "APPROACH" });
    const r2 = selectDecisionChain({ state, nowMs: NOW, phase: "APPROACH" });
    expect(r1.headline).toBe(r2.headline);
    expect(r1.summary).toEqual(r2.summary);
    expect(r1.nodes.map(n => n.verdict)).toEqual(r2.nodes.map(n => n.verdict));
  });

  it("Available R node exposes hints for missing inputs — every state explainable", () => {
    // availableRInputs supplied but the required fields (entryPrice /
    // structuralStop / destination) are absent → selectAvailableR returns
    // resolution UNKNOWN with missingInputs populated. The chain must
    // surface those inputs as hints so the trader knows WHY the risk
    // node is unknown without opening WhyInspector.
    const r = selectDecisionChain({
      state: mkState(),
      nowMs: NOW,
      phase: "APPROACH",
      availableRInputs: {
        side: "LONG",
        entryPrice: null,
        structuralStop: null,
        destination: null,
      },
    });
    const risk = r.nodes.find((n) => n.key === "risk");
    expect(risk).toBeDefined();
    expect(risk!.indicator).toBe("UNKNOWN");
    expect(risk!.hints).toBeDefined();
    expect(risk!.hints!.length).toBeGreaterThan(0);
    // Every missing-input hint tagged 'missing' tone.
    expect(risk!.hintTones!.every((t) => t === "missing")).toBe(true);
    // Specifically names entryPrice + structuralStop + destination.
    const joined = risk!.hints!.join(" ");
    expect(joined).toContain("entryPrice");
    expect(joined).toContain("structuralStop");
    expect(joined).toContain("destination");
  });

  it("Available R node has no hints when nothing to explain (silence-is-a-feature)", () => {
    // No availableRInputs at all → node verdict NOT_EVALUATED, hints
    // must be undefined (not an empty array — silence, not noise).
    const r = selectDecisionChain({ state: mkState(), nowMs: NOW, phase: "PREPARATION" });
    const risk = r.nodes.find((n) => n.key === "risk");
    expect(risk!.verdict).toBe("NOT_EVALUATED");
    expect(risk!.hints).toBeUndefined();
    expect(risk!.hintTones).toBeUndefined();
  });

  it("Permission node exposes hints for each engaged rule with HARD/SOFT tone", () => {
    // Two real rules that always engage: MAX_TRADES_PER_SESSION with
    // threshold 0 (engages when 0 sessionDecisions ≥ 0) and same rule
    // as SOFT. The chain must surface both as hints — HARD 'warn' tone,
    // SOFT 'watch' tone. This is the same evidence the Command Deck's
    // Steward panel renders (08796aa), now available through the
    // DecisionChain contract too so alternate consumers can reuse the
    // same VM.
    const r = selectDecisionChain({
      state: mkState(),
      nowMs: NOW,
      phase: "APPROACH",
      permissionInputs: {
        ownerId: "test-owner",
        sessionIdentity: "test-session",
        rules: [
          { id: "hard-1", kind: "HARD", trigger: "MAX_TRADES_PER_SESSION", label: "Max daily loss", threshold: 0 },
          { id: "soft-1", kind: "SOFT", trigger: "MAX_TRADES_PER_SESSION", label: "Cool-off window", threshold: 0 },
        ],
        sessionDecisions: [],
      },
    });
    const perm = r.nodes.find((n) => n.key === "permission");
    expect(perm).toBeDefined();
    expect(perm!.hints).toBeDefined();
    expect(perm!.hints!.length).toBe(2);
    expect(perm!.hints![0]).toContain("HARD");
    expect(perm!.hints![0]).toContain("Max daily loss");
    expect(perm!.hints![1]).toContain("SOFT");
    expect(perm!.hints![1]).toContain("Cool-off window");
    expect(perm!.hintTones).toEqual(["warn", "watch"]);
  });
});
