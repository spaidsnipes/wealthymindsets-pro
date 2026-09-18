import { describe, expect, it } from "vitest";

import { compileFeedStanding } from "@/lib/os/osChrome";
import { selectHeatmapFeedObservation } from "./selectHeatmapFeedObservation";

const AT = 1_758_000_000_000;

describe("selectHeatmapFeedObservation — the evidence /heatmaps actually holds", () => {
  it("THE DEFECT ITSELF — a dated board stops compiling to FEED UNKNOWN", () => {
    // Measured live 2026-09-17 on production: eight real session moves
    // (-1.37% … +4.03%) under a masthead reading FEED UNKNOWN.
    const standing = compileFeedStanding(
      selectHeatmapFeedObservation({ observedAt: AT - 60_000 }),
      AT,
    );
    expect(standing.label).not.toBe("FEED UNKNOWN");
    expect(standing.established).toBe(true);
    // RE-PINNED under WM-CHART-PROV-EMERG-01 (leak measured live
    // 2026-09-17 as `SOURCE YAHOO · OBSERVED`). What this line
    // protects — the standing rests on a NAMED provider, not on
    // nothing — moved to `provenance`, which no chrome renders.
    expect(standing.provenance).toBe("yahoo");
    expect(standing.detail).not.toContain("yahoo");
  });

  it("an UNDATED board keeps reading FEED UNKNOWN — tiles are not an observation", () => {
    // This is the load-bearing case. Percentages can be a retained browser
    // snapshot from a previous session; nothing has been seen THIS round, and
    // the open question is then the correct reading.
    for (const observedAt of [null, undefined]) {
      const obs = selectHeatmapFeedObservation({ observedAt });
      expect(obs.source).toBeNull();
      expect(obs.quotePresent).toBe(false);
      expect(obs.lastObservedAtMs).toBeNull();
      expect(compileFeedStanding(obs, AT).label).toBe("FEED UNKNOWN");
    }
  });

  it("refuses zero, negative and non-finite epochs", () => {
    for (const observedAt of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        selectHeatmapFeedObservation({ observedAt }).quotePresent,
        String(observedAt),
      ).toBe(false);
    }
  });

  it("asserts no session for a whole-index, cross-sector board", () => {
    expect(selectHeatmapFeedObservation({ observedAt: AT - 60_000 }).sessionOpen).toBeNull();
  });

  it("reports no transport it does not have, and no bars it does not draw", () => {
    const obs = selectHeatmapFeedObservation({ observedAt: AT - 60_000 });
    expect(obs.connected).toBeNull();
    expect(obs.barsPresent).toBe(false);
  });

  it("does not grade its own fidelity — it publishes evidence only", () => {
    expect(Object.keys(selectHeatmapFeedObservation({ observedAt: AT })).sort()).toEqual([
      "barsPresent",
      "connected",
      "lastObservedAtMs",
      "quotePresent",
      "sessionOpen",
      "source",
    ]);
  });

  it("a 20-minute-old REST observation is graded, not slandered as a stall", () => {
    const standing = compileFeedStanding(
      selectHeatmapFeedObservation({ observedAt: AT - 20 * 60_000 }),
      AT,
    );
    expect(standing.label).not.toBe("STALE PIPELINE");
    expect(standing.established).toBe(true);
  });

  it("a provider clock ahead of ours is not rounded into a reading", () => {
    const standing = compileFeedStanding(
      selectHeatmapFeedObservation({ observedAt: AT + 60_000 }),
      AT,
    );
    expect(standing.label).toBe("FEED UNKNOWN");
    expect(standing.established).toBe(false);
  });
});
