/**
 * THE OPPORTUNITY MAP LIVES IN THE SCANNER DECK. THERE IS NO HEATMAPS ROOM.
 *
 * CURRENT AUTHORITY (Complete Invention Registry & Surface Map — CURRENT —
 * 2026-09-22, F14 DISCOVERY / HEAT):
 *
 *   "live current-symbol heat = chart lens
 *    saved/historical heat = Research Heat Archive
 *    multi-symbol opportunity/discovery heat belongs to scanning/research
 *    job, not a live Heatmaps Room"
 *
 * and the same registry lists "Opportunity Map · Opportunity Observatory ·
 * Discovery lens" as RELATED NAMES under "SCANNER DECK / MARKET-STATE
 * DISCOVERY", with "Heat cell → existing camera landing".
 *
 * The Command Center's HOUSE PLAN bolt-on puts "live Heatmaps Room" on the
 * DO NOT PUT IN ROOMS list, and: "ROOMS BUTTON ≠ HEATMAPS ROOM."
 *
 * So the cross-market sector/stock map is one VIEW of the Scanner Deck (the
 * surveying-many-instruments job), and a heat cell does exactly one thing:
 * it opens the EXISTING market camera on that symbol. This module is the one
 * owner of both answers — where the map lives, and where a cell lands.
 */

/** The Scanner Deck's own view of multi-symbol opportunity heat. */
export const OPPORTUNITY_MAP_ROUTE = "/scanner/map";

/** The Scanner Deck's signal table — the deck's other view. */
export const SCANNER_SIGNALS_ROUTE = "/scanner";

/**
 * The retired live-room path. It is answered by an edge alias (see
 * `@/lib/legacyRouteAliases`) so saved links land on the map's lawful home
 * instead of 404ing — it is never a room again.
 */
export const RETIRED_HEATMAPS_ROOM_ROUTE = "/heatmaps";

/** The two views of the Scanner Deck, in the order the deck shows them. */
export const SCANNER_DECK_VIEWS: ReadonlyArray<{ readonly href: string; readonly label: string }> = [
  { href: SCANNER_SIGNALS_ROUTE, label: "Signals" },
  { href: OPPORTUNITY_MAP_ROUTE, label: "Opportunity Map" },
];

/**
 * Where a heat cell lands: the ONE market camera, seeded with the cell's
 * symbol and nothing else.
 *
 * The timeframe is deliberately NOT sent. The map's "1D / 1W / 1M …" is a
 * performance WINDOW over which the cell's change was measured, not a chart
 * bar interval. Sending it as `tf` would overwrite the camera timeframe the
 * trader already chose with a number that means something else. /charts
 * treats `?symbol=` as a seed and keeps its own timeframe when `tf` is
 * absent, so omitting it is how the camera's timeframe is KEPT.
 */
export function heatCellCameraHref(symbol: string): string {
  return `/charts?symbol=${encodeURIComponent(symbol.trim().toUpperCase())}`;
}
