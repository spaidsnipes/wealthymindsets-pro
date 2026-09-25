/**
 * LIVING PROFILE BIOGRAPHY IN INSPECT — render proof (H-601: "Its biography /
 * session lineage belongs in Inspect"). The slice ticket reads the auction's
 * session lineage from the same owner the glass's movie draws.
 *
 * Rendered to static markup (no testing-library in this repo).
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ChartInspectTicket from "@/components/chart/ChartInspectTicket";
import { selectInspectTicket } from "@/lib/marketData/viewModels/selectInspectTicket";
import { selectLivingBiography } from "@/lib/marketData/viewModels/selectLivingBiography";
import type { ValueMigrationVM } from "@/lib/marketData/viewModels/selectValueMigration";

const T0 = Date.UTC(2026, 0, 13, 14, 30) / 1000; // 14:30 UTC
const vm = {
  version: 1, drawn: true, reason: "DRAWN", sessions: 1, quality: "candle-estimated", latestPocTravel: null,
  points: [
    { time: T0, poc: 100, vah: 102, val: 98, session: 0 },
    { time: T0 + 300, poc: 101, vah: 104, val: 98, session: 0 },
    { time: T0 + 600, poc: 103, vah: 107, val: 99, session: 0 },
  ],
} as unknown as ValueMigrationVM;

const slice = {
  found: true as const, price: 100, priceHigh: 100.5, shareOfPoc: 0.8, isPoc: false, insideValueArea: true,
  location: "IN_VALUE" as const, distanceFromPoc: -3, estimated: true, nodesWithheld: null, node: null,
};

const html = (bio: ReturnType<typeof selectLivingBiography>) => renderToStaticMarkup(
  <ChartInspectTicket
    vm={selectInspectTicket({ barOpenMs: null, barSpanMs: null, price: null, barVolume: null, prints: [] })}
    followingLiveBar={false}
    open
    onOpenChange={() => {}}
    onOpenFootprint={() => {}}
    selectedProfileSlice={slice}
    profileSliceSymbol="NQ1!"
    livingBiography={bio}
  />,
);

describe("the Living slice ticket carries the auction's biography", () => {
  it("session start, every POC move, and what value did — on the axis clock", () => {
    const out = html(selectLivingBiography(vm));
    expect(out).toContain('data-testid="living-biography"');
    expect(out).toContain("BIOGRAPHY · THIS SESSION");
    expect(out).toContain("from 2026-01-13 14:30 UTC · 3 bars");
    expect(out).toContain("100.00 → 103.00 · migrated 2×");
    expect(out).toContain("14:30 100.00 → 14:35 101.00 → 14:40 103.00");
    expect(out).toContain("EXPANDED · width 4.00 → 8.00 · TRANSLATED UP 3.00");
  });

  it("no measured movie → no biography section (never an invented one)", () => {
    expect(html(null)).not.toContain('data-testid="living-biography"');
  });
});
