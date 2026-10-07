/**
 * NOTES MOVE INTELLIGENTLY — Garden 19 §16 + §14 AUTO COMPOSE, PURE.
 *
 * Before this owner, a Class-B word that could not find a clear spot beside
 * its own mark was DROPPED ("a letter that cannot sit by its own swing is
 * dropped"; a session word that would overlap another was skipped). The mark
 * stayed; the word vanished — truth deleted by layout.
 *
 * Now a displaced word is handed here instead. Displaced words that sit near
 * each other collapse into ONE contextual anchor — "3 MARKET EVENTS" — placed
 * where they happened. Tapping it lists every word it holds. The geometry
 * (chevrons, bands, marks) is untouched and stays visible.
 *
 * §14 law this module obeys, and its tests hold it to:
 *   · it may AGGREGATE words and LOWER their opacity — nothing else;
 *   · every note handed in comes out in exactly one anchor (no deletion);
 *   · it never sees, and so can never switch off, a layer, an evidence class,
 *     an order or a protection line — it receives words only;
 *   · the trader can override it (compose OFF → every word prints at its own
 *     preferred spot, collisions and all).
 */

export interface DisplacedNote {
  /** The layer that owns the word (receipt + list grouping). */
  readonly layer: string;
  readonly text: string;
  /** Where the word wanted to sit (canvas CSS px). */
  readonly x: number;
  readonly y: number;
  /** The bar the event belongs to, when it has one (epoch seconds). */
  readonly time?: number | null;
}

export interface NoteAnchor {
  readonly x: number;
  readonly y: number;
  readonly notes: readonly DisplacedNote[];
  readonly word: string;
}

/** Notes within this many px (both axes) of a cluster's seed share its anchor. */
export const ANCHOR_RADIUS = 56;
export const COMPOSE_NOTES_KEY = "wm_composeNotes";

export function anchorWord(n: number): string {
  return `${n} MARKET EVENT${n === 1 ? "" : "S"}`;
}

/** Greedy left-to-right clustering. Deterministic; conserves every note. */
export function composeNoteAnchors(notes: readonly DisplacedNote[], radius = ANCHOR_RADIUS): NoteAnchor[] {
  const sorted = notes
    .filter(n => Number.isFinite(n.x) && Number.isFinite(n.y))
    .slice()
    .sort((a, b) => a.x - b.x || a.y - b.y);
  // A note with a non-finite position still belongs somewhere: it joins the
  // last anchor (or opens one at the origin) — conserved, never dropped.
  const stray = notes.filter(n => !(Number.isFinite(n.x) && Number.isFinite(n.y)));
  const groups: DisplacedNote[][] = [];
  for (const n of sorted) {
    const g = groups.find(q => Math.abs(q[0].x - n.x) <= radius && Math.abs(q[0].y - n.y) <= radius);
    if (g) g.push(n); else groups.push([n]);
  }
  if (stray.length) { if (groups.length) groups[groups.length - 1].push(...stray); else groups.push([...stray]); }
  return groups.map(g => {
    const placed = g.filter(n => Number.isFinite(n.x) && Number.isFinite(n.y));
    const x = placed.length ? placed.reduce((s, n) => s + n.x, 0) / placed.length : 0;
    const y = placed.length ? placed.reduce((s, n) => s + n.y, 0) / placed.length : 0;
    return { x, y, notes: g, word: anchorWord(g.length) };
  });
}

/** One line per note for the tap list: "MARKET STRUCTURE · HH". */
export function anchorListLines(a: NoteAnchor): string[] {
  return a.notes.map(n => `${n.layer} · ${n.text}`);
}

/** A stable key so the DOM overlay re-renders only when the anchors change. */
export function anchorsKey(anchors: readonly NoteAnchor[]): string {
  return anchors.map(a => `${Math.round(a.x)}:${Math.round(a.y)}:${a.notes.map(n => n.text).join(",")}`).join("|");
}

/* ── THE PIP'S TOUCH TARGET ────────────────────────────────────────────────
 * A lone held word paints as a 12px pip but carries an invisible ≥44px hit
 * area on touch (the house `.wm-tap-slop`). That square must not reach into the
 * newest candle's clear zone (§15) — a tap meant for the live candle must never
 * open a note — nor overlap a neighbour pip's square. The painted pip moves
 * left (never right, toward the live edge) until its square is clear.
 */
export const PIP_HIT = 44;

export interface PipRect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

export function pipHitRect(r: PipRect): PipRect {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const w = Math.max(r.w, PIP_HIT), h = Math.max(r.h, PIP_HIT);
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

const overlaps = (a: PipRect, b: PipRect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Where the pip may sit: its own rect shifted left as far as needed so its hit
 * square stays left of `clearLeft` and off every `taken` hit square. Returns
 * null when no spot at or right of `minX` exists (the caller keeps the pip
 * as a word in the cluster list rather than plant a tap trap).
 */
export function placePipHit(r: PipRect, clearLeft: number, taken: readonly PipRect[], minX = 0): PipRect | null {
  let x = Math.min(r.x, clearLeft - PIP_HIT / 2 - r.w / 2 - 1);
  for (let guard = 0; guard < 40 && x >= minX; guard++) {
    const cand = { ...r, x };
    const hit = pipHitRect(cand);
    const clash = taken.find(t => overlaps(hit, t));
    if (!clash && hit.x + hit.w <= clearLeft) return cand;
    x = clash ? Math.min(x - 2, clash.x - PIP_HIT / 2 - r.w / 2 - 1) : x - 4;
  }
  return null;
}
