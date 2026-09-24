/**
 * SWING-ORIGIN ZONES — the geometry the Passport mockup selects.
 *
 * Child: MARKET OBJECT · ZONE (swing origin). Parent: F11 Market Object
 * Passport / I. Market Object family ("external order block … map into ZONE").
 * Class: OVERLAY + INSPECTOR feed. Plate: the Founder's Market Object
 * Passport mockup (a selected zone on price, its biography beside it).
 *
 * ── WHY "ZONE", NOT "ORDER BLOCK" ──────────────────────────────────────────
 *
 * `ORDER_BLOCK` is on the rejected-kind list: an order block is a READING of
 * geometry, not a kind the house owns. The geometry here is plain and
 * checkable — the full range of the bar a confirmed swing was born on — and
 * the reading is stated as provenance ("swing-low origin"), never as a
 * strategy claim.
 *
 *   swing LOW  → DEMAND zone = that bar's [low, high]; invalid on a close below.
 *   swing HIGH → SUPPLY zone = that bar's [low, high]; invalid on a close above.
 *
 * Pivots come from the ONE structure owner (`selectMarketStructure`); the
 * biography comes from the ONE lifecycle owner (`selectZoneLifecycle`). This
 * module only joins them and names bars by their canonical ids.
 *
 * PURE. DETERMINISTIC.
 */

import type { CanonicalBarIdentity, LegacyOhlcvTuple } from "../canonicalBar";
import type { MarketObject } from "../marketObjectKinds";
import type { MarketStructureVM, StructurePoint } from "./selectMarketStructure";
import selectZoneLifecycle, { type ZoneLifecycle, type ZoneSide } from "./selectZoneLifecycle";

export interface StructureZone {
  readonly object: MarketObject;
  readonly side: ZoneSide;
  /** "SWING-LOW ORIGIN" / "SWING-HIGH ORIGIN" — provenance, not strategy. */
  readonly origin: string;
  readonly birthTime: number;
  readonly lifecycle: ZoneLifecycle;
}

function zoneFor(
  side: ZoneSide,
  pivot: StructurePoint | null,
  bars: readonly LegacyOhlcvTuple[],
  identities: readonly CanonicalBarIdentity[],
): StructureZone | null {
  if (!pivot) return null;
  const birth = bars.find(b => Number(b.time) === pivot.time);
  if (!birth || !(birth.high >= birth.low)) return null;
  const idAt = (t: number) => identities.find(i => Math.floor(i.asOf / 1000) === t);
  const identity = idAt(pivot.time);
  if (!identity) return null;

  const lifecycle = selectZoneLifecycle(
    { side, low: birth.low, high: birth.high, birthTime: pivot.time },
    bars,
  );
  const testBarIds = lifecycle.touches
    .map(t => idAt(t.start)?.barId)
    .filter((x): x is string => typeof x === "string");
  const last = lifecycle.touches.at(-1);
  const newest = identities[identities.length - 1] ?? identity;

  return {
    side,
    origin: side === "DEMAND" ? "SWING-LOW ORIGIN" : "SWING-HIGH ORIGIN",
    birthTime: pivot.time,
    lifecycle,
    object: {
      objectId: `ZONE:${identity.barId}:${side}`,
      kind: "ZONE",
      symbolId: identity.symbolId,
      sessionId: identity.sessionId,
      priceLow: birth.low,
      priceHigh: birth.high,
      birthBarId: identity.barId,
      testBarIds,
      lastResponseBarId: last ? idAt(last.end)?.barId ?? null : null,
      invalidationPrice: lifecycle.invalidationPrice,
      state: lifecycle.state,
      evidenceIds: [identity.barId, ...testBarIds],
      decay: lifecycle.barsSinceBirth,
      asOf: newest.asOf,
      fidelityAtBirth: identity.fidelity,
    },
  };
}

export function selectStructureZoneObjects(input: {
  readonly structure: MarketStructureVM;
  readonly bars: readonly LegacyOhlcvTuple[];
  readonly identities: readonly CanonicalBarIdentity[];
}): readonly StructureZone[] {
  if (!input.structure.measured) return [];
  return [
    zoneFor("SUPPLY", input.structure.lastSwingHigh, input.bars, input.identities),
    zoneFor("DEMAND", input.structure.lastSwingLow, input.bars, input.identities),
  ].filter((z): z is StructureZone => z !== null);
}

export default selectStructureZoneObjects;
