/**
 * THE VIEW IN FORCE WHEN THE ORDER LEFT — §J 2026-10-07. PURE.
 *
 * Read, never remembered: the chart room announces its live switch positions
 * (equipmentChannel `announcedArrangementCapture`), and the Views owner
 * (savedLayouts) holds the trader's named Views. The View at send is the
 * trader's own named View those switches add up to; failing that, the starter
 * View (Order Flow / Regime / Review) they add up to; failing that, nothing —
 * the draft then says the View was unreported. No View is guessed.
 */

import { arrangementCameraLabel, camerasInForce, savedArrangementInForce, ARRANGEMENT_SPECS } from "@/lib/marketData/viewModels/selectChartArrangement";

export interface ViewCandidate {
  readonly name: string;
  readonly switches: Readonly<Partial<Record<string, unknown>>>;
  /** Set on a trader's edited copy of a starter View (savedLayouts §B1–2). */
  readonly starter?: unknown;
}

export function viewNameAtSend(
  capture: Readonly<Partial<Record<string, boolean>>> | null,
  views: readonly ViewCandidate[],
): string | null {
  if (!capture) return null;
  // The trader's own named Views first: the most specific (most switches named) wins.
  const own = views
    .filter(v => !v.starter && v.name.trim() !== "" && savedArrangementInForce(v.switches, capture))
    .sort((a, b) => Object.keys(b.switches).length - Object.keys(a.switches).length)[0];
  if (own) return own.name.trim();
  // Then the trader's edit of a starter View, then a starter at its canon arms.
  const edited = views.find(v => typeof v.starter === "string" && v.name.trim() !== "" && savedArrangementInForce(v.switches, capture));
  if (edited) return `${edited.name.trim()} view`;
  const starters = camerasInForce(capture);
  if (!starters.length) return null;
  const arms = (id: string) => ARRANGEMENT_SPECS.find(a => a.id === id)?.arms.length ?? 0;
  const id = [...starters].sort((a, b) => arms(b) - arms(a))[0];
  return arrangementCameraLabel(id) || null;
}
