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
  /**
   * True when the field HAS a reading and that reading is "there is nothing
   * here".
   *
   * ── Why this is not `unresolved` (2026-09-16, found by USE) ────────────────
   *
   * Measured live: the band rendered `STATE QUALITY  UNAVAILABLE` in #ede6d3 —
   * the ivory this band reserves for findings — at the same weight as
   * `PROTOCOL wm.market-object-passport.v1`. A trader scanning the row saw an
   * absence wearing the ink of a fact.
   *
   * The lazy repair is to fold UNAVAILABLE into `unresolved`. That would be
   * wrong, and wrong in the direction this codebase keeps having to undo:
   *
   *   UNKNOWN      the passport's own sentinel — NO state was compiled
   *   UNAVAILABLE  a real compiled reading from produceCanonicalMarketState —
   *                measured, and there is no coverage and no price
   *
   * "We never looked" and "we looked and there is nothing" are opposite facts
   * about the engine, exactly as FLAT and POSITION UNREAD are opposite facts
   * about an account (§14.1). Collapsing them would erase the one thing that
   * makes UNAVAILABLE worth printing.
   *
   * So it is a THIRD state, and it introduces no new token: an absence takes
   * the muted ink already used for the unknowns, and keeps the upright face
   * already used for readings. The ink says "not a finding"; the upright says
   * "this IS a reading". CapitalPostureLine already carries this exact flag
   * under the same rule — an absence is never rendered in the ivory reserved
   * for findings.
   *
   * Only STATE QUALITY can be an absence. DELAYED / STALE / PROXY / REPLAY /
   * PARTIAL are degraded FINDINGS and keep the finding ink; a degraded reading
   * that dims itself would be the absent-cell defect in reverse.
   */
  readonly absence: boolean;
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
      absence: false,
    },
    {
      label: "Issued",
      value: vm.capturedAt === null ? UNKNOWN : formatIssuedAt(vm.capturedAt),
      unresolved: vm.capturedAt === null,
      absence: false,
    },
    {
      label: "Protocol",
      // The version is the ONE field that is never unknown — it is a property
      // of the compiler, not of the market.
      value: vm.version,
      unresolved: false,
      absence: false,
    },
    {
      label: "State Quality",
      // The engine's own word, under the engine's own label. NOT relabelled
      // "INTEGRITY", which would claim a verification that never ran.
      value: vm.qualityState,
      unresolved: vm.qualityState === "UNKNOWN",
      // The engine measured, and found no coverage and no price. That is a
      // reading, so it keeps the upright face — but it is not a finding, so it
      // does not get the finding ink. See `absence` on StampField.
      absence: vm.qualityState === "UNAVAILABLE",
    },
    {
      label: "Resolved",
      // The honest stand-in for the mockup's "Verified • Signed": the share of
      // the ledger that actually came back with an answer. An empty ledger
      // reads UNKNOWN, never "0 of 0" — a clean bill of health for a ledger
      // that was never opened is the same lie as a blank.
      //
      // ── Why the noun is load-bearing (2026-09-16, found by USE) ───────────
      //
      // This read "0 of 8". About 150px below it on the same live deck, the
      // Evidence Debt cell read "0 of 9 paid". Both numbers are correct and
      // neither is a bug:
      //
      //   8 = market DIMENSIONS        (this band — `objects` is
      //                                 DIMENSION_ORDER.map, so the count is
      //                                 literally the dimension list)
      //   9 = decision-chain NODES     (the evidence ledger — the dimensions
      //                                 plus non-dimension nodes such as
      //                                 permission, which is why its own
      //                                 sentence ends "1 warned: permission")
      //
      // A bare "0 of 8" beside a bare "0 of 9" is canon Weakness #1: two
      // counts disagreeing on one page, with nothing on screen saying they
      // count different sets. The trader is left to reconstruct the
      // distinction in their head, which is the definition of
      // SCENE_FRAGMENTATION.
      //
      // The repair is a NOUN, never a number. Re-deriving either count to make
      // them match would mint a second answer to a question that already has
      // two correct owners — §24, a second CALLER of one owner is fine, a
      // second ANSWER is not. "dimensions" is not a new word either: the
      // primary-story cell already prints "(0/8 dimensions resolved)" for this
      // exact set, so the band now agrees with a phrase already on screen.
      value:
        vm.totalCount > 0
          ? `${vm.resolvedCount} of ${vm.totalCount} dimension${vm.totalCount === 1 ? "" : "s"}`
          : UNKNOWN,
      unresolved: vm.totalCount === 0,
      // "0 of 8 dimensions" is an alarming reading, but it is a reading. An
      // absence mark here would soften the very number the trader must see.
      absence: false,
    },
  ];

  return { fields, unissued };
}

export default selectPassportStamp;
