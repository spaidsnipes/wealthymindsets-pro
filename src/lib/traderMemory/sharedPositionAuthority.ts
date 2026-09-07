/**
 * THE SHARED DECISION / POSITION AUTHORITY — THE RECONCILIATION LAW.
 *
 * ── What this is ─────────────────────────────────────────────────────────────
 *
 * BUILD ORDER §22A and Known Holes H16 name the same gap in the same words:
 *
 *   "paper / position state held in per-device localStorage. That is NOT
 *    cross-device truth… if no shared store exists, status is CROSS-DEVICE
 *    BLOCKED, not simulated parity."
 *
 * `capitalReach.ts` made that gap VISIBLE and then said the only honest thing
 * left to say: "To claim parity you have to produce the thing that would make
 * it true." This module is the first half of that thing — the law a shared
 * authority must obey. The table and the route are worthless without it,
 * because a shared store that accepts any write is not an authority, it is a
 * race with a network bill.
 *
 * ── The two defects this exists to stop ──────────────────────────────────────
 *
 * DEFECT 1 — THE STALE OVERWRITE. Canon H16 lists it first:
 *
 *   "stale client cannot overwrite newer reconVersion"
 *
 * The founder opens a position on the iPad. The phone has been asleep in his
 * pocket holding a snapshot from four minutes ago, in which quantity was 0.
 * The phone wakes, syncs, and writes what it believes. Without a version
 * guard, the authoritative record now says FLAT while the broker holds three
 * contracts. That is the single worst thing this product can do: §14 puts
 * "the UI never says FLAT while broker quantity is above zero" at the top of
 * the tests that matter more than component tests.
 *
 * DEFECT 2 — THE CLIENT THAT WRITES BROKER TRUTH. §11 is explicit:
 *
 *   "Only the reconciliation worker writes quantity and working-order truth.
 *    Everyone else writes intent."
 *
 * Nothing in the codebase enforced that sentence, because until now there was
 * no shared record for it to be true about. If a phone can PUT `quantityFilled`
 * then the phone is a broker, and §6 ("the screen may not show FILLED because
 * WM wished it") is a comment rather than a rule. The split is therefore
 * structural here: an INTENT write physically cannot carry settled quantity,
 * and the type system says so.
 *
 * ── Why the version is the authority, not the clock ──────────────────────────
 *
 * Wall-clock timestamps are the obvious tiebreak and they are wrong for this
 * job: devices disagree about the time, and the founder's phone and iPad are
 * exactly the two machines whose clocks WM does not control. §6 asks whose
 * clock is authority; the answer here is nobody's. `reconVersion` is a
 * monotonic integer minted by the authority itself, so "newer" is a fact about
 * the record rather than a claim by the writer.
 *
 * PURE MODULE — no React, no I/O, no clock, no Supabase import. The route
 * imports this. This imports nothing, so the law can be tested without a
 * database and cannot drift toward whatever the database happens to allow.
 */

/**
 * The named authority that holds the book for every device.
 *
 * This string is the evidence `selectCapitalReach` demands before it will say
 * ALL_DEVICES. It is exported from here — beside the law — rather than typed
 * into the UI, so that the name cannot appear on screen unless this module is
 * actually in the path.
 */
export const SHARED_POSITION_AUTHORITY = "wm_decision_positions" as const;

export const RECON_LAW_VERSION = "wm.recon-law.v1" as const;

/** Who is writing, and therefore what they are allowed to say. */
export type WriterRole =
  /** A signed-in surface: browser, iPad, phone. May state what the human wants. */
  | "CLIENT_INTENT"
  /** The reconciliation worker, speaking for the broker. The only source of settled truth. */
  | "RECONCILIATION";

/**
 * What a CLIENT may write. Note what is absent: quantity, protection state,
 * broker order ids, execution state. A client cannot express those in this
 * type, which is a stronger guarantee than a runtime check that someone
 * remembers to call.
 */
export interface ClientIntentWrite {
  readonly role: "CLIENT_INTENT";
  readonly decisionId: string;
  /** The version the client believes it is amending. */
  readonly baseReconVersion: number;
  /** Human purpose (§5 STEP 5), never a broker primitive. */
  readonly intent: string;
  readonly deviceId: string;
}

/**
 * What the RECONCILIATION worker may write: everything the broker actually
 * said. §11 — "Only the reconciliation worker writes quantity and
 * working-order truth."
 */
