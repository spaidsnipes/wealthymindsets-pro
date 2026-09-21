import { describe, expect, it } from "vitest";
import {
  chartVolumeFooterFact,
  formatBarVolume,
} from "@/lib/chart/chartVolumeFooterFact";
import { formatVolumeMagnitude } from "@/lib/chart/stockInfoSessionFacts";

/** Stand-in for the real `dataWindowBarScope(...).volume.title`. */
const SCOPE =
  "Volume — the quantity traded of the 5m bar beginning Sep 21, 18:00. " +
  "These are the values of the latest bar and it has not closed yet.";

describe("formatBarVolume", () => {
  // ── THE REASON THIS FUNCTION EXISTS ──────────────────────────────────────
  // `formatVolumeMagnitude` was written for daily equity turnover, where a
  // sub-1000 figure never occurs. Its final branch is `(n/1e3).toFixed(0)+"K"`,
  // which turns a real 57-contract 5m futures bar into "0K" — a manufactured
  // zero on the primary trading surface, indistinguishable from "nothing
  // traded". This case is the lock on that.
  it("prints small bar counts exactly, never as a rounded-to-zero magnitude", () => {
    // First, PROVE the hazard is real rather than asserting it in a comment.
    // If someone ever fixes formatVolumeMagnitude itself, this line goes red
    // and tells them this wrapper may now be redundant — which is the correct
    // thing for it to do.
    expect(formatVolumeMagnitude(57)).toBe("0K");

    expect(formatBarVolume(57)).toBe("57");
    expect(formatBarVolume(1)).toBe("1");
    expect(formatBarVolume(0)).toBe("0");
    expect(formatBarVolume(999)).toBe("999");
  });

  it("hands over to the magnitude rule exactly at its valid domain", () => {
    // 1000 is the seam: the first value for which the "K" branch is honest.
    expect(formatBarVolume(1000)).toBe(formatVolumeMagnitude(1000));
    expect(formatBarVolume(1000)).toBe("1K");
    expect(formatBarVolume(68_920_000)).toBe("68.92M");
    expect(formatBarVolume(2_500_000_000)).toBe("2.50B");
  });
});

describe("chartVolumeFooterFact", () => {
  it("reads an observed quantity and carries the bar's provenance unchanged", () => {
    const f = chartVolumeFooterFact(68_920_000, SCOPE);
    expect(f.state).toBe("OBSERVED");
    expect(f.text).toBe("Vol 68.92M");
    // The scope sentence is PASSED THROUGH, not paraphrased. A second phrasing
    // of "which bar is this" is a second owner of that claim.
    expect(f.title).toBe(SCOPE);
  });

  it("treats a genuine zero as observed, not as missing", () => {
    // A bar that traded nothing is a measurement. Collapsing it into the
    // missing-data state would delete a real and tradeable observation.
    const f = chartVolumeFooterFact(0, SCOPE);
    expect(f.state).toBe("OBSERVED");
    expect(f.text).toBe("Vol 0");
  });

  it("says what happened when the bar carried no usable quantity", () => {
    for (const bad of [undefined, null, NaN, Infinity, -Infinity, -1, "57", {}]) {
      const f = chartVolumeFooterFact(bad, SCOPE);
      expect(f.state, `input ${String(bad)}`).toBe("NOT_REPORTED");
      // Never a bare glyph: "—" leaves the trader guessing between "no trades"
      // and "no data", which are opposite readings of the same market.
      expect(f.text).toBe("Vol not reported");
      expect(f.text).not.toContain("—");
      expect(f.text).not.toContain("NaN");
      expect(f.text).not.toContain("undefined");
      // Still says WHICH bar it is refusing to report for.
      expect(f.title).toContain(SCOPE);
    }
  });

  it("never emits an empty or glyph-only string in any state", () => {
    for (const v of [undefined, NaN, -1, 0, 1, 57, 999, 1000, 1e9]) {
      const f = chartVolumeFooterFact(v, SCOPE);
      expect(f.text.trim().length, `input ${String(v)}`).toBeGreaterThan(2);
      expect(f.text.startsWith("Vol")).toBe(true);
      expect(f.title.trim().length).toBeGreaterThan(10);
    }
  });
});
