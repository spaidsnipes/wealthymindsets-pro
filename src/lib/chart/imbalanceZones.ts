/**
 * PLATE 28 · STACKED IMBALANCE BECOMES A ZONE — Garden 19 finish line (Founder 2026-10-15).
 *
 * "Three or more price rows in a row where buyers out-traded sellers 3 to 1 draw a solid zone.
 * It stretches right until price comes back, then it marks the test."
 *
 * Before: a stacked run was a 2px bracket beside its column and a ratio word that waited for NEAR
 * ("imbalance sucks, nothing to see"). The run (footprintCanon.imbalanceRuns — the ONE stacked-
 * imbalance owner, 3:1, ≥ MIN_STACK_LEVELS rows) is now a ZONE from its bar to the right. This
 * module decides only its fate from the bars after it — pure, no canvas.
 *
 *   UNTESTED  no later bar has reached the zone: it runs to the live edge.
 *   HELD      a later bar reached it and closed on the zone's side (a buy zone: close ≥ its low).
 *   BROKE     a later bar reached it and closed through it.
 * The zone stops at the bar that tested it; the test is marked there.
 */

export type ImbalanceZoneState = "UNTESTED" | "HELD" | "BROKE";

export interface ImbalanceZone {
  readonly side: "buy" | "sell";
  readonly lo: number;
  readonly hi: number;
  /** The bar the stack printed in (epoch seconds). */
  readonly birth: number;
}

export interface ZoneFate {
  readonly state: ImbalanceZoneState;
  /** The bar that first came back into the zone; null while untested. */
  readonly testTime: number | null;
}

export function imbalanceZoneFate(
  z: ImbalanceZone,
  bars: readonly { readonly time: number; readonly high: number; readonly low: number; readonly close: number }[],
): ZoneFate {
  for (const b of bars) {
    if (!(b.time > z.birth)) continue;
    if (b.low <= z.hi && b.high >= z.lo) {
      const broke = z.side === "buy" ? b.close < z.lo : b.close > z.hi;
      return { state: broke ? "BROKE" : "HELD", testTime: b.time };
    }
  }
  return { state: "UNTESTED", testTime: null };
}

const fmt = (p: number, dp: number) => p.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

/** "Stacked buy imbalance · 30,112–30,117 · untested" */
export function imbalanceZoneName(z: ImbalanceZone, dp: number, state: ImbalanceZoneState): string {
  const tail = state === "UNTESTED" ? " · untested" : "";
  return `Stacked ${z.side} imbalance · ${fmt(z.lo, dp)}–${fmt(z.hi, dp)}${tail}`;
}

/** The mark at the test: "✓ Tested · held" / "✗ Tested · broke through"; null while untested. */
export function imbalanceTestWords(state: ImbalanceZoneState): string | null {
  return state === "HELD" ? "✓ Tested · held" : state === "BROKE" ? "✗ Tested · broke through" : null;
}

/** At most this many zones are named at once (the newest); older ones keep their band, unnamed. */
export const IMBALANCE_ZONE_NAMES_MAX = 3;

/** "3:UNTESTED,HELD,BROKE" */
export function imbalanceZonesReceipt(states: readonly ImbalanceZoneState[]): string {
  return `${states.length}:${states.join(",") || "NONE"}`;
}
