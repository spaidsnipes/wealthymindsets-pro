/**
 * BAR DELTA KEEL — Garden 19 §6 / census C-02, PURE.
 *
 * "Who won this bar, and by how much of its sided volume?" told ACROSS the
 * candles: each finished bar that carries signed evidence gets a hairline keel
 * on its close edge. Length ∝ delta ratio (delta ÷ sided volume), side ink by
 * sign. Read left to right, the keels are the temporal story — aggression
 * arriving (keels appear), increasing (they lengthen), fading (they shorten),
 * and FAILURE TO DISPLACE: a strong keel whose bar did not move its way (body
 * against the delta, or under 0.15 ATR; |ratio| ≥ 0.35 — serving SPY 5m at 0.2 / 0.2 hollowed 26 of 72 keels, noise) is drawn HOLLOW. Form, not
 * hue, carries the failure.
 *
 * Evidence ladder (one owner each — this module only reads what they hand it):
 *   TAPE   captured signed prints for the bar (footprintCanon.barTapeDelta)
 *   SIDES  the provider's own bid / ask volume per bar (tastytrade bar sides)
 * Neither → no keel (silence is data). Never an OHLC guess, never on spot FX.
 */

export type KeelBasis = "TAPE" | "SIDES";

export interface KeelInput {
  readonly time: number;
  readonly open: number;
  readonly close: number;
  /** ATR at that bar (NaN while warming up). */
  readonly atr: number;
  readonly buy: number;
  readonly sell: number;
  readonly basis: KeelBasis;
}

export interface Keel {
  readonly time: number;
  /** delta ÷ (buy + sell), −1..1. */
  readonly ratio: number;
  readonly delta: number;
  readonly basis: KeelBasis;
  /** A strong keel whose bar did not move its way. */
  readonly failed: boolean;
  /** Ratio's growth vs the previous keel of the same sign: >0 increasing, <0 fading, null = first / flipped. */
  readonly change: number | null;
}

/** |ratio| below this is a balanced bar — no keel. */
export const KEEL_MIN_RATIO = 0.05;
/** |ratio| at or above this paints a full-length keel. */
export const KEEL_FULL_RATIO = 0.6;
/** A keel this strong that fails to displace is a failure, not noise. */
export const FAIL_MIN_RATIO = 0.35;
/** Displacement under this fraction of ATR is "did not move". */
export const FAIL_MAX_BODY_ATR = 0.15;
export const DELTA_KEEL_BUDGET_MS = 1.5;

export function readKeels(rows: readonly KeelInput[]): Keel[] {
  return readKeelsFrom(rows, 0, [], null, null);
}

/** One row → its keel (or null: no sided volume / balanced). `prev` is the keel of the row just before, or null. */
function keelOf(r: KeelInput, prev: Keel | null): Keel | null {
  const tot = r.buy + r.sell;
  if (!(tot > 0)) return null;
  const delta = r.buy - r.sell;
  const ratio = delta / tot;
  if (Math.abs(ratio) < KEEL_MIN_RATIO) return null;
  const body = r.close - r.open;
  const against = body !== 0 && Math.sign(body) !== Math.sign(delta);
  const stalled = r.atr > 0 && Math.abs(body) < FAIL_MAX_BODY_ATR * r.atr;
  const failed = Math.abs(ratio) >= FAIL_MIN_RATIO && (against || stalled);
  const change = prev && Math.sign(prev.ratio) === Math.sign(ratio) ? Math.abs(ratio) - Math.abs(prev.ratio) : null;
  return { time: r.time, ratio, delta, basis: r.basis, failed, change };
}

const sameKeel = (a: Keel, b: Keel) =>
  a.time === b.time && Object.is(a.ratio, b.ratio) && a.delta === b.delta && a.basis === b.basis && a.failed === b.failed && Object.is(a.change, b.change);

/** Continue the keel walk at row `d` over `out` (the keels of rows [0, d)); a keel equal to `reuse[j]` keeps that object. */
function readKeelsFrom(rows: readonly KeelInput[], d: number, out: Keel[], prev: Keel | null, reuse: readonly Keel[] | null): Keel[] {
  for (let i = d; i < rows.length; i++) {
    const k = keelOf(rows[i], prev);
    if (!k) { prev = null; continue; }
    const old = reuse ? reuse[out.length] : undefined;
    const kk = old && sameKeel(old, k) ? old : k;
    out.push(kk);
    prev = kk;
  }
  return out;
}

export const sameKeelInput = (a: KeelInput, b: KeelInput) =>
  a.time === b.time && Object.is(a.open, b.open) && Object.is(a.close, b.close) && Object.is(a.atr, b.atr) &&
  Object.is(a.buy, b.buy) && Object.is(a.sell, b.sell) && a.basis === b.basis;

