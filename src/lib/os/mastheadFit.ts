/**
 * WHERE THE MASTHEAD'S ITEMS CAN STAND — the arithmetic behind the compact
 * band's wrap rule (Garden 16 §51, 2026-09-26; repaired 2026-09-27).
 *
 * The stylesheet in WMOperatingSystem.tsx is what actually places the items; a
 * browser decides, not this module. This is the same decision written as
 * arithmetic so the masthead's shape can be pinned at the widths §51 names, and
 * so a change to the STYLESHEET is caught here before it is caught on the
 * glass. Two halves, kept apart on purpose:
 *
 *   readMastheadCss(source)   the box geometry, READ from the component's own
 *                             source text — gaps, paddings, plate widths, and
 *                             what the band does with the mode bar. Widen a
 *                             plate or re-force the mode bar onto its own row
 *                             in the stylesheet and the numbers here move.
 *   layoutMasthead(...)       flex-wrap line breaking and growth over those
 *                             boxes, returning rows and the masthead height.
 *
 * The only numbers this module does not own are TEXT widths (a word's width is
 * the font's business); callers pass those as measured in Chromium, labelled.
 */

// ── The stylesheet, read ─────────────────────────────────────────────────────

/** What the band does with a room's mode bar (the non-empty masthead centre). */
export type CentreRule =
  /** Basis = its own one-row width, never shrinks: the wrap decides. */
  | "wrap-decides"
  /** Basis 100%: always a row of its own, whether or not it would fit inline. */
  | "own-row";

export interface MastheadCss {
  /** Inline masthead style — every desktop width. */
  readonly padXPx: number;
  readonly padYPx: number;
  readonly borderBottomPx: number;
  readonly gapPx: number;
  /** The Command Deck hairline: width + both side margins. */
  readonly deckRulePx: number;
  /** DESKTOP block (901 and up; the band overrides below 1400). */
  readonly desktop: PlateCss;
  /** COMPACT band (901–1399). */
  readonly band: PlateCss & {
    readonly columnGapPx: number;
    readonly rowGapPx: number;
    readonly centre: CentreRule;
    /** True when the band moves the centre after everything else (`order`). */
    readonly centreReordered: boolean;
  };
}

export interface PlateCss {
  readonly platesGapPx: number;
  readonly plateWidthPx: number;
  /** Gap between a plate's mark and its word. */
  readonly plateInnerGapPx: number;
  readonly deckPadXPx: number;
  readonly deckMarkPx: number;
}

function num(re: RegExp, text: string, what: string): number {
  const m = re.exec(text);
  if (m === null) throw new Error(`mastheadFit: cannot read ${what} from the stylesheet`);
  return Number(m[1]);
}

function block(source: string, head: string): string {
  const a = source.indexOf(head);
  if (a < 0) throw new Error(`mastheadFit: stylesheet block missing: ${head}`);
  const b = source.indexOf("\n        }\n", a);
  return source.slice(a, b < 0 ? undefined : b);
}

export const DESKTOP_BLOCK_HEAD = "@media (min-width: ${OS_RAIL_BREAKPOINT_PX + 1}px) {";
export const BAND_BLOCK_HEAD =
  "@media (min-width: ${OS_RAIL_BREAKPOINT_PX + 1}px) and (max-width: ${OS_MASTHEAD_COMPACT_MAX_PX}px) {";

