/**
 * Garden 18 §4 finding 3 (2026-10-06): "Observing — decision chain now reads
 * preparation" was seen. Posture (what the trader is doing) and the market's
 * verdict are separate, and every visible label must agree with the posture
 * underneath it at every transition.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  LIFECYCLE_STAGES,
  STAGE_HEADLINE,
  STAGE_WORD,
  chainHeadlineWord,
  phaseForStage,
  stageForPhase,
} from "./decisionLifecycle";
import { lifecycleReadback } from "@/components/experience/ExperienceModeBar";
import { selectDecisionChain } from "@/lib/marketData/viewModels/selectDecisionChain";
import type { CanonicalMarketState, MarketStateDimension } from "@/lib/marketData/canonicalMarketState";

const UNK: MarketStateDimension = { resolution: "UNKNOWN", value: null, confidence: null, evidence: [], contradictions: [], unknowns: [] };
const state = {
  schemaVersion: "wm.market-state.v1", snapshotId: "s1", capturedAt: 1, instrumentId: "TSLA:NASDAQ",
  normalizedSymbol: "TSLA", executableIdentity: null, assetClass: "equity", exchange: "NASDAQ",
  session: "REGULAR", timeframeContext: ["5m"], price: { last: 100, bid: null, ask: null, eventAt: 1 },
  qualityState: "LIVE", qualityStateEvidence: [], freshnessMs: 100, coverage: [],
  direction: UNK, location: UNK, aggression: UNK, regime: UNK, structure: UNK, volatility: UNK,
  profile: UNK, orderFlow: UNK, contradictions: [], unknowns: [],
} as unknown as CanonicalMarketState;

describe("the chain headline names the trader's posture, at every stage", () => {
  it("THE DEFECT: OBSERVE no longer headlines as 'Preparing'", () => {
    const vm = selectDecisionChain({ state, nowMs: 1, phase: phaseForStage("OBSERVE"), stage: "OBSERVE" });
    expect(vm.headline).toMatch(/^Observing — /);
    expect(vm.phase).toBe("PREPARATION");
  });
  it.each(LIFECYCLE_STAGES)("stage %s: headline word, deck word and read-back agree", (stage) => {
    const vm = selectDecisionChain({ state, nowMs: 1, phase: phaseForStage(stage), stage });
    expect(vm.headline.startsWith(`${STAGE_HEADLINE[stage]} — `)).toBe(true);
    const rb = lifecycleReadback(stage);
    expect(rb).toContain(stage.replace("_", "-"));
    expect(rb).toContain(STAGE_WORD[stage]);
    expect(rb).toMatch(/not the market's verdict/);
  });
  it("a stage that does not compile this phase never names a posture it was not compiled for", () => {
    expect(chainHeadlineWord("POSITION", "OBSERVE")).toBe("Managing");
    expect(chainHeadlineWord("PREPARATION")).toBe("Preparing");
  });
  it("every deck press round-trips to a stage whose headline the deck shows", () => {
    for (const stage of LIFECYCLE_STAGES) {
      const back = stageForPhase(phaseForStage(stage));
      expect(phaseForStage(back)).toBe(phaseForStage(stage));
    }
  });
  it("the Command Deck hands the chain its posture", () => {
    const deck = readFileSync(path.resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");
    expect(deck).toContain("stage: posture,");
    expect(deck).toContain("const posture = stageAttachedTo(experienceContext, symbol);");
  });
  it("posture words never borrow the market verdict vocabulary (READY / GO)", () => {
    for (const w of [...Object.values(STAGE_WORD), ...Object.values(STAGE_HEADLINE)]) {
      expect(w).not.toMatch(/\b(READY|GO|NO-GO)\b/i);
    }
  });
});
