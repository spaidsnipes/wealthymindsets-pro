/**
 * THE OPEN DOOR'S EDGE — how far over the room a picked-up door reaches.
 *
 * ── WHAT WAS MEASURED ──────────────────────────────────────────────────────
 *
 * Live /charts, 1905px desktop, NQ1! 15m, 2026-09-25 (orchestrator's hands-on
 * pass). With the Workspace door open — the 264px sheet the frame pins over
 * the room's left edge — four pieces of chart chrome printed ON the sheet or
 * vanished under it:
 *
 *   1. the data-window "D" toggle (zIndex 70) sat beside the MODE heading;
 *   2. the "Vol 16" volume footer label sat on the Draw card's text;
 *   3. the Question Lens "ASK · Auto · Absorbed? …" row sat on Review / Draw;
 *   4. the price legend's headline ("NQ1! · 15m · 30741.25 +…") was hidden
 *      under the sheet — only "3%)  O 30777.50 H…" was left to its right.
 *      The trader lost the symbol and the price while arranging the desk.
 *
 * ── ONE RULE, NOT FOUR SPECIAL CASES ───────────────────────────────────────
 *
 * 1–3 are one defect: the room was not a stacking context, so every z-index
 * the chart's chrome carries competed with the door's 40 directly. The frame
 * now seals the room into one layer beneath an open door (`isolation`, set by
 * WMOperatingSystem). No chart z-index, however large, climbs out of it.
 *
 * 4 is the opposite need: the headline is the one thing the trader must still
 * READ while the door is open, and hiding it correctly under the sheet is
 * still hiding it. A second copy of price inside the door would be a second
 * price owner. So the headline steps PAST the door instead — and to do that it
 * must be TOLD where the door ends. That is this module.
 *
 * ── WHY TOLD AND NOT INFERRED ──────────────────────────────────────────────
 *
 * Same law as `equipmentChannel`: the frame is the only writer of what it has
 * open, and the room never guesses. A chart that guessed "the door is 264px"
 * would be wrong in every split layout — the right-hand pane of a 2-up grid is
 * not under the door at all, and pushing its headline 264px right would be a
 * layout change with no cause. So the frame announces the door's right edge in
 * VIEWPORT pixels, and each band measures its own host against it
 * (`doorInsetFor`). A pane the door does not reach gets an inset of 0.
 *
 * SSR-safe: every function no-ops without a `document`.
 */

export const OPEN_DOOR_EDGE_EVENT = "wm:open-door-edge";

let edgeX: number | null = null;

/** Band side, on MOUNT: where the open door currently ends, or null (none open). */
export function openDoorEdge(): number | null {
  return edgeX;
}

/**
 * Frame side: "my open door's right edge is at this viewport x" — or `null`
 * when nothing is open. `null` MUST be sent on close, or every headline would
 * stay stepped aside over an empty edge.
 */
export function announceOpenDoorEdge(x: number | null): void {
  edgeX = typeof x === "number" && Number.isFinite(x) && x > 0 ? x : null;
  if (typeof document === "undefined") return;
  document.dispatchEvent(new CustomEvent<number | null>(OPEN_DOOR_EDGE_EVENT, { detail: edgeX }));
}

/** Band side. Returns the unsubscribe — a listener per remount is a leak. */
export function subscribeOpenDoorEdge(handler: (x: number | null) => void): () => void {
  if (typeof document === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<number | null>).detail;
    handler(typeof detail === "number" && Number.isFinite(detail) && detail > 0 ? detail : null);
  };
  document.addEventListener(OPEN_DOOR_EDGE_EVENT, listener);
  return () => document.removeEventListener(OPEN_DOOR_EDGE_EVENT, listener);
}

/**
 * How far a band anchored at `hostLeft` (viewport px) must step right to clear
 * a door whose right edge is `edge`. PURE.
 *
 *  - no door open                      → 0
 *  - the door ends left of the host    → 0 (this pane is not under it)
 *  - the door covers the WHOLE host    → 0: there is no visible part of the
 *    pane to step into, and an inset wider than the host would collapse the
 *    band to a negative width (the phone sheet is full-width and does this).
 *  - otherwise                         → the overlap, rounded UP so the first
 *    glyph never shares a pixel column with the door's border.
 */
export function doorInsetFor(edge: number | null, hostLeft: number, hostWidth: number): number {
  if (edge === null || !Number.isFinite(edge)) return 0;
  if (!Number.isFinite(hostLeft) || !Number.isFinite(hostWidth) || hostWidth <= 0) return 0;
  const overlap = Math.ceil(edge - hostLeft);
  if (overlap <= 0) return 0;
  if (overlap >= hostWidth) return 0;
  return overlap;
}
