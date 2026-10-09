/**
 * Prop evaluation arithmetic (Founder order §7). Every number in this file is SYNTHETIC — round sample
 * figures chosen to exercise the rules; none is anyone's account.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_CONSISTENCY_LIMIT, EMPTY_PROP_INPUTS, PROP_SCENARIO_LABEL, PROP_STORAGE_KIND, editInputs, formatCents, parseMoneyToCents, planDaysVerdict,
  propSampleInputs, readPropEvaluation, readPropScenario, readPropStored, requiredForLargestCents, stampVerified, type PropInputs,
} from "./propEvaluation";

const base = (over: Partial<PropInputs>): PropInputs => ({ ...EMPTY_PROP_INPUTS, ...over });
const val = <T,>(k: { known: true; value: T } | { known: false; why: string }): T => { if (!k.known) throw new Error(k.why); return k.value; };

describe("money is integer cents", () => {
  it("parses plain money and refuses anything else", () => {
    expect(parseMoneyToCents("1,000.50")).toBe(100050);
    expect(parseMoneyToCents("$3,333.34")).toBe(333334);
    expect(parseMoneyToCents("-250")).toBe(-25000);
    expect(parseMoneyToCents("(250.5)")).toBe(-25050);
    expect(parseMoneyToCents(".5")).toBe(50);
    for (const bad of ["", "abc", "1.234", "1e5", "12..3", "--5"]) expect(parseMoneyToCents(bad), bad).toBeNull();
  });
  it("formats cents without float noise", () => {
    expect(formatCents(333334)).toBe("$3,333.34");
    expect(formatCents(-25000)).toBe("−$250.00");
    expect(formatCents(5)).toBe("$0.05");
    expect(formatCents(0)).toBe("$0.00");
  });
  it("a required profit is rounded UP to the cent", () => {
    expect(requiredForLargestCents(100_000, 0.3)).toBe(333_334);   // 3,333.333… → 3,333.34
    expect(requiredForLargestCents(90_000, 0.3)).toBe(300_000);    // exact
    expect(requiredForLargestCents(100_000, 0.5)).toBe(200_000);
    expect(requiredForLargestCents(0, 0.3)).toBeNull();
    expect(requiredForLargestCents(100_000, 0)).toBeNull();
    expect(requiredForLargestCents(100_000, 1.2)).toBeNull();
  });
});

describe("THE CASE FROM THE ORDER: best day $1,000, $1,000 earned, limit 0.30", () => {
  const x = base({ profitTargetCents: 300_000, days: [{ date: "2026-01-05", netCents: 100_000 }] });
  const r = readPropEvaluation(x);
  it("required $3,333.34, remaining $2,333.34, at least 3 more days", () => {
    expect(DEFAULT_CONSISTENCY_LIMIT).toBe(0.3);
    expect(val(r.netProfitCents)).toBe(100_000);
    expect(r.largestDayCents).toBe(100_000);
    expect(val(r.bestDayShare)).toBe(1);
    expect(val(r.requiredNetProfitCents)).toBe(333_334);
    expect(formatCents(val(r.requiredNetProfitCents))).toBe("$3,333.34");
    expect(r.targetRaisedByBestDay).toBe(true);
    expect(val(r.remainingCents)).toBe(233_334);
    expect(formatCents(val(r.remainingCents))).toBe("$2,333.34");
    expect(val(r.minimumFurtherProfitableDays)).toBe(3);
    expect(val(r.minimumFurtherDaysAnyPlan)).toBe(3);
  });
  it("a 2-day plan is IMPOSSIBLE; 3 days is arithmetically possible; neither is called a plan or a promise to pass", () => {
    expect(planDaysVerdict(x, 2)).toEqual({ verdict: "IMPOSSIBLE", words: "IMPOSSIBLE in 2 further days — the rule arithmetic needs at least 3. This is arithmetic, not a plan." });
    expect(planDaysVerdict(x, 1).verdict).toBe("IMPOSSIBLE");
    expect(planDaysVerdict(x, 0).verdict).toBe("IMPOSSIBLE");
    expect(planDaysVerdict(x, 3).verdict).toBe("POSSIBLE");
    expect(planDaysVerdict(x, 3).words).toMatch(/not a plan and not a promise/);
    expect(planDaysVerdict(x, 2.5).verdict).toBe("CANNOT_SAY");
  });
  it("two further days cannot do it even with a NEW best day (which raises the requirement) — checked by brute force", () => {
    let found = false;
    for (let a = -200_000; a <= 400_000 && !found; a += 5_000) for (let b = -200_000; b <= 400_000 && !found; b += 5_000) {
      const s = readPropScenario(x, [a, b]);
      const net = val(s.after.netProfitCents);
      if (net >= 300_000 && net >= (s.after.requiredByConsistencyCents ?? Infinity)) found = true;
    }
    expect(found).toBe(false);
    // …and three days of the current largest does satisfy target and consistency.
    const three = readPropScenario(x, [100_000, 100_000, 33_334]);
    expect(three.conditions.find(c => c.id === "TARGET")!.state).toBe("MET");
    expect(three.conditions.find(c => c.id === "CONSISTENCY")!.state).toBe("MET");
  });
});

describe("the reading says what it cannot know", () => {
  it("opens empty: nothing is known, nothing is divided, nothing is guessed", () => {
    const r = readPropEvaluation(EMPTY_PROP_INPUTS);
    expect(r.verified).toBe(false);
    expect(r.netBasis).toBe("NONE");
    for (const k of [r.netProfitCents, r.bestDayShare, r.requiredNetProfitCents, r.remainingCents, r.drawdownFloorCents, r.drawdownHeadroomCents, r.minDaysRemaining, r.minimumFurtherProfitableDays]) expect(k.known).toBe(false);
    expect(r.largestDayCents).toBe(0);
  });
  it("best-day share is UNDEFINED when the net is not above zero — never a division", () => {
    const r = readPropEvaluation(base({ days: [{ date: "d1", netCents: 50_000 }, { date: "d2", netCents: -80_000 }] }));
    expect(val(r.netProfitCents)).toBe(-30_000);
    expect(r.bestDayShare).toEqual({ known: false, why: "Undefined — the net profit is not above zero, so there is nothing to take a share of." });
    const zero = readPropEvaluation(base({ days: [{ date: "d1", netCents: 50_000 }, { date: "d2", netCents: -50_000 }] }));
    expect(zero.bestDayShare.known).toBe(false);
  });
  it("net profit comes from the balances when both are entered, and the gap to the daily results is shown, not hidden", () => {
    const r = readPropEvaluation(base({ startingBalanceCents: 5_000_000, currentBalanceCents: 5_090_000, days: [{ date: "d1", netCents: 100_000 }] }));
    expect(r.netBasis).toBe("BALANCES");
    expect(val(r.netProfitCents)).toBe(90_000);
    expect(r.balanceVsDaysGapCents).toBe(-10_000);
    const fees = readPropEvaluation(base({ commissionsPerDayCents: 500, days: [{ date: "d1", netCents: 100_000 }, { date: "d2", netCents: -20_000 }] }));
    expect(fees.feesCents).toBe(1_000);
    expect(val(fees.netProfitCents)).toBe(79_000);
  });
  it("the original target stands when the best day is small; the largest day is the largest PROFITABLE day", () => {
    const r = readPropEvaluation(base({ profitTargetCents: 300_000, days: [{ date: "d1", netCents: 60_000 }, { date: "d2", netCents: -90_000 }, { date: "d3", netCents: 80_000 }] }));
    expect(r.largestDayCents).toBe(80_000);
    expect(r.largestDayDate).toBe("d3");
    expect(r.requiredByConsistencyCents).toBe(266_667);
    expect(val(r.requiredNetProfitCents)).toBe(300_000);
    expect(r.targetRaisedByBestDay).toBe(false);
    expect(val(r.remainingCents)).toBe(250_000);
    expect(val(r.minimumFurtherProfitableDays)).toBe(4);       // 2,500 ÷ 800 → 4 days
  });
  it("remaining is floored at zero; days traded against the minimum", () => {
    const r = readPropEvaluation(base({ profitTargetCents: 100_000, minTradingDays: 5, days: [1, 2, 3, 4].map(i => ({ date: `d${i}`, netCents: 30_000 })) }));
    expect(val(r.remainingCents)).toBe(0);
    expect(val(r.minimumFurtherProfitableDays)).toBe(0);
    expect(r.daysTraded).toBe(4);
    expect(val(r.minDaysRemaining)).toBe(1);
    expect(planDaysVerdict(base({ profitTargetCents: 100_000, minTradingDays: 5, days: [1, 2, 3, 4].map(i => ({ date: `d${i}`, netCents: 30_000 })) }), 0).verdict).toBe("IMPOSSIBLE");
  });
  it("no profitable day yet: the no-new-best count does not apply; the any-plan count is ⌈1 ÷ limit⌉", () => {
    const r = readPropEvaluation(base({ profitTargetCents: 300_000, days: [{ date: "d1", netCents: -10_000 }] }));
    expect(r.minimumFurtherProfitableDays.known).toBe(false);
    expect(val(r.minimumFurtherDaysAnyPlan)).toBe(4);            // four equal days: each is 25% ≤ 30%
  });
});

describe("drawdown headroom — a trailing floor is never guessed", () => {
  const acct = { startingBalanceCents: 5_000_000, currentBalanceCents: 5_100_000, maxDrawdownCents: 200_000 };
  it("UNKNOWN method → UNKNOWN", () => {
    expect(readPropEvaluation(base({ ...acct, drawdownMethod: "UNKNOWN" })).drawdownHeadroomCents).toEqual({ known: false, why: "UNKNOWN — the drawdown method is not known yet." });
  });
  it.each(["INTRADAY_TRAILING", "END_OF_DAY_TRAILING"] as const)("%s without a floor read from the dashboard → UNKNOWN, with the reason", method => {
    const r = readPropEvaluation(base({ ...acct, drawdownMethod: method }));
    expect(r.drawdownHeadroomCents.known).toBe(false);
    expect(r.drawdownFloorCents).toEqual({ known: false, why: "UNKNOWN — a trailing floor moves with the account; enter the floor the firm's dashboard shows. It is not guessed here." });
  });
  it("a trailing method WITH the floor the trader read → headroom from that floor", () => {
    const r = readPropEvaluation(base({ ...acct, drawdownMethod: "END_OF_DAY_TRAILING", drawdownFloorCents: 4_950_000 }));
    expect(val(r.drawdownHeadroomCents)).toBe(150_000);
  });
  it("STATIC → starting balance minus the maximum drawdown", () => {
    const r = readPropEvaluation(base({ ...acct, drawdownMethod: "STATIC" }));
    expect(val(r.drawdownFloorCents)).toBe(4_800_000);
    expect(val(r.drawdownHeadroomCents)).toBe(300_000);
    expect(readPropEvaluation(base({ drawdownMethod: "STATIC" })).drawdownHeadroomCents.known).toBe(false);
  });
});

describe("scenario lab — illustrative arithmetic, never a target", () => {
  const acct = base({ profitTargetCents: 300_000, startingBalanceCents: 5_000_000, currentBalanceCents: 5_100_000, maxDrawdownCents: 200_000, drawdownMethod: "STATIC", minTradingDays: 4, days: [{ date: "d1", netCents: 100_000 }] });
  it("is labelled, recomputes totals, and a new best day RAISES the requirement", () => {
    const s = readPropScenario(acct, [150_000, -40_000]);
    expect(s.label).toBe(PROP_SCENARIO_LABEL);
    expect(s.label).toBe("ILLUSTRATIVE ARITHMETIC — NOT A TARGET");
    expect(s.rows).toBe(2);
    expect(s.rowsSumCents).toBe(110_000);
    expect(val(s.after.netProfitCents)).toBe(210_000);
    expect(s.after.largestDayCents).toBe(150_000);
    expect(s.newBestDay).toBe(true);
    expect(val(s.before.requiredNetProfitCents)).toBe(333_334);
    expect(val(s.after.requiredNetProfitCents)).toBe(500_000);
    expect(s.requiredRoseByCents).toBe(166_666);
    expect(s.lowestBalanceCents).toBe(5_100_000);
  });
  it("losses run the balance against a STATIC floor; fees are taken per row", () => {
    const s = readPropScenario({ ...acct, commissionsPerDayCents: 1_000 }, [-250_000, -60_000]);
    expect(s.feesCents).toBe(2_000);
    expect(s.lowestBalanceCents).toBe(5_100_000 - 250_000 - 1_000 - 60_000 - 1_000);
    expect(s.conditions.find(c => c.id === "DRAWDOWN")).toMatchObject({ state: "NOT_MET" });
    expect(s.verdict).toBe("DOES_NOT");
    expect(s.verdictLine).toMatch(/^These numbers do not satisfy the rules as entered — /);
  });
  it("UNVERIFIED rules can never read 'satisfies' — the verdict is 'cannot say' until the stamp", () => {
    const rows = [100_000, 100_000, 33_334];
    const un = readPropScenario(acct, rows);
    expect(un.conditions.map(c => c.state)).toEqual(["MET", "MET", "MET", "MET"]);
    expect(un.verdict).toBe("CANNOT_SAY");
    expect(un.verdictLine).toBe("Cannot say — the rules are UNVERIFIED. Stamp them as read back from the firm's dashboard first.");
    const ok = readPropScenario(stampVerified(acct, 1_800_000_000_000), rows);
    expect(ok.verdict).toBe("SATISFIES_VERIFIED");
    expect(ok.verdictLine).toBe("These numbers satisfy every VERIFIED condition entered here. The firm's own dashboard decides; this is arithmetic.");
  });
  it("a rule that is not known makes the verdict 'cannot say — rule X', even when stamped", () => {
    const s = readPropScenario(stampVerified({ ...acct, drawdownMethod: "END_OF_DAY_TRAILING" }, 1), [100_000, 100_000, 33_334]);
    expect(s.verdict).toBe("CANNOT_SAY");
    expect(s.verdictLine).toMatch(/^Cannot say — drawdown: a trailing floor moves as the balance moves/);
    const noMin = readPropScenario(stampVerified({ ...acct, minTradingDays: null }, 1), [100_000, 100_000, 33_334]);
    expect(noMin.verdictLine).toBe("Cannot say — minimum trading days: the minimum number of trading days is not entered.");
  });
  it("a row that is not a whole number of cents is ignored, never rounded into the sum", () => {
    expect(readPropScenario(acct, [100.5, Number.NaN, 5_000] as number[]).rows).toBe(1);
  });
});

describe("the stamp covers exactly what was read", () => {
  it("any edit clears the stamp; the stamp carries its time", () => {
    const stamped = stampVerified(propSampleInputs(), 1_800_000_000_000);
    expect(readPropEvaluation(stamped).verified).toBe(true);
    const edited = editInputs(stamped, { currentBalanceCents: 5_150_000 });
    expect(edited.verifiedAtMs).toBeNull();
    expect(readPropEvaluation(edited).verified).toBe(false);
  });
});

describe("stored desk: read back whole or not at all", () => {
  const stored = { kind: PROP_STORAGE_KIND, version: 1 as const, inputs: propSampleInputs(), scenarioRowsCents: [50_000, -10_000] };
  it("survives JSON unchanged", () => {
    expect(readPropStored(JSON.parse(JSON.stringify(stored)))).toEqual(stored);
  });
  it("malformed records are dropped whole", () => {
    for (const bad of [null, "x", [], { ...stored, kind: "OTHER" }, { ...stored, version: 2 }, { ...stored, inputs: null }, { ...stored, scenarioRowsCents: [1.5] },
      { ...stored, inputs: { ...stored.inputs, days: [{ date: "d", netCents: 1.5 }] } }, { ...stored, inputs: { ...stored.inputs, days: "none" } }]) {
      expect(readPropStored(bad), JSON.stringify(bad)?.slice(0, 50)).toBeNull();
    }
  });
  it("an unusable limit or method falls back to the default / UNKNOWN, never a guess", () => {
    const r = readPropStored({ ...stored, inputs: { ...stored.inputs, consistencyLimit: 7, drawdownMethod: "MAGIC" } })!;
    expect(r.inputs.consistencyLimit).toBe(0.3);
    expect(r.inputs.drawdownMethod).toBe("UNKNOWN");
  });
});

it("the source scan below reads the real owner file", () => {
  expect(readFileSync(path.resolve(process.cwd(), "src/lib/journal/propEvaluation.ts"), "utf8").length).toBeGreaterThan(1000);
});

describe("source: no balances, no account numbers, no promises", () => {
  const src = readFileSync(path.resolve(process.cwd(), "src/lib/journal/propEvaluation.ts"), "utf8");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  it("the owner is pure — no storage, no network, no clock", () => {
    expect(code).not.toMatch(/localStorage|sessionStorage|fetch\(|Date\.now\(|new Date\(|XMLHttpRequest/);
  });
  it("the only figures in the owner are the labelled SAMPLE account's round numbers", () => {
    const sample = code.slice(code.indexOf("export function propSampleInputs"));
    const rest = code.slice(0, code.indexOf("export function propSampleInputs"));
    expect(sample).toContain('nickname: "SAMPLE"');
    // Outside the sample there is no dollar-sized literal at all (limits, caps and unit constants only).
    expect(rest.match(/\b\d{1,3}(_\d{3})+\b/g)?.filter(n => !["1_000_000", "10_000"].includes(n)) ?? []).toEqual([]);
    expect(rest).not.toMatch(/account\s*(number|id)|password|credential/i);
  });
  it("never promises a pass and never words an amount as something to make today", () => {
    expect(src).not.toMatch(/you will pass|guarantee|you need to make|make \$?[\d,]+ today|should make|must make/i);
  });
});
