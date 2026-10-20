import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROTOCOL, dataCheckRefusal, minutesToNyOpen, prepPace, protocolDate, sanitizeDay, sanitizeProtocol, sanitizeTrigger, triggerPattern,
} from "./protocol";

describe("morning protocol (Founder brief 2026-10-20)", () => {
  it("the founder defaults carry the five trigger phrases and the anchor", () => {
    expect(DEFAULT_PROTOCOL.triggers).toHaveLength(5);
    expect(DEFAULT_PROTOCOL.triggers).toContain("The platform looks wrong, but I want to trade anyway.");
    expect(DEFAULT_PROTOCOL.anchor).toBe("I don't trade to prove who I am. I trade the evidence in front of me.");
    expect(DEFAULT_PROTOCOL.wakeTime).toBe("05:00");
  });
  it("anything from the wire becomes a valid protocol; bad fields fall back to the defaults", () => {
    const p = sanitizeProtocol({ wakeTime: "25:99", triggers: ["", 7, "x".repeat(500)], watchlist: ["nq1!", "<script>"], dailyRiskUsd: -5 });
    expect(p.wakeTime).toBe("05:00");
    expect(p.triggers).toEqual(["x".repeat(160)]);
    expect(p.watchlist).toEqual(["NQ1!"]);
    expect(p.dailyRiskUsd).toBeNull();
    expect(sanitizeProtocol(null)).toEqual(DEFAULT_PROTOCOL);
  });
  it("a day keeps only known steps and decisions, and is always the given date", () => {
    const d = sanitizeDay({ date: "1999-01-01", done: ["wake", "nope"], health: "MAYBE", plan: { decision: "YOLO" }, tfDone: ["4h", "3h"] }, "2026-10-20");
    expect(d.date).toBe("2026-10-20");
    expect(d.done).toEqual(["wake"]);
    expect(d.health).toBeNull();
    expect(d.plan.decision).toBeNull();
    expect(d.tfDone).toEqual(["4h"]);
  });
  it("a trigger needs words and an intensity 1–10; the server stamps the time", () => {
    expect(sanitizeTrigger({ trigger: "", intensity: 5 }, 1)).toBeNull();
    expect(sanitizeTrigger({ trigger: "x", intensity: 11 }, 1)).toBeNull();
    expect(sanitizeTrigger({ trigger: "I need to recover that loss.", intensity: 8, at: 0, interrupted: "yes" }, 42)).toMatchObject({ at: 42, intensity: 8, interrupted: false });
  });
  it("the pattern is counts from the trader's own log, never a guess", () => {
    expect(triggerPattern([]).topTrigger).toBeNull();
    const p = triggerPattern([
      { at: 1, trigger: "A", intensity: 8, action: "", interrupted: true, followedRules: true },
      { at: 2, trigger: "A", intensity: 6, action: "", interrupted: false, followedRules: true },
      { at: 3, trigger: "B", intensity: 4, action: "", interrupted: false, followedRules: false },
    ]);
    expect(p).toMatchObject({ n: 3, topTrigger: "A", topCount: 2, interruptedPct: 33, followedPct: 67, avgIntensity: 6 });
  });
  it("pace: a late start is said, never shortened", () => {
    expect(prepPace({ wakeMinutesLocal: 300, nowMinutesLocal: 290, minutesToOpen: 200, stepsDone: 0, stepsTotal: 9 })).toBe("NOT_STARTED");
    expect(prepPace({ wakeMinutesLocal: 300, nowMinutesLocal: 450, minutesToOpen: 30, stepsDone: 1, stepsTotal: 9 })).toBe("BEHIND");
    expect(prepPace({ wakeMinutesLocal: 300, nowMinutesLocal: 450, minutesToOpen: 30, stepsDone: 8, stepsTotal: 9 })).toBe("ON_PACE");
    expect(prepPace({ wakeMinutesLocal: 300, nowMinutesLocal: 600, minutesToOpen: -5, stepsDone: 0, stepsTotal: 9 })).toBe("OPEN");
  });
  it("the date and the open are on the New York clock", () => {
    const t = Date.UTC(2026, 9, 20, 12, 0); // 08:00 ET
    expect(protocolDate(t)).toBe("2026-10-20");
    expect(minutesToNyOpen(t)).toBe(90);
  });
});

describe("the data-check gate on the live order route", () => {
  it("a FAILED check refuses a new position only", () => {
    const failed = JSON.stringify({ health: "FAIL" });
    expect(dataCheckRefusal(failed, "Buy to Open")).toMatch(/FAILED/);
    expect(dataCheckRefusal(failed, "Sell to Open")).toMatch(/FAILED/);
    expect(dataCheckRefusal(failed, "Sell to Close")).toBeNull();
    expect(dataCheckRefusal(failed, "Buy to Close")).toBeNull();
  });
  it("passed, unset or unreadable → no refusal from this gate", () => {
    expect(dataCheckRefusal(JSON.stringify({ health: "PASS" }), "Buy to Open")).toBeNull();
    expect(dataCheckRefusal(null, "Buy to Open")).toBeNull();
    expect(dataCheckRefusal("{not json", "Buy to Open")).toBeNull();
  });
});

describe("founder brief 2026-10-20 (morning): $50 per trade, readiness states, clean runway", () => {
  it("the founder default risks $50 a trade; a member may clear it; bad values become null", async () => {
    const { DEFAULT_PROTOCOL: D, sanitizeProtocol: S } = await import("./protocol");
    expect(D.riskPerTradeUsd).toBe(50);
    expect(S({}).riskPerTradeUsd).toBe(50);
    expect(S({ riskPerTradeUsd: null }).riskPerTradeUsd).toBeNull();
    expect(S({ riskPerTradeUsd: -1 }).riskPerTradeUsd).toBeNull();
  });
  it("a day keeps only known readiness states and runway checks", async () => {
    const { sanitizeDay: S } = await import("./protocol");
    const d = S({ states: { calm: true, angry: true }, runway: { direction: true, runway: "yes", trigger: false } }, "2026-10-20");
    expect(d.states).toEqual({ calm: true });
    expect(d.runway).toEqual({ direction: true, trigger: false });
  });
  it("$50 on MNQ with a 10-point stop is 2 contracts; on NQ it does not fit", async () => {
    const { instrumentEconomics } = await import("@/lib/marketData/contractEconomics");
    const { calculatePositionSize } = await import("@/lib/riskKernel");
    const mnq = instrumentEconomics("MNQ1!", null), nq = instrumentEconomics("NQ1!", null);
    expect(mnq.status).toBe("PRICED"); expect(nq.status).toBe("PRICED");
    if (mnq.status !== "PRICED" || nq.status !== "PRICED") return;
    expect(calculatePositionSize({ accountRiskBudget: 50, riskPerUnit: 10 * mnq.pointValue, quantityStep: 1 })).toMatchObject({ status: "AVAILABLE", quantity: 2 });
    expect(calculatePositionSize({ accountRiskBudget: 50, riskPerUnit: 10 * nq.pointValue, quantityStep: 1 }).status).toBe("UNAVAILABLE");
  });
  it("a $476 best day under a 30% consistency rule needs $1,586.67 total profit", async () => {
    const { requiredForLargestCents } = await import("@/lib/journal/propEvaluation");
    expect(requiredForLargestCents(47_600, 0.3)).toBe(158_667);
  });
});
