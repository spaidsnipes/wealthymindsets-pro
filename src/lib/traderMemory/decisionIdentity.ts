/**
 * DECISION IDENTITY — WHO THE DECISION IS, FOR ITS WHOLE LIFE.
 *
 * ── The missing primitive ────────────────────────────────────────────────────
 *
 * The shared authority can now be written to and read from. The migration
 * holds eight columns keyed by `decision_id`. `sharedPositionAuthority.ts`
 * says who may write which of them. And yet nothing in `src/` has ever
 * produced a DECISION_ID. `sealDecision` has zero production callers. The
 * artery has a body and no head.
 *
 * That absence is why BUILD ORDER steps 5, 6, 9 and 10 cannot move: every one
 * of them is phrased as "the SAME decision, later." Without an identity owner
 * there is no same.
 *
 * ── The aliasing trap this module exists to refuse ───────────────────────────
 *
 * The tempting shortcut is to mint the id where orders are already minted —
 * inside the order path, reusing or deriving from the broker's order id. It
 * would compile, it would look wired, and it would be wrong, because TEAM
 * BUILD PROMPT §4 says what a DECISION_ID must survive:
 *
 *   "Born at permission or first explicit intent. Never changes through
 *    reject, retry attempt, partial, protect, replace, exit, receipt."
 *
 * A broker order id changes at every one of those. A rejected order is
 * followed by a retry with a NEW broker id — and if that is the decision id,
 * then the retry is a different decision, the journal shows two, the receipt
 * cannot be written, and the phone asking about the first id gets
 * NOT_RECORDED for a position that is open. The id would be a label, not an
 * identity.
 *
 * So this module makes the trap unrepresentable rather than discouraged:
 * `mintDecisionId` will not accept a broker-shaped id as a seed, and the
 * child-id types are nominally distinct from `DecisionId`, so a broker order
 * id cannot be passed where a decision id is expected. §H21: one owner per
 * rule.
 *
 * ── Birth is an EVENT, not a reading ─────────────────────────────────────────
 *
 * `computeRightOfWay` returns ACTION whenever permission reads ALLOWED. It is
 * a pure derivation, recomputed on every render. Minting an id there would
 * produce a new identity per frame — the exact opposite of identity. §4's two
 * birth causes are both *acts*: permission being GRANTED (a transition, not a
 * state) and the human's first explicit intent. `DecisionBirth` therefore
 * carries which act occurred, and there is no way to mint without naming one.
 *
 * PURE MODULE — no React, no I/O, no Supabase. The clock and the randomness
 * are INJECTED, never read from ambient globals, so identity is reproducible
 * in a test and cannot vary between the server that mints and the client that
 * reads.
 */

export const DECISION_IDENTITY_LAW_VERSION = "wm.decision-identity.v1" as const;

/**
 * The two acts §4 permits as a birth. Both are transitions performed by or for
 * the human — neither is a state a selector can find itself in.
 */
export type DecisionBirthCause =
  /** Permission crossed into GRANTED. Not "permission is currently ALLOWED". */
  | "PERMISSION_GRANTED"
  /** The human's first explicit intent — a press, not an inference. */
  | "EXPLICIT_INTENT";

/**
 * Nominal type. A plain `string` cannot be passed where a DecisionId is
 * required, which is what stops a broker order id from becoming one by
 * accident three refactors from now.
 */
export type DecisionId = string & { readonly __brand: "DecisionId" };

/** The six child-id kinds §4 allows. There is no seventh. */
export const DECISION_CHILD_KINDS = [
  "executionAttemptIds",
  "brokerOrderIds",
  "fillIds",
  "protectionOrderIds",
  "receiptId",
  "originShadowDecisionId",
] as const;

export type DecisionChildKind = (typeof DECISION_CHILD_KINDS)[number];

export interface DecisionIdentity {
  readonly lawVersion: typeof DECISION_IDENTITY_LAW_VERSION;
  readonly decisionId: DecisionId;
  readonly bornAt: number;
  readonly bornFrom: DecisionBirthCause;
  /** The device that witnessed the birth. Not an owner — a witness. */
  readonly bornOnDeviceId: string;
}

export interface MintDecisionIdInput {
  readonly cause: DecisionBirthCause;
  readonly deviceId: string;
  /** Injected. `Date.now()` is never read here. */
  readonly nowMs: number;
  /**
   * Injected opaque uniqueness — a UUID from the caller's crypto. It must not
   * be derived from anything the broker or the order path knows.
   */
  readonly nonce: string;
}

export type MintResult =
  | { readonly ok: true; readonly identity: DecisionIdentity }
  | { readonly ok: false; readonly reason: string };

/**
 * Shapes a broker order id takes at the venues WM talks to. A seed matching
 * any of these is refused outright: it means the caller is standing in the
 * order path trying to name a decision after an order.
 */
const BROKER_ID_SHAPES: readonly RegExp[] = [
  /^ord[-_]/i,
  /^order[-_]/i,
  /^bro?k(er)?[-_]/i,
  /^fill[-_]/i,
  /^exec[-_]/i,
];

