/**
 * PROFILE MEMORY LEVELS AS MARKET OBJECTS — biography attached, no new kind.
 *
 * Garden Pass 12: "MEMORY — tests / defenses / decay / rejection history should
 * have biography", and the MarketObject law: "Do not invent new private
 * geometry databases … use canonical MarketObjects and lawful attachments;
 * memory may enrich/read the object." Profile Memory already measured each
 * prior session's final POC / VAH / VAL — when it formed, every later bar that
 * traded through it, whether it is still naked — but a trader could not select
 * one, so none of that reached Inspect.
 *
 * Each remembered level becomes a LEVEL MarketObject read from the owner
 * verbatim: born on the session's last bar (its admitted identity), tested by
 * the owner's recent test bars, ALIVE while naked and TESTED once traded
 * through. No identity for the birth bar → no object (never a guessed id).
 * `decay` is bars since birth, the same unit the structure owner uses.
 *
 * PURE. DETERMINISTIC.
 */

import type { CanonicalBarIdentity } from "../canonicalBar";
import type { MarketObject } from "../marketObjectKinds";
import type { ProfileMemoryVM } from "./selectProfileMemory";

export const MEMORY_OBJECT_PREFIX = "MEMORY:";

export function selectMemoryMarketObjects(input: {
  readonly memory: ProfileMemoryVM | null | undefined;
  readonly identities: readonly CanonicalBarIdentity[];
}): readonly MarketObject[] {
  const m = input.memory;
  if (!m || !m.drawn || m.levels.length === 0 || input.identities.length === 0) return [];
  const bySec = new Map<number, CanonicalBarIdentity>();
  for (const id of input.identities) bySec.set(Math.floor(id.asOf / 1000), id);
  const newest = input.identities[input.identities.length - 1];
  const out: MarketObject[] = [];
  for (const level of m.levels) {
    const birth = bySec.get(level.formedAt);
    if (!birth) continue;
    const testIds = level.recentTestTimes
      .map(t => bySec.get(t)?.barId)
      .filter((id): id is string => typeof id === "string");
    let barsSince = 0;
    for (const id of input.identities) if (Math.floor(id.asOf / 1000) > level.formedAt) barsSince++;
    out.push({
      objectId: `${MEMORY_OBJECT_PREFIX}${birth.barId}:${level.kind}`,
      kind: "LEVEL",
      symbolId: birth.symbolId,
      sessionId: birth.sessionId,
      priceLow: level.price,
      priceHigh: level.price,
      birthBarId: birth.barId,
      testBarIds: testIds,
      lastResponseBarId: testIds.length ? testIds[testIds.length - 1] : null,
      invalidationPrice: null,
      state: level.naked ? "ALIVE" : "TESTED",
      evidenceIds: [birth.barId, ...testIds],
      decay: barsSince,
      asOf: newest.asOf,
      fidelityAtBirth: birth.fidelity,
    });
  }
  return out;
}

/** "POC" / "VAH" / "VAL" for a memory object id, else null. */
export function memoryLevelKindOf(objectId: string): "POC" | "VAH" | "VAL" | null {
  if (!objectId.startsWith(MEMORY_OBJECT_PREFIX)) return null;
  const k = objectId.slice(objectId.lastIndexOf(":") + 1);
  return k === "POC" || k === "VAH" || k === "VAL" ? k : null;
}
