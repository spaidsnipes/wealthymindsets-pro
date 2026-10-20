import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROTOCOL, minutesToNyOpen, prepPace, protocolDate, sanitizeDay, sanitizeProtocol, sanitizeTrigger, triggerPattern,
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
