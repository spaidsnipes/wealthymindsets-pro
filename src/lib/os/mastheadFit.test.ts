/**
 * THE MASTHEAD AT 901 / 1024 / 1280 / 1360 / 1399 / 1440 — Garden 16 §51.
 *
 * A GUARD, NOT A SNAPSHOT. Every box width, gap and padding below is READ from
 * WMOperatingSystem.tsx's own source (readMastheadCss), so widening a plate,
 * changing a gap, or re-forcing the mode bar onto a row of its own in the
 * stylesheet moves these numbers and turns this file RED. The only typed
 * numbers are TEXT widths and heights — a word's size belongs to the font —
 * MEASURED 2026-09-27 in Chromium (container fallback fonts) on
 * renderToStaticMarkup(<WMExperienceShell>) at /journal and /charts, and the
 * /charts identity/utilities the glass reported on 2026-09-26.
 *
 * Verifier RED this repairs (2026-09-27): the band sent a room's mode bar to a
 * row of its own EVERYWHERE, so /journal's masthead went 73 → 125px at
 * 1360–1399 where the seven modes fit inline. The expected heights here are
 * computed from the layout, never typed: one row is 2·padY + border + the
 * tallest item; two rows add the band's row gap and the second row's tallest.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  feedReadingPlacement,
  feedReadingRoomPx,
  layoutMasthead,
  readMastheadCss,
  type FeedReadingPx,
  type MastheadFrame,
  type MastheadItemPx,
  type MastheadRowPx,
} from "./mastheadFit";
import { OS_MASTHEAD_COMPACT_MAX_PX, OS_RAIL_BREAKPOINT_PX } from "@/components/os/WMOperatingSystem";

const SOURCE = readFileSync(path.join(process.cwd(), "src/components/os/WMOperatingSystem.tsx"), "utf8");
const CSS = readMastheadCss(SOURCE);

const inBand = (vw: number) => vw > OS_RAIL_BREAKPOINT_PX && vw <= OS_MASTHEAD_COMPACT_MAX_PX;

// ── MEASURED text boxes (width × height, px) ────────────────────────────────
/** Doorway words: 9px eyebrow + 9px padding each side + 1px border each side. */
const MARKET = { w: 67, h: 46 };
const ROOMS = { w: 59.515625, h: 32 };
const COMMUNITY = { w: 90.015625, h: 32 };
/** "Command Deck" at the desktop plate's 15px. */
const DECK_WORD_15PX = 105.109375;
/** Plate borders: 1px each side (inline `border: 1px solid`). */
const PLATE_BORDERS = 2;
/** The seven-mode bar laid out in ONE row (max-content), 44px tap floor + 3px pad + 1px border. */
const MODE_BAR = { w: 446.921875, h: 52 };
/** /journal: wordmark + job caption; points + four utilities. */
const JOURNAL_IDENTITY = { w: 203.25, h: 37 };
const JOURNAL_UTILITIES = { w: 138, h: 30 };
/** /journal's reading, "FEED UNKNOWN · no observation yet": stacked floor and one line. */
const JOURNAL_READING = { stacked: 110.671875, stackedH: 26, oneLine: 208.484375, oneLineH: 12.5 };

// ── DERIVED from the stylesheet ─────────────────────────────────────────────
function doorsPlatesPx(vw: number): number {
  const gap = inBand(vw) ? CSS.band.platesGapPx : CSS.desktop.platesGapPx;
  return MARKET.w + ROOMS.w + COMMUNITY.w + 2 * gap;
}

/** Rooms · Community · Workspace · Tools · hairline · Command Deck. */
function chartsPlatesPx(vw: number): number {
  const band = inBand(vw);
  const p = band ? CSS.band : CSS.desktop;
  const deck = band
    ? 2 * p.deckPadXPx + p.deckMarkPx + PLATE_BORDERS // the mark alone; the word is visually hidden
    : 2 * p.deckPadXPx + p.deckMarkPx + p.plateInnerGapPx + DECK_WORD_15PX + PLATE_BORDERS;
  return ROOMS.w + COMMUNITY.w + 2 * p.plateWidthPx + CSS.deckRulePx + deck + 5 * p.platesGapPx;
}

