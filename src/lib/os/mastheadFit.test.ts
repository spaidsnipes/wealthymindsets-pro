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
  bandCentreRules,
  feedReadingRoomPx,
  hypotheticalPx,
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
/** "Smart Money" at the desktop plate word (15px Georgia, 0.6px tracking), measured on serving 2026-09-27. */
const W_WORD_15PX = 96.21875;
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
  // The W plate (Garden 16 §13): mark + word on desktop, the mark alone in the band.
  const w = band
    ? 2 * p.wPadXPx + p.deckMarkPx + PLATE_BORDERS
    : 2 * p.wPadXPx + p.deckMarkPx + p.plateInnerGapPx + W_WORD_15PX + PLATE_BORDERS;
  return ROOMS.w + COMMUNITY.w + 2 * p.plateWidthPx + w + CSS.deckRulePx + deck + 6 * p.platesGapPx;
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
      : band
        ? {
            key: "modes",
            basisPx: Math.max(MODE_BAR.w, CSS.band.centreFloorPx),
            heightPx: MODE_BAR.h,
            grows: CSS.band.centreGrow > 0,
          }
        : { key: "modes", basisPx: MODE_BAR.w, heightPx: MODE_BAR.h, grows: true };
  const reading: MastheadItemPx = band
    ? {
        key: "reading",
        basisPx: 0, // flex: 1 1 0% — base size zero, floored at min-content
        minPx: JOURNAL_READING.stacked,
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
    // Re-derived 2026-09-27 with the masthead W plate (Garden 16 §13); the
    // serving glass is re-measured against these after deploy.
    expect(chartsPlatesPx(1280)).toBeCloseTo(514.53125, 1);
    expect(chartsPlatesPx(1440)).toBeCloseTo(861.859375, 1);
    expect(doorsPlatesPx(1280)).toBeCloseTo(228.53125, 1);
    expect(doorsPlatesPx(1440)).toBeCloseTo(236.53125, 1);
  });

  it("the band lets the wrap decide where the mode bar stands — never a forced row, never reordered, never grown", () => {
    expect(CSS.band.centre).toBe("wrap-decides");
    expect(CSS.band.centreReordered).toBe(false);
    expect(CSS.band.centreGrow).toBe(0);
  });

  // Verifier RED 2026-09-27 (round 3): only the FIRST ':not(:empty)' rule was
  // read, so a second band rule on the mode bar walked past the guard.
  describe("a LATER band rule on the mode bar is read too", () => {
    const ANCHOR = ".wm-os-masthead-center:empty { flex-grow: 0 !important; }";
    const withRule = (rule: string) => {
      expect(SOURCE).toContain(ANCHOR);
      return readMastheadCss(SOURCE.replace(ANCHOR, `${ANCHOR}\n          ${rule}`));
    };
    it.each([
      ".wm-os-masthead > .wm-os-masthead-center { flex-basis: 100% !important; }",
      ".wm-os-feed-standing, .wm-os-masthead-center:not(:empty) { width: 100% !important; }",
      ".wm-os-masthead-center:not(:empty) { min-width: 100% !important; }",
      ".wm-os-masthead-center:not(:empty) { flex: 0 0 100% !important; }",
      ".wm-os-masthead-center:not(:empty) { min-width: 1200px !important; }",
    ])("%s → own-row", (rule) => {
      expect(withRule(rule).band.centre).toBe("own-row");
    });
    it("a later order or grow is read as well", () => {
      expect(withRule(".wm-os-masthead-center:not(:empty) { order: 2 !important; }").band.centreReordered).toBe(true);
      expect(withRule(".wm-os-masthead .wm-os-masthead-center { flex-grow: 1 !important; }").band.centreGrow).toBe(1);
    });
    it("rules that land on the empty centre or on the item after it are not the mode bar's", () => {
      expect(withRule(".wm-os-masthead-center:empty { flex-basis: 100% !important; }").band.centre).toBe("wrap-decides");
      expect(withRule(".wm-os-masthead-center + * { width: 100% !important; }").band.centre).toBe("wrap-decides");
      expect(bandCentreRules(SOURCE).map((r) => r.selector)).toEqual([".wm-os-masthead-center:not(:empty)"]);
    });
  });
});

