import { describe, expect, it } from "vitest";
import { todayRuleState } from "./todayRuleState";
import type { Episode } from "@/lib/broker/webullLedger";

const ep = (net: number | null, closedAt: string | null, label = "RECONSTRUCTED") => ({ label, net, closedAt, entries: [{}] } as unknown as Episode);

describe("today's rule state — silent with no trades, evidence when there are", () => {
  it("no trades today → nothing to show", () => { expect(todayRuleState([], 50)).toBeNull(); });
  it("attempts, net, last result, stop/shutdown with a stated 1R", () => {
    expect(todayRuleState([ep(-60, "2026-10-02T13:40:00Z")], null)).toMatchObject({ trades: 1, net: -60, attemptState: "NEXT IS THE SECOND", stop: "NOT STATED" });
    const two = todayRuleState([ep(-60, "2026-10-02T13:40:00Z"), ep(-45, "2026-10-02T14:10:00Z")], 50)!;
    expect(two).toMatchObject({ trades: 2, net: -105, lastNet: -45, attemptState: "NEXT WOULD BE A THIRD", stop: "REACHED", shutdown: "CLEAR" });
    const open = todayRuleState([ep(160, "2026-10-02T13:40:00Z"), ep(null, null, "OPEN"), ep(5, "2026-10-02T15:00:00Z")], 50)!;
    expect(open).toMatchObject({ trades: 3, open: 1, net: 165, attemptState: "PAST THE SECOND", shutdown: "REACHED" });
  });
});