/**
 * Mint the identity. Returns a REASON on refusal rather than throwing, so the
 * caller cannot swallow the refusal with a try/catch and carry on with an id
 * it invented itself.
 */
export function mintDecisionId(input: MintDecisionIdInput): MintResult {
  if (!Number.isFinite(input.nowMs)) {
    return { ok: false, reason: "Birth time is not a finite instant — a decision cannot be born at an unknown time." };
  }
  if (input.deviceId.trim() === "") {
    return { ok: false, reason: "No device witnessed this birth." };
  }
  if (input.nonce.trim() === "") {
    return { ok: false, reason: "No uniqueness was supplied — two decisions would collide." };
  }
  if (BROKER_ID_SHAPES.some((shape) => shape.test(input.nonce.trim()))) {
    return {
      ok: false,
      reason:
        "The uniqueness supplied looks like a broker/order/fill id. A decision "
        + "may not be named after an order: the order changes on every reject "
        + "and retry, and the decision does not.",
    };
  }

  return {
    ok: true,
    identity: {
      lawVersion: DECISION_IDENTITY_LAW_VERSION,
      decisionId: `wmd_${input.nonce.trim()}` as DecisionId,
      bornAt: input.nowMs,
      bornFrom: input.cause,
      bornOnDeviceId: input.deviceId.trim(),
    },
  };
}

/**
 * The reader-side half of the mint. Does this untrusted value carry a decision
 * identity this system would have been willing to MINT?
 *
 * WHY THIS EXISTS. `DecisionId` is a nominal brand, and a brand is only worth
 * the checks performed at the places untrusted bytes cross into it. Paper-book
 * records come back from localStorage as `JSON.parse` output and are asserted
 * to be `Order` / `Trade` by predicates that never looked at `decisionId` at
 * all — so a persisted `decisionId: 42`, `decisionId: ""`, or a hand-edited
 * `decisionId: "wmd_ord-9"` was accepted and handed downstream wearing a brand
 * that promised it had been minted. Nothing downstream re-checks, because the
 * type says it does not have to. That is a brand that lies.
 *
 * SYMMETRY IS THE WHOLE POINT: this is defined against the SAME
 * `BROKER_ID_SHAPES` list `mintDecisionId` refuses, not a second hand-written
 * list that can drift away from it. What the minter will not produce, the
 * reader will not accept. If the two ever disagree, an id the law forbids
 * could re-enter the system through the back door of persistence — which is
 * precisely the §4 failure the brand was introduced to prevent.
 *
 * Absence is NOT handled here. `undefined` is not a DecisionId, and this
 * returns false for it. The H1 rule — absence is not zero and is not a fresh
 * id either — is the CALLER's to honour: an optional field must test presence
 * first and disclose absence, never route it through here and mint over it.
 */
export function isDecisionId(v: unknown): v is DecisionId {
  if (typeof v !== "string") return false;
  if (!v.startsWith("wmd_")) return false;
  const nonce = v.slice("wmd_".length);
  // The minter trims before joining, so a minted id never carries edge
  // whitespace. An id that does was not produced by this mint.
  if (nonce === "" || nonce.trim() !== nonce) return false;
  return !BROKER_ID_SHAPES.some((shape) => shape.test(nonce));
}

/**
 * The events §4 says an identity must SURVIVE. Named as data so the survival
 * rule can be tested exhaustively rather than by whichever three a reviewer
 * happened to think of.
 */
export const SURVIVED_EVENTS = [
  "REJECT",
  "RETRY_ATTEMPT",
  "PARTIAL",
  "PROTECT",
  "REPLACE",
  "EXIT",
  "RECEIPT",
] as const;

export type SurvivedEvent = (typeof SURVIVED_EVENTS)[number];

/**
 * The identity after an event. This is deliberately the IDENTITY FUNCTION for
 * every event in §4's list — the point is not that it computes something, it
 * is that it EXISTS, so that any future code reaching for "the decision id
 * after a reject" finds a function that hands back the same one instead of
 * inventing a fresh mint at the call site.
 *
 * A function that provably does nothing is the cheapest way to make doing
 * something require deleting a rule rather than forgetting one.
 */
export function decisionIdAfter(identity: DecisionIdentity, _event: SurvivedEvent): DecisionId {
  return identity.decisionId;
}

export type ChildIdVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/**
 * Guard for attaching a child id. The only structural rule §4 gives is that
 * children are children — a child id may never equal the decision id, because
 * then the parent would be reachable through the child's lifecycle and would
 * inherit its mortality.
 */
export function checkChildId(
  identity: DecisionIdentity,
  kind: DecisionChildKind,
  childId: string,
): ChildIdVerdict {
  if (childId.trim() === "") {
    return { ok: false, reason: `Empty ${kind} — an absent child may not be recorded as a present one.` };
  }
  if (childId.trim() === identity.decisionId) {
    return {
      ok: false,
      reason:
        `A ${kind} entry may not be the decision id itself. The child dies at `
        + "reject, replace, or exit; the decision does not, and sharing the id "
        + "would take the decision down with it.",
    };
  }
  return { ok: true };
}
