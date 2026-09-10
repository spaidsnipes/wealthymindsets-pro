/**
 * THE WRITE ARROW — a decision made on this device becomes a decision the
 * account has.
 *
 * `ab6595a` gave the shared authority a read arrow. `1588556` gave the trader
 * a real DECISION_ID at the moment he presses submit. Between the two there
 * was still nothing that carried the second to the first, so the id existed
 * only in this browser's memory and a second device asking about it would
 * truthfully get NOT_RECORDED forever.
 *
 * ── WHAT THIS DOES AND DOES NOT CLAIM ────────────────────────────────────────
 *
 * It records INTENT: that this decision exists, what the human wanted, and
 * which device witnessed it. §11 — "everyone else writes intent" — and the
 * `ClientIntentWrite` type physically cannot carry quantity, fills, or
 * protection state, so this cannot become a device pretending to be a broker.
 *
 * IT DOES NOT MAKE THE PAPER BOOK SHARED, and nothing here may be read as
 * saying so. `PAPER_STORE_FACTS.serverAuthority` is still null, positions and
 * cash are still per-browser, and `selectCapitalReach` must keep computing
 * THIS_BROWSER_ONLY. H16 stays CROSS-DEVICE BLOCKED for capital. What changes
 * is narrower and true: the decision now has a home outside this tab.
 *
 * ── WHY FAILURE IS NOT AN ERROR ──────────────────────────────────────────────
 *
 * The trader's order is already placed by the time this runs. If the network
 * is down, the honest outcome is UNRECORDED — the decision happened and WM
 * failed to write it down. That is a real state with a real consequence (the
 * phone will not see this decision), and it is reported as such rather than
 * thrown, swallowed, or retried into a lie. §8 forbids ERROR/FAILED for a
 * designed boundary.
 *
 * THE ONE THING IT MUST NEVER DO is report RECORDED when it does not know.
 * A false RECORDED is how a trader comes to believe his phone will show a
 * position it will not show.
 */

import type { ClientIntentWrite } from "./sharedPositionAuthority";
import type { DecisionId } from "./decisionIdentity";

export type IntentRecordStatus =
  /** The authority accepted it. A second device can now read this decision. */
  | "RECORDED"
  /** WM could not reach or convince the authority. The decision is local-only. */
  | "UNRECORDED";

export interface IntentRecordResult {
  readonly status: IntentRecordStatus;
  /** Words a surface may show the trader. Never "error", never "failed". */
  readonly note: string;
}

export interface RecordIntentInput {
  readonly decisionId: DecisionId;
  /** The human's purpose (§5 STEP 5) — never a broker primitive like "MKT". */
  readonly intent: string;
  readonly deviceId: string;
}

const UNREACHED: IntentRecordResult = {
  status: "UNRECORDED",
  note:
    "This decision was made on this device and WM could not write it to the "
    + "shared record. Your other devices will not see it until it is written.",
};

/**
 * `fetchImpl` is injected so the Sentinels never touch the network and so the
 * transport can be swapped without this module learning about React.
 */
export async function recordDecisionIntent(
  input: RecordIntentInput,
  fetchImpl: typeof fetch = fetch,
): Promise<IntentRecordResult> {
  if (input.deviceId.trim() === "") {
    return {
      status: "UNRECORDED",
      note:
        "This device could not name itself, so WM did not claim a decision on "
        + "its behalf. The decision is held on this device only.",
    };
  }

  /**
   * baseReconVersion 0 — this is the decision's FIRST write, so the record it
   * is amending is the empty one. If a record already exists at this id the
   * authority returns REJECT_STALE and this reports UNRECORDED, which is the
   * correct answer: a second birth for one decision id is not something to
   * paper over by re-reading and retrying, it means two devices both think
   * they invented the same decision.
   */
  const write: ClientIntentWrite = {
    role: "CLIENT_INTENT",
    decisionId: input.decisionId,
    baseReconVersion: 0,
    intent: input.intent,
    deviceId: input.deviceId,
  };

  let response: Response;
  try {
    response = await fetchImpl("/api/decision-position", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(write),
    });
  } catch {
    return UNREACHED;
  }

  if (!response.ok) return UNREACHED;

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    // A 200 WM cannot read is not a 200 WM may believe.
    return UNREACHED;
  }

  const receipt = readWriteReceipt(body);
  // This call always proposes the first version (base 0), so only the
  // authority-minted version 1 proves that exact write landed.  A bare
  // ACCEPT, a malformed version, or a version from another write is not an
  // acknowledgement WM may turn into cross-device certainty.
  if (receipt.verdict !== "ACCEPT" || receipt.nextReconVersion !== 1) {
    return UNREACHED;
  }

  return {
    status: "RECORDED",
    note: "This decision is on the shared record. Your other devices can see it.",
  };
}

function readWriteReceipt(body: unknown): {
  readonly verdict: string | null;
  readonly nextReconVersion: number | null;
} {
  if (typeof body !== "object" || body === null) {
    return { verdict: null, nextReconVersion: null };
  }
  const record = body as Record<string, unknown>;
  return {
    verdict: typeof record.verdict === "string" ? record.verdict : null,
    nextReconVersion:
      typeof record.nextReconVersion === "number"
      && Number.isSafeInteger(record.nextReconVersion)
      && record.nextReconVersion > 0
        ? record.nextReconVersion
        : null,
  };
}
