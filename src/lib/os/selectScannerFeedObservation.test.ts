import { describe, expect, it } from "vitest";

import { compileFeedStanding } from "@/lib/os/osChrome";
import { selectScannerFeedObservation } from "./selectScannerFeedObservation";

const AT = 1_758_000_000_000;

describe("selectScannerFeedObservation — the evidence /scanner actually holds", () => {
  it("THE DEFECT ITSELF — thirty counted signals stop compiling to FEED UNKNOWN", () => {
    // Measured live 2026-09-17 on production: the room's own headline read
    // "30 delayed-quote signals" while the masthead above it read FEED UNKNOWN.
    const standing = compileFeedStanding(
      selectScannerFeedObservation({
        results: Array.from({ length: 30 }, (_, i) => ({
          quoteObservedAt: AT - 60_000 - i * 1_000,
        })),
      }),
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

  it("names no provider before a round has resolved — FEED UNKNOWN is then TRUE", () => {
    for (const results of [[], null, undefined]) {
      const obs = selectScannerFeedObservation({ results });
      expect(obs.source).toBeNull();
      expect(obs.quotePresent).toBe(false);
      expect(obs.lastObservedAtMs).toBeNull();
      expect(compileFeedStanding(obs, AT).label).toBe("FEED UNKNOWN");
    }
  });

  it("a table of rows that resolved nothing is silence, not an observation", () => {
    const obs = selectScannerFeedObservation({
      results: [{ quoteObservedAt: null }, { quoteObservedAt: null }],
    });
    expect(obs.source).toBeNull();
    expect(obs.quotePresent).toBe(false);
  });

  it("refuses zero and non-finite epochs — the never-received sentinel is not 1970", () => {
    for (const at of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        selectScannerFeedObservation({ results: [{ quoteObservedAt: at }] }).quotePresent,
        `observedAt ${String(at)}`,
      ).toBe(false);
    }
  });

  it("publishes the NEWEST observation, not the first or the last row", () => {
    const obs = selectScannerFeedObservation({
      results: [
        { quoteObservedAt: AT - 300_000 },
        { quoteObservedAt: AT - 60_000 },
        { quoteObservedAt: AT - 900_000 },
      ],
    });
    expect(obs.lastObservedAtMs).toBe(AT - 60_000);
  });

  it("one resolved row among many unresolved still counts as an observation", () => {
    const obs = selectScannerFeedObservation({
      results: [
        { quoteObservedAt: null },
        { quoteObservedAt: AT - 60_000 },
        { quoteObservedAt: null },
      ],
    });
    expect(obs.source).toBe("yahoo");
    expect(obs.lastObservedAtMs).toBe(AT - 60_000);
  });

  it("asserts no session for a thirty-symbol multi-market scan", () => {
    // The masthead names no symbol. Reporting open or closed would be a claim
    // about an instrument the reader cannot see.
    expect(
      selectScannerFeedObservation({ results: [{ quoteObservedAt: AT - 60_000 }] }).sessionOpen,
    ).toBeNull();
  });

  it("reports no transport it does not have, and no bars it does not draw", () => {
    const obs = selectScannerFeedObservation({ results: [{ quoteObservedAt: AT - 60_000 }] });
    expect(obs.connected).toBeNull();
    expect(obs.barsPresent).toBe(false);
  });

  it("does not grade its own fidelity — it publishes evidence only", () => {
    const obs = selectScannerFeedObservation({ results: [{ quoteObservedAt: AT - 60_000 }] });
    expect(Object.keys(obs).sort()).toEqual([
      "barsPresent",
      "connected",
      "lastObservedAtMs",
      "quotePresent",
      // EVIDENCE, not a verdict, for the same reason every key beside it is:
      // "is a companion camera driving this room". The scanner ranks a live
      // list and answers `false` — an answer, not a silence.
      "replayEngaged",
      "sessionOpen",
      "source",
    ]);
  });

  it("a 20-minute-old REST quote is still graded, not slandered as a stall", () => {
    const standing = compileFeedStanding(
      selectScannerFeedObservation({ results: [{ quoteObservedAt: AT - 20 * 60_000 }] }),
      AT,
    );
    expect(standing.label).not.toBe("STALE PIPELINE");
    expect(standing.established).toBe(true);
  });

  it("a provider clock ahead of ours is not rounded into a reading", () => {
    const standing = compileFeedStanding(
      selectScannerFeedObservation({ results: [{ quoteObservedAt: AT + 60_000 }] }),
      AT,
    );
    expect(standing.label).toBe("FEED UNKNOWN");
    expect(standing.established).toBe(false);
  });
});
