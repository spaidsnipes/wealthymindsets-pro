/**
 * THE READ ARROW — a second device asks the account what it knows about a
 * decision it never witnessed.
 *
 * `102c4df` carried the decision off the device. `9e21897` told the trader
 * when that failed. Both are write-side. The GET handler at
 * `/api/decision-position?decisionId=` has been sitting complete and
 * CALLERLESS: nothing in `src/` has ever asked it a question. A record that
 * can be written and not read is a filing cabinet with no handle.
 *
 * ── THE ASYMMETRY THIS MODULE EXISTS TO HOLD ─────────────────────────────────
 *
 * NOT_RECORDED IS A POSITIVE CLAIM. It says: WM reached your account's shared
 * record, looked under this decision id, and there was nothing there. That is
 * real information — it is how the trader learns his phone will not have this
 * position. It may ONLY be said when the authority said it.
 *
 * Every silence is UNVERIFIED instead: the network threw, the response was
 * unreadable, the status was one this module does not know. A lost connection
 * is not a finding. Collapsing "I could not look" into "there is nothing
 * there" is the exact move H1 forbids — absence is not zero — and it is worse
 * here than anywhere else, because the trader would take a true position for
 * a missing one and act on the difference.
 *
 * ── WHAT IT REFUSES TO INVENT ────────────────────────────────────────────────
 *
 * §11: quantity, fills, execution and protection state are the broker's words
 * or they are absent. `null` survives the whole way through this module and is
 * never defaulted to 0 on the way out. A projection whose position body cannot
 * be read is UNVERIFIED, not a projection full of zeroes.
 *
 * An answer about a DIFFERENT decision is not an answer. If the authority
 * projects a row whose decisionId is not the one asked about, this reports
 * UNVERIFIED rather than handing a surface someone else's position.
 */

import { readClassifiedJsonReceipt } from "../marketData/readJsonReceipt";
import type { DecisionId } from "./decisionIdentity";

export type DecisionProjectionStatus =
  /** The shared record holds this decision and WM read it. */
  | "PROJECTED"
  /** WM reached the record and it holds nothing here. Not a position of zero. */
  | "NOT_RECORDED"
  /** WM could not look, or could not read what came back. Not a finding. */
  | "UNVERIFIED"
  /** A shared book is per-trader. There is nothing to look up yet. */
  | "SIGNED_OUT";

/**
 * §11 / H1. Every broker-owned field is nullable and `null` means ABSENT —
 * never zero, never flat, never "none". Only reconciliation may fill these.
 */
export interface ProjectedPosition {
  readonly decisionId: string;
  readonly reconVersion: number;
  readonly intent: string | null;
  readonly intentDeviceId: string | null;
  readonly quantityFilled: number | null;
  readonly quantityProtected: number | null;
  readonly executionState: string | null;
  readonly protectionState: string | null;
}

export interface DecisionProjection {
  readonly status: DecisionProjectionStatus;
  /** The position, or null. `null` NEVER means flat — read `status` first. */
  readonly position: ProjectedPosition | null;
  /** Words a surface may show. Never "error", never "failed" (§8). */
  readonly note: string;
}

const UNVERIFIED: DecisionProjection = {
  status: "UNVERIFIED",
  position: null,
  note:
    "WM could not read the shared record for this decision, so it is not "
    + "reporting one. This does not mean the position is flat.",
};

const SIGNED_OUT: DecisionProjection = {
  status: "SIGNED_OUT",
  position: null,
  note:
    "A shared record belongs to an account, so WM has nothing to look up "
    + "until you are signed in on this device.",
};

/**
 * `fetchImpl` and `signal` are injected so the Sentinels never touch the
 * network and so this module never learns about React.
 */
export async function projectDecision(
  decisionId: DecisionId | string,
  fetchImpl: typeof fetch = fetch,
  signal: AbortSignal = new AbortController().signal,
): Promise<DecisionProjection> {
  if (typeof decisionId !== "string" || decisionId.trim() === "") {
    // Asking about no decision would return the authority's CAPABILITY probe
    // (the no-decisionId branch of the same route), and reading that as a
    // position would be a category error the trader could never see.
    return UNVERIFIED;
  }

  let receipt;
  try {
    receipt = await readClassifiedJsonReceipt<Record<string, unknown>>(
      fetchImpl,
      `/api/decision-position?decisionId=${encodeURIComponent(decisionId)}`,
      signal,
    );
  } catch {
    return UNVERIFIED;
  }

  if (receipt.status === 401) return SIGNED_OUT;

  const body = receipt.body;
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return UNVERIFIED;
  }

  const status = typeof body.status === "string" ? body.status : null;

  // NOT_RECORDED is the one silence WM is allowed to report as a finding, and
  // only because the authority itself reported it, over a response it was
  // willing to call ok.
  if (receipt.ok && status === "NOT_RECORDED") {
    return {
      status: "NOT_RECORDED",
      position: null,
      note: readNote(body)
        ?? "The shared record holds nothing for this decision. That is not the "
          + "same as a position of size zero.",
    };
  }

  if (receipt.ok && status === "PROJECTED") {
    const position = readPosition(body.position, decisionId);
    // A projection WM cannot read is not a projection WM may report.
    if (position === null) return UNVERIFIED;
    return {
      status: "PROJECTED",
      position,
      note: readNote(body)
        ?? "Every signed-in device projects this record. Nothing here was defaulted.",
    };
  }

  // Includes the route's own 503 UNVERIFIED, any status this module does not
  // know, and any ok response that failed to say which of the two it was.
  return { ...UNVERIFIED, note: readNote(body) ?? UNVERIFIED.note };
}

function readNote(body: Record<string, unknown>): string | null {
  return typeof body.note === "string" && body.note.trim() !== "" ? body.note : null;
}

function readPosition(raw: unknown, askedFor: string): ProjectedPosition | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const p = raw as Record<string, unknown>;

  // An answer about a different decision is not an answer to this question.
  if (p.decisionId !== askedFor) return null;

  const reconVersion = p.reconVersion;
  // A record whose version cannot be read cannot be safely amended later, and
  // the route already refuses to project one. If it arrives anyway, WM does
  // not invent a version to fill the hole.
  if (typeof reconVersion !== "number" || !Number.isFinite(reconVersion)) return null;

  return {
    decisionId: askedFor,
    reconVersion,
    intent: nullableString(p.intent),
    intentDeviceId: nullableString(p.intentDeviceId),
    quantityFilled: nullableNumber(p.quantityFilled),
    quantityProtected: nullableNumber(p.quantityProtected),
    executionState: nullableString(p.executionState),
    protectionState: nullableString(p.protectionState),
  };
}

/** Absent stays absent. A missing value may not become "" on the way in. */
function nullableString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/** H1: absent stays absent. A missing quantity may NEVER become 0. */
function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
