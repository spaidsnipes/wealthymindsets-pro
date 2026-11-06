/**
 * WM PRO PLANS — what each plan unlocks (Founder pricing decision 2026-11-06). These tests FAIL if the
 * 3-invention cap, the timeframe gate or the auto-trading flag is removed or loosened, or if the chart stops
 * routing its switches and its timeframe through them.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  FOUNDER_PASSPORT_IDS, PARTNER_GRANTS_ENV, PAY_PER_TRADE, STANDARD_INVENTION_CAP, STANDARD_TIMEFRAMES,
  activeInventionIds, entitlementsFor, inventionSwitchAllowed, inventionsOverCap, lockedTimeframeKind, planLimits,
  readPlanEntitlements, timeframeAllowed, upgradeWords,
} from "./planEntitlements";
import { TIER_SPEC } from "./tiers";

const MEMBER = "11111111-2222-4333-8444-555555555555";

describe("the plan matrix", () => {
  it("$10 holds 3 inventions + the standard timeframes; $20 Premium unlocks all; $30 adds auto-trading", () => {
    expect(STANDARD_INVENTION_CAP).toBe(3);
    expect(planLimits("APP")).toMatchObject({ maxActiveInventions: 3, timeframes: "STANDARD", autoTrading: false });
    expect(planLimits("PASSPORT")).toMatchObject({ maxActiveInventions: null, timeframes: "ALL", autoTrading: false });
    expect(planLimits("OS")).toMatchObject({ maxActiveInventions: null, timeframes: "ALL", autoTrading: true });
    // Free (signed-in, no plan) never exceeds the $10 plan.
    expect(planLimits("FREE")).toMatchObject({ maxActiveInventions: 3, timeframes: "STANDARD", autoTrading: false });
    // Only the $30 plan carries auto-trading.
    expect((["FREE", "APP", "PASSPORT", "OS"] as const).filter(t => planLimits(t).autoTrading)).toEqual(["OS"]);
    expect([TIER_SPEC.APP.monthlyCents, TIER_SPEC.PASSPORT.monthlyCents, TIER_SPEC.OS.monthlyCents]).toEqual([1000, 2000, 3000]);
  });

  it("the standard timeframe set: seconds, trade-count and custom-minute rungs are locked; the standard ones are not", () => {
    for (const tf of ["1m", "3m", "5m", "15m", "30m", "45m", "1h", "2h", "4h", "1D", "1W", "1M"]) expect(STANDARD_TIMEFRAMES, tf).toContain(tf);
    for (const [tf, kind] of [["5s", "SECONDS"], ["15s", "SECONDS"], ["30s", "SECONDS"], ["500T", "TICK"], ["2m", "CUSTOM"], ["10m", "CUSTOM"], ["20m", "CUSTOM"], ["1Q", "CUSTOM"]] as const) {
      expect(lockedTimeframeKind(tf), tf).toBe(kind);
      expect(timeframeAllowed(planLimits("APP"), tf), tf).toBe(false);
      expect(timeframeAllowed(planLimits("PASSPORT"), tf), tf).toBe(true);
    }
    expect(timeframeAllowed(planLimits("APP"), "5m")).toBe(true);
    // An unknown plan gates nothing (a failed read never strips a paying member's chart).
    expect(timeframeAllowed(null, "5s")).toBe(true);
  });

  it("the 3-invention cap: a 4th switch-on is refused, switching off is always allowed, armed draw tools never count", () => {
    const app = planLimits("APP");
    const three = { LIVING_PROFILE: true, ABSORPTION: true, TPO_PROFILE: true, FLOW_CURRENT: false, DELTA_VP: true };
    expect(activeInventionIds(three)).toEqual(["LIVING_PROFILE", "ABSORPTION", "TPO_PROFILE"]);
    expect(inventionSwitchAllowed(app, three, "FLOW_CURRENT", true)).toBe(false);
    expect(inventionSwitchAllowed(app, three, "TPO_PROFILE", false)).toBe(true);
    expect(inventionSwitchAllowed(app, three, "ANCHORED_RANGE", true)).toBe(true);
    expect(inventionSwitchAllowed(app, { LIVING_PROFILE: true, ABSORPTION: true }, "FLOW_CURRENT", true)).toBe(true);
    expect(inventionSwitchAllowed(planLimits("PASSPORT"), three, "FLOW_CURRENT", true)).toBe(true);
    expect(inventionSwitchAllowed(null, three, "FLOW_CURRENT", true)).toBe(true);
    // A saved view holding five on the $10 plan is trimmed to the first three.
    const five = { LIVING_PROFILE: true, ABSORPTION: true, TPO_PROFILE: true, FLOW_CURRENT: true, BRICK_WALLS: true };
    expect(inventionsOverCap(app, five)).toEqual(["FLOW_CURRENT", "BRICK_WALLS"]);
    expect(inventionsOverCap(planLimits("OS"), five)).toEqual([]);
  });
});

describe("who gets what — the server decides", () => {
  it("Founders get everything by Passport id; a partner only when the Founder lists them; nobody else is lifted", () => {
    for (const id of FOUNDER_PASSPORT_IDS) expect(entitlementsFor({ tier: "FREE", userId: id })).toMatchObject({ tier: "OS", autoTrading: true, grantedBy: "FOUNDER" });
    expect(entitlementsFor({ tier: "FREE", userId: MEMBER })).toMatchObject({ tier: "FREE", maxActiveInventions: 3, grantedBy: "PLAN" });
    expect(entitlementsFor({ tier: "FREE", userId: MEMBER, env: { [PARTNER_GRANTS_ENV]: `x, ${MEMBER.toUpperCase()}` } })).toMatchObject({ tier: "OS", grantedBy: "PARTNER" });
    expect(entitlementsFor({ tier: "APP", userId: "not-a-passport" })).toMatchObject({ tier: "APP", maxActiveInventions: 3 });
  });

  it("the client's copy is parsed fail-closed: junk is unknown, never a bigger plan", () => {
    expect(readPlanEntitlements(entitlementsFor({ tier: "APP", userId: MEMBER }))).toEqual(planLimits("APP"));
    for (const junk of [null, "OS", {}, { tier: "GOD", maxActiveInventions: null, timeframes: "ALL", autoTrading: true }, { tier: "APP", maxActiveInventions: -1, timeframes: "STANDARD", autoTrading: false }, { tier: "APP", maxActiveInventions: 3, timeframes: "SOME", autoTrading: false }]) {
      expect(readPlanEntitlements(junk), JSON.stringify(junk)).toBeNull();
    }
  });

  it("upgrade words name the plan and its price once — no countdowns, no scarcity, no discounts", () => {
    const words = [upgradeWords("INVENTION_CAP"), upgradeWords("TIMEFRAME", "5s"), upgradeWords("TIMEFRAME", "500T"), upgradeWords("AUTO_TRADING")];
    expect(words[0]).toContain("$20");
    expect(words[1]).toContain("Seconds");
    expect(words[2]).toContain("tick");
    expect(words[3]).toContain("$30");
    for (const w of words) expect(w).not.toMatch(/only \d+ left|hurry|limited time|today only|% off|free month|trial/i);
  });

  it("pay per trade: every paid plan; the amount is the Founder's and is NOT set — nothing is charged per trade", () => {
    expect(PAY_PER_TRADE.plans).toEqual(["APP", "PASSPORT", "OS"]);
    expect(PAY_PER_TRADE.amountCents).toBeNull();
  });
});

describe("the chart routes through the gates (sentinel)", () => {
  const dash = readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");
  it("the one switch toggle refuses past the cap; over-cap switches are trimmed; the timeframe chip goes through the gate", () => {
    expect(dash.length).toBeGreaterThan(100_000);   // the scan read the real room
    expect(dash).toContain("const planEntitlements = usePlanEntitlements();");
    expect(dash).toMatch(/const onProfileMenuToggle = \(id: ProfileId\) => \{\s*\/\/[^\n]*\n\s*if \(!inventionSwitchAllowed\(planEntitlements, profileMenuActive, id, !profileMenuActive\[id\]\)\)/);
    expect(dash).toContain("inventionsOverCap(planEntitlements, profileMenuActive)");
    expect(dash).toContain("if (!timeframeAllowed(planEntitlements, tf))");
    expect(dash).toContain("if (timeframeAllowed(planEntitlements, timeframe)) return;");
    expect(dash).toContain("setTimeframe={chooseTimeframe}");
    expect(dash).not.toContain("setTimeframe={setTimeframe}");
  });
  it("the standing route answers the entitlements from the server's tier", () => {
    const route = readFileSync(path.join(process.cwd(), "src/app/api/billing/standing/route.ts"), "utf8");
    expect(route).toContain("entitlements: entitlementsFor({ tier, userId: auth.user.sub, env: process.env })");
  });
});
