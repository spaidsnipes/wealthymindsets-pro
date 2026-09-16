/**
 * selectPassportStamp — the MARKET OBJECT PASSPORT identity band.
 *
 * The Founder's Canonical Market State mockup opens its passport with a stamp
 * row, the way a real document does:
 *
 *     OBJECT ID   ·   ISSUED AT   ·   VALID UNTIL 60s TTL
 *     VERSION 1.0.3 Protocol 7    ·   INTEGRITY  Verified • Signed
 *
 * Four of those six fields have canonical producers in this repo. TWO DO NOT,
 * and they are the two that would matter most if a trader believed them:
 *
 *   "VALID UNTIL · 60s TTL"  — nothing in this build expires a market-state
 *       snapshot on a timer. Printing a TTL would promise an invalidation
 *       mechanism that does not exist.
 *   "INTEGRITY · Verified • Signed" — there is no signature, no chain of
 *       custody, no verifier. This is the single most dangerous phrase in the
 *       whole mockup: it is the word that would let a trader stop checking.
 *
 * Both are the JPEG's $1.80 and both are omitted. What the band renders in
 * their place is the one integrity-shaped fact that IS real: how much of the
 * ledger actually resolved, plus the state-quality reading the engine
 * genuinely computed, under its own honest label.
 *
 * TIME IS RENDERED IN UTC ON PURPOSE. `toLocaleTimeString` reads the host's
 * zone and locale, which differ between the server render and the browser
 * render — that class of mismatch is what produced five separate React #418
 * hydration failures in this codebase. A stamp is supposed to be the same
 * mark everywhere it is read.
 *
 * PURE. Formats an already-compiled passport VM. Derives no market fact.
 */

import type { MarketObjectPassportVM } from "../marketData/viewModels/selectMarketObjectPassport";

export const PASSPORT_STAMP_VERSION = "wm.passport-stamp.v1" as const;

export interface StampField {
  readonly label: string;
  readonly value: string;
  /** True when the field has no reading — it must refuse the confident ink. */
  readonly unresolved: boolean;
}

export interface PassportStampVM {
  readonly fields: readonly StampField[];
  /** True when nothing has been sealed yet and the whole band is a blank. */
  readonly unissued: boolean;
}

const UNKNOWN = "—";

/**
 * Middle truncation, never a prefix. A stamp the trader cannot check against
 * the real id is decoration; keeping BOTH ends keeps it verifiable by eye.
 */
export function abbreviateObjectId(id: string): string {
  if (id.length <= 22) return id;
  return `${id.slice(0, 10)}…${id.slice(-8)}`;
}

/** Deterministic UTC wall-clock. Same characters on every host. */
export function formatIssuedAt(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return UNKNOWN;
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 19)} UTC`;
}

export function selectPassportStamp(vm: MarketObjectPassportVM): PassportStampVM {
  const unissued = vm.snapshotId === null && vm.capturedAt === null;

  const fields: StampField[] = [
    {
      label: "Object ID",
      value: vm.snapshotId ? abbreviateObjectId(vm.snapshotId) : UNKNOWN,
      unresolved: vm.snapshotId === null,
    },
    {
      label: "Issued",
      value: vm.capturedAt === null ? UNKNOWN : formatIssuedAt(vm.capturedAt),
      unresolved: vm.capturedAt === null,
    },
    {
      label: "Protocol",
      // The version is the ONE field that is never unknown — it is a property
      // of the compiler, not of the market.
      value: vm.version,
      unresolved: false,
    },
    {
      label: "State Quality",
      // The engine's own word, under the engine's own label. NOT relabelled
      // "INTEGRITY", which would claim a verification that never ran.
      value: vm.qualityState,
      unresolved: vm.qualityState === "UNKNOWN",
    },
    {
      label: "Resolved",
      // The honest stand-in for the mockup's "Verified • Signed": the share of
      // the ledger that actually came back with an answer. An empty ledger
      // reads UNKNOWN, never "0 of 0" — a clean bill of health for a ledger
      // that was never opened is the same lie as a blank.
      value: vm.totalCount > 0 ? `${vm.resolvedCount} of ${vm.totalCount}` : UNKNOWN,
      unresolved: vm.totalCount === 0,
    },
  ];

  return { fields, unissued };
}

export default selectPassportStamp;
