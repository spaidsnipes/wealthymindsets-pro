/**
 * ZONE PASSPORT · LINEAGE — where a selected zone came from, by id.
 *
 * Child: LINEAGE. Parent: F11 Market Object Passport. Class: INSPECTOR feed.
 * The Passport printed its object id only as a data attribute and the first
 * two evidence ids; the birth bar's source and provenance, the session, the
 * lifecycle version and the Decision_ID chain (computed by the room, never
 * rendered) were nowhere on the glass.
 *
 * Every line is read from an owner, verbatim:
 *
 *   OBJECT    `StructureZone.object` (selectStructureZoneObjects) — id, kind,
 *             symbol, session, evidence ids (first = the birth bar, the rest =
 *             the bars that tested it), asOf.
 *   BIRTH BAR the canonical identity the room admitted for `birthBarId` — its
 *             source, provenance and fidelity; or the statement that none was
 *             admitted. Never a copy of the bar's prices.
 *   METHOD    the two owners and the lifecycle owner's version.
 *   CHAIN     `buildInspectChain` — BAR → OBJECT → DECISION, or its refusal.
 *
 * "Passport remembers. Receipt freezes. Neither reprints the bar." The lineage
 * holds ids and words only; `checkNoReprint` passes on it.
 *
 * PURE. DETERMINISTIC. Called when the selection or the identities change —
 * never per frame.
 */

import type { CanonicalBarIdentity } from "../canonicalBar";
import { buildInspectChain } from "../inspectChain";
import type { MarketObject } from "../marketObjectKinds";
import type { StructureZone } from "./selectStructureZoneObjects";

export const ZONE_LINEAGE_VERSION = 1;

export interface ZoneLineageVM {
  readonly version: number;
  readonly objectId: string;
  readonly kind: string;
  readonly symbolId: string;
  readonly sessionId: string;
  readonly birth:
    | {
        readonly state: "READ";
        readonly barId: string;
        readonly line: string;
        /** The admitted identity's own words, verbatim — the Passport's BIRTH SOURCE slot (2026-09-26). */
        readonly source: string;
        readonly provenance: string;
        /** The birth bar's open, epoch ms, from its identity. */
        readonly asOf: number;
      }
    | { readonly state: "UNREAD"; readonly barId: string; readonly absence: string };
  /** The object's evidence ids in its own order: the birth bar first, then each test bar. */
  readonly evidence: readonly { readonly id: string; readonly role: "BIRTH" | "TEST" }[];
  readonly method: string;
  /** The object's asOf, epoch ms. */
  readonly asOf: number;
  readonly chain:
    | { readonly state: "READ"; readonly line: string; readonly decisionId: string | null }
    | { readonly state: "UNREAD"; readonly reason: string };
}

export function selectZoneLineage(input: {
  readonly zone: StructureZone;
  /** The room's admitted identities; the birth bar is looked up by id. */
  readonly identities: readonly CanonicalBarIdentity[];
  /** The Decision_ID born on this camera, if any. */
  readonly decisionId: string | null;
}): ZoneLineageVM {
  return selectObjectLineage({
    object: input.zone.object,
    method: `selectStructureZoneObjects + selectZoneLifecycle v${input.zone.lifecycle.version}`,
    identities: input.identities,
    decisionId: input.decisionId,
  });
}

/** Any MarketObject's lineage. "Kind only changes the noun on the door": a
 *  LEVEL's lineage is the same drawer as a ZONE's, read from the same slots. */
export type ObjectLineageVM = ZoneLineageVM;

export function selectObjectLineage(input: {
  readonly object: MarketObject;
  /** The owner(s) that published the object, verbatim. */
  readonly method: string;
  readonly identities: readonly CanonicalBarIdentity[];
  readonly decisionId: string | null;
}): ObjectLineageVM {
  const o = input.object;
  const identity = input.identities.find(i => i.barId === o.birthBarId) ?? null;
  const verdict = buildInspectChain({ barId: o.birthBarId, objectId: o.objectId, decisionId: input.decisionId });
  return {
    version: ZONE_LINEAGE_VERSION,
    objectId: o.objectId,
    kind: o.kind,
    symbolId: o.symbolId,
    sessionId: o.sessionId,
    birth: identity
      ? {
          state: "READ",
          barId: identity.barId,
          line: `${identity.barId} · ${identity.source} · ${identity.provenance} · ${identity.fidelity}`,
          source: identity.source,
          provenance: identity.provenance,
          asOf: identity.asOf,
        }
      : {
          state: "UNREAD",
          barId: o.birthBarId,
          absence: "Birth bar identity not admitted — the room holds no canonical identity for this id.",
        },
    evidence: o.evidenceIds.map((id, i) => ({ id, role: i === 0 && id === o.birthBarId ? "BIRTH" : "TEST" })),
    method: input.method,
    asOf: o.asOf,
    chain: verdict.ok
      ? {
          state: "READ",
          line: `BAR ${verdict.chain.barId} → OBJECT ${verdict.chain.objectId ?? "none"} → DECISION ${verdict.chain.decisionId ?? "none taken"}`,
          decisionId: verdict.chain.decisionId,
        }
      : { state: "UNREAD", reason: verdict.reason },
  };
}

export default selectZoneLineage;
