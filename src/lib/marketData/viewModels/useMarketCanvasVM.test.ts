import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CanonicalMarketState, MarketStateDimension } from "../canonicalMarketState";
import { useMarketCanvasVM } from "./useMarketCanvasVM";

const inputs = vi.hoisted(() => ({ state: null as CanonicalMarketState | null }));
// Isolate subscriptions, not the compiler. This invokes the actual hook's
// argument forwarding and every pure selector downstream of it.
vi.mock("react", () => ({ useMemo: (factory: () => unknown) => factory() }));
vi.mock("../useCanonicalMarketState", () => ({
  useCanonicalMarketState: () => inputs.state,
  useCanonicalMarketStateHistory: () => [],
}));
vi.mock("@/lib/traderMemory/useDecisionMemory", () => ({ useDecisionMemory: () => [] }));
vi.mock("@/lib/traderMemory/adapters/useJournalSnapshots", () => ({ useJournalSnapshots: () => [] }));
vi.mock("./canvasClock", () => ({ useCanvasClock: () => 2_000 }));

const unresolved = (): MarketStateDimension => ({
  resolution: "UNKNOWN", value: null, confidence: null,
  evidence: [], contradictions: [], unknowns: [],
});
beforeEach(() => {
  inputs.state = {
    schemaVersion: "wm.market-state.v1", sealed: true, snapshotId: "partial-no-evidence",
    capturedAt: 1_000, availableAt: 1_000, instrumentId: "GC1!", normalizedSymbol: "GC1!",
    executableIdentity: null, assetClass: "futures", exchange: null, session: "REGULAR",
    timeframeContext: [], qualityState: "PARTIAL",
    price: { last: 4_476.6, bid: null, ask: null, eventAt: 1_000, availableAt: 1_000 },
    coverage: [], direction: unresolved(), location: unresolved(), aggression: unresolved(),
    regime: unresolved(), structure: unresolved(), volatility: unresolved(), profile: unresolved(),
    orderFlow: unresolved(), contradictions: [], unknowns: [],
  };
});

describe("Market Canvas hook preserves prerequisite evidence", () => {
  it("compiles the absent override instead of silently suppressing the chain", () => {
    const out = useMarketCanvasVM({ identity: inputs.state!, ownerId: "fixture-owner" });
    expect(out.chain).not.toBeNull();
    expect(out.oneStory.debt?.missing).toBeGreaterThan(0);
    expect(out.canvas.verdict).toBe("WAIT");
    expect(out.decisionWhy.clear).toBe(false);
    expect(out.decisionWhy.blockers.some(b => b.kind === "EVIDENCE_DEBT")).toBe(true);
    expect(out.canvas.resolved).toEqual([]);
  });

  it("preserves an explicit null override without granting vacuous ACTION", () => {
    const out = useMarketCanvasVM({ identity: inputs.state!, ownerId: "fixture-owner", chain: null });
    expect(out.chain).toBeNull();
    expect(out.oneStory.debt).toBeNull();
    expect(out.canvas.verdict).toBe("UNKNOWN");
    expect(out.decisionWhy.clear).toBe(false);
  });
});
