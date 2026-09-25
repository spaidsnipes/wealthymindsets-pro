/**
 * selectWaitPlaque / selectDebtTag — the WAIT organism's words (H-101, F05A,
 * F06A, P110). Every case compiles through the REAL production path —
 * `computeEvidenceDebt` → `computeRightOfWay` — because the plaque's whole
 * claim is that it says nothing the compiler did not already decide.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { computeEvidenceDebt, computeRightOfWay, type RightOfWay } from "./decisionPermissionCompiler";
import type { DecisionChainNode } from "./selectDecisionChain";
import type { PermissionVM } from "@/lib/traderMemory/viewModels/selectPermission";
import { selectWaitPlaque, selectDebtTag } from "./selectWaitPlaque";
import { selectWaitStanding } from "./selectWaitStanding";
import { selectOneNextThing } from "./selectOneNextThing";

const perm = (verdict: PermissionVM["verdict"]): PermissionVM => ({ verdict }) as PermissionVM;

/** A production-shaped node: real keys, real payableBy, as selectDecisionChain emits them. */
const node = (
  key: string,
  label: string,
  indicator: DecisionChainNode["indicator"],
  payableBy: DecisionChainNode["payableBy"],
  venueBlocked = false,
): DecisionChainNode => ({
  key,
  label,
  verdict: indicator === "OK" ? "RESOLVED" : "UNRESOLVED",
  resolution: "RESOLVED",
  narrative: "fixture",
  indicator,
  payableBy,
  venueBlocked,
});

/** The live /charts shape of 2026-09-25: structure paid, R and rules owed, tape absent. */
const LIVE: DecisionChainNode[] = [
  node("regime", "Regime", "OK", "COMPOSITION"),
  node("direction", "Direction", "OK", "EVIDENCE"),
  node("location", "Location", "OK", "EVIDENCE"),
  node("auction", "Auction", "OK", "COMPOSITION"),
  node("aggression", "Aggression", "UNKNOWN", "EVIDENCE", true),
  node("clc", "CLC", "UNKNOWN", "COMPOSITION"),
  node("risk", "Available R", "UNKNOWN", "DECLARATION"),
  node("permission", "Permission", "UNKNOWN", "DECLARATION"),
  node("management", "Management", "UNKNOWN", "COMPOSITION"),
];

function compile(chain: DecisionChainNode[], verdict: PermissionVM["verdict"] = "ALLOWED") {
  const debt = computeEvidenceDebt(chain)!;
  const decision = computeRightOfWay(perm(verdict), debt);
  return { debt, decision };
}

