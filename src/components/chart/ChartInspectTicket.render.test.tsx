/**
 * FL-06 Inspect Ticket — render proof, and the adoption proof beside it.
 *
 * TWO DIFFERENT FAILURES ARE GUARDED HERE, and they fail in different files.
 *
 *   1. THE GLASS DROPS THE REFUSAL. `selectInspectTicket` can decide that a
 *      bar's delta is UNREAD and say exactly why, and a component that renders
 *      only `row.value` would print a blank where the reason belongs. The
 *      compiler's own suite cannot catch that — it never renders anything.
 *
 *   2. THE GLASS IS NEVER MOUNTED. A correct compiler feeding an orphaned
 *      component is the hardest version of this defect to notice, because
 *      every unit test is green and the trader sees nothing. An import
 *      satisfies a grep; only a JSX tag puts the panel on the candles.
 *
 * NOT A SCANNER. This file reads TWO named files and asserts about their
 * contents. It does not walk a directory, and it does not assert that some
 * collected list is empty — a check that passes when it collected nothing.
 *
 * There is no `@testing-library/react` in this repo, so the rendering tests
 * render to static markup and assert against the HTML.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ChartInspectTicket from "@/components/chart/ChartInspectTicket";
import {
  selectInspectTicket,
  type InspectPrint,
} from "@/lib/marketData/viewModels/selectInspectTicket";

const BAR_OPEN_MS = 1_750_000_000_000;
const SPAN_15M = 900_000;

const coveringTape = (): InspectPrint[] => [
  { price: 100, size: 30, side: "buy",  timeMs: BAR_OPEN_MS + 1, trade: true },
  { price: 100, size: 20, side: "buy",  timeMs: BAR_OPEN_MS + 2, trade: true },
  { price: 100, size: 10, side: "sell", timeMs: BAR_OPEN_MS + 3, trade: true },
  { price: 100, size: 15, side: "sell", timeMs: BAR_OPEN_MS + 4, trade: true },
];

const vmFor = (prints: InspectPrint[]) =>
  selectInspectTicket({
    barOpenMs: BAR_OPEN_MS,
    barSpanMs: SPAN_15M,
    price: 5297.75,
    barVolume: 623,
    prints,
  });

const markup = (
  prints: InspectPrint[],
  over: Partial<React.ComponentProps<typeof ChartInspectTicket>> = {},
) =>
  renderToStaticMarkup(
    <ChartInspectTicket
      vm={vmFor(prints)}
      followingLiveBar={false}
      open
      onOpenChange={() => {}}
      onOpenFootprint={() => {}}
      {...over}
    />,
  );

describe("the ticket puts its verdict on the glass", () => {
  it("inspects the selected individual print instead of unrelated live-bar totals", () => {
    const html = markup(coveringTape(), {
      selectedPrint: {
        symbol: "BTCUSD", timeframe: "1m", barTime: BAR_OPEN_MS / 1000,
        printKey: "event:coinbase:print-42", timeMs: BAR_OPEN_MS + 125,
        priceLevel: 86250.125, bid: 0, ask: 1.17161234, total: 1.17161234,
        aggressorMethod: "MAKER_SIDE_INVERTED",
      },
    });
    expect(html).toContain("SELECTED PRINT");
    expect(html).toContain("86250.125");
    expect(html).toContain("1.17161234");
    expect(html).toContain("event:coinbase:print-42");
    expect(html).toContain(new Date(BAR_OPEN_MS + 125).toISOString());
    expect(html).toContain("provider maker-side inversion");
    expect(html).toContain("UNKNOWN");
    expect(html).not.toContain("+25");
    expect(html).not.toContain("chart-inspect-footprint-door");
  });

  it("prints a read delta as a signed number", () => {
    const html = markup(coveringTape());
    expect(html).toContain("+25");
    expect(html).toContain("data-inspect-reach=\"COVERS_BAR\"");
  });

  it("prints the REASON for a refusal, not merely the word UNREAD", () => {
    /*
      THE LOAD-BEARING ASSERTION OF THIS FILE. A row that renders "UNREAD" and
      swallows `row.absence` tells the trader a number is missing and never
      which fact was missing — and which fact was missing is the entire content
      of the reading. The compiler already decided the sentence; the failure
      mode is a component that never renders it.
    */
    const stale = coveringTape().map(p => ({ ...p, timeMs: BAR_OPEN_MS + SPAN_15M + 60_000 }));
    const html = markup(stale);
    const absence = vmFor(stale).rows.find(r => r.id === "DELTA")!.absence!;
    expect(absence.length, "the compiler emitted no reason to render").toBeGreaterThan(0);
    expect(html, "the refusal's REASON never reached the glass").toContain(absence);
  });

  it("states the live-bar fallback instead of silently changing subject", () => {
    // A trader who moves the cursor off the chart gets a different set of
    // numbers. Unstated, that is the panel lying about which bar it describes.
    expect(markup(coveringTape(), { followingLiveBar: true })).toMatch(/still forming/i);
    expect(markup(coveringTape(), { followingLiveBar: true })).toContain("LIVE BAR");
    expect(markup(coveringTape(), { followingLiveBar: false })).toContain("SELECTED BAR");
  });

  it("offers no door when the footprint could not divide this bar, and says why", () => {
    const html = markup([]);
    expect(html).not.toContain("chart-inspect-footprint-door");
    expect(html).toContain(vmFor([]).footprintDoorNote);
  });

  it("leaves a findable chip when closed rather than vanishing", () => {
    const html = markup(coveringTape(), { open: false });
    expect(html).toContain("chart-inspect-reopen");
    expect(html).toContain("wm-chart-reading-anchor");
    expect(html).not.toContain("chart-inspect-ticket");
  });

  it("caps its own height so a long refusal cannot be clipped off the pane", () => {
    /*
      FOUND BY LOOKING AT IT, not by reasoning about it. The first screenshot
      of this panel on real candles had its last two sentences cut off by the
      bottom of the chart pane, because a fully-REFUSED ticket is taller than a
      read one — four reasons are longer than four numbers. A refusal truncated
      mid-sentence is worse than no refusal: the trader cannot tell whether the
      product ran out of room or ran out of honesty.
    */
    const html = markup([]);
    expect(html).toMatch(/max-h-\[calc\(100%-6rem\)\]/);
    expect(html).toMatch(/overflow-y-auto/);
  });

  it("always carries the tape's reach on the glass", () => {
    expect(markup(coveringTape())).toContain(vmFor(coveringTape()).reachNote);
  });
});