/**
 * INCREMENTAL KEELS (2026-10-07, serving NQ1! 5m: the 1 s evidence re-read
 * rebuilt every keel and re-walked all geometry, peaks ~2.0 ms vs 1.5 ms).
 * Equal to `readKeels(rows)` (pinned by test) but only re-reads from the first
 * row that differs from `prevRows`: on a live chart that is the newest closed
 * bar(s) whose tape / sides moved. Every keel equal to the previous one at the
 * same position keeps its OBJECT, so a caller can find the changed keels by
 * identity; nothing changed → `prevKeels` itself is returned.
 * Rows are bar-ordered (strictly ascending time), as the chart's bars are.
 */
export function patchKeels(prevRows: readonly KeelInput[] | null, prevKeels: readonly Keel[] | null, rows: readonly KeelInput[]): Keel[] {
  if (!prevRows || !prevKeels) return readKeels(rows);
  let d = 0;
  const n = Math.min(prevRows.length, rows.length);
  while (d < n && sameKeelInput(prevRows[d], rows[d])) d++;
  if (d === rows.length && rows.length === prevRows.length) return prevKeels as Keel[];
  if (d === 0) return readKeelsFrom(rows, 0, [], null, prevKeels);
  // Keels of the unchanged rows [0, d): those whose time is at or before row d-1.
  const lastT = rows[d - 1].time;
  let keep = 0;
  while (keep < prevKeels.length && prevKeels[keep].time <= lastT) keep++;
  const out = prevKeels.slice(0, keep);
  const prev = keep > 0 && out[keep - 1].time === lastT ? out[keep - 1] : null;
  return readKeelsFrom(rows, d, out, prev, prevKeels);
}

/** One keel's painted marks: its group (side ink + age bucket), its rect and its halo. */
export interface KeelGlyph {
  readonly group: string;
  /** Drawn as a stroked (hollow) rect rather than filled. */
  readonly hollow: boolean;
  readonly failed: boolean;
  readonly rect: readonly [number, number, number, number];
  readonly halo: readonly [number, number, number, number];
}

export interface KeelGeometry {
  halo: number[];
  groups: Map<string, { solid: number[]; hollow: number[] }>;
  drawn: number;
  failed: number;
  /** Per keel index: its glyph (null = not painted) … */
  glyphs: (KeelGlyph | null)[];
  /** … and where its four numbers sit in `halo` and in its group's array. */
  slots: ({ h: number; g: number } | null)[];
}

/** Batch the glyphs by group in keel order — exactly the full walk's arrays. */
export function groupKeelGlyphs(glyphs: readonly (KeelGlyph | null)[]): KeelGeometry {
  const halo: number[] = [];
  const groups = new Map<string, { solid: number[]; hollow: number[] }>();
  const slots: ({ h: number; g: number } | null)[] = [];
  let drawn = 0, failed = 0;
  for (const gl of glyphs) {
    if (!gl) { slots.push(null); continue; }
    let g = groups.get(gl.group);
    if (!g) { g = { solid: [], hollow: [] }; groups.set(gl.group, g); }
    const arr = gl.hollow ? g.hollow : g.solid;
    slots.push({ h: halo.length, g: arr.length });
    halo.push(gl.halo[0], gl.halo[1], gl.halo[2], gl.halo[3]);
    arr.push(gl.rect[0], gl.rect[1], gl.rect[2], gl.rect[3]);
    if (gl.failed) failed++;
    drawn++;
  }
  return { halo, groups, drawn, failed, glyphs: [...glyphs], slots };
}

/**
 * Re-lay only the `changed` keel indices (same keel count, same camera). A glyph
 * that keeps its group, fill class and presence is overwritten IN PLACE (no
 * allocation); anything else regroups from the cached glyphs — still no
 * coordinate work for the unchanged keels. The result equals
 * `groupKeelGlyphs(all glyphs re-laid)` (pinned by test).
 */
export function patchKeelGeometry(geo: KeelGeometry, changed: readonly number[], glyphAt: (k: number) => KeelGlyph | null): KeelGeometry {
  let regroup = false;
  const next = new Map<number, KeelGlyph | null>();
  for (const k of changed) {
    const a = geo.glyphs[k], b = glyphAt(k);
    if (!a && !b) continue; // still not painted
    next.set(k, b);
    if (!a || !b || a.group !== b.group || a.hollow !== b.hollow || a.failed !== b.failed) regroup = true;
  }
  if (regroup) {
    const glyphs = geo.glyphs.slice();
    for (const [k, b] of next) glyphs[k] = b;
    return groupKeelGlyphs(glyphs);
  }
  for (const [k, b] of next) {
    const s = geo.slots[k]!;
    const g = geo.groups.get(b!.group)!;
    const arr = b!.hollow ? g.hollow : g.solid;
    for (let j = 0; j < 4; j++) { geo.halo[s.h + j] = b!.halo[j]; arr[s.g + j] = b!.rect[j]; }
    geo.glyphs[k] = b;
  }
  return geo;
}

/** Keel length in px for a body of `bodyW` px. */
export function keelLength(ratio: number, bodyW: number): number {
  if (!(bodyW > 0)) return 0;
  return Math.max(1, Math.min(1, Math.abs(ratio) / KEEL_FULL_RATIO) * bodyW);
}
