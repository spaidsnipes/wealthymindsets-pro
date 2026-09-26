/**
 * PROFILE FUSION IN INSPECT — render proof (G16 §23: "Preserve provenance …
 * Inspect"). The fused object's ticket says it is DERIVED, how its volume was
 * known, its overlap policy, and names both parents with their own POCs.
 *
 * Rendered to static markup (no testing-library in this repo).
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ChartInspectTicket from "@/components/chart/ChartInspectTicket";
import { selectInspectTicket } from "@/lib/marketData/viewModels/selectInspectTicket";
import fuseProfiles, { type FusionSourceProfile } from "@/lib/marketData/viewModels/fuseProfiles";

const src = (id: string, species: string, rows: [number, number][], poc: number, window: { from: number; to: number }): FusionSourceProfile => ({
  id, species, rows: rows.map(([price, volume]) => ({ price, volume })), poc, asOf: window.to, fidelity: null,
  instrument: "TSLA", volumeUnit: "BAR_VOLUME", evidence: "CANDLE_ESTIMATED", window,
});

describe("the fused object's Inspect ticket", () => {
  it("says DERIVED, CANDLE-ESTIMATED, the unit, the overlap policy and both parents", () => {
    const r = fuseProfiles(
      src("composite", "COMPOSITE", [[100, 500], [101, 20], [104, 300]], 100, { from: 0, to: 99 }),
      src("visible-range", "VISIBLE_RANGE", [[103, 50], [104, 400], [105, 50]], 104, { from: 100, to: 200 }),
    );
    if (!r.ok) throw new Error(r.reason);
    const out = renderToStaticMarkup(
      <ChartInspectTicket
        vm={selectInspectTicket({ barOpenMs: null, barSpanMs: null, price: null, barVolume: null, prints: [] })}
        followingLiveBar={false}
        open
        onOpenChange={() => {}}
        onOpenFootprint={() => {}}
        fusion={r.fused}
      />,
    );
    expect(out).toContain('data-inspect-fusion="fusion:composite+visible-range"');
    expect(out).toContain("Fused POC 104.00");
    expect(out).toContain("DERIVED · CANDLE-ESTIMATED");
    expect(out).toContain("BAR_VOLUME · 1 shared rows · policy DISJOINT_WINDOWS_ONLY");
    expect(out).toContain("Source COMPOSITE · own POC 100.00");
    expect(out).toContain("Source VISIBLE_RANGE · own POC 104.00");
  });
});
