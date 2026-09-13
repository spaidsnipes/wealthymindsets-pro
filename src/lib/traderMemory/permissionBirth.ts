/**
 * permissionBirth — the missing half of DECISION_ID birth.
 *
 * ── Why this file exists ─────────────────────────────────────────────────────
 *
 * `decisionIdentity.ts` names TWO lawful births: `EXPLICIT_INTENT` and
 * `PERMISSION_GRANTED`. Only the first has ever been called from production —
 * `OptionExpressionIntent.tsx` mints on a press. Grep for `PERMISSION_GRANTED`
 * outside the owner and its test and you find nothing. So a decision could only
 * be born by reaching for an option chain, and the trader who sits with the
 * chart while their own rules stop limiting them had no identity at all. Every
 * later step phrased as "the SAME decision" therefore had nothing to attach to
 * on the primary surface.
 *
 * ── The trap this module refuses ─────────────────────────────────────────────
 *
 * The identity owner is explicit that birth is an EVENT:
 *
 *   "`computeRightOfWay` returns ACTION whenever permission reads ALLOWED. It
 *    is a pure derivation, recomputed on every render. Minting an id there
 *    would produce a new identity per frame — the exact opposite of identity."
 *
 * A surface that mints whenever it observes `permission.verdict === "ALLOWED"`
 * has done exactly that, one indirection out. This module exists so the
 * difference between a READING and a CROSSING is written down once, in a pure
 * function, with tests — instead of being re-judged by each surface that wants
 * a decision id.
 *
 * ── Why UNKNOWN is not a prior reading ───────────────────────────────────────
 *
 * `selectPermission` emits UNKNOWN when "inputs insufficient to evaluate any
 * rule." On a cold page load the compiler therefore emits UNKNOWN first and
 * ALLOWED a tick later, once quotes arrive. If UNKNOWN→ALLOWED counted as a
 * crossing, a decision would be born on essentially EVERY page load — a
 * reading wearing an event's clothes, which is the precise failure the identity
 * owner wrote its §"Birth is an EVENT" section to prevent.
 *
 * Nothing was granted in that sequence. The rules were never evaluated and then
 * relaxed; they were simply un-evaluatable and then evaluatable. So UNKNOWN is
 * treated as the ABSENCE of a prior reading, identically to `null`.
 *
 * A real grant is narrower and is an actual change in the trader's standing:
 * the rules WERE evaluated, WERE limiting (ADVISORY or RESTRICTED), and then
 * stopped. That is the only shape this module calls a crossing.
 *
 * PURE MODULE — no React, no I/O, no clock. Consumers inject nowMs and nonce,
 * exactly as `mintDecisionId` requires.
 */

import {
  mintDecisionId,
  type MintResult,
} from "./decisionIdentity";
import type { PermissionVerdict } from "./viewModels/selectPermission";

/**
 * What happened between two permission readings.
 *
 * Modelled as a named verdict rather than a boolean so the two DIFFERENT
 * reasons for "no birth" stay distinguishable at the call site. A surface that
 * wants to disclose "no decision has been born yet" honestly needs to know
 * whether that is because nothing has been observed, or because something was
 * observed and simply did not change.
 */
export type PermissionCrossing =
  /** First evaluable reading. A reading is not an event — no birth. */
  | "NO_PRIOR_READING"
  /** Rules were limiting and stopped limiting. The one lawful grant. */
  | "CROSSED_INTO_GRANTED"
  /** Something changed, or nothing did, but permission was not granted. */
  | "NOT_A_CROSSING";

/**
 * The only verdict that means the trader's rules currently permit
 * participation. Named so the comparison is not spelled inline at two sites
 * and quietly widened at one of them.
 */
const GRANTED: PermissionVerdict = "ALLOWED";

/**
 * Was a prior verdict an actual evaluation? UNKNOWN is not — see the header.
 */
function isEvaluated(v: PermissionVerdict | null): v is PermissionVerdict {
  return v !== null && v !== "UNKNOWN";
}

/** Classify the step between two consecutive permission readings. */
export function classifyPermissionCrossing(
  prev: PermissionVerdict | null,
  next: PermissionVerdict,
): PermissionCrossing {
  if (next !== GRANTED) return "NOT_A_CROSSING";
  if (!isEvaluated(prev)) return "NO_PRIOR_READING";
  if (prev === GRANTED) return "NOT_A_CROSSING";
  return "CROSSED_INTO_GRANTED";
}

export interface PermissionBirthInput {
  readonly prev: PermissionVerdict | null;
  readonly next: PermissionVerdict;
  readonly deviceId: string;
  /** Injected. `Date.now()` is never read here. */
  readonly nowMs: number;
  /** Injected opaque uniqueness — a UUID from the caller's crypto. */
  readonly nonce: string;
}

export type PermissionBirthOutcome =
  | { readonly born: false; readonly crossing: PermissionCrossing }
  | { readonly born: true; readonly crossing: "CROSSED_INTO_GRANTED"; readonly mint: MintResult };

/**
 * Mint a DECISION_ID if — and only if — permission just crossed into granted.
 *
 * The mint's own refusals (bad clock, missing witness, broker-shaped nonce) are
 * NOT swallowed here: the `MintResult` is handed back intact, so a caller that
 * supplied a bad seed learns the reason instead of silently getting no id and
 * concluding no crossing occurred. Those are different facts and the caller has
 * to be able to tell them apart.
 */
export function birthOnPermissionCrossing(
  input: PermissionBirthInput,
): PermissionBirthOutcome {
  const crossing = classifyPermissionCrossing(input.prev, input.next);
  if (crossing !== "CROSSED_INTO_GRANTED") return { born: false, crossing };
  return {
    born: true,
    crossing,
    mint: mintDecisionId({
      cause: "PERMISSION_GRANTED",
      deviceId: input.deviceId,
      nowMs: input.nowMs,
      nonce: input.nonce,
    }),
  };
}
