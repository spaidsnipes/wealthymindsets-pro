/**
 * Prop session plan (Megazord order §6). Every number here is SYNTHETIC — round figures chosen to
 * exercise the rules; none is anyone's account. MNQ: $2.00 a point, 0.25 tick → $0.50 a tick.
 */
import { describe, expect, it } from "vitest";

import { instrumentEconomics } from "@/lib/marketData/contractEconomics";
import {
  EMPTY_SESSION_PLAN, EMPTY_SESSION_RECORD, SESSION_PLAN_STORAGE_KIND, editSessionPlan, lockSessionPlan, readSessionPlan, readStoredSessionPlan,
  readSessionAgainstDay, readStoredSessionRecord, startNewSessionPlan, storedSessionRecord,
  type SessionAccountContext, type SessionPlanInputs,
} from "./propSessionPlan";

const plan = (over: Partial<SessionPlanInputs>): SessionPlanInputs => ({
  ...EMPTY_SESSION_PLAN, symbol: "MNQ1!", stopTicks: 40, riskPerTradeCents: 15_000, feesPerContractCents: 104, ...over,
});
const acct = (over: Partial<SessionAccountContext> = {}): SessionAccountContext => ({
  drawdownHeadroomCents: { known: true, value: 200_000 }, contractLimit: null, verified: true, ...over,
});
const sized = (p: ReturnType<typeof readSessionPlan>) => { if (p.status !== "SIZED") throw new Error(p.why); return p; };
const check = (p: ReturnType<typeof sized>, id: string) => p.checks.find(c => c.id === id);

describe("sizing uses the one contract-economics owner and rounds contracts down", () => {
  it("MNQ is $0.50 a tick in the owner this plan reads", () => {
    const e = instrumentEconomics("MNQ1!", null);
    expect(e.status === "PRICED" && e.tickValue).toBe(0.5);
  });

  it("40 ticks + $1.04 fees is $21.04 a contract; $150 buys 7 contracts carrying $147.28", () => {
    const p = sized(readSessionPlan(plan({}), acct()));
    expect(p.perContractRiskCents).toBe(2_104);
    expect(p.contracts).toBe(7);
    expect(p.tradeRiskCents).toBe(14_728);
    expect(p.unusedRiskCents).toBe(272);
    expect(p.cappedByContractLimit).toBe(false);
  });

  it("the contract limit caps the size and says so", () => {
    const p = sized(readSessionPlan(plan({}), acct({ contractLimit: 5 })));
    expect(p.contracts).toBe(5);
    expect(p.tradeRiskCents).toBe(10_520);
    expect(p.cappedByContractLimit).toBe(true);
  });

  it("a risk smaller than one contract is not sized, and the reason names both amounts", () => {
    const p = readSessionPlan(plan({ riskPerTradeCents: 2_000 }), acct());
    expect(p.status).toBe("NOT_SIZED");
    expect(p.status === "NOT_SIZED" && p.why).toMatch(/\$20\.00 does not cover one MNQ contract at this stop \(\$21\.04 with fees\)/);
  });

  it("an instrument the owner refuses, a share instrument, or a missing input is never sized", () => {
    expect(readSessionPlan(plan({ symbol: "ZZZZ9!" }), acct()).status).toBe("NOT_SIZED");
    const stock = readSessionPlan(plan({ symbol: "TSLA" }), acct());
    expect(stock.status === "NOT_SIZED" && stock.why).toMatch(/futures contracts/);
    expect(readSessionPlan(plan({ stopTicks: 2.5 }), acct()).status).toBe("NOT_SIZED");
    expect(readSessionPlan(plan({ feesPerContractCents: null }), acct()).status).toBe("NOT_SIZED");
    expect(readSessionPlan({ ...EMPTY_SESSION_PLAN }, acct()).status).toBe("NOT_SIZED");
  });
});

