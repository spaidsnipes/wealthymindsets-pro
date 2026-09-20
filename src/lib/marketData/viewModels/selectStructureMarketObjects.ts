import type { CanonicalBarIdentity, LegacyOhlcvTuple } from "../canonicalBar";
import type { MarketObject } from "../marketObjectKinds";
import type { MarketStructureVM, StructurePoint } from "./selectMarketStructure";

function objectForPivot(input: {
  readonly side: "HIGH" | "LOW";
  readonly pivot: StructurePoint | null;
  readonly structure: MarketStructureVM;
  readonly bars: readonly LegacyOhlcvTuple[];
  readonly identities: readonly CanonicalBarIdentity[];
}): MarketObject | null {
  const { pivot } = input;
  if (!pivot || !input.structure.measured) return null;

  const barIndex = input.bars.findIndex(bar => Number(bar.time) === pivot.time);
  if (barIndex < 0) return null;
  const identity = input.identities.find(item => Math.floor(item.asOf / 1000) === pivot.time);
  if (!identity) return null;

  // No lifecycle owner exists yet. A later touch could mean TESTED, DEFENDED,
  // CONSUMED or INVALID; choosing among them here would make this selector a
  // second market. Publish only a confirmed level that has not been touched.
  const touchedLater = input.bars.slice(barIndex + 1).some(bar =>
    bar.low <= pivot.price && bar.high >= pivot.price,
  );
  if (touchedLater) return null;

  const newest = input.identities[input.identities.length - 1] ?? identity;
  return {
    objectId: `LEVEL:${identity.barId}:${input.side}`,
    kind: "LEVEL",
    symbolId: identity.symbolId,
    sessionId: identity.sessionId,
    priceLow: pivot.price,
    priceHigh: pivot.price,
    birthBarId: identity.barId,
    testBarIds: [],
    lastResponseBarId: null,
    invalidationPrice: null,
    state: "ALIVE",
    evidenceIds: [identity.barId],
    decay: Math.max(0, input.bars.length - 1 - barIndex),
    asOf: newest.asOf,
    fidelityAtBirth: identity.fidelity,
  };
}

/**
 * Convert the compiled swing owner's latest confirmed, untouched levels into
 * selectable MarketObjects. No pivots are recomputed here.
 */
export function selectStructureMarketObjects(input: {
  readonly structure: MarketStructureVM;
  readonly bars: readonly LegacyOhlcvTuple[];
  readonly identities: readonly CanonicalBarIdentity[];
}): readonly MarketObject[] {
  const candidates = [
    objectForPivot({ ...input, side: "HIGH", pivot: input.structure.lastSwingHigh }),
    objectForPivot({ ...input, side: "LOW", pivot: input.structure.lastSwingLow }),
  ];
  return candidates.filter((candidate): candidate is MarketObject => candidate !== null);
}

