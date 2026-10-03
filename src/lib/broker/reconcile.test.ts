import { describe, expect, it } from "vitest";
import { reconcileDay } from "./reconcile";
import type { Episode } from "./webullLedger";

const ep = (net: number, closedAt: string) => ({ label: "RECONSTRUCTED", net, closedAt } as unknown as Episode);
const NOW = new Date("2026-10-02T23:00:00Z");   // 19:00 New York

describe("reconcile the ledger with Webull's own day P&L", () => {
  it("nothing held: equal to the cent is RECONCILED (measured 2026-10-02: −$14.11 both)", () => {
    expect(reconcileDay([ep(-14.11, "2026-10-02T14:33:35Z"), ep(-7.88, "2026-10-01T14:12:00Z")], -14.11, 0, NOW)).toMatchObject({ state: "RECONCILED", ledgerToday: -14.11, difference: 0 });
  });
  it("a gap is a MISMATCH; positions held make it NOT COMPARABLE; no broker figure, NOT COMPARABLE", () => {
    expect(reconcileDay([ep(-14.11, "2026-10-02T14:33:35Z")], -12, 0, NOW)).toMatchObject({ state: "MISMATCH", difference: -2.11 });
    expect(reconcileDay([ep(-14.11, "2026-10-02T14:33:35Z")], -12, 2, NOW).state).toBe("NOT COMPARABLE");
    expect(reconcileDay([], null, 0, NOW).state).toBe("NOT COMPARABLE");
  });
});
