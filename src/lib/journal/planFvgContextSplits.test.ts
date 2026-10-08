/**
 * §23 context splits and §24 "did management help?" — unit tests. Garden 19.
 * MARKET and TRADER outcomes stay apart; each is MEASURED only at n ≥ 20; context a
 * record does not carry is its own NOT RECORDED group, never guessed, never dropped.
 */
import { describe, expect, it } from "vitest";

import type { FvgRelationshipReading } from "@/lib/marketData/fvg/fvgRelationships";
import { journalFixture } from "./journalProofFixture";
import { fvgContextSplits, sessionGroupOf, splitGroupsOf, SPLIT_DIMENSIONS, type SplitInput } from "./planFvgContextSplits";
import { managementCounterfactual, planAloneR, type ManagementTrade } from "./planManagementCounterfactual";
import type { PlanVsActualResult } from "./planVsActual";
import { INSUFFICIENT } from "./statGuard";

const fx = journalFixture();
const REF = fx.entries[0].fvgRef;
const result = (departed: boolean, decidable = true): PlanVsActualResult => ({
  decisionId: "wmd_x", findings: departed ? [{ id: "MOVED_STOP_WITHOUT_PLAN_BASIS" }] as never : [], primary: (departed ? "MOVED_STOP_WITHOUT_PLAN_BASIS" : "FOLLOWED_PLAN") as never,
  exitDecidable: decidable, hindsightRisk: false, emotionalReason: "", emotionalReasonSource: "NOT RECORDED",
});
const rel = (rels: { family: string; kind: string }[], silent: string[] = []): FvgRelationshipReading => ({
  objectId: REF.objectId,
  relationships: rels as never,
  sources: [
    ...["STRUCTURE", "PROFILE", "WALL"].map(f => ({ family: f, owner: f, label: f, evidence: silent.includes(f) ? "SILENCE" : "MEASURED", provenance: "test" })),
  ] as never,
});
// 10:00 New York on a Tuesday (EST, UTC−5).
const NY_OPEN = Date.UTC(2026, 0, 6, 15, 0, 0);
const at = (ms: number) => ({ ...REF, decisionAtMs: ms });

describe("splitGroupsOf — each dimension from data knowable at the decision", () => {
  it("a bare reference: what it does not carry is NOT RECORDED, never guessed", () => {
    const g = splitGroupsOf({ ref: at(NY_OPEN) });
    expect(Object.keys(g)).toEqual([...SPLIT_DIMENSIONS]);
    for (const d of ["STRUCTURE", "PROFILE", "WALL", "EFFORT→RESPONSE", "REGIME"] as const) expect(g[d], d).toBe("NOT RECORDED with this reference");
    expect(g.SESSION).toBe("NY open 09:30–11:00 ET");
    expect(g.TIMEFRAME).toBe(`Timeframe ${REF.timeframe}`);
    expect(g.INSTRUMENT).toBe(REF.symbol);
  });
  it("relationships name the family's group; an owner's SILENCE is said, not read as 'none'", () => {
    const g = splitGroupsOf({ ref: REF, relationships: rel([{ family: "STRUCTURE", kind: "BROKE_SWING" }, { family: "PROFILE", kind: "LVN" }], ["WALL"]) });
    expect(g.STRUCTURE).toBe("Broke a confirmed swing");
    expect(g.PROFILE).toBe("HVN / LVN inside or near");
    expect(g.WALL).toBe("wall owner SILENCE");
    const h = splitGroupsOf({ ref: REF, relationships: rel([{ family: "PROFILE", kind: "POC" }]) });
    expect(h.STRUCTURE).toBe("No structure relationship");
    expect(h.PROFILE).toBe("POC / VAH / VAL inside or near");
  });
  it("effort cell, regime: SILENT and UNTAGGED are their own words", () => {
    expect(splitGroupsOf({ ref: REF, effortCell: "SILENT" })["EFFORT→RESPONSE"]).toBe("Effort→response SILENT");
    expect(splitGroupsOf({ ref: REF, effortCell: "ABSORBED" })["EFFORT→RESPONSE"]).toBe("Displacement bar ABSORBED");
    expect(splitGroupsOf({ ref: REF, regime: "UNTAGGED" }).REGIME).toBe("Regime UNTAGGED (no regime reading attached)");
    expect(splitGroupsOf({ ref: REF, regime: "TREND" }).REGIME).toBe("Regime TREND");
  });
  it("session is New York time, DST included", () => {
    expect(sessionGroupOf(Date.UTC(2026, 6, 7, 13, 45))).toBe("NY open 09:30–11:00 ET");        // EDT
    expect(sessionGroupOf(Date.UTC(2026, 0, 6, 17, 0))).toBe("NY midday 11:00–14:00 ET");
    expect(sessionGroupOf(Date.UTC(2026, 0, 6, 20, 0))).toBe("NY afternoon 14:00–16:00 ET");
    expect(sessionGroupOf(Date.UTC(2026, 0, 6, 23, 0))).toBe("Outside NY regular hours");
    expect(sessionGroupOf(Date.UTC(2026, 0, 10, 15, 0))).toBe("Weekend (New York)");
  });
});