describe("layoutMasthead resolves flexible lengths as CSS does", () => {
  const F: MastheadFrame = { padXPx: 0, padYPx: 0, borderBottomPx: 0, columnGapPx: 0, rowGapPx: 0 };
  it("growers start from their FLEX BASE size, not their min-clamped size", () => {
    // A: base 100. B: flex 1 1 0%, min 50. Free = 300 - 100 - 0 = 200, 100 each.
    const l = layoutMasthead(300, F, [
      { key: "a", basisPx: 100, heightPx: 1, grows: true },
      { key: "b", basisPx: 0, minPx: 50, heightPx: 1, grows: true },
    ]);
    expect(l.rows[0].widthsPx).toEqual([200, 100]);
  });
  it("a max-violator freezes and the rest share what it gives back", () => {
    const l = layoutMasthead(300, F, [
      { key: "a", basisPx: 100, heightPx: 1, grows: true },
      { key: "b", basisPx: 0, minPx: 50, maxPx: 60, heightPx: 1, grows: true },
    ]);
    expect(l.rows[0].widthsPx).toEqual([240, 60]);
    expect(l.rows[0].freePx).toBe(0);
  });
  it("a min-violator freezes at its floor", () => {
    const l = layoutMasthead(160, F, [
      { key: "a", basisPx: 100, heightPx: 1, grows: true },
      { key: "b", basisPx: 0, minPx: 50, heightPx: 1, grows: true },
    ]);
    expect(l.rows[0].widthsPx).toEqual([110, 50]);
  });
  it("what no grower can take is left over for the auto margins", () => {
    const l = layoutMasthead(300, F, [
      { key: "a", basisPx: 100, heightPx: 1 },
      { key: "b", basisPx: 0, minPx: 50, maxPx: 60, heightPx: 1, grows: true },
    ]);
    expect(l.rows[0].widthsPx).toEqual([100, 60]);
    expect(l.rows[0].freePx).toBe(140);
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

  // Verifier RED 2026-09-27 (round 3): at flex-grow 1 the mode bar took the
  // row's leftover, so the reading stayed stacked at 1280–1399 beside ~130px
  // of empty mode-bar box. The leftover belongs to the reading first.
  it("the reading takes the leftover before anything else: one line, or every spare pixel of the row", () => {
    for (let vw = OS_RAIL_BREAKPOINT_PX + 1; vw <= OS_MASTHEAD_COMPACT_MAX_PX; vw++) {
      const l = journal(vw);
      for (const row of l.rows) {
        const k = row.keys.indexOf("reading");
        if (k < 0) continue;
        const oneLine = row.widthsPx[k] >= JOURNAL_READING.oneLine - 1e-9;
        expect(oneLine || row.freePx < 1e-9, `${vw}: reading ${row.widthsPx[k]} with ${row.freePx}px spare`).toBe(true);
      }
      const modes = l.rows.flatMap((r) => r.keys.map((key, k) => [key, r.widthsPx[k]] as const)).find(([key]) => key === "modes");
      expect(modes?.[1], `${vw}: the mode bar grew past its one-row width`).toBeCloseTo(MODE_BAR.w, 6);
    }
  });

  it.each([1360, 1399])("at %ipx the reading reads on ONE line and the rest is spare", (vw) => {
    const row = journal(vw).rows[0];
    expect(row.widthsPx[row.keys.indexOf("reading")]).toBeCloseTo(JOURNAL_READING.oneLine, 6);
    expect(row.freePx).toBeGreaterThan(0);
  });

  it("at 1280 the reading gets every spare pixel and the row still holds", () => {
    const l = journal(1280);
    expect(l.rows).toHaveLength(1);
    expect(l.rows[0].freePx).toBeCloseTo(0, 6);
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
      const avail = vw - 2 * f.padXPx;
      const whole = items.reduce((a, i) => a + hypotheticalPx(i, avail), 0) + f.columnGapPx * (items.length - 1);
      if (whole <= avail) expect(journal(vw).rows, String(vw)).toHaveLength(1);
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
    // 1024: the W plate (2026-09-27) takes the room the stacked reading had;
    // the band recomposes it onto the second row, whole, inside the viewport.
    [1024, "second-row"],
    [1280, "one-line"],
    [1440, "stacked"],
  ] as const)("at %ipx it stands %s — inside the viewport either way", (vw, placement) => {
    expect(feedReadingPlacement(vw, chartsRow(vw), SESSION_CLOSED)).toBe(placement);
  });

  it("901 is the width that forced the second row: five pixels were never going to hold a reading", () => {
    expect(feedReadingRoomPx(901, chartsRow(901))).toBeLessThan(SESSION_CLOSED.stackedPx);
    // With the desktop gap instead of the band's, the room was the 5px the glass showed.
    // It was 5px on the glass before the W plate; the W only takes more.
    expect(Math.round(feedReadingRoomPx(901, { ...chartsRow(901), gapPx: CSS.gapPx }))).toBeLessThanOrEqual(5);
  });

  it("the named widths straddle the bands the way the stylesheet does", () => {
    for (const vw of [901, 1024, 1280, 1360, 1399]) expect(inBand(vw), String(vw)).toBe(true);
    expect(inBand(1440)).toBe(false);
  });
});

