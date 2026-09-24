import { describe, expect, it } from "vitest";

import selectRiskOnPrice from "../marketData/viewModels/selectRiskOnPrice";
import { readRiskReceipt, riskReceiptKey, tearRiskReceipt, writeRiskReceiptOnce, type StoragePort } from "./riskReceipt";

const mem = (): StoragePort & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};
const risk = selectRiskOnPrice([{ side: "LONG", entry: 100, stop: 98, target: 105, placedAt: 1 }], [], 101);
const decision = { decisionId: "wmd_abc", bornAt: 1_000, bornFrom: "EXPLICIT_INTENT" };
const gates = { verdict: "ALLOWED", rules: [{ label: "Max daily loss", engaged: false }] };

describe("H-1001 · frozen asOf receipt", () => {
  it("is torn only from a born decision and a bracketed plan", () => {
    expect(tearRiskReceipt({ decision: null, risk, symbol: "AAPL", timeframe: "5m", gates, nowMs: 5 })).toMatchObject({ ok: false });
    const none = selectRiskOnPrice([], [], 100);
    expect(tearRiskReceipt({ decision, risk: none, symbol: "AAPL", timeframe: "5m", gates, nowMs: 5 })).toMatchObject({ ok: false });
  });

  it("freezes asOf, the plan and the gates, and states NO_FILL", () => {
    const t = tearRiskReceipt({ decision, risk, symbol: "AAPL", timeframe: "5m", gates, nowMs: 1_700_000_000_000 });
    if (!t.ok) throw new Error(t.reason);
    expect(t.receipt).toMatchObject({ decisionId: "wmd_abc", asOf: 1_700_000_000_000, fill: "NO_FILL", priceAtTear: 101 });
    expect(t.receipt.plan).toMatchObject({ side: "LONG", entry: 100, stop: 98, target: 105 });
    expect(Object.isFrozen(t.receipt)).toBe(true);
    expect(Object.isFrozen(t.receipt.plan)).toBe(true);
    expect(() => { (t.receipt as { asOf: number }).asOf = 1; }).toThrow();
  });

  it("writes once: a second tear is refused and the first asOf stands", () => {
    const s = mem();
    const a = tearRiskReceipt({ decision, risk, symbol: "AAPL", timeframe: "5m", gates, nowMs: 10 });
    const b = tearRiskReceipt({ decision, risk, symbol: "AAPL", timeframe: "5m", gates, nowMs: 20 });
    if (!a.ok || !b.ok) throw new Error("tear");
    expect(writeRiskReceiptOnce(s, "owner-1", a.receipt)).toMatchObject({ ok: true });
    const second = writeRiskReceiptOnce(s, "owner-1", b.receipt);
    expect(second).toMatchObject({ ok: false, reason: "ALREADY_TORN" });
    expect(readRiskReceipt(s, "owner-1", "wmd_abc")?.asOf).toBe(10);
  });

  it("is owner-scoped and refuses an unreadable record rather than guessing", () => {
    const s = mem();
    expect(riskReceiptKey("", "wmd_abc")).toBeNull();
    s.setItem(riskReceiptKey("owner-1", "wmd_abc")!, "{not json");
    expect(readRiskReceipt(s, "owner-1", "wmd_abc")).toBeNull();
    expect(readRiskReceipt(s, "owner-2", "wmd_abc")).toBeNull();
  });
});
