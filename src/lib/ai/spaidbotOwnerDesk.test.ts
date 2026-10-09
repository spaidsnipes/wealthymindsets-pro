import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACADEMY_DOOR_FOR_TOOL } from "@/lib/academy/academyDoorForTool";
import { FVG_LESSONS } from "@/lib/academy/fvgCourse";
import { PROP_STORAGE_KIND, formatCents, planDaysVerdict, propSampleInputs, readPropEvaluation } from "@/lib/journal/propEvaluation";
import {
  SPAIDBOT_NO_PROMISE_RULES, SPAIDBOT_PROP_RULES, formatPropEvaluationBlock, spaidbotAcademyBlock, spaidbotPropNote,
} from "./spaidbotOwnerDesk";

const route = readFileSync("src/app/api/spaidbot/route.ts", "utf8");
const PROMISE = /\b(you will pass|will pass|guarantee|guaranteed|you should (take|trade|size)|sure to|certain to)\b/i;

describe("Supermax §8 / §10 — SpaidBot explains the owner's evaluation arithmetic with the desk's own engine", () => {
  const stored = { kind: PROP_STORAGE_KIND, version: 1, inputs: propSampleInputs(), scenarioRowsCents: [] };

  it("every figure in the block is the engine's own reading — no second arithmetic", () => {
    const x = propSampleInputs();
    const r = readPropEvaluation(x);
    const block = formatPropEvaluationBlock(x);
    expect(block).toContain("PROP EVALUATION — OWNER'S OWN NUMBERS");
    expect(block).toContain("UNVERIFIED");
    if (r.netProfitCents.known) expect(block).toContain(`Net profit so far: ${formatCents(r.netProfitCents.value)}`);
    if (r.requiredNetProfitCents.known) expect(block).toContain(`Required net profit: ${formatCents(r.requiredNetProfitCents.value)}`);
    if (r.remainingCents.known) expect(block).toContain(`Remaining: ${formatCents(r.remainingCents.value)}`);
    expect(block).toContain(planDaysVerdict(x, 2).words);
    expect(block).not.toMatch(PROMISE);
  });

  it("a missing figure is said, never assumed", () => {
    const block = formatPropEvaluationBlock({ ...propSampleInputs(), profitTargetCents: null, startingBalanceCents: null, currentBalanceCents: null, days: [] });
    expect(block).toMatch(/cannot be said — /);
  });

  it("owner only: a member's record says nothing; a malformed record says nothing", () => {
    expect(spaidbotPropNote(stored, false)).toBe("");
    expect(spaidbotPropNote(stored, true)).toContain("OWNER'S OWN NUMBERS");
    for (const bad of [null, undefined, "x", {}, { kind: "OTHER", version: 1, inputs: {} }, { ...stored, version: 2 }]) {
      expect(spaidbotPropNote(bad, true), JSON.stringify(bad)).toBe("");
    }
  });

  it("the route gates the desk block and the desk rules on the owner, and stores nothing", () => {
    expect(route).toMatch(/const ownerAllowed = tastytradeOwnerGate\(auth\.user\.sub, process\.env\)\.allowed;/);
    expect(route).toMatch(/spaidbotPropNote\(\(context as \{ prop\?: unknown \} \| undefined\)\?\.prop, ownerAllowed\)/);
    expect(route).toMatch(/ownerAllowed \? `\\n\\n\$\{SPAIDBOT_PROP_RULES\}` : ""/);
    expect(route).not.toMatch(/\.put\(|setItem|writeFile|insert\(/);
  });

  it("the rules forbid a promise of passing and any trade or size toward a number", () => {
    expect(SPAIDBOT_PROP_RULES).toMatch(/Never say an evaluation will be passed/);
    expect(SPAIDBOT_PROP_RULES).toMatch(/never suggest trades, size or risk to reach a number/);
    expect(SPAIDBOT_PROP_RULES).toMatch(/required net profit = the larger of \(the profit target\) and \(the largest profitable day ÷ 0\.3\)/);
    expect(SPAIDBOT_NO_PROMISE_RULES).toMatch(/Never promise profit, a win, a fill, or that a prop-firm evaluation, challenge or funded account will be passed/);
    expect(route).toContain("${SPAIDBOT_NO_PROMISE_RULES}");
  });

  it("the execution boundary is still in the instructions, and the product is a Trading Operating System", () => {
    expect(route).toMatch(/You cannot stage, submit, replace, or cancel paper or live orders\./);
    expect(route).toMatch(/You cannot access broker accounts, credentials, balances, positions, or orders\./);
    expect(route).toMatch(/WealthyMindsets Pro — a Trading Operating System/);
    expect(route).not.toMatch(/professional trading platform/);
  });
});

describe("Supermax §9 / §10 — SpaidBot recommends only the lessons the ⓘ doors point at", () => {
  it("every recommended lesson is in the door table and in the course, by exact title and address", () => {
    const block = spaidbotAcademyBlock();
    const cited = [...block.matchAll(/"([^"]+)" — (\/education\?lesson=fvg-\d+)/g)].map(m => ({ title: m[1], href: m[2] }));
    expect(cited.length).toBeGreaterThanOrEqual(8);
    for (const c of cited) {
      const l = FVG_LESSONS.find(x => `/education?lesson=${x.id}` === c.href);
      expect(l, c.href).toBeTruthy();
      expect(c.title).toBe(l!.title);
    }
    for (const id of ["LIVING_PROFILE", "BRICK_WALLS", "ABSORPTION", "EFFORT_RESPONSE", "LIQUIDITY_WEATHER", "FP_bid-ask"]) {
      expect(block).toContain(ACADEMY_DOOR_FOR_TOOL[id].href);
    }
    expect(block).toMatch(/never name another/);
    expect(route).toContain("${spaidbotAcademyBlock()}");
  });
});
