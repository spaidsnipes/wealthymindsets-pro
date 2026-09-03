/**
 * selectChannelCoverageHealth — LIVING-PIXEL LAW compliance.
 *
 * Locks the /nectar two-writer defect shut: the ribbon and the strip must
 * never again disagree about channel health, and a stale channel set must
 * never render in a verified tone.
 */

import { describe, it, expect } from "vitest";
import {
  selectChannelCoverageHealth,
  type CoverageHealthInputChannel,
} from "./selectChannelCoverageHealth";

const ch = (coverageState: string, gapCount = 0): CoverageHealthInputChannel => ({
  coverageState,
  gapCount,
});

describe("selectChannelCoverageHealth", () => {
  it("degrades to NONE/unknown with no channels — never an implied all-clear", () => {
    const h = selectChannelCoverageHealth([]);
    expect(h.verdict).toBe("NONE");
    expect(h.tone).toBe("unknown");
    expect(h.total).toBe(0);
    expect(h.detail).toBe("no channel coverage yet");
  });

  it("treats null/undefined input as no coverage", () => {
    expect(selectChannelCoverageHealth(null).verdict).toBe("NONE");
    expect(selectChannelCoverageHealth(undefined).tone).toBe("unknown");
  });

  /* The exact prod case: Vault Ribbon rendered "6 · no gaps recorded" in the
   * resolved/gold tone while the sibling strip proved STALE 6 / OBSERVING 0. */
  it("never reports resolved when every channel is STALE with zero gaps", () => {
    const channels = Array.from({ length: 6 }, () => ch("STALE", 0));
    const h = selectChannelCoverageHealth(channels);

    expect(h.total).toBe(6);
    expect(h.stale).toBe(6);
    expect(h.observing).toBe(0);
    expect(h.gaps).toBe(0);

    expect(h.verdict).toBe("STALE");
    expect(h.tone).not.toBe("resolved");
    expect(h.tone).toBe("warn");
    // Must not claim the misleading all-clear phrase.
    expect(h.detail).not.toContain("no gaps recorded");
    expect(h.detail).toContain("stale");
    expect(h.detail).toContain("none observing");
  });

  it("reports OBSERVING/resolved only when collecting with nothing degraded", () => {
    const h = selectChannelCoverageHealth([ch("COLLECTING"), ch("COLLECTING")]);
    expect(h.verdict).toBe("OBSERVING");
    expect(h.tone).toBe("resolved");
    expect(h.observing).toBe(2);
    expect(h.detail).toBe("2 observing · no gaps recorded");
  });

  it("reports GAPPED when gaps are recorded even while collecting", () => {
    const h = selectChannelCoverageHealth([ch("COLLECTING", 3), ch("COLLECTING")]);
    expect(h.verdict).toBe("GAPPED");
    expect(h.tone).toBe("warn");
    expect(h.gaps).toBe(3);
    expect(h.detail).toBe("3 coverage gaps");
  });

  it("reports PARTIAL when some observe and some are degraded", () => {
    const h = selectChannelCoverageHealth([ch("COLLECTING"), ch("STALE"), ch("UNAVAILABLE")]);
    expect(h.verdict).toBe("PARTIAL");
    expect(h.tone).toBe("warn");
    expect(h.detail).toBe("1 observing · 2 degraded");
  });

  it("reports UNAVAILABLE when every channel is unavailable", () => {
    const h = selectChannelCoverageHealth([ch("UNAVAILABLE"), ch("UNAVAILABLE")]);
    expect(h.verdict).toBe("UNAVAILABLE");
    expect(h.tone).toBe("unknown");
    expect(h.detail).toBe("all 2 channels unavailable");
  });

  it("reports CONNECTING as pending, never resolved", () => {
    const h = selectChannelCoverageHealth([ch("CONNECTING"), ch("CONNECTING")]);
    expect(h.verdict).toBe("CONNECTING");
    expect(h.tone).toBe("pending");
    expect(h.detail).toBe("2 connecting");
  });

  it("never claims health for an unrecognised coverage state", () => {
    const h = selectChannelCoverageHealth([ch("WAT"), ch("???")]);
    expect(h.tone).toBe("unknown");
    expect(h.verdict).toBe("NONE");
  });

  it("singularises gap and channel wording", () => {
    expect(selectChannelCoverageHealth([ch("COLLECTING", 1)]).detail).toBe("1 coverage gap");
    expect(selectChannelCoverageHealth([ch("UNAVAILABLE")]).detail).toBe("all 1 channel unavailable");
  });

  it("ignores negative or non-finite gap counts rather than trusting them", () => {
    const h = selectChannelCoverageHealth([
      ch("COLLECTING", -5),
      { coverageState: "COLLECTING", gapCount: Number.NaN },
    ]);
    expect(h.gaps).toBe(0);
    expect(h.verdict).toBe("OBSERVING");
  });

  /* Structural guarantee: the tone the ribbon paints and the counts the strip
   * prints come from ONE reduction, so they cannot contradict each other. */
  it("resolved tone implies zero stale, zero unavailable and zero gaps", () => {
    const cases: CoverageHealthInputChannel[][] = [
      [ch("COLLECTING")],
      [ch("COLLECTING"), ch("STALE")],
      [ch("STALE"), ch("STALE")],
      [ch("COLLECTING", 2)],
      [ch("UNAVAILABLE")],
      [ch("CONNECTING"), ch("COLLECTING")],
      [],
    ];
    for (const c of cases) {
      const h = selectChannelCoverageHealth(c);
      if (h.tone === "resolved") {
        expect(h.stale).toBe(0);
        expect(h.unavailable).toBe(0);
        expect(h.gaps).toBe(0);
        expect(h.observing).toBeGreaterThan(0);
      }
    }
  });
});
