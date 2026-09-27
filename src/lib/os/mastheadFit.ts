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
 *   layoutMasthead(...)       flex-wrap line breaking over hypothetical sizes,
 *                             then CSS's flexible-length resolution (flex base
 *                             size, min/max clamp and freeze loop), returning
 *                             rows, widths, leftover and the masthead height.
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
    /** True when any band rule moves the centre out of DOM order (`order`). */
    readonly centreReordered: boolean;
    /** The mode bar's flex-grow in the band (the inline style's 1 unless a band rule sets it). */
    readonly centreGrow: number;
    /** The widest px floor a band rule puts on the mode bar (min-width / width / flex-basis); 0 if none. */
    readonly centreFloorPx: number;
  };
}

/** One band rule whose selector lands on the masthead centre (not `:empty`, not a sibling after it). */
export interface CentreRuleRead {
  readonly selector: string;
  readonly decls: Readonly<Record<string, string>>;
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

/** Does this selector (one of a comma list) style the NON-EMPTY masthead centre itself? */
function targetsCentre(selector: string): boolean {
  // A relational :has(...) names a NEIGHBOUR of the centre, never the centre.
  const plain = selector.replace(/:has\([^)]*\)/g, ":has()").trim();
  const last = plain.split(/\s*[>+~]\s*|\s+/).pop() ?? "";
  if (!last.includes(".wm-os-masthead-center")) return false;
  return !last.replace(/:not\(:empty\)/g, "").includes(":empty");
}

function declarations(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of body.split(";")) {
    const at = d.indexOf(":");
    if (at < 0) continue;
    const prop = d.slice(0, at).trim().toLowerCase();
    const value = d.slice(at + 1).replace(/!important/g, "").trim();
    if (prop) out[prop] = value;
  }
  return out;
}

/**
 * EVERY band rule that targets the mode bar, in source order — not just the
 * first `:not(:empty)` rule. A second rule later in the band (a selector list,
 * a more specific selector) would otherwise override the one read and slip
 * past the guard.
 */
export function bandCentreRules(source: string): CentreRuleRead[] {
  const band = stripComments(block(source, BAND_BLOCK_HEAD).slice(BAND_BLOCK_HEAD.length));
  const out: CentreRuleRead[] = [];
  const rule = /([^{}]+)\{([^{}]*)\}/g;
  for (let m = rule.exec(band); m !== null; m = rule.exec(band)) {
    const selectors = m[1].split(",").filter(targetsCentre);
    if (selectors.length > 0) out.push({ selector: selectors.join(", ").trim(), decls: declarations(m[2]) });
  }
  return out;
}

const pct = (v: string | undefined): number | null => {
  const m = v === undefined ? null : /^([\d.]+)%$/.exec(v.trim());
  return m ? Number(m[1]) : null;
};
const px = (v: string | undefined): number | null => {
  const m = v === undefined ? null : /^([\d.]+)px$/.exec(v.trim());
  return m ? Number(m[1]) : null;
};

/** The flex shorthand's parts (grow, shrink, basis) — only the forms this stylesheet writes. */
function flexParts(v: string | undefined): { grow?: number; basis?: string } {
  if (v === undefined) return {};
  const t = v.trim().split(/\s+/);
  if (t.length === 1 && t[0] === "none") return { grow: 0, basis: "auto" };
  if (t.length === 1 && t[0] === "auto") return { grow: 1, basis: "auto" };
  const grow = Number(t[0]);
  const basis = t.length === 3 ? t[2] : t.length === 2 && !/^[\d.]+$/.test(t[1]) ? t[1] : undefined;
  return { grow: Number.isFinite(grow) ? grow : undefined, basis };
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
  const railPx = num(/export const OS_RAIL_BREAKPOINT_PX = (\d+);/, source, "the rail breakpoint");
  // The room a mode bar has in the band's narrowest row: a floor wider than
  // this can never share a row, so it is a forced row of its own.
  const roomPx = railPx + 1 - 2 * Number(header[3]);
  let ownRow = false;
  let reordered = false;
  let grow = 1; // the inline style: flex 1 1 auto
  let floorPx = 0;
  for (const { decls } of bandCentreRules(source)) {
    const flex = flexParts(decls.flex);
    if (flex.grow !== undefined) grow = flex.grow;
    if (decls["flex-grow"] !== undefined) grow = Number(decls["flex-grow"]);
    const sizes = [flex.basis, decls["flex-basis"], decls.width, decls["min-width"]];
    for (const v of sizes) {
      const p = pct(v);
      if (p !== null && p >= 100) ownRow = true;
      const w = px(v);
      if (w !== null) {
        floorPx = Math.max(floorPx, w);
        if (w > roomPx) ownRow = true;
      }
    }
    if (decls.order !== undefined && Number(decls.order) !== 0) reordered = true;
  }
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
      centreReordered: reordered,
      centreGrow: grow,
      centreFloorPx: floorPx,
    },
  };
}