describe("the day against the daily loss limit and the drawdown floor", () => {
  it("three attempts at $147.28 is $441.84 of exposure; it fits a $500 daily room", () => {
    const p = sized(readSessionPlan(plan({ attempts: 3, dailyLossLimitCents: 50_000, netTodayCents: 0 }), acct()));
    expect(p.dayExposureCents).toBe(44_184);
    expect(check(p, "day-daily")?.state).toBe("OK");
    expect(p.verdict).toBe("WITHIN_LIMITS");
    expect(p.verdictLine).toMatch(/7 contracts, \$147\.28 a trade, \$441\.84 for the day at most/);
  });

  it("a loss already taken shrinks today's room; profit does not widen it", () => {
    const after = sized(readSessionPlan(plan({ attempts: 3, dailyLossLimitCents: 50_000, netTodayCents: -10_000 }), acct()));
    expect(after.dailyRemainingCents).toEqual({ known: true, value: 40_000 });
    expect(check(after, "day-daily")?.state).toBe("BREAKS");
    expect(after.verdict).toBe("BREAKS_A_LIMIT");
    const up = sized(readSessionPlan(plan({ dailyLossLimitCents: 50_000, netTodayCents: 30_000 }), acct()));
    expect(up.dailyRemainingCents).toEqual({ known: true, value: 50_000 });
  });

  it("a reached daily limit says the session is over, in the trader's own rule", () => {
    const p = sized(readSessionPlan(plan({ dailyLossLimitCents: 50_000, netTodayCents: -50_000 }), acct()));
    expect(check(p, "daily-open")?.state).toBe("BREAKS");
    expect(check(p, "daily-open")?.words).toMatch(/Your own rule says the session is over/);
  });

  it("a loss that would land exactly on the drawdown floor is a breach", () => {
    const p = sized(readSessionPlan(plan({}), acct({ drawdownHeadroomCents: { known: true, value: 14_728 } })));
    expect(check(p, "trade-drawdown")?.state).toBe("BREAKS");
    expect(check(p, "trade-drawdown")?.words).toMatch(/a loss that reaches the floor is a breach/);
    expect(p.lossesToDrawdownFloor).toEqual({ known: true, value: 0 });
  });

  it("the loss count is equal full-stop losses: 13 before a $2,000 floor, 3 before a $500 daily room", () => {
    const p = sized(readSessionPlan(plan({ dailyLossLimitCents: 50_000 }), acct()));
    expect(p.lossesToDrawdownFloor).toEqual({ known: true, value: 13 });
    expect(p.lossesToDailyLimit).toEqual({ known: true, value: 3 });
  });

  it("the trader's own maximum trades is a check of its own", () => {
    const p = sized(readSessionPlan(plan({ attempts: 3, maxTradesPerDay: 2 }), acct()));
    expect(check(p, "trades-max")?.state).toBe("BREAKS");
    expect(sized(readSessionPlan(plan({ attempts: 1, maxTradesPerDay: 2 }), acct())).checks.find(c => c.id === "trades-max")?.state).toBe("OK");
  });
});

describe("unknown and unverified are said, never turned into a green", () => {
  it("unknown headroom and no daily limit leave the plan CANNOT_SAY with the reason", () => {
    const p = sized(readSessionPlan(plan({}), acct({ drawdownHeadroomCents: { known: false, why: "Enter the drawdown floor" } })));
    expect(check(p, "trade-drawdown")).toMatchObject({ state: "CANNOT_SAY", words: "Cannot say — drawdown headroom is not known (see the account above)." });
    expect(check(p, "trade-daily")).toMatchObject({ state: "CANNOT_SAY", words: "Cannot say — no daily loss limit entered." });
    // The full reason stays on the headroom figure itself, said once.
    expect(p.drawdownHeadroomCents).toEqual({ known: false, why: "Enter the drawdown floor" });
    expect(p.lossesToDrawdownFloor).toEqual({ known: false, why: "not known" });
    expect(p.verdict).toBe("CANNOT_SAY");
  });

  it("figures not read back from the firm are never within limits — but a break is still a break", () => {
    const ok = sized(readSessionPlan(plan({ dailyLossLimitCents: 50_000 }), acct({ verified: false })));
    expect(ok.verdict).toBe("CANNOT_SAY");
    expect(ok.verdictLine).toMatch(/UNVERIFIED/);
    const bad = sized(readSessionPlan(plan({ dailyLossLimitCents: 10_000 }), acct({ verified: false })));
    expect(bad.verdict).toBe("BREAKS_A_LIMIT");
  });

  it("no line tells the trader to make an amount, shames a loss, or presses for more attempts", () => {
    const lines = [
      readSessionPlan(plan({ attempts: 3, dailyLossLimitCents: 10_000, netTodayCents: -10_000, maxTradesPerDay: 1 }), acct({ verified: false })),
      readSessionPlan(plan({ dailyLossLimitCents: 50_000 }), acct()),
    ].flatMap(p => (p.status === "SIZED" ? [p.verdictLine, ...p.checks.map(c => c.words)] : [p.why])).join(" ");
    expect(lines).not.toMatch(/\b(must make|target for today|you failed|not built for|psychology is broken|guarantee|take (all|three|more))\b/i);
  });
});

