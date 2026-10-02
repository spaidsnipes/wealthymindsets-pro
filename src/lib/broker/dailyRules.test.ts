import { describe, expect, it } from "vitest";
import { replayDailyRules } from "./dailyRules";
import type { Episode } from "./webullLedger";

const ep = (id: string, open: string, close: string, net: number) => ({ id, label: "RECONSTRUCTED", net, openedAt: open, closedAt: close } as unknown as Episode);

describe("daily stop / shutdown replay — trades opened after the day was already done", () => {
  it("counts trades opened after realised net reached −2R, and after +3R", () => {
    const d = "2026-09-29T";
    const eps = [
      ep("a", `${d}13:31:00Z`, `${d}13:35:00Z`, -60),
      ep("b", `${d}13:40:00Z`, `${d}13:45:00Z`, -50),   // day now −110 ≤ −2R (R = 50)
      ep("c", `${d}13:50:00Z`, `${d}13:55:00Z`, -30),   // opened after the stop
      ep("d", `${d}14:00:00Z`, `${d}14:05:00Z`, 20),    // also after the stop
      ep("e", "2026-09-30T13:31:00Z", "2026-09-30T13:40:00Z", 160),  // +3.2R
      ep("f", "2026-09-30T13:45:00Z", "2026-09-30T13:50:00Z", -40),  // after shutdown
    ];
    const r = replayDailyRules(eps, 50)!;
    expect(r).toMatchObject({ days: 2, stopDays: 1, afterStopTrades: 2, afterStopNet: -10, shutdownDays: 1, afterShutdownTrades: 1, afterShutdownNet: -40 });
  });
  it("no stated 1R, no replay", () => {
    expect(replayDailyRules([], 0)).toBeNull();
  });
});