// ── The layout ───────────────────────────────────────────────────────────────

export interface MastheadItemPx {
  readonly key: string;
  /** The FLEX BASE SIZE (the reading's `flex: 1 1 0%` has base 0). */
  readonly basisPx: number;
  readonly heightPx: number;
  /** flex-grow 1. */
  readonly grows?: boolean;
  /** min-width (the reading's min-content); undefined = 0. */
  readonly minPx?: number;
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
  /** What growth left over — the auto margins' share (0 when a grower is unbounded). */
  readonly freePx: number;
}

export interface MastheadLayout {
  readonly availablePx: number;
  readonly rows: readonly MastheadRowLayout[];
  readonly heightPx: number;
}

/** CSS's hypothetical main size: the base size clamped by max, then min (min wins). */
export function hypotheticalPx(item: MastheadItemPx, availablePx: number): number {
  if (item.fullRow) return availablePx;
  const capped = item.maxPx === undefined ? item.basisPx : Math.min(item.basisPx, item.maxPx);
  return Math.max(item.minPx ?? 0, capped);
}

/**
 * CSS Flexbox §9.7 "resolve the flexible lengths", growing only (every row
 * this module is asked about fits its hypothetical sizes; shrinking is not
 * modelled, and a row that overflows keeps its hypothetical sizes and reports
 * usedPx > available). Inflexible items (grow 0, or a base size above the
 * hypothetical) freeze at their hypothetical size; the rest start from their
 * FLEX BASE SIZE and share the free space by grow factor (all 1 here); each
 * round clamps to min/max, and the min- or max-violators freeze by the sign of
 * the total violation, until every item is frozen.
 */
function growLine(items: readonly MastheadItemPx[], availablePx: number, gapsPx: number): number[] {
  const hyp = items.map((i) => hypotheticalPx(i, availablePx));
  const target = [...hyp];
  // The spec picks growing when the flex BASE sizes (not the clamped ones) leave room.
  if (items.reduce((a, i, k) => a + (i.fullRow ? hyp[k] : i.basisPx), 0) + gapsPx >= availablePx) return target;
  const frozen = items.map((i, k) => !i.grows || i.fullRow === true || i.basisPx > hyp[k]);
  for (let guard = 0; guard < 2 * items.length + 2 && frozen.includes(false); guard++) {
    const open = items.map((_, k) => k).filter((k) => !frozen[k]);
    const taken = items.reduce((a, it, k) => a + (frozen[k] ? target[k] : it.basisPx), 0);
    const free = availablePx - gapsPx - taken;
    let violation = 0;
    const clamped = new Map<number, number>();
    for (const k of open) {
      const raw = items[k].basisPx + free / open.length;
      const lo = items[k].minPx ?? 0;
      const hi = items[k].maxPx ?? Infinity;
      const c = Math.max(lo, Math.min(raw, hi));
      clamped.set(k, c);
      violation += c - raw;
    }
    for (const k of open) {
      const c = clamped.get(k)!;
      const raw = items[k].basisPx + free / open.length;
      target[k] = c;
      if (Math.abs(violation) < 1e-9) frozen[k] = true;
      else if (violation > 0 && c > raw) frozen[k] = true; // min violation
      else if (violation < 0 && c < raw) frozen[k] = true; // max violation
    }
  }
  return target;
}

/**
 * CSS flex-wrap line breaking (items in order; a new line when the next item's
 * hypothetical size plus one gap would pass the edge), then the flexible
 * lengths resolved per line as CSS does (growLine), and the masthead's height.
 * Heights are per item: a reading that reached its max-width is one line tall,
 * anything narrower is its stacked height.
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
    const basis = hypotheticalPx(item, available);
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
    const gaps = frame.columnGapPx * (l.length - 1);
    const widths = growLine(l, available, gaps);
    const heights = l.map((i, k) =>
      i.maxPx !== undefined && i.heightAtMaxPx !== undefined && widths[k] >= i.maxPx - 1e-9 ? i.heightAtMaxPx : i.heightPx,
    );
    const usedPx = widths.reduce((a, b) => a + b, 0) + gaps;
    return {
      keys: l.map((i) => i.key),
      widthsPx: widths,
      heightPx: Math.max(...heights),
      usedPx,
      freePx: Math.max(0, available - usedPx),
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
