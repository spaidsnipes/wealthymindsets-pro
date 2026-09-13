/**
 * Ticket T post-cutover guard: /command-deck must not recreate the five
 * decision dimensions in a detached summary band after rendering them in
 * the living room. /charts may keep the shared DecisionSpineBand; the deck
 * owns one fused scene with stable region markers and one decision identity.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DECK = () => readFileSync(resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");

describe("the deck projects one decision room without a duplicate spine", () => {
  it("retires the route-local DecisionSpineBand duplication", () => {
    const src = DECK();
    expect(src).not.toContain('import DecisionSpineBand from "@/components/experience/DecisionSpineBand";');
    expect(src).not.toContain("<DecisionSpineBand");
  });

  it("contains NOW, MARKET, RISK, WHY, and NEXT under one scene owner", () => {
    const src = DECK();
    const room = src.indexOf('data-testid="deck-market-scene"');
    const now = src.indexOf('data-testid="scene-now"', room);
    const market = src.indexOf('data-testid="scene-market"', now);
    const support = src.indexOf('data-testid="scene-support"', market);
    const risk = src.indexOf('data-testid="scene-risk"', support);
    const why = src.indexOf('data-testid="scene-why"', risk);
    const next = src.indexOf('data-testid="scene-next"', why);
    const exitRamp = src.indexOf("<ExitRampCard", next);
    const end = src.indexOf("{/* Today's morning-prep intention", next);
    expect(room).toBeGreaterThan(0);
    expect(now).toBeLessThan(market);
    expect(market).toBeLessThan(support);
    expect(support).toBeLessThan(risk);
    expect(risk).toBeLessThan(why);
    expect(why).toBeLessThan(next);
    expect(next).toBeLessThan(exitRamp);
    expect(exitRamp).toBeLessThan(end);
    expect(next).toBeLessThan(end);
    expect(src.match(/<ExitRampCard/g)).toHaveLength(1);
    expect(src.slice(room, end).match(/data-decision-id=/g)).toHaveLength(8);
    expect(src.slice(room, end)).toContain("currentSceneDecision?.decisionId ?? undefined");
    expect(src.slice(room, end)).toContain(": sceneDecisionAbsence");
  });
});
