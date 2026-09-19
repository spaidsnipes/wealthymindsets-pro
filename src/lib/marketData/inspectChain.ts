/**
 * CONNECTIVE TISSUE — one inspect, one source, full context.
 *
 * Visual source: WM_NewMockup_135_Bar_Object_Decision_Inspect.jpg (2026-09-18).
 * It is the first mockup that draws the three contracts TOGETHER, and the law
 * it prints along its foot is the reason this module exists:
 *
 *   "Passport remembers. Receipt freezes. Neither reprints the bar."
 *
 * Three sentences, three different failure modes, and they are only obviously
 * different once someone writes them down beside each other.
 *
 * ── THE CHAIN ────────────────────────────────────────────────────────────────
 *
 *   barId  B-9921   →   objectId  OBJ-77   →   decisionId  D-1842
 *
 * The mockup's drawer is labelled D≈0 / DEPTH: ZERO, and that is a
 * specification rather than a flourish. Selecting a bar resolves all three at
 * once. The trader does not navigate from bar to object to decision through
 * three panels, because each hop is a place where the surface can silently
 * substitute a different instrument, a different session, or yesterday.
 *
 * ── "NEITHER REPRINTS THE BAR" ───────────────────────────────────────────────
 *
 * `marketObjectKinds.ts` already forbids an OBJECT from carrying OHLC. This
 * extends the same refusal to the RECEIPT, which is where it is far more
 * tempting: a receipt is supposed to be a frozen record, and freezing "the bar
 * I decided on" by copying its numbers feels like exactly the right instinct.
 *
 * It is the cut. A receipt holding its own open and close is a second past that
 * cannot be corrected — when the provider later revises that bar, the chart
 * moves and the receipt does not, and the two now disagree about the instant a
 * human committed capital. Holding `barId` instead means the receipt points at
 * whichever version of the truth is current, and `truthEpoch` on the bar makes
 * the revision itself visible rather than silent.
 *
 * ── "PASSPORT REMEMBERS. RECEIPT FREEZES." ───────────────────────────────────
 *
 * These are opposite obligations on the same chain, and conflating them breaks
 * the record in whichever direction you conflate:
 *
 *   A passport that FROZE would stop counting tests. The object's whole value
 *   is that it accumulates — tests, last response, decay. A snapshot of an
 *   object is a fossil.
 *
 *   A receipt that REMEMBERED would be re-derived on read. The gate snapshot
 *   would silently update to today's gates, and the record of what the house
 *   actually permitted at 15:47 would be replaced by what it would permit now.
 *   That is the difference between an audit trail and a mirror.
 *
 * So the receipt carries `frozenAt` and its stored gate verdict, and this
 * module refuses a receipt whose contents have drifted from the moment it
 * claims to have frozen.
 */

/* ── THE CHAIN ─────────────────────────────────────────────────────────────── */

/**
 * What one inspect resolves. Nulls are real answers: a bar with no object on it
 * is ordinary, and an object nobody has taken a stance on is the common case.
 */
export interface InspectChain {
  readonly barId: string;
  readonly objectId: string | null;
  readonly decisionId: string | null;
}

export type ChainVerdict =
  | { readonly ok: true; readonly chain: InspectChain }
  | { readonly ok: false; readonly reason: string };

/**
 * Build the chain from one selection.
 *
 * Refuses a decision that dangles without an object. The mockup draws the
 * chain as a chain, and a decision whose object is unknown is a stance about
 * nothing — the house would be able to show a receipt it cannot explain.
 */
export function buildInspectChain(input: {
  readonly barId: string;
  readonly objectId?: string | null;
  readonly decisionId?: string | null;
}): ChainVerdict {
  const barId = input.barId.trim();
  if (barId === "") {
    return { ok: false, reason: "An inspect with no bar has no source. The chain starts at the bar." };
  }

  const objectId = input.objectId?.trim() ? input.objectId.trim() : null;
  const decisionId = input.decisionId?.trim() ? input.decisionId.trim() : null;

  if (decisionId && !objectId) {
    return {
      ok: false,
      reason:
        "A decision with no object is a stance about nothing. The chain is "
        + "bar → object → decision; it may end early, but it may not skip a link.",
    };
  }

  return { ok: true, chain: { barId, objectId, decisionId } };
}

/* ── NEITHER REPRINTS THE BAR ──────────────────────────────────────────────── */

/**
 * The field names that mean someone copied a bar into something that should
 * have pointed at one.
 *
 * Kept as data rather than as a reviewer's memory, because this is precisely
 * the addition that looks harmless in a diff: one extra field on a receipt,
 * added by someone being careful.
 */
export const REPRINTED_BAR_FIELDS: readonly string[] = Object.freeze([
  "open", "high", "low", "close", "volume", "ohlc", "ohlcv",
  "barOpen", "barHigh", "barLow", "barClose", "barVolume",
  "priceAtDecision", "closeAtDecision", "lastPrice",
]);

export type ReprintVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string; readonly offending: readonly string[] };

/**
 * Does this payload reprint a bar?
 *
 * Applies to passports AND receipts, because the law names both. A caller that
 * needs the numbers reads the CanonicalBar by id — which is one extra hop and
 * is the entire point of the hop.
 */
