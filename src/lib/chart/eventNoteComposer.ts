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