describe("fvgContextSplits — MARKET and TRADER apart, MEASURED only at 20", () => {
  const row = (i: number, over: Partial<SplitInput> = {}): SplitInput => ({
    ref: at(NY_OPEN + i * 86_400_000 * 7), marketResponse: i % 4 === 0 ? "ACCEPTED" : "REJECTED", realizedR: i % 2 ? 1 : -1, result: result(i % 5 === 0), ...over,
  });
  it("19 decisions: both sides INSUFFICIENT with their n; nothing dropped", () => {
    const rows = fvgContextSplits(Array.from({ length: 19 }, (_, i) => row(i)));
    expect(rows.length).toBeGreaterThan(SPLIT_DIMENSIONS.length - 1);
    for (const d of SPLIT_DIMENSIONS) expect(rows.filter(r => r.dimension === d).reduce((s, r) => s + r.decisions, 0), d).toBe(19);
    const s = rows.find(r => r.dimension === "INSTRUMENT")!;
    expect(s.market.state).toBe("INSUFFICIENT EVIDENCE");
    expect(s.market.line).toBe(`MARKET: ${INSUFFICIENT} — 19 of 20 interactions with a settled response.`);
    expect(s.trader.state).toBe("INSUFFICIENT EVIDENCE");
    expect(s.trader.meanR).not.toBeNull();       // kept for n, but the line says INSUFFICIENT
    expect(s.trader.line).toMatch(/^TRADER: .*19.*plan adherence INSUFFICIENT EVIDENCE \(19 decided\)\.$/);
  });
  it("20 decisions: MEASURED counts on each side, separately", () => {
    const rows = fvgContextSplits(Array.from({ length: 20 }, (_, i) => row(i)));
    const s = rows.find(r => r.dimension === "INSTRUMENT")!;
    expect(s.decisions).toBe(20);
    expect(s.market).toMatchObject({ n: 20, rejected: 15, accepted: 5, tradedThrough: 0, state: "MEASURED" });
    expect(s.market.line).toBe("MARKET: the territory rejected on 75%, was accepted on 25% and traded through on 0% of 20.");
    expect(s.trader).toMatchObject({ withR: 20, meanR: 0, decided: 20, followed: 16, state: "MEASURED" });
    expect(s.trader.line).toBe("TRADER: mean 0R over 20 recorded results; plan followed on 16 of 20 decided (80%).");
  });
  it("the market side counts only SETTLED responses (OPEN / unknown excluded); the trader side only finite R", () => {
    const rows = fvgContextSplits(Array.from({ length: 22 }, (_, i) => row(i, { marketResponse: i < 5 ? "OPEN" : i < 8 ? null : "REJECTED", realizedR: i < 3 ? Number.NaN : 1 })));
    const s = rows.find(r => r.dimension === "TIMEFRAME")!;
    expect(s.market.n).toBe(14);
    expect(s.market.state).toBe("INSUFFICIENT EVIDENCE");
    expect(s.trader.withR).toBe(19);
    expect(s.trader.state).toBe("INSUFFICIENT EVIDENCE");
  });
  it("on the proof fixture: every decision appears once per dimension", () => {
    expect(fx.splits.length).toBeGreaterThan(9);
    for (const d of SPLIT_DIMENSIONS) expect(fx.splits.filter(r => r.dimension === d).reduce((s, r) => s + r.decisions, 0), d).toBe(fx.entries.length);
  });
  it("never a verdict word about the trader", () => {
    const text = fvgContextSplits(Array.from({ length: 25 }, (_, i) => row(i))).flatMap(r => [r.market.line, r.trader.line]).join(" ");
    expect(text.length).toBeGreaterThan(200);
    expect(text).not.toMatch(/afraid|fear|greed|impatient|undisciplined|edge is|you should|always|never/i);
  });
});