export function checkNoReprint(payload: Readonly<Record<string, unknown>>): ReprintVerdict {
  const offending = Object.keys(payload).filter((k) =>
    REPRINTED_BAR_FIELDS.includes(k),
  );
  if (offending.length === 0) return { ok: true };
  return {
    ok: false,
    offending: Object.freeze(offending),
    reason:
      `This payload reprints the bar (${offending.join(", ")}). A record holding its `
      + "own open and close is a second past that cannot be corrected: when the "
      + "provider revises that bar the chart moves and this does not. Hold barId.",
  };
}

/* ── PASSPORT REMEMBERS, RECEIPT FREEZES ───────────────────────────────────── */

/**
 * The frozen half. `frozenAt` is the moment, and everything beside it is what
 * was true THEN — never what is true now.
 */
export interface DecisionReceipt {
  readonly decisionId: string;
  readonly barId: string;
  readonly objectId: string;
  readonly frozenAt: number;
  /** The gate verdict AS RECORDED. Never recomputed on read. */
  readonly gateSnapshot: string;
  /** The stance the human took. */
  readonly stance: string;
}

export type FreezeVerdict =
  | { readonly ok: true; readonly receipt: DecisionReceipt }
  | { readonly ok: false; readonly reason: string };

/**
 * Freeze a receipt against a chain.
 *
 * Note what this does NOT accept: a `now`. A receipt is stamped with the
 * moment the decision happened, supplied by the caller who witnessed it. If
 * this function read a clock, a receipt re-freezing on a later read would move
 * its own timestamp, which is the exact drift the law forbids.
 */
export function freezeReceipt(input: {
  readonly chain: InspectChain;
  readonly frozenAt: number;
  readonly gateSnapshot: string;
  readonly stance: string;
}): FreezeVerdict {
  const { chain } = input;
  if (!chain.objectId || !chain.decisionId) {
    return {
      ok: false,
      reason: "A receipt needs the whole chain — bar, object and decision.",
    };
  }
  if (!Number.isFinite(input.frozenAt)) {
    return { ok: false, reason: "A receipt without a finite frozenAt is not frozen to anything." };
  }
  if (input.gateSnapshot.trim() === "" || input.stance.trim() === "") {
    return {
      ok: false,
      reason:
        "A receipt with an empty gate snapshot or stance records that something "
        + "happened without recording what. An audit trail of blanks is not one.",
    };
  }
  return {
    ok: true,
    receipt: {
      decisionId: chain.decisionId,
      barId: chain.barId,
      objectId: chain.objectId,
      frozenAt: input.frozenAt,
      gateSnapshot: input.gateSnapshot.trim(),
      stance: input.stance.trim(),
    },
  };
}

export type DriftVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/**
 * Has a receipt drifted from what it froze?
 *
 * The bug this catches is not malice, it is a re-render. A surface that
 * rebuilds its receipt from today's gates on every read produces a document
 * that always agrees with the present — which reads as a perfect audit trail
 * and is the opposite of one.
 *
 * Compared field by field rather than by identity, because the drift arrives
 * through a NEW object with the same decisionId.
 */
export function checkReceiptFrozen(
  stored: DecisionReceipt,
  recomputed: DecisionReceipt,
): DriftVerdict {
  if (stored.decisionId !== recomputed.decisionId) {
    return { ok: false, reason: "These are receipts for two different decisions." };
  }
  for (const field of ["barId", "objectId", "frozenAt", "gateSnapshot", "stance"] as const) {
    if (stored[field] !== recomputed[field]) {
      return {
        ok: false,
        reason:
          `Receipt ${stored.decisionId} has drifted on ${field}: froze `
          + `"${String(stored[field])}", now reads "${String(recomputed[field])}". `
          + "Receipt freezes — a record re-derived on read is a mirror, not an audit trail.",
      };
    }
  }
  return { ok: true };
}

/**
 * The passport's opposite obligation, stated as a check so it is testable.
 *
 * An object's memory must be allowed to GROW. This refuses a passport update
 * that goes backwards — fewer tests than before, or an asOf in the past —
 * because that is a stale read overwriting a fresh one, the same out-of-order
 * bug `admitReconPacket` and `admitBar` each catch at their own door.
 */
export function checkPassportRemembers(
  before: { readonly tests: number; readonly asOf: number },
  after: { readonly tests: number; readonly asOf: number },
): DriftVerdict {
  if (!Number.isFinite(after.asOf) || !Number.isFinite(after.tests)) {
    return { ok: false, reason: "A passport update without finite memory cannot be ordered." };
  }
  if (after.asOf < before.asOf) {
    return {
      ok: false,
      reason:
        "This passport update is older than what it would replace. Passport "
        + "remembers; a stale read must not overwrite a fresh one.",
    };
  }
  if (after.tests < before.tests) {
    return {
      ok: false,
      reason:
        `Test count fell from ${before.tests} to ${after.tests}. An object's memory `
        + "accumulates — a passport that forgets a test is a fossil, not a record.",
    };
  }
  return { ok: true };
}
