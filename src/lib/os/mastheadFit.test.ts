/**
 * THE MASTHEAD'S FEED READING AT 901 / 1024 / 1280 / 1440 — Garden 16 §51.
 *
 * Widths are MEASURED (2026-09-26), not typed from a design: WMOperatingSystem
 * rendered with the /charts props (equipment destinations, compact wordmark,
 * compact utilities, SESSION CLOSED feed) and laid out by Chromium with this
 * container's serif fallback. The same numbers the glass reported before the
 * repair: reading at x 878 in a 901 viewport, i.e. five pixels of room.
 *
 * This is the stylesheet's decision written as arithmetic. The browser, not
 * this function, places the reading — the glass script in the lane report is
 * the proof; this pins the reasoning so a wider masthead item is caught here.
 */
import { describe, expect, it } from "vitest";
import { feedReadingPlacement, feedReadingRoomPx, type FeedReadingPx, type MastheadRowPx } from "./mastheadFit";
import { OS_MASTHEAD_COMPACT_MAX_PX, OS_RAIL_BREAKPOINT_PX } from "@/components/os/WMOperatingSystem";

const IDENTITY = 217; // compact wordmark + "— A Trading Sanctuary —"
const UTILITIES = 122; // Search · Notifications · Settings · Profile, compact strip
const EMPTY_CENTRE = 0; // the instrument view publishes no mode bar in the band

/** Rooms · Community · Workspace · Tools · rule · Command Deck mark. */
const PLATES_COMPACT = 465;
const PLATES_FULL = 745;

/** "SESSION CLOSED — LAST VERIFIED · historical bars": pip 7 + gap 7 + words. */
const SESSION_CLOSED: FeedReadingPx = {
  oneLinePx: 301,
  stackedPx: 7 + 7 + 114, // widest phrase: "SESSION CLOSED —"
};

function chartsRow(viewportPx: number): MastheadRowPx {
  const compact = viewportPx > OS_RAIL_BREAKPOINT_PX && viewportPx <= OS_MASTHEAD_COMPACT_MAX_PX;
  return {
    padPx: 18,
    gapPx: compact ? 10 : 14,
    itemsPx: [IDENTITY, compact ? PLATES_COMPACT : PLATES_FULL, EMPTY_CENTRE, UTILITIES],
  };
}

describe("the /charts feed reading, desktop 901–1440", () => {
  it.each([
    [901, "second-row"],
    [1024, "stacked"],
    [1280, "one-line"],
    [1440, "stacked"],
  ] as const)("at %ipx it stands %s — inside the viewport either way", (vw, placement) => {
    expect(feedReadingPlacement(vw, chartsRow(vw), SESSION_CLOSED)).toBe(placement);
  });

  it("901 is the width that forced the second row: five pixels were never going to hold a reading", () => {
    // Before the band's gap change the room was 5px (x 878 → 883); after it,
    // still far below the narrowest honest form of the reading.
    expect(feedReadingRoomPx(901, chartsRow(901))).toBeLessThan(SESSION_CLOSED.stackedPx);
    expect(feedReadingRoomPx(901, { ...chartsRow(901), gapPx: 14 })).toBe(5);
  });

  it("the four named widths straddle the bands the way the stylesheet does", () => {
    for (const vw of [901, 1024, 1280]) {
      expect(vw > OS_RAIL_BREAKPOINT_PX && vw <= OS_MASTHEAD_COMPACT_MAX_PX, String(vw)).toBe(true);
    }
    expect(1440 > OS_MASTHEAD_COMPACT_MAX_PX).toBe(true);
  });
});
