/**
 * Garden 18 §4 finding 4 (2026-10-06): Personal Edge carries sample size,
 * first / last observation, recency, counterevidence and uncertainty beside
 * every context — and the Coach's n<20 INSUFFICIENT EVIDENCE gate stays.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contextEvidenceLine, selectPersonalEdge, wilsonWinRateInterval } from "../selectPersonalEdge";
import type { DecisionMemorySnapshot } from "../selectProcessLandscape";
import { MIN_SAMPLE, edgeEvidenceLine, wilsonInterval, type EdgeBucket } from "@/lib/broker/ledgerEdge";
import { JOURNAL_COACH_MIN_SAMPLE, hasJournalCoachEvidence } from "@/lib/journalEvidence";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 6);
const dec = (i: number, r: number, at: number): DecisionMemorySnapshot => ({
  decisionId: `d${i}`, capturedAt: at, ownerId: "o", sessionIdentity: "s",
  marketStateSummary: { regime: null, direction: null, location: null, volatility: null, session: null },
  playbookId: "clc", playbookVersion: 1, plan: { action: "ENTER_LONG", expectedR: 2 },
  ruleAdherenceAtDecision: true, externalInfluenceFlagged: false, tradeNumberInSession: 1,
  outcome: { closedAt: at, realizedR: r, reason: r > 0 ? "TARGET" : "STOP" },
} as DecisionMemorySnapshot);

describe("selectPersonalEdge — every context carries its evidence", () => {
  const decisions = [dec(1, 2, NOW - 40 * DAY), dec(2, 1, NOW - 30 * DAY), dec(3, -1, NOW - 20 * DAY), dec(4, 2, NOW - 10 * DAY), dec(5, 1.5, NOW - 3 * DAY)];
  const vm = selectPersonalEdge({ ownerId: "o", decisions, nowMs: NOW, sampleThreshold: 5 });
  const b = vm.topStrengths[0];
  it("sample size, first/last observation, counterevidence and an interval", () => {
    expect(b.sampleCount).toBe(5);
    expect(b.firstAt).toBe(NOW - 40 * DAY);
    expect(b.lastAt).toBe(NOW - 3 * DAY);
    expect(b.counterevidence).toBe(1);
    expect(b.winRateInterval!.low).toBeLessThan(0.8);
    expect(b.winRateInterval!.high).toBeGreaterThan(0.8);
  });
  it("the visible line says all of it, including recency", () => {
    const line = contextEvidenceLine(b, NOW);
    expect(line).toMatch(/n=5/);
    expect(line).toMatch(/first 2026-08-27 · last 2026-10-03/);
    expect(line).toMatch(/last seen 3 days ago/);
    expect(line).toMatch(/1 against/);
    expect(line).toMatch(/win rate plausibly \d+–\d+% \(95%\)/);
  });
  it("the panel renders the line", () => {
    const src = readFileSync(path.resolve(__dirname, "../../../../components/profile/PersonalEdgePanel.tsx"), "utf8");
    expect(src).toContain("contextEvidenceLine(b, nowMs)");
  });
  it("no closed sample → no interval (undefined, never 0–0%)", () => {
    expect(wilsonWinRateInterval(0, 0)).toBeNull();
    expect(wilsonInterval(0, 0)).toBeNull();
  });
});

describe("ledger Personal Edge — evidence line, and n<20 stays INSUFFICIENT EVIDENCE", () => {
  const base: EdgeBucket = { key: "Open", n: 7, wins: 5, losses: 2, net: 100, expectancy: 14.29, winRate: 5 / 7, vsOverall: 10, evidence: "INSUFFICIENT EVIDENCE",
    firstAt: "2026-09-01T13:35:00Z", lastAt: "2026-10-01T13:35:00Z", counterevidence: 2, winRateLow: 0.36, winRateHigh: 0.92 };
  it("a thin group says INSUFFICIENT EVIDENCE first and still shows its evidence", () => {
    const line = edgeEvidenceLine(base, NOW);
    expect(line.startsWith(`INSUFFICIENT EVIDENCE (n=7, needs ${MIN_SAMPLE})`)).toBe(true);
    expect(line).toMatch(/first 2026-09-01 · last 2026-10-01/);
    expect(line).toMatch(/last seen 4 days ago/);
    expect(line).toMatch(/2 trades against/);
    expect(line).toMatch(/36–92% \(95%\)/);
  });
  it("the ledger panel renders the evidence line", () => {
    const src = readFileSync(path.resolve(__dirname, "../../../../components/journal/LedgerPersonalEdge.tsx"), "utf8");
    expect(src).toContain("edgeEvidenceLine(b, Date.now())");
  });
  it("Coach gate: 20 trades, never fewer", () => {
    expect(MIN_SAMPLE).toBe(20);
    expect(JOURNAL_COACH_MIN_SAMPLE).toBe(20);
    expect(hasJournalCoachEvidence(19)).toBe(false);
    expect(hasJournalCoachEvidence(20)).toBe(true);
  });
});
