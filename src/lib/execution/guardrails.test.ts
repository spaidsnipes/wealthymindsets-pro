import { describe, expect, it } from "vitest";

import { DEFAULT_GUARDRAILS, checkOrder, readGuardrails } from "./guardrails";

describe("self-control built into the glass", () => {
  it("no stored commitments: armed, no ceilings", () => {
    expect(readGuardrails(null)).toEqual(DEFAULT_GUARDRAILS);
    expect(readGuardrails("garbage")).toEqual(DEFAULT_GUARDRAILS);
    expect(checkOrder(DEFAULT_GUARDRAILS, { kind: "FUTURE", qty: 50 })).toEqual({ ok: true });
  });

  it("disarmed refuses every live order, in words", () => {
    const g = readGuardrails(JSON.stringify({ liveArmed: false }));
    for (const o of [{ kind: "EQUITY", qty: 1 }, { kind: "FUTURE", qty: 1 }, { kind: "EQUITY_OPTION", qty: 1, limitPx: 1 }] as const) {
      const v = checkOrder(g, o);
      expect(v.ok).toBe(false);
      if (!v.ok) expect(v.reason).toMatch(/disarmed/);
    }
  });

  it("contract, share and premium ceilings each bite their own kind", () => {
    const g = readGuardrails(JSON.stringify({ maxContractsPerOrder: 2, maxSharesPerOrder: 100, maxOptionPremiumPerOrder: 500, liveArmed: true }));
    expect(checkOrder(g, { kind: "FUTURE", qty: 3 }).ok).toBe(false);
    expect(checkOrder(g, { kind: "FUTURE_OPTION", qty: 2 }).ok).toBe(true);
    expect(checkOrder(g, { kind: "EQUITY", qty: 101 }).ok).toBe(false);
    expect(checkOrder(g, { kind: "EQUITY", qty: 100 }).ok).toBe(true);
    expect(checkOrder(g, { kind: "EQUITY_OPTION", qty: 1, limitPx: 4.9 }).ok).toBe(true);
    expect(checkOrder(g, { kind: "EQUITY_OPTION", qty: 1, limitPx: 5.25 }).ok).toBe(false);
    const v = checkOrder(g, { kind: "EQUITY_OPTION", qty: 1, limitPx: 5.25 * 2 });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/\$1050\.00 of premium/);
  });

  it("an empty or nonsense ceiling is no ceiling", () => {
    expect(readGuardrails(JSON.stringify({ maxContractsPerOrder: "", maxSharesPerOrder: -5, maxOptionPremiumPerOrder: "abc" }))).toMatchObject({ maxContractsPerOrder: null, maxSharesPerOrder: null, maxOptionPremiumPerOrder: null });
  });
});
