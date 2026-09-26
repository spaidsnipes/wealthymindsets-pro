/**
 * THE FIDELITY WORD BREAKS BETWEEN PHRASES — Garden 16 §51, measured on the
 * glass 2026-09-26 (local /charts at 901px): the masthead reading was shredded
 * to one word per line ("SESSION / CLOSED — / LAST / VERIFIED") and still ran
 * past the viewport (x 892–1005 of 901). `feedLabelLines` is the one owner of
 * where a label may break; the badge renders each line nowrap.
 */
import { describe, expect, it } from "vitest";
import { feedLabelLines, LABEL_ONE_LINE_MAX_CHARS, osFeedChipParts } from "./osFeedChipParts";
import { CANONICAL_FIDELITY_LABELS } from "@/lib/marketData/canonicalFidelityLabels";
import type { FeedStanding } from "./osChrome";

describe("feedLabelLines", () => {
  it("breaks a canon em-dash label after the dash — where the canon paused", () => {
    expect(feedLabelLines("SESSION CLOSED — LAST VERIFIED")).toEqual(["SESSION CLOSED —", "LAST VERIFIED"]);
    expect(feedLabelLines("LIVE — CERTIFIED QUOTE")).toEqual(["LIVE —", "CERTIFIED QUOTE"]);
  });

  it("breaks a long plain label before its last word — subject, then verdict", () => {
    expect(feedLabelLines("HISTORICAL BARS VERIFIED")).toEqual(["HISTORICAL BARS", "VERIFIED"]);
    expect(feedLabelLines("DELAYED BY ENTITLEMENT")).toEqual(["DELAYED BY", "ENTITLEMENT"]);
  });

  it("leaves a short label whole", () => {
    expect(LABEL_ONE_LINE_MAX_CHARS).toBe(16);
    expect(feedLabelLines("FEED UNKNOWN")).toEqual(["FEED UNKNOWN"]);
    expect(feedLabelLines("STALE PIPELINE")).toEqual(["STALE PIPELINE"]);
    expect(feedLabelLines("ACTIVE DEGRADED")).toEqual(["ACTIVE DEGRADED"]);
  });

  it("never drops, abbreviates or adds a character — every canon label round-trips", () => {
    for (const label of [...Object.values(CANONICAL_FIDELITY_LABELS), "FEED UNKNOWN"]) {
      const lines = feedLabelLines(label);
      expect(lines.length, label).toBeGreaterThanOrEqual(1);
      expect(lines.length, label).toBeLessThanOrEqual(2);
      expect(lines.join(" "), label).toBe(label);
      for (const line of lines) expect(line.trim(), label).toBe(line);
    }
  });

  it("is what the chip owner hands the badge", () => {
    const parts = osFeedChipParts({
      label: "SESSION CLOSED — LAST VERIFIED",
      detail: "historical bars",
      provenance: null,
      tone: "IDLE",
      established: true,
      observedAtMs: null,
    } as FeedStanding);
    expect(parts.labelLines).toEqual(["SESSION CLOSED —", "LAST VERIFIED"]);
    // The spoken sentence is untouched — assistive tech still hears it whole.
    expect(parts.spoken).toBe("SESSION CLOSED — LAST VERIFIED · historical bars");
  });
});