describe("device storage", () => {
  it("round-trips a stored plan and refuses anything malformed", () => {
    const p = plan({ attempts: 2, dailyLossLimitCents: 50_000, netTodayCents: -1_250, maxTradesPerDay: 3 });
    expect(readStoredSessionPlan(JSON.parse(JSON.stringify({ kind: SESSION_PLAN_STORAGE_KIND, version: 1, plan: p })))).toEqual(p);
    expect(readStoredSessionPlan({ kind: SESSION_PLAN_STORAGE_KIND, version: 3, plan: p })).toBeNull();
    expect(readStoredSessionPlan("nope")).toBeNull();
    expect(readStoredSessionPlan({ kind: SESSION_PLAN_STORAGE_KIND, version: 1, plan: { ...p, attempts: 9, stopTicks: "40" } }))
      .toMatchObject({ attempts: 1, stopTicks: null });
  });
});

describe("lock the plan before the session", () => {
  const T0 = Date.UTC(2026, 9, 21, 13, 30), T1 = T0 + 25 * 60_000;
  const draft = { ...EMPTY_SESSION_RECORD, plan: plan({ dailyLossLimitCents: 50_000 }) };

  it("edits before the lock are a draft — no amendment", () => {
    const r = editSessionPlan(draft, { stopTicks: 30 }, T0);
    expect(r.plan.stopTicks).toBe(30);
    expect(r.amendments).toEqual([]);
    expect(r.lockedAtMs).toBeNull();
  });

  it("the locked plan is kept; a change after the lock is appended, never written over it", () => {
    const locked = lockSessionPlan(draft, T0);
    expect(locked.lockedAtMs).toBe(T0);
    expect(locked.lockedPlan).toEqual(draft.plan);
    const r = editSessionPlan(locked, { attempts: 2, riskPerTradeCents: 20_000 }, T1);
    expect(r.plan.attempts).toBe(2);
    expect(r.lockedPlan?.attempts).toBe(1);
    expect(r.amendments).toEqual([
      { at: T1, field: "attempts", from: "One and done", to: "Two attempts" },
      { at: T1, field: "riskPerTradeCents", from: "$150.00", to: "$200.00" },
    ]);
    // Locking again does not move the lock or clear the trail.
    expect(lockSessionPlan(r, T1 + 1)).toBe(r);
  });

  it("today's running result is a fact of the day, not a change of plan", () => {
    const r = editSessionPlan(lockSessionPlan(draft, T0), { netTodayCents: -12_500 }, T1);
    expect(r.plan.netTodayCents).toBe(-12_500);
    expect(r.amendments).toEqual([]);
  });

  it("a new day keeps the settings as a draft and clears the lock, the trail and today's result", () => {
    const r = startNewSessionPlan(editSessionPlan(lockSessionPlan(draft, T0), { attempts: 3, netTodayCents: -500 }, T1));
    expect(r).toMatchObject({ lockedAtMs: null, lockedPlan: null, amendments: [] });
    expect(r.plan.attempts).toBe(3);
    expect(r.plan.netTodayCents).toBe(0);
  });

  it("storage keeps the lock and trail (v2) and still reads a v1 plan; a trail without its lock is dropped", () => {
    const r = editSessionPlan(lockSessionPlan(draft, T0), { attempts: 2 }, T1);
    expect(readStoredSessionRecord(JSON.parse(JSON.stringify(storedSessionRecord(r))))).toEqual(r);
    expect(readStoredSessionRecord({ kind: SESSION_PLAN_STORAGE_KIND, version: 1, plan: draft.plan })).toEqual(draft);
    const torn = { ...storedSessionRecord(r), lockedPlan: null };
    expect(readStoredSessionRecord(torn)).toMatchObject({ lockedAtMs: null, amendments: [] });
  });
});

