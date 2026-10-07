import { describe, expect, it } from "vitest";

import { DEFAULT_SERVER_LIMITS } from "./liveOrderPreflight";
import { applyLimitsChange, loadServerOrderLimits, saveServerOrderLimits, serverLimitsKey } from "./serverOrderLimitsStore";

const T = 1_700_000_000_000;
const SET = { ...DEFAULT_SERVER_LIMITS, armed: true, maxContractsPerOrder: 2, maxSharesPerOrder: 100, maxNotionalUsdPerOrder: 50_000, maxLossUsdPerOrder: 250, updatedAtMs: T - 1 };

describe("server-held limits change only in the directions the Founder allows", () => {
  it("the kill switch engages in one write and disarms with it", () => {
    const r = applyLimitsChange(SET, { killSwitch: true }, T);
    expect(r).toMatchObject({ ok: true, limits: { killSwitch: true, armed: false, maxContractsPerOrder: 2, updatedAtMs: T } });
  });
  it("a stray killSwitch:false never releases it; only releaseKillSwitch does, and it stays DISARMED", () => {
    const killed = { ...SET, killSwitch: true, armed: false };
    expect(applyLimitsChange(killed, { killSwitch: false }, T)).toMatchObject({ ok: false });
    expect(applyLimitsChange(killed, { armed: true }, T)).toMatchObject({ ok: false });
    expect(applyLimitsChange(killed, { releaseKillSwitch: true }, T)).toMatchObject({ ok: true, limits: { killSwitch: false, armed: false } });
  });
  it("caps are replaced when present, cleared by null, and garbage reads as unset", () => {
    const r = applyLimitsChange(SET, { maxLossUsdPerOrder: 400, maxSharesPerOrder: null, maxContractsPerOrder: "lots" }, T);
    expect(r).toMatchObject({ ok: true, limits: { maxLossUsdPerOrder: 400, maxSharesPerOrder: null, maxContractsPerOrder: null, maxNotionalUsdPerOrder: 50_000 } });
  });
  it("from nothing, a first save is DISARMED unless it arms explicitly", () => {
    expect(applyLimitsChange(null, { maxContractsPerOrder: 1 }, T)).toMatchObject({ ok: true, limits: { armed: false, maxContractsPerOrder: 1, updatedAtMs: T } });
  });
  it("load/save round-trip per owner; no store reads as nothing", async () => {
    const m = new Map<string, string>();
    const kv = { get: async (k: string) => m.get(k) ?? null, put: async (k: string, v: string) => { m.set(k, v); } };
    expect(await loadServerOrderLimits(null, "u1")).toBeNull();
    expect(await loadServerOrderLimits(kv, "u1")).toBeNull();
    await saveServerOrderLimits(kv, "u1", SET);
    expect(m.has(serverLimitsKey("u1"))).toBe(true);
    expect(await loadServerOrderLimits(kv, "u1")).toEqual(SET);
    expect(await loadServerOrderLimits(kv, "u2")).toBeNull();
  });
});
