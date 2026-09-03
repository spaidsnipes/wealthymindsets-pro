import { describe, it, expect } from "vitest";
import { selectPermission, defaultFounderRules } from "./traderMemory/viewModels/selectPermission";

/**
 * Daily-drawdown HARD rule reachability.
 *
 * defaultFounderRules() declares
 *   { id: "max-drawdown", kind: "HARD", trigger: "MAX_DAILY_DRAWDOWN", threshold: -3 }
 * and composeMarketCanvasVM loads those rules for the Canvas verdict shown on
 * /command-deck, /charts, /nectar/[symbol] and /ai-bot.
 *
 * But `cumulativeSessionR` is optional and NO production caller supplies it.
 * The rule read `input.cumulativeSessionR ?? 0`, so cum was always 0 and
 * `0 <= -3` was always false — the Founder's declared HARD drawdown floor was
 * configured, surfaced as a rule, and structurally incapable of engaging.
 *
 * The evidence was already in scope: sessionDecisions carries outcome.realizedR,
 * which the max-losses rule already reads.
 */
function decision(id: string, realizedR?: number) {
  return {
    decisionId: id,
    decidedAt: 1_788_000_000_000,
    outcome: realizedR === undefined ? undefined : { realizedR },
  } as never;
}

const base = {
  ownerId: "u1",
  sessionIdentity: "s1",
  nowMs: 1_788_000_100_000,
  rules: defaultFounderRules(),
};

function drawdownRule(vm: ReturnType<typeof selectPermission>) {
  return vm.evaluations.find(e => e.rule.id === "max-drawdown");
}

describe("daily drawdown rule reachability", () => {
  it("engages when session R breaches the -3R floor", () => {
    const vm = selectPermission({
      ...base,
      sessionDecisions: [decision("a", -1.5), decision("b", -2)],
    } as never);
    expect(drawdownRule(vm)?.engaged).toBe(true);
  });

  it("does not engage above the floor", () => {
    const vm = selectPermission({
      ...base,
      sessionDecisions: [decision("a", -1), decision("b", -1)],
    } as never);
    expect(drawdownRule(vm)?.engaged).toBe(false);
  });

  it("an explicit cumulativeSessionR still wins", () => {
    const vm = selectPermission({
      ...base,
      sessionDecisions: [],
      cumulativeSessionR: -5,
    } as never);
    expect(drawdownRule(vm)?.engaged).toBe(true);
  });

  it("a non-finite explicit value falls back to derivation rather than passing through", () => {
    // `?? 0` never guarded this — ?? passes NaN through, and NaN <= -3 is false.
    const vm = selectPermission({
      ...base,
      sessionDecisions: [decision("a", -4)],
      cumulativeSessionR: Number.NaN,
    } as never);
    expect(drawdownRule(vm)?.engaged).toBe(true);
  });

  it("one unresolved outcome cannot disable the rule for the whole session", () => {
    // Summing a NaN would poison the total and silently restore "never engages".
    const vm = selectPermission({
      ...base,
      sessionDecisions: [decision("a", -4), decision("b", Number.NaN), decision("c")],
    } as never);
    expect(drawdownRule(vm)?.engaged).toBe(true);
  });

  it("a flat session with no outcomes does not engage", () => {
    const vm = selectPermission({
      ...base,
      sessionDecisions: [decision("a"), decision("b")],
    } as never);
    expect(drawdownRule(vm)?.engaged).toBe(false);
  });

  it("the rule is HARD, so engaging it must actually restrict", () => {
    const rule = defaultFounderRules().find(r => r.id === "max-drawdown");
    expect(rule?.kind).toBe("HARD");
    expect(rule?.threshold).toBe(-3);
  });
});
