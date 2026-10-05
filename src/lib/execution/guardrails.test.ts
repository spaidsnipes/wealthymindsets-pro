import { describe, expect, it } from "vitest";

import { DEFAULT_GUARDRAILS, checkOrder, readGuardrails } from "./guardrails";

describe("self-control built into the glass", () => {
  it("no stored commitments: DISARMED, no ceilings — nothing can be sent (P0.3, 2026-10-05)", () => {
    expect(readGuardrails(null)).toEqual(DEFAULT_GUARDRAILS);
    expect(readGuardrails("garbage")).toEqual(DEFAULT_GUARDRAILS);
    expect(DEFAULT_GUARDRAILS.liveArmed).toBe(false);
    expect(checkOrder(DEFAULT_GUARDRAILS, { kind: "FUTURE", qty: 50 }).ok).toBe(false);
  });

  it("armed but a ceiling left blank refuses that kind of order, in words", () => {
    const g = readGuardrails(JSON.stringify({ liveArmed: true }));
    const cases = [
      [{ kind: "EQUITY", qty: 1 }, /maximum shares/],
      [{ kind: "FUTURE", qty: 1 }, /maximum contracts/],
      [{ kind: "FUTURE_OPTION", qty: 1 }, /maximum contracts/],
    ] as const;
    for (const [o, re] of cases) {
      const v = checkOrder(g, o);
      expect(v.ok).toBe(false);
      if (!v.ok) expect(v.reason).toMatch(re);
    }
    const capped = readGuardrails(JSON.stringify({ liveArmed: true, maxContractsPerOrder: 5 }));
    const opt = checkOrder(capped, { kind: "EQUITY_OPTION", qty: 1, limitPx: 1 });
    expect(opt.ok).toBe(false);
    if (!opt.ok) expect(opt.reason).toMatch(/maximum option premium/);
    const noLimit = checkOrder(readGuardrails(JSON.stringify({ liveArmed: true, maxContractsPerOrder: 5, maxOptionPremiumPerOrder: 500 })), { kind: "EQUITY_OPTION", qty: 1, limitPx: null });
    expect(noLimit.ok).toBe(false);
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
