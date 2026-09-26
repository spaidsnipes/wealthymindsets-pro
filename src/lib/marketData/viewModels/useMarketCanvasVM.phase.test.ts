/**
 * THE ROOM'S ONE COMPILE HEARS THE TRADE PHASE — 2026-09-26, Garden 16 §11.
 *
 * /charts called `useMarketCanvasVM` with no phase for its whole life, so its
 * chain compiled at PREPARATION forever. The Command Deck drawer's phase
 * control now writes the room's `tradePhase`, and the room hands it to THIS
 * hook. This file proves the hook actually forwards it into the compiler — the
 * link that makes the drawer's control a real control rather than a lamp.
 *
 * Same harness as `useMarketCanvasVM.test.ts`: subscriptions isolated, the
 * compiler and every selector downstream of it real.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CanonicalMarketState, MarketStateDimension } from "../canonicalMarketState";
import { useMarketCanvasVM } from "./useMarketCanvasVM";

const inputs = vi.hoisted(() => ({ state: null as CanonicalMarketState | null }));
vi.mock("react", () => ({ useMemo: (factory: () => unknown) => factory() }));
vi.mock("../useCanonicalMarketState", () => ({
  useCanonicalMarketState: () => inputs.state,
  useCanonicalMarketStateHistory: () => [],
}));
vi.mock("@/lib/traderMemory/useDecisionMemory", () => ({ useDecisionMemory: () => [] }));
vi.mock("@/lib/traderMemory/adapters/useJournalSnapshots", () => ({
  useJournalSnapshots: () => [],
  useJournalBook: () => ({ snapshots: [], coverage: { read: 0, total: 0 }, entries: [] }),
}));
vi.mock("./canvasClock", () => ({ useCanvasClock: () => 2_000 }));

const unresolved = (): MarketStateDimension => ({
  resolution: "UNKNOWN", value: null, confidence: null,
  evidence: [], contradictions: [], unknowns: [],
});
beforeEach(() => {
  inputs.state = {
    schemaVersion: "wm.market-state.v1", sealed: true, snapshotId: "phase-fixture",
    capturedAt: 1_000, availableAt: 1_000, instrumentId: "TSLA", normalizedSymbol: "TSLA",
    executableIdentity: null, assetClass: "equity", exchange: null, session: "REGULAR",
    timeframeContext: [], qualityState: "PARTIAL",
    price: { last: 250, bid: null, ask: null, eventAt: 1_000, availableAt: 1_000 },
    coverage: [], direction: unresolved(), location: unresolved(), aggression: unresolved(),
    regime: unresolved(), structure: unresolved(), volatility: unresolved(), profile: unresolved(),
    orderFlow: unresolved(), contradictions: [], unknowns: [],
  };
});

const compile = (phase?: "PREPARATION" | "POSITION" | "POST_EXIT") =>
  useMarketCanvasVM({ identity: inputs.state!, ownerId: "fixture-owner", ...(phase ? { phase } : {}) });

const management = (out: ReturnType<typeof compile>) =>
  out.chain?.nodes.find((n) => n.key === "management") ?? null;

describe("the room's one compile answers the drawer's phase control", () => {
  it("no phase still means PREPARATION — the default the room had before is unchanged", () => {
    expect(compile().chain?.phase).toBe("PREPARATION");
    expect(compile().chain?.headline).toMatch(/^Preparing — /);
  });

  it("a phase is FORWARDED into the chain, not dropped on the floor", () => {
    const inTrade = compile("POSITION");
    expect(inTrade.chain?.phase).toBe("POSITION");
    expect(inTrade.chain?.headline).toMatch(/^Managing — /);
    expect(management(inTrade)?.verdict).toBe("ACTIVE");
    expect(management(inTrade)?.resolution).toBe("RESOLVED");
    expect(management(compile("POST_EXIT"))?.verdict).toBe("COMPLETE");
    expect(management(compile("PREPARATION"))?.verdict).toBe("PENDING");
  });

  it("and it reaches what the right rail reads: the one story's evidence debt", () => {
    const prep = compile("PREPARATION");
    const inTrade = compile("POSITION");
    expect(prep.oneStory.debt).not.toBeNull();
    expect(inTrade.oneStory.debt).not.toBeNull();
    // Management is resolved by the phase, so exactly one node leaves the debt.
    expect(inTrade.oneStory.debt!.missing).toBe(prep.oneStory.debt!.missing - 1);
    expect(inTrade.oneStory.debt!.resolved).toBe(prep.oneStory.debt!.resolved + 1);
  });
});
