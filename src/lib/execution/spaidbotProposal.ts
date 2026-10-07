/**
 * SPAIDBOT — OBSERVE → PROPOSE → (explicitly authorized execution). Garden 19 §24.
 * Tonight SpaidBot stops at PROPOSE. PURE.
 *
 * A proposal is a plan the trader can LOAD into the chart ticket — never an
 * order. Loading it stages entry / stop / target lines as STAGED; the trader
 * still previews (tastytrade dry run + the server gate), reads the confirm
 * sheet, and presses send. SpaidBot has no send path, no access to the server
 * limits, and cannot widen its own permission: `permission` is a literal type
 * with one value, and `validateProposal` refuses anything else.
 *
 * Every proposal carries what §24 requires of an automated order, so the
 * trail exists before any send could: Decision_ID, ORDER_INTENT_ID, evidence /
 * reason, permission basis, broker / account (named by the trader at load, not
 * by SpaidBot), risk boundary, and an audit trail. The broker ack and the
 * reconciliation are added by the order-submit route and the readback, never
 * by SpaidBot.
 */

export const SPAIDBOT_PERMISSION = "PROPOSE_ONLY" as const;

export interface SpaidBotProposal {
  readonly kind: "SPAIDBOT_PROPOSAL";
  readonly proposalId: string;
  /** The decision this proposal belongs to (`wmd_…`). Required — no orphan proposals. */
  readonly decisionId: string;
  /** The order intent the ticket will carry as its client order id stem (`wmi_…`). */
  readonly orderIntentId: string;
  /** The chart symbol it was made on (`NQ1!`) — the ticket resolves the dated contract itself. */
  readonly chartSymbol: string;
  readonly side: "BUY" | "SELL";
  readonly entryPx: number;
  readonly stopPx: number;
  readonly targetPx: number | null;
  /** A suggested size. The ticket clamps it to the server caps; it never raises them. */
  readonly qty: number;
  readonly reason: string;
  /** Observations, each with where it came from. At least one. */
  readonly evidence: readonly { readonly claim: string; readonly source: string }[];
  readonly permission: typeof SPAIDBOT_PERMISSION;
  /** What SpaidBot believed the bound on loss was, in USD, when it proposed. Re-checked by the gate. */
  readonly riskBoundaryUsd: number | null;
  readonly createdAtMs: number;
  /** Proposals age out: a stale plan is not loaded. */
  readonly expiresAtMs: number;
  readonly audit: readonly { readonly atMs: number; readonly event: "PROPOSED" | "LOADED_INTO_TICKET" | "DISMISSED" | "EXPIRED"; readonly by: "SPAIDBOT" | "TRADER" }[];
}

export type ProposalVerdict = { readonly ok: true } | { readonly ok: false; readonly reasons: readonly string[] };

const pos = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;

export function validateProposal(p: SpaidBotProposal, nowMs: number): ProposalVerdict {
  const reasons: string[] = [];
  if (p.kind !== "SPAIDBOT_PROPOSAL") reasons.push("Not a SpaidBot proposal.");
  if (p.permission !== SPAIDBOT_PERMISSION) reasons.push("SpaidBot may only PROPOSE. Any other permission is refused — it cannot widen itself.");
  if (!/^wmd_\S+$/.test(p.decisionId)) reasons.push("No Decision_ID: a proposal must belong to a decision.");
  if (!/^wmi_[A-Za-z0-9_-]{6,56}$/.test(p.orderIntentId)) reasons.push("No ORDER_INTENT_ID.");
  if (!p.reason.trim()) reasons.push("No reason given.");
  if (!p.evidence.length || p.evidence.some(e => !e.claim.trim() || !e.source.trim())) reasons.push("Every proposal names its evidence and where each piece came from.");
  if (!pos(p.entryPx) || !pos(p.stopPx)) reasons.push("Entry and stop must be prices above zero.");
  else if (p.side === "BUY" ? p.stopPx >= p.entryPx : p.stopPx <= p.entryPx) reasons.push("The stop is on the wrong side of the entry.");
  if (p.targetPx != null && pos(p.entryPx) && (p.side === "BUY" ? p.targetPx <= p.entryPx : p.targetPx >= p.entryPx)) reasons.push("The target is on the wrong side of the entry.");
  if (!(Number.isInteger(p.qty) && p.qty > 0)) reasons.push("Quantity must be a whole number above zero.");
  if (nowMs > p.expiresAtMs) reasons.push("This proposal has expired. Ask for a fresh one.");
  return reasons.length ? { ok: false, reasons } : { ok: true };
}

export interface ProposalTicket {
  readonly side: "BUY" | "SELL";
  readonly qty: number;
  readonly entryType: "Limit";
  readonly limitPx: number;
  readonly stopPx: number;
  readonly targetPx: number | null;
  readonly decisionId: string;
  readonly orderIntentId: string;
  readonly provenance: string;
}

/**
 * The ticket fields a valid proposal loads. Size is clamped to the server's
 * per-order contract cap when one is known; an unknown cap loads the proposal
 * at its own size and the gate refuses at preview, in words.
 */
export function proposalToTicket(p: SpaidBotProposal, maxQty: number | null, nowMs: number): { ok: true; ticket: ProposalTicket } | { ok: false; reasons: readonly string[] } {
  const v = validateProposal(p, nowMs);
  if (!v.ok) return v;
  return {
    ok: true,
    ticket: {
      side: p.side,
      qty: maxQty != null ? Math.min(p.qty, Math.floor(maxQty)) : p.qty,
      entryType: "Limit",
      limitPx: p.entryPx,
      stopPx: p.stopPx,
      targetPx: p.targetPx,
      decisionId: p.decisionId,
      orderIntentId: p.orderIntentId,
      provenance: `SpaidBot proposal ${p.proposalId} · ${SPAIDBOT_PERMISSION} · ${p.reason}`,
    },
  };
}

export function recordProposalEvent(p: SpaidBotProposal, event: SpaidBotProposal["audit"][number]["event"], by: "SPAIDBOT" | "TRADER", atMs: number): SpaidBotProposal {
  return { ...p, audit: [...p.audit, { atMs, event, by }] };
}