function frame(vw: number): MastheadFrame {
  return {
    padXPx: CSS.padXPx,
    padYPx: CSS.padYPx,
    borderBottomPx: CSS.borderBottomPx,
    columnGapPx: inBand(vw) ? CSS.band.columnGapPx : CSS.gapPx,
    // Above the band the masthead does not wrap; a second row there would be a spill.
    rowGapPx: inBand(vw) ? CSS.band.rowGapPx : 0,
  };
}

/** The /journal masthead's items, in the order and with the flex the stylesheet gives them. */
function journalItems(vw: number): MastheadItemPx[] {
  const band = inBand(vw);
  const centre: MastheadItemPx =
    band && CSS.band.centre === "own-row"
      ? { key: "modes", basisPx: MODE_BAR.w, heightPx: MODE_BAR.h, fullRow: true }
      : { key: "modes", basisPx: MODE_BAR.w, heightPx: MODE_BAR.h, grows: true };
  const reading: MastheadItemPx = band
    ? {
        key: "reading",
        basisPx: JOURNAL_READING.stacked, // flex-basis 0 floored at min-content
        heightPx: JOURNAL_READING.stackedH,
        grows: true,
        maxPx: JOURNAL_READING.oneLine,
        heightAtMaxPx: JOURNAL_READING.oneLineH,
      }
    : { key: "reading", basisPx: JOURNAL_READING.oneLine, heightPx: JOURNAL_READING.oneLineH };
  const items: MastheadItemPx[] = [
    { key: "identity", basisPx: JOURNAL_IDENTITY.w, heightPx: JOURNAL_IDENTITY.h },
    { key: "doors", basisPx: doorsPlatesPx(vw), heightPx: MARKET.h },
    centre,
    { key: "utilities", basisPx: JOURNAL_UTILITIES.w, heightPx: JOURNAL_UTILITIES.h },
    reading,
  ];
  if (band && CSS.band.centreReordered) items.push(items.splice(2, 1)[0]);
  return items;
}

const journal = (vw: number) => layoutMasthead(vw, frame(vw), journalItems(vw));
const oneRowPx = (vw: number, tallest: number) => 2 * frame(vw).padYPx + frame(vw).borderBottomPx + tallest;

describe("the stylesheet, read", () => {
  it("finds the band's gaps and plates where the component declares them", () => {
    expect(CSS.band.columnGapPx).toBeGreaterThan(0);
    expect(CSS.band.rowGapPx).toBeGreaterThan(0);
    expect(CSS.band.plateWidthPx).toBeLessThan(CSS.desktop.plateWidthPx);
    // Cross-check the derivation against the whole plate groups Chromium measured.
    expect(chartsPlatesPx(1280)).toBeCloseTo(464.53125, 1);
    expect(chartsPlatesPx(1440)).toBeCloseTo(744.640625, 1);
    expect(doorsPlatesPx(1280)).toBeCloseTo(228.53125, 1);
    expect(doorsPlatesPx(1440)).toBeCloseTo(236.53125, 1);
  });

  it("the band lets the wrap decide where the mode bar stands — never a forced row, never reordered", () => {
    expect(CSS.band.centre).toBe("wrap-decides");
    expect(CSS.band.centreReordered).toBe(false);
  });
});