describe("after the session: the plan as locked beside the day as journaled", () => {
  const T0 = Date.UTC(2026, 9, 21, 13, 0);
  const locked = lockSessionPlan({ ...EMPTY_SESSION_RECORD, plan: plan({ attempts: 2, dailyLossLimitCents: 30_000 }) }, T0);
  const day = "2026-10-21";

  it("compares with the LOCKED plan even after it was changed", () => {
    const changed = editSessionPlan(locked, { attempts: 3 }, T0 + 60_000);
    const v = readSessionAgainstDay(changed, [{ date: day, pnl: -50 }, { date: day, pnl: 80 }, { date: day, pnl: -40 }], day, acct());
    expect(v.basis).toBe("LOCKED");
    expect(v.tradesPlanned).toBe(2);
    expect(v.differences.map(d => d.id)).toEqual(["MORE_TRADES"]);
    expect(v.differences[0].words).toBe("3 trades journaled against 2 planned attempts.");
  });

  it("a loss larger than the planned trade risk and a day past the daily limit are both named", () => {
    const v = readSessionAgainstDay(locked, [{ date: day, pnl: -200 }, { date: day, pnl: -150 }], day, acct());
    expect(v.plannedTradeRiskCents).toBe(14_728);
    expect(v.largestLossCents).toBe(20_000);
    expect(v.dayNetCents).toBe(-35_000);
    expect(v.differences.map(d => d.id)).toEqual(["LOSS_ABOVE_PLANNED_RISK", "DAY_PAST_DAILY_LIMIT"]);
    expect(v.line).toBe("The day differed from the locked plan in 2 ways — worth a look in Review.");
  });

  it("other days, no-trade days and an empty journal are not counted; a draft is named as a draft", () => {
    const v = readSessionAgainstDay(locked, [{ date: "2026-10-20", pnl: -999 }, { date: day, pnl: 0, dayModel: "M0" }], day, acct());
    expect(v.tradesJournaled).toBe(0);
    expect(v.line).toBe("No trades journaled for 2026-10-21 yet.");
    const d = readSessionAgainstDay({ ...EMPTY_SESSION_RECORD, plan: plan({}) }, [{ date: day, pnl: 30 }], day, acct());
    expect(d.basis).toBe("DRAFT");
    expect(d.line).toBe("The day stayed inside the draft plan.");
  });

  it("the words describe a difference, never grade the trader", () => {
    const v = readSessionAgainstDay(locked, [{ date: day, pnl: -500 }, { date: day, pnl: -500 }, { date: day, pnl: -500 }], day, acct());
    const all = [v.line, ...v.differences.map(d => d.words)].join(" ");
    expect(all).not.toMatch(/fail|broke|undisciplined|mistake|bad|should have|must stop/i);
  });
});

describe("the way back matches what broke", () => {
  it("only the trade count broke → fewer attempts; a reached daily limit → the session is over; money → size, stop or attempts", () => {
    const count = sized(readSessionPlan(plan({ attempts: 3, maxTradesPerDay: 2, dailyLossLimitCents: 50_000 }), acct()));
    expect(count.verdictLine).toMatch(/Fewer attempts would change that\.$/);
    const over = sized(readSessionPlan(plan({ dailyLossLimitCents: 50_000, netTodayCents: -50_000 }), acct()));
    expect(over.verdictLine).toMatch(/Your own rule says the session is over\.$/);
    const money = sized(readSessionPlan(plan({ attempts: 3, dailyLossLimitCents: 20_000 }), acct()));
    expect(money.verdictLine).toMatch(/Smaller size, a closer stop on structure, or fewer attempts would change that\.$/);
  });
});
