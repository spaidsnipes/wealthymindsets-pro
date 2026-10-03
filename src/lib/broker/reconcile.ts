/**
 * RECONCILIATION WITH THE BROKER'S OWN NUMBER (Garden 18 v2 §36/§86) — PURE.
 *
 * Webull states a day P&L per account (balance endpoint, summed by the
 * route). With nothing held it is realised P&L for the day, fees included, so
 * the ledger's net for trades closed today (New York) must equal it. With
 * positions open, day P&L carries their marks and the two are not comparable —
 * the page says so instead of forcing a match.
 */
import type { Episode } from "./webullLedger";

export type ReconcileState = "RECONCILED" | "MISMATCH" | "NOT COMPARABLE";

export interface Reconciliation { readonly state: ReconcileState; readonly ledgerToday: number; readonly brokerDayPnl: number | null; readonly difference: number | null; readonly why: string }

const nyDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

export function reconcileDay(episodes: readonly Episode[], brokerDayPnl: number | null, positionsHeld: number | null, now = new Date()): Reconciliation {
  const today = nyDay(now.toISOString());
  const ledgerToday = Math.round(episodes.filter(e => e.label === "RECONSTRUCTED" && e.net != null && e.closedAt && nyDay(e.closedAt) === today).reduce((s, e) => s + e.net!, 0) * 100) / 100;
  if (brokerDayPnl == null) return { state: "NOT COMPARABLE", ledgerToday, brokerDayPnl, difference: null, why: "Webull did not state a day P&L." };
  if (positionsHeld == null || positionsHeld > 0) return { state: "NOT COMPARABLE", ledgerToday, brokerDayPnl, difference: null, why: positionsHeld == null ? "Positions could not be read, so open marks may be in Webull's figure." : `${positionsHeld} position(s) held — Webull's day P&L includes their marks.` };
  const difference = Math.round((ledgerToday - brokerDayPnl) * 100) / 100;
  return { state: Math.abs(difference) <= 0.01 ? "RECONCILED" : "MISMATCH", ledgerToday, brokerDayPnl, difference, why: "Nothing held, so Webull's day P&L is the day's realised result, fees included." };
}