describe("/journal's masthead, desktop 901–1440", () => {
  it.each([1360, 1399, 1440])(
    "at %ipx the seven modes fit beside the doors, so the masthead is ONE row — no height lost",
    (vw) => {
      const l = journal(vw);
      expect(l.rows.map((r) => r.keys)).toEqual([["identity", "doors", "modes", "utilities", "reading"]]);
      expect(l.heightPx).toBe(oneRowPx(vw, MODE_BAR.h));
    },
  );

  it("1360–1399 is exactly as tall as 1440 — the band costs this room nothing where it fits", () => {
    expect(journal(1360).heightPx).toBe(journal(1440).heightPx);
    expect(journal(1399).heightPx).toBe(journal(1440).heightPx);
  });

  it("at 1280 the reading stacks its phrases and the row still holds", () => {
    const l = journal(1280);
    expect(l.rows).toHaveLength(1);
    expect(l.heightPx).toBe(oneRowPx(1280, MODE_BAR.h));
  });

  it("at 1024 the modes stay inline; only utilities and reading take a short second row", () => {
    const l = journal(1024);
    expect(l.rows.map((r) => r.keys)).toEqual([
      ["identity", "doors", "modes"],
      ["utilities", "reading"],
    ]);
    expect(l.heightPx).toBe(oneRowPx(1024, MODE_BAR.h) + CSS.band.rowGapPx + JOURNAL_UTILITIES.h);
  });

  it("at 901 the modes cannot fit beside the doors, so they wrap WHOLE — seven across, in reading order", () => {
    const l = journal(901);
    expect(l.rows.map((r) => r.keys)).toEqual([
      ["identity", "doors"],
      ["modes", "utilities", "reading"],
    ]);
    expect(l.heightPx).toBe(oneRowPx(901, MARKET.h) + CSS.band.rowGapPx + MODE_BAR.h);
  });

  it("wherever the whole row fits, the masthead is one row — the rule is the wrap, not a width", () => {
    for (let vw = OS_RAIL_BREAKPOINT_PX + 1; vw <= 1440; vw++) {
      const items = journalItems(vw);
      const f = frame(vw);
      const whole = items.reduce((a, i) => a + i.basisPx, 0) + f.columnGapPx * (items.length - 1);
      if (whole <= vw - 2 * f.padXPx) expect(journal(vw).rows, String(vw)).toHaveLength(1);
    }
  });

  it("nothing spills past the right edge at any desktop width", () => {
    for (let vw = OS_RAIL_BREAKPOINT_PX + 1; vw <= 1440; vw++) {
      for (const row of journal(vw).rows) expect(row.usedPx, String(vw)).toBeLessThanOrEqual(journal(vw).availablePx);
    }
  });
});

// ── /charts: the feed reading (first pass of §51, constants now derived) ────
/** Glass-measured 2026-09-26: compact wordmark + caption; compact utilities strip. */
const CHARTS_IDENTITY = 217;
const CHARTS_UTILITIES = 122;
const EMPTY_CENTRE = 0; // the instrument view publishes no mode bar

/** "SESSION CLOSED — LAST VERIFIED · historical bars": pip 7 + gap 7 + words (glass). */
const SESSION_CLOSED: FeedReadingPx = {
  oneLinePx: 301,
  stackedPx: 7 + 7 + 114, // widest phrase: "SESSION CLOSED —"
};

function chartsRow(vw: number): MastheadRowPx {
  return {
    padPx: CSS.padXPx,
    gapPx: inBand(vw) ? CSS.band.columnGapPx : CSS.gapPx,
    itemsPx: [CHARTS_IDENTITY, chartsPlatesPx(vw), EMPTY_CENTRE, CHARTS_UTILITIES],
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
    expect(feedReadingRoomPx(901, chartsRow(901))).toBeLessThan(SESSION_CLOSED.stackedPx);
    // With the desktop gap instead of the band's, the room was the 5px the glass showed.
    expect(Math.round(feedReadingRoomPx(901, { ...chartsRow(901), gapPx: CSS.gapPx }))).toBe(5);
  });

  it("the named widths straddle the bands the way the stylesheet does", () => {
    for (const vw of [901, 1024, 1280, 1360, 1399]) expect(inBand(vw), String(vw)).toBe(true);
    expect(inBand(1440)).toBe(false);
  });
});
