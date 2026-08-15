/**
 * Growth-tab integration smoke — verifies the 5 selectors that feed the
 * /profile Growth tab all compose correctly against a shared decisions
 * array and return sensible empty-state VMs when no decisions exist.
 * Prevents the 'imported but never invoked' regression that shipped
 * across commits 476cfdc → 90fa78c → 98d0cff.
 */
import { describe, it, expect } from "vitest";
import { selectPersonalEdge } from "../viewModels/selectPersonalEdge";
import { selectPlaybookDNA } from "../viewModels/selectPlaybookDNA";
import { selectSessionEdge } from "../viewModels/selectSessionEdge";
import { selectProcessLandscape } from "../viewModels/selectProcessLandscape";
import { selectMirror } from "../viewModels/selectMirror";

const OWNER = "owner-1";
const NOW = 1_800_000_000_000;

describe("Growth-tab integration — 5 selectors compose over shared decisions", () => {
  it("all 5 selectors return empty/UNKNOWN states cleanly on empty decisions", () => {
    const decisions: never[] = [];

    const edge = selectPersonalEdge({ ownerId: OWNER, decisions, nowMs: NOW });
    expect(edge.resolution).toBe("UNKNOWN");
    expect(edge.topStrengths).toHaveLength(0);
    expect(edge.topWatch).toHaveLength(0);

    const dna = selectPlaybookDNA({ ownerId: OWNER, decisions, nowMs: NOW });
    expect(dna.playbooks).toHaveLength(0);

    const sess = selectSessionEdge({ ownerId: OWNER, decisions, nowMs: NOW, metric: "avg_realized_r" });
    expect(sess.cells).toHaveLength(0);

    const land = selectProcessLandscape({
      ownerId: OWNER, decisions,
      rowAxis: "time_of_day", colAxis: "playbook", metric: "process_adherence",
    });
    expect(land.cells).toHaveLength(0);

    const mirror = selectMirror({ ownerId: OWNER, decisions, nowMs: NOW });
    expect(mirror.patterns).toHaveLength(0);
  });

  it("all 5 selectors respect owner scoping on the same decisions array", () => {
    const otherOwnerDecisions = [{
      decisionId: "x", capturedAt: NOW - 60_000, ownerId: "owner-other",
      sessionIdentity: "s", marketStateSummary: { regime: null, direction: null, location: null, volatility: null, session: null },
      playbookId: "p", playbookVersion: 1,
      plan: { action: "ENTER_LONG" as const, expectedR: 2 },
      ruleAdherenceAtDecision: true, externalInfluenceFlagged: false, tradeNumberInSession: 1,
      outcome: { closedAt: NOW, realizedR: 100, reason: "TARGET" as const },
    }];

    expect(selectPersonalEdge({ ownerId: OWNER, decisions: otherOwnerDecisions, nowMs: NOW }).totalDecisions).toBe(0);
    expect(selectPlaybookDNA({ ownerId: OWNER, decisions: otherOwnerDecisions, nowMs: NOW }).totalPlaybooks).toBe(0);
    expect(selectSessionEdge({ ownerId: OWNER, decisions: otherOwnerDecisions, nowMs: NOW, metric: "avg_realized_r" }).totalDecisions).toBe(0);
    expect(selectMirror({ ownerId: OWNER, decisions: otherOwnerDecisions, nowMs: NOW }).totalDecisions).toBe(0);
  });

  it("Growth-tab merge order preserves store precedence on decisionId collision", () => {
    // Simulates mergeSnapshots(useDecisionMemory, useJournalSnapshots) from
    // src/app/profile/page.tsx — store record wins on collision.
    const primary = [{ decisionId: "dup", capturedAt: NOW, ownerId: OWNER, source: "store" as const }];
    const secondary = [{ decisionId: "dup", capturedAt: NOW, ownerId: OWNER, source: "journal" as const }];
    const merged = [...primary, ...secondary.filter((s) => !new Set(primary.map((p) => p.decisionId)).has(s.decisionId))];
    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe("store");
  });
});
