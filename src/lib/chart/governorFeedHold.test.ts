import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { GOVERNOR_STALE_HOLD_MS, holdGovernorFeed, type GovernorFeedHold } from "./governorFeedHold";

/*
 * THE LAMP ON A QUIET TAPE (P0 Structure Profile colours, 2026-11-02 — "dimmed … then back … like a blinking lamp").
 * The feed reading is graded at render time: 15 s without a provider print reads STALE, and the attention governor
 * then multiplies EVERY governed layer by STALE_DIM (0.6). On a quiet tape any re-render — a colour pick in the
 * style card is one — flipped the whole glass to 60 %, and the next print flipped it back. The words (the STALE chip)
 * stay immediate; the glass steps back only once STALE has HELD.
 */
describe("holdGovernorFeed — the glass dims for a stale tape that has held, never per render", () => {
  it("a STALE reading dims nothing until it has held for GOVERNOR_STALE_HOLD_MS", () => {
    let h: GovernorFeedHold = { staleSince: null };
    let r = holdGovernorFeed(h, "LIVE", 0); h = r.hold; expect(r.governed).toBe("LIVE");
    r = holdGovernorFeed(h, "STALE", 16_000); h = r.hold; expect(r.governed).toBe("LIVE");
    r = holdGovernorFeed(h, "STALE", 16_000 + GOVERNOR_STALE_HOLD_MS - 1); h = r.hold; expect(r.governed).toBe("LIVE");
    r = holdGovernorFeed(h, "STALE", 16_000 + GOVERNOR_STALE_HOLD_MS); h = r.hold; expect(r.governed).toBe("STALE");
  });
  it("a print brings the glass back at once and restarts the hold", () => {
    let h: GovernorFeedHold = { staleSince: 0 };
    let r = holdGovernorFeed(h, "STALE", GOVERNOR_STALE_HOLD_MS + 5); h = r.hold; expect(r.governed).toBe("STALE");
    r = holdGovernorFeed(h, "LIVE", GOVERNOR_STALE_HOLD_MS + 10); h = r.hold; expect(r.governed).toBe("LIVE"); expect(h.staleSince).toBeNull();
    r = holdGovernorFeed(h, "STALE", GOVERNOR_STALE_HOLD_MS + 20); expect(r.governed).toBe("LIVE");
  });
  it("unknown stays unknown (null) — the hold never invents a LIVE", () => {
    expect(holdGovernorFeed({ staleSince: null }, null, 5).governed).toBeNull();
    expect(holdGovernorFeed({ staleSince: null }, "STALE", 5).governed).toBeNull();
  });
  it("the chart hands the governor the HELD feed, not the render-time reading", () => {
    const chart = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
    expect(chart).toContain("feedState: governedFeed,");
    expect(chart).not.toContain("feedState: feedStateRef.current,");
  });
});