describe("selectWaitPlaque — the word is the compiler's, never this module's", () => {
  it("prints the compiled verdict VERBATIM for every verdict the compiler can return", () => {
    // TOTAL over RightOfWay: a sixth verdict fails the build here.
    const ALL: Record<RightOfWay, true> = { ACTION: true, WAIT: true, "NO TRADE": true, CAUTION: true, UNKNOWN: true };
    for (const value of Object.keys(ALL) as RightOfWay[]) {
      const vm = selectWaitPlaque({ value, detail: "d", tone: "pending" }, null);
      expect(vm?.word, value).toBe(value);
      expect(vm?.reason.length, value).toBeGreaterThan(8);
      // ONE sentence, not a paragraph: the plaque is a plaque.
      expect(vm?.reason, value).not.toMatch(/\.\s+\S/);
    }
  });

  it("renders no plaque at all when nothing was compiled", () => {
    expect(selectWaitPlaque(null, null)).toBeNull();
    expect(selectWaitPlaque(undefined, null)).toBeNull();
  });

  it("the live shape names the SAME node NEXT names — Available R, in F05A's voice", () => {
    const { debt, decision } = compile(LIVE);
    expect(decision.value).toBe("WAIT");
    const plaque = selectWaitPlaque(decision, debt)!;
    const next = selectOneNextThing({ rightOfWay: decision, debt, hasExpression: false });
    expect(plaque.standing).toBe("WORKABLE");
    expect(plaque.basis).toBe("FIRST_PAYABLE");
    expect(plaque.node).toBe("Available R");
    expect(next.headline).toBe("Resolve available R");
    // The two readers agree because both read the ledger's chain order.
    expect(next.headline.toLowerCase()).toContain(plaque.node!.toLowerCase());
    expect(plaque.reason).toBe("RISK NOT DECLARED · CLARITY PRECEDES ENTRY");
  });

  it("agrees with NEXT for EVERY choice of first payable node", () => {
    const payables = LIVE.filter((n) => n.payableBy === "EVIDENCE" || n.payableBy === "DECLARATION");
    for (const target of payables) {
      const chain = LIVE.map((n) =>
        n.key === target.key ? { ...n, indicator: "UNKNOWN" as const, venueBlocked: false }
        : n.payableBy === "COMPOSITION" ? n
        : { ...n, indicator: "OK" as const },
      );
      const { debt, decision } = compile(chain);
      const plaque = selectWaitPlaque(decision, debt)!;
      const next = selectOneNextThing({ rightOfWay: decision, debt, hasExpression: false });
      expect(plaque.node, target.key).toBe(target.label);
      expect(next.headline.toLowerCase(), target.key).toContain(target.label.toLowerCase());
    }
  });

  it("carries selectWaitStanding's answer, never its own", () => {
    for (const chain of [LIVE, LIVE.map((n) => (n.payableBy === "DECLARATION" ? { ...n, indicator: "OK" as const } : n))]) {
      const { debt, decision } = compile(chain);
      expect(selectWaitPlaque(decision, debt)?.standing).toBe(selectWaitStanding(decision, debt)?.standing ?? null);
    }
  });

  it("FINISHED over compositions says P110's words — the thing that clears only when its inputs do", () => {
    const chain = LIVE.map((n) =>
      n.payableBy === "COMPOSITION" && n.key === "regime" ? { ...n, indicator: "UNKNOWN" as const }
      : n.payableBy === "COMPOSITION" ? n
      : { ...n, indicator: "OK" as const, venueBlocked: false },
    );
    const { debt, decision } = compile(chain);
    const plaque = selectWaitPlaque(decision, debt)!;
    expect(plaque.standing).toBe("FINISHED");
    expect(plaque.basis).toBe("COMPOSITIONS_ONLY");
    expect(plaque.node).toBe("Regime");
    expect(plaque.reason).toBe("LET STRUCTURE DEVELOP");
  });

  it("a venue blockage names the feed, not patience", () => {
    const chain = LIVE.map((n) =>
      n.key === "aggression" ? n : n.payableBy === "COMPOSITION" ? { ...n, indicator: "OK" as const } : { ...n, indicator: "OK" as const },
    );
    const { debt, decision } = compile(chain);
    const plaque = selectWaitPlaque(decision, debt)!;
    expect(plaque.standing).toBe("VENUE_BLOCKED");
    expect(plaque.reason).toBe("THIS FEED CANNOT SUPPLY AGGRESSION");
    expect(plaque.reason).not.toMatch(/DEVELOP|FINISH/);
  });

  it("× THE BORROWED MOCKUP: never says ABSORPTION — no owner on this rail publishes it", () => {
    // F06A draws "ABSORPTION IN PROGRESS · LET STRUCTURE FINISH". No absorption
    // reading reaches the decision rail, so the phrase would be design theater.
    const src = readFileSync(resolve(__dirname, "selectWaitPlaque.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(src).not.toMatch(/ABSORPTION/);
    for (const chain of [LIVE, LIVE.map((n) => ({ ...n, indicator: "UNKNOWN" as const }))]) {
      const { debt, decision } = compile(chain);
      expect(selectWaitPlaque(decision, debt)?.reason).not.toMatch(/ABSORPTION/);
    }
  });

  it("a WAIT with no ledger says so rather than inventing a reason", () => {
    const plaque = selectWaitPlaque({ value: "WAIT", detail: "d", tone: "warn" }, null)!;
    expect(plaque.basis).toBe("NO_LEDGER");
    expect(plaque.reason).toBe("NO LEDGER EXPLAINS THIS WAIT");
  });

  it("ACTION is never a green light on this rail — paid is not ripe", () => {
    const plaque = selectWaitPlaque({ value: "ACTION", detail: "d", tone: "resolved" }, null)!;
    expect(plaque.reason).toContain("PERMISSION NOT EVALUATED");
    expect(plaque.reason).not.toMatch(/GRANTED|\bGO\b|ENTER NOW/);
  });

  it("× THE SECOND DECISION OWNER: this module computes no verdict, debt or standing", () => {
    const src = readFileSync(resolve(__dirname, "selectWaitPlaque.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(src).not.toMatch(/computeRightOfWay\s*\(/);
    expect(src).not.toMatch(/computeEvidenceDebt\s*\(/);
    expect(src).not.toMatch(/selectGoInterlock\s*\(/);
    // The standing is CALLED from its owner, never re-derived from the count.
    expect(src).toContain("selectWaitStanding(decision");
    expect(src).not.toMatch(/missingPayable\s*>\s*0/);
    // The word is the reading's own value — no literal verdict is ever minted.
    expect(src).toContain("word: decision.value");
    expect(src).not.toMatch(/word:\s*"(WAIT|ACTION|NO TRADE|CAUTION|UNKNOWN)"/);
    // No clock: a plaque that read the time would be a second asOf owner.
    expect(src).not.toMatch(/Date\.now\(|new Date\(/);
  });
});

describe("selectDebtTag — H-101: the tag lives on the event, or nowhere", () => {
  const { debt, decision } = compile(LIVE);
  const EVENT = Date.UTC(2026, 8, 25, 18, 0, 0);
  const AS_OF = Date.UTC(2026, 8, 25, 18, 16, 4);

  it("tags the bar the ledger was read at, in the chart's own seconds", () => {
    const tag = selectDebtTag({ decision, debt, eventBarOpenedAtMs: EVENT, capturedAt: AS_OF, replayEngaged: false })!;
    expect(tag.word).toBe("WAIT");
    expect(tag.barTimeSec).toBe(EVENT / 1000);
    expect(tag.asOfMs).toBe(AS_OF);
    expect(tag.owed).toBe(debt.missing);
  });

  it("no event bar → no tag (never a guessed 'newest candle')", () => {
    for (const eventBarOpenedAtMs of [null, undefined, 0, Number.NaN]) {
      expect(selectDebtTag({ decision, debt, eventBarOpenedAtMs, capturedAt: AS_OF, replayEngaged: false })).toBeNull();
    }
  });

  it("no open debt, or not WAIT → no tag", () => {
    const paid = compile(LIVE.map((n) => ({ ...n, indicator: "OK" as const })));
    expect(paid.decision.value).not.toBe("WAIT");
    expect(selectDebtTag({ ...paid, eventBarOpenedAtMs: EVENT, capturedAt: AS_OF, replayEngaged: false })).toBeNull();
    expect(selectDebtTag({ decision: { value: "NO TRADE", detail: "d", tone: "warn" }, debt, eventBarOpenedAtMs: EVENT, capturedAt: AS_OF, replayEngaged: false })).toBeNull();
    expect(selectDebtTag({ decision, debt: null, eventBarOpenedAtMs: EVENT, capturedAt: AS_OF, replayEngaged: false })).toBeNull();
    // A WAIT over a CLOSED ledger (permission withheld for another reason)
    // has no debt to tag: "GO circuit is dark while debt is OPEN".
    const closed = { ...debt, missing: 0, missingPayable: 0, missingLabels: [], missingPayableLabels: [], venueBlocked: 0, venueBlockedLabels: [] };
    expect(selectDebtTag({ decision, debt: closed, eventBarOpenedAtMs: EVENT, capturedAt: AS_OF, replayEngaged: false })).toBeNull();
  });

  it("a replay camera walking history gets no live tag", () => {
    expect(selectDebtTag({ decision, debt, eventBarOpenedAtMs: EVENT, capturedAt: AS_OF, replayEngaged: true })).toBeNull();
  });

  it("an absent capture instant is an absent asOf, never epoch zero", () => {
    const tag = selectDebtTag({ decision, debt, eventBarOpenedAtMs: EVENT, capturedAt: null, replayEngaged: false })!;
    expect(tag.asOfMs).toBeNull();
  });
});