export interface ReconciliationWrite {
  readonly role: "RECONCILIATION";
  readonly decisionId: string;
  readonly baseReconVersion: number;
  readonly quantityFilled: number;
  readonly quantityProtected: number;
  readonly executionState: string;
  readonly protectionState: string;
}

export type AuthorityWrite = ClientIntentWrite | ReconciliationWrite;

export type WriteVerdict =
  /** Apply it, at the version named in `nextReconVersion`. */
  | "ACCEPT"
  /** The writer is behind. Its view must be refreshed; its write is discarded. */
  | "REJECT_STALE"
  /** The writer tried to say something its role may not say. */
  | "REJECT_ROLE";

export interface WriteDecision {
  readonly version: typeof RECON_LAW_VERSION;
  readonly verdict: WriteVerdict;
  /** The version the record will carry if accepted. `null` on rejection. */
  readonly nextReconVersion: number | null;
  /**
   * Why, in words a surface may show. §8 forbids ERROR/INVALID/FAILED for a
   * designed boundary — a stale phone is not broken, it is behind.
   */
  readonly note: string;
}

/**
 * Decide whether a write may land on the canonical record.
 *
 * The current version is the authority's, not the writer's. A writer that
 * names a version OTHER than the current one is by definition looking at a
 * different record than the one it is trying to change.
 */
export function decideWrite(
  currentReconVersion: number,
  write: AuthorityWrite,
): WriteDecision {
  // STALE FIRST. A phone that is four minutes behind AND overreaching should
  // be told it is behind: refreshing is the action that fixes it, and naming
  // the role problem instead would send the trader to fix the wrong thing.
  if (write.baseReconVersion < currentReconVersion) {
    return {
      version: RECON_LAW_VERSION,
      verdict: "REJECT_STALE",
      nextReconVersion: null,
      note:
        `This device is showing version ${write.baseReconVersion} of the position and the `
        + `shared record has moved on to ${currentReconVersion}. WM did not apply the change, `
        + "because doing so would replace newer broker truth with an older view. "
        + "Nothing was lost — this device will catch up on its next read.",
    };
  }

  // A writer AHEAD of the authority invented a version. That is not staleness
  // and must not be waved through: it is the shape a replayed or forged write
  // takes, and accepting it would let a client choose its own ordering.
  if (write.baseReconVersion > currentReconVersion) {
    return {
      version: RECON_LAW_VERSION,
      verdict: "REJECT_STALE",
      nextReconVersion: null,
      note:
        `This device claims version ${write.baseReconVersion} of the position but the shared `
        + `record is at ${currentReconVersion}. WM only accepts a change written against the `
        + "version it currently holds, so the change was not applied.",
    };
  }

  if (write.role === "CLIENT_INTENT") {
    // §11. The type already prevents a client from naming quantity; this is
    // the runtime half, for writes that arrive as parsed JSON over the wire
    // where the compiler was never present.
    const trespass = findSettledTruthKeys(write);
    if (trespass !== null) {
      return {
        version: RECON_LAW_VERSION,
        verdict: "REJECT_ROLE",
        nextReconVersion: null,
        note:
          `A device tried to record ${trespass} on the shared position. Only broker `
          + "reconciliation may state filled or protected quantity, so the change was not "
          + "applied. The intent itself was not recorded either — resend it without that field.",
      };
    }
  }

  return {
    version: RECON_LAW_VERSION,
    verdict: "ACCEPT",
    nextReconVersion: currentReconVersion + 1,
    note:
      write.role === "RECONCILIATION"
        ? `Broker reconciliation applied at version ${currentReconVersion + 1}.`
        : `Intent recorded at version ${currentReconVersion + 1}.`,
  };
}

/**
 * The fields only reconciliation may set. Named as data rather than checked
 * inline so the list is one thing that can be extended when the record grows a
 * new piece of broker truth.
 */
const SETTLED_TRUTH_KEYS = [
  "quantityFilled",
  "quantityProtected",
  "quantityRequested",
  "executionState",
  "protectionState",
  "brokerOrderIds",
] as const;

function findSettledTruthKeys(write: object): string | null {
  const present = SETTLED_TRUTH_KEYS.filter((key) => key in write);
  if (present.length === 0) return null;
  return present.join(", ");
}