/** Rules only — comments carry prose that names the very selectors read here. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function plateCss(css: string, deckMarkFallback: number): PlateCss {
  return {
    platesGapPx: num(/\.wm-os-equipment-plates \{[^}]*?gap: (\d+)px/, css, "plates gap"),
    plateWidthPx: num(/\.wm-os-equipment-plate \{[^}]*?width: (\d+)px/, css, "plate width"),
    plateInnerGapPx: num(/\.wm-os-equipment-plate \{[^}]*?gap: (\d+)px/, css, "plate inner gap"),
    deckPadXPx: (() => {
      const own = /\.wm-os-command-deck \{[^}]*?padding: 0 (\d+)px/.exec(css);
      return own ? Number(own[1]) : num(/\.wm-os-equipment-plate \{[^}]*?padding: 0 (\d+)px/, css, "plate padding");
    })(),
    deckMarkPx: (() => {
      const m = /\.wm-os-equipment-plate-mark \{[^}]*?width: (\d+)px/.exec(css);
      return m ? Number(m[1]) : deckMarkFallback;
    })(),
  };
}

/** Read the masthead's box geometry out of WMOperatingSystem.tsx's source. */
export function readMastheadCss(source: string): MastheadCss {
  const header = /className="wm-os-masthead"[\s\S]*?gap: (\d+),\s*padding: "(\d+)px (\d+)px",\s*borderBottom: `(\d+)px/.exec(source);
  if (header === null) throw new Error("mastheadFit: cannot read the masthead's inline box");
  const rule = /className="wm-os-command-deck-rule"\s*style=\{\{ width: (\d+),[^}]*margin: "0 (\d+)px"/.exec(source);
  if (rule === null) throw new Error("mastheadFit: cannot read the Command Deck hairline");
  const desktopCss = stripComments(block(source, DESKTOP_BLOCK_HEAD));
  const bandCss = stripComments(block(source, BAND_BLOCK_HEAD));
  const desktop = plateCss(desktopCss, 12);
  const centre = /\.wm-os-masthead-center:not\(:empty\) \{([^}]*)\}/.exec(bandCss)?.[1] ?? "";
  const ownRow = /flex-basis: 100%|flex: [\d.]+ [\d.]+ 100%/.test(centre);
  return {
    padYPx: Number(header[2]),
    padXPx: Number(header[3]),
    gapPx: Number(header[1]),
    borderBottomPx: Number(header[4]),
    deckRulePx: Number(rule[1]) + 2 * Number(rule[2]),
    desktop,
    band: {
      ...plateCss(bandCss, desktop.deckMarkPx),
      columnGapPx: num(/\.wm-os-masthead \{[^}]*?column-gap: (\d+)px/, bandCss, "band column gap"),
      rowGapPx: num(/\.wm-os-masthead \{[^}]*?row-gap: (\d+)px/, bandCss, "band row gap"),
      centre: ownRow ? "own-row" : "wrap-decides",
      centreReordered: /order: [1-9]/.test(centre),
    },
  };
}

// ── The layout ───────────────────────────────────────────────────────────────

export interface MastheadItemPx {
  readonly key: string;
  /** The size the wrap sees (flex basis after its min clamp). */
  readonly basisPx: number;
  readonly heightPx: number;
  /** flex-grow 1. */
  readonly grows?: boolean;
  /** max-width while growing; undefined = unbounded. */
  readonly maxPx?: number;
  /** Height once grown to maxPx (a reading that reached one line). */
  readonly heightAtMaxPx?: number;
  /** Basis 100% — always a line of its own. */
  readonly fullRow?: boolean;
}

export interface MastheadFrame {
  readonly padXPx: number;
  readonly padYPx: number;
  readonly borderBottomPx: number;
  readonly columnGapPx: number;
  readonly rowGapPx: number;
}

export interface MastheadRowLayout {
  readonly keys: readonly string[];
  /** Final widths after growth, in `keys` order. */
  readonly widthsPx: readonly number[];
  readonly heightPx: number;
  /** Items + gaps; > available means the row spills. */
  readonly usedPx: number;
}

export interface MastheadLayout {
  readonly availablePx: number;
  readonly rows: readonly MastheadRowLayout[];
  readonly heightPx: number;
}

/**
 * CSS flex-wrap line breaking (items in order; a new line when the next item's
 * basis plus one gap would pass the edge), then flex-grow 1 shared equally
 * among growers, each clamped at its max, and the masthead's height.
 */
export function layoutMasthead(
  viewportPx: number,
  frame: MastheadFrame,
  items: readonly MastheadItemPx[],
): MastheadLayout {
  const available = viewportPx - 2 * frame.padXPx;
  const lines: MastheadItemPx[][] = [];
  let line: MastheadItemPx[] = [];
  let used = 0;
  for (const item of items) {
    const basis = item.fullRow ? available : item.basisPx;
    const next = line.length === 0 ? basis : used + frame.columnGapPx + basis;
    if (line.length > 0 && next > available) {
      lines.push(line);
      line = [item];
      used = basis;
    } else {
      line.push(item);
      used = next;
    }
  }
  if (line.length > 0) lines.push(line);

  const rows = lines.map((l): MastheadRowLayout => {
    const widths = l.map((i) => (i.fullRow ? available : i.basisPx));
    const gaps = frame.columnGapPx * (l.length - 1);
    let free = available - gaps - widths.reduce((a, b) => a + b, 0);
    // Equal shares to every grower still under its max, until none is left.
    for (let guard = 0; free > 0.01 && guard < 16; guard++) {
      const open = l.map((i, k) => k).filter((k) => l[k].grows && (l[k].maxPx === undefined || widths[k] < l[k].maxPx!));
      if (open.length === 0) break;
      const share = free / open.length;
      for (const k of open) {
        const cap = l[k].maxPx === undefined ? Infinity : l[k].maxPx! - widths[k];
        const take = Math.min(share, cap);
        widths[k] += take;
        free -= take;
      }
    }
    const heights = l.map((i, k) =>
      i.maxPx !== undefined && i.heightAtMaxPx !== undefined && widths[k] >= i.maxPx ? i.heightAtMaxPx : i.heightPx,
    );
    return {
      keys: l.map((i) => i.key),
      widthsPx: widths,
      heightPx: Math.max(...heights),
      usedPx: widths.reduce((a, b) => a + b, 0) + gaps,
    };
  });

  const heightPx =
    2 * frame.padYPx +
    frame.borderBottomPx +
    rows.reduce((a, r) => a + r.heightPx, 0) +
    frame.rowGapPx * Math.max(0, rows.length - 1);
  return { availablePx: available, rows, heightPx };
}

// ── The /charts feed reading (Garden 16 §51, first pass) ─────────────────────

export interface MastheadRowPx {
  /** Masthead horizontal padding, each side. */
  readonly padPx: number;
  /** Gap between masthead items in this band. */
  readonly gapPx: number;
  /** Widths of the row-one items that precede the reading (identity, plates or doors, utilities). */
  readonly itemsPx: readonly number[];
}

export interface FeedReadingPx {
  /** pip + the whole reading on one line */
  readonly oneLinePx: number;
  /** pip + the widest single phrase (feedLabelLines) */
  readonly stackedPx: number;
}

export type FeedReadingPlacement = "one-line" | "stacked" | "second-row";

/** Room left for the reading in row one — negative when row one is already over. */
export function feedReadingRoomPx(viewportPx: number, row: MastheadRowPx): number {
  const items = row.itemsPx.reduce((a, b) => a + b, 0);
  // One gap between each item AND before the reading itself.
  const gaps = row.gapPx * row.itemsPx.length;
  return viewportPx - 2 * row.padPx - items - gaps;
}

export function feedReadingPlacement(
  viewportPx: number,
  row: MastheadRowPx,
  reading: FeedReadingPx,
): FeedReadingPlacement {
  const room = feedReadingRoomPx(viewportPx, row);
  if (room >= reading.oneLinePx) return "one-line";
  if (room >= reading.stackedPx) return "stacked";
  return "second-row";
}