describe("planAloneR + managementCounterfactual — descriptive, one path per trade", () => {
  const withAlone = fx.entries.map(e => ({ e, alone: planAloneR({ plan: e.plan, actuals: e.actuals, path: e.path, result: fx.planResults[e.id], realizedR: e.realizedR }) }));
  const usable = withAlone.find(x => x.alone != null)!;
  const trade = (realizedR: number, departed: boolean, over: Partial<ManagementTrade> = {}): ManagementTrade =>
    ({ plan: usable.e.plan, actuals: usable.e.actuals, path: usable.e.path, result: result(departed), realizedR, ...over });

  it("planAloneR states a number only when it can: no plan, no path or no entry → null", () => {
    expect(usable).toBeDefined();
    expect(typeof usable.alone).toBe("number");
    expect(planAloneR(trade(0, true, { plan: null }))).toBeNull();
    expect(planAloneR(trade(0, true, { path: null }))).toBeNull();
    expect(planAloneR(trade(0, true, { actuals: null }))).toBeNull();
  });
  it("19 departed pairs: INSUFFICIENT, counts so far shown, means withheld", () => {
    const m = managementCounterfactual(Array.from({ length: 19 }, (_, i) => trade(usable.alone! + (i % 2 ? 1 : -1), true)));
    expect(m.departed).toMatchObject({ n: 19, planAloneBetter: 10, traderBetter: 9, same: 0, meanTraderR: null, meanPlanAloneR: null, state: "INSUFFICIENT EVIDENCE" });
    expect(m.departed.line).toBe(`Did departing from the plan cost or help? ${INSUFFICIENT} — 19 of 20 departed trades with a plan-alone result (so far: plan alone better 10, you better 9).`);
    expect(m.claim).toMatch(/^DESCRIPTIVE/);
  });
  it("20 departed pairs: MEASURED with both means; 'about the same' inside ±0.05R", () => {
    const m = managementCounterfactual([...Array.from({ length: 18 }, (_, i) => trade(usable.alone! - 0.5 - i * 0.01, true)), trade(usable.alone! + 0.04, true), trade(usable.alone! + 2, true)]);
    expect(m.departed).toMatchObject({ n: 20, planAloneBetter: 18, traderBetter: 1, same: 1, state: "MEASURED" });
    expect(m.departed.meanPlanAloneR).toBe(Math.round(usable.alone! * 100) / 100);
    expect(m.departed.line).toMatch(/^Where you departed from the plan \(20 trades\), the plan alone on the same path would have done better on 18, worse on 1, about the same on 1 — mean .*R taken vs .*R for the plan alone\. Descriptive only\.$/);
  });
  it("departed trades with no plan-alone result are not paired (never a made-up comparison)", () => {
    const m = managementCounterfactual(Array.from({ length: 25 }, () => trade(1, true, { path: null })));
    expect(m.departed.n).toBe(0);
    expect(m.departed.state).toBe("INSUFFICIENT EVIDENCE");
    expect(m.restraint.departed).toBe(25);   // the trader's own R still counts for restraint
  });
  it("restraint: MEASURED only when BOTH sides hold 20; undecidable exits and missing R are left out", () => {
    const both = [...Array.from({ length: 20 }, () => trade(1, false)), ...Array.from({ length: 20 }, () => trade(-0.5, true))];
    const m = managementCounterfactual(both);
    expect(m.restraint).toMatchObject({ followed: 20, departed: 20, meanFollowedR: 1, meanDepartedR: -0.5, state: "MEASURED" });
    expect(m.restraint.line).toBe("Plan followed: mean 1R over 20; departed: mean -0.5R over 20. Descriptive only.");
    const short = managementCounterfactual([...both.slice(0, 20), ...both.slice(20, 39), { ...trade(1, true), result: result(true, false) }, { ...trade(1, true), realizedR: null }]);
    expect(short.restraint).toMatchObject({ followed: 20, departed: 19, meanFollowedR: null, meanDepartedR: null, state: "INSUFFICIENT EVIDENCE" });
    expect(short.restraint.line).toBe(`Did following the plan go with better results? ${INSUFFICIENT} — 20 followed and 19 departed decided trades (20 each side needed).`);
  });
  it("an empty book: both questions INSUFFICIENT at 0", () => {
    const m = managementCounterfactual([]);
    expect(m.departed.n + m.restraint.followed + m.restraint.departed).toBe(0);
    expect([m.departed.state, m.restraint.state]).toEqual(["INSUFFICIENT EVIDENCE", "INSUFFICIENT EVIDENCE"]);
  });
});
