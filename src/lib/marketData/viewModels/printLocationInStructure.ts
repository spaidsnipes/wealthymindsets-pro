/**
 * LOCATION IN STRUCTURE for a print (canon G04 / UI_05: "LOCATION IN
 * STRUCTURE — at prior resistance / supply zone …"). Reads the ONE structure
 * owner (selectMarketStructure) and places the print against the swings that
 * were CONFIRMED BEFORE its time — no swing from the print's future is used.
 * Words only from measured prices; no verdict about what it means.
 *
 * PURE. DETERMINISTIC.
 */
import type { MarketStructureVM, StructurePoint } from "./selectMarketStructure";

export type PrintLocation = "ABOVE_LAST_HIGH" | "AT_LAST_HIGH" | "INSIDE_RANGE" | "AT_LAST_LOW" | "BELOW_LAST_LOW" | "UNREAD";

export interface PrintLocationVM {
  readonly location: PrintLocation;
  readonly lastHigh: StructurePoint | null;
  readonly lastLow: StructurePoint | null;
  readonly bias: string | null;
  /** How close counts as "at" a swing, as a fraction of price. */
  readonly tolerance: number;
  readonly note: string;
}

export const PRINT_AT_SWING_TOLERANCE = 0.0015;

export function printLocationInStructure(
  price: number,
  timeSec: number,
  structure: MarketStructureVM | null | undefined,
): PrintLocationVM {
  const tol = PRINT_AT_SWING_TOLERANCE;
  const unread = (note: string): PrintLocationVM => ({ location: "UNREAD", lastHigh: null, lastLow: null, bias: null, tolerance: tol, note });
  if (!structure || !structure.measured) return unread(structure?.insufficientNote ?? "no structure read on this chart");
  if (!(price > 0) || !Number.isFinite(timeSec)) return unread("the print has no price or time");
  // A swing is known only after its confirmation bars closed; `time` is the
  // pivot bar — require it strictly before the print.
  const before = (xs: readonly StructurePoint[]) => xs.filter(p => p.time < timeSec).sort((a, b) => b.time - a.time)[0] ?? null;
  const hi = before(structure.swingHighs), lo = before(structure.swingLows);
  if (!hi && !lo) return unread("no swing was confirmed before this print");
  const near = (p: StructurePoint | null) => p != null && Math.abs(price - p.price) / p.price <= tol;
  const location: PrintLocation =
    near(hi) ? "AT_LAST_HIGH"
    : near(lo) ? "AT_LAST_LOW"
    : hi && price > hi.price ? "ABOVE_LAST_HIGH"
    : lo && price < lo.price ? "BELOW_LAST_LOW"
    : "INSIDE_RANGE";
  const words: Record<PrintLocation, string> = {
    AT_LAST_HIGH: "at the last swing high",
    AT_LAST_LOW: "at the last swing low",
    ABOVE_LAST_HIGH: "above the last swing high",
    BELOW_LAST_LOW: "below the last swing low",
    INSIDE_RANGE: "inside the last swing range",
    UNREAD: "",
  };
  return { location, lastHigh: hi, lastLow: lo, bias: structure.bias ?? null, tolerance: tol, note: words[location] };
}