describe("the ticket is rendered by the charts room, not merely imported", () => {
  const DASHBOARD = readFileSync(
    join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"),
    "utf8",
  );

  it("appears as a JSX tag", () => {
    expect(
      DASHBOARD,
      "ChartsDashboard imports the Inspect Ticket but never renders it. An " +
        "import satisfies a grep; only a tag puts the panel on the candles.",
    ).toMatch(/<ChartInspectTicket[\s>]/);
  });

  it("adopts MainChart's crosshair callback rather than opening a second selection path", () => {
    expect(DASHBOARD).toMatch(/onOHLCAtCursor=\{/);
  });

  it("converts the bar's SECONDS clock into the compiler's MILLISECONDS input", () => {
    /*
      `LegacyOhlcvTuple.time` and the crosshair's `time` are epoch SECONDS;
      `selectInspectTicket` takes `barOpenMs`. Both are bare `number`, so the
      compiler cannot reject the mistake at the type level — it would simply
      refuse every bar forever while looking perfectly well-behaved.
    */
    expect(DASHBOARD).toMatch(/barOpenMs:\s*inspectBar\s*\?\s*inspectBar\.time\s*\*\s*1000/);
  });

  it("feeds the compiler from the room's own tape", () => {
    expect(DASHBOARD).toMatch(/selectInspectTicket\(/);
    expect(DASHBOARD).toMatch(/timeMs:\s*t\.time/);
  });
});
