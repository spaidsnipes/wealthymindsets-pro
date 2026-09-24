/**
 * FROZEN asOf RECEIPT — H-1001 / F20 · V22.
 *
 * Sheet H-1001: "Receipt card torn from same DECISION_ID. Journal receipt
 * cannot rewrite asOf. Journal receipt is immutable. asOf is frozen at
 * receipt. Past cannot be rewritten."
 *
 * A receipt is TORN by the trader (an explicit press, never a render) from
 * the decision born on this camera, and freezes what was true at that
 * instant: the plan bracketed on price, the price, the plan's state on the
 * bars, and the permission gates. After the tear:
 *
 *   · asOf is never re-stamped — a second tear for the same decision is
 *     REFUSED and hands back the receipt that already exists;
 *   · the stored receipt is never overwritten or edited;
 *   · FILL is always "NO_FILL" here — the chart executes nothing, so the
 *     receipt says so instead of printing a fill price.
 *
 * Held on THIS device, owner-scoped (`wm:risk-receipt:`, cleared at sign-out
 * with every owner's local data). Purging a device is not rewriting history;
 * printing a different asOf would be.
 *
 * PURE except the storage port the caller hands in.
 */

import type { RiskOnPriceVM, RiskState } from "../marketData/viewModels/selectRiskOnPrice";

export const RISK_RECEIPT_VERSION = 1 as const;
export const RISK_RECEIPT_KEY_PREFIX = "wm:risk-receipt:v1:";

export interface RiskReceipt {
  readonly version: typeof RISK_RECEIPT_VERSION;
  readonly decisionId: string;
  readonly decisionBornAt: number;
  readonly decisionBornFrom: string;
  /** The instant of the tear. Frozen; never re-stamped. */
  readonly asOf: number;
  readonly symbol: string;
  readonly timeframe: string;
  readonly plan: {
    readonly side: "LONG" | "SHORT";
    readonly entry: number;
    readonly stop: number;
    readonly target: number | null;
    readonly riskPerUnit: number;
    readonly riskPct: number;
    readonly rr: number | null;
  };
  readonly priceAtTear: number | null;
  readonly stateAtTear: RiskState | null;
  readonly fill: "NO_FILL";
  readonly gates: {
    readonly verdict: string;
    readonly rules: readonly { readonly label: string; readonly engaged: boolean }[];
  };
}

export interface TearInput {
  readonly decision: { readonly decisionId: string; readonly bornAt: number; readonly bornFrom: string } | null;
  readonly risk: RiskOnPriceVM;
  readonly symbol: string;
  readonly timeframe: string;
  readonly gates: RiskReceipt["gates"];
  /** Injected; the clock is never read here. */
  readonly nowMs: number;
}

export type TearResult =
  | { readonly ok: true; readonly receipt: RiskReceipt }
  | { readonly ok: false; readonly reason: string };

function deepFreeze<T>(v: T): T {
  if (v && typeof v === "object" && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const k of Object.keys(v as object)) deepFreeze((v as Record<string, unknown>)[k]);
  }
  return v;
}

export function tearRiskReceipt(input: TearInput): TearResult {
  if (!input.decision) {
    return { ok: false, reason: "No DECISION_ID on this camera — a receipt is torn from a born decision, never from nothing." };
  }
  const r = input.risk;
  if (!r.drawn || r.side == null || r.entry == null || r.stop == null || r.riskPerUnit == null || r.riskPct == null) {
    return { ok: false, reason: "No plan bracketed on price — draw a Long / Short Position with a stop first." };
  }
  if (!Number.isFinite(input.nowMs)) return { ok: false, reason: "The tear has no finite instant — asOf cannot be unknown." };
  return {
    ok: true,
    receipt: deepFreeze({
      version: RISK_RECEIPT_VERSION,
      decisionId: input.decision.decisionId,
      decisionBornAt: input.decision.bornAt,
      decisionBornFrom: input.decision.bornFrom,
      asOf: input.nowMs,
      symbol: input.symbol,
      timeframe: input.timeframe,
      plan: { side: r.side, entry: r.entry, stop: r.stop, target: r.target, riskPerUnit: r.riskPerUnit, riskPct: r.riskPct, rr: r.rr },
      priceAtTear: r.live?.price ?? null,
      stateAtTear: r.state,
      fill: "NO_FILL",
      gates: { verdict: input.gates.verdict, rules: input.gates.rules.map(g => ({ label: g.label, engaged: g.engaged })) },
    }),
  };
}

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function riskReceiptKey(owner: string | null | undefined, decisionId: string | null | undefined): string | null {
  const o = owner?.trim() ?? "", d = decisionId?.trim() ?? "";
  if (!o || !d) return null;
  return `${RISK_RECEIPT_KEY_PREFIX}${encodeURIComponent(o)}:${encodeURIComponent(d)}`;
}

function isReceipt(v: unknown): v is RiskReceipt {
  if (!v || typeof v !== "object") return false;
  const x = v as Record<string, unknown>;
  const plan = x.plan as Record<string, unknown> | undefined;
  return x.version === RISK_RECEIPT_VERSION && typeof x.decisionId === "string" && typeof x.asOf === "number"
    && Number.isFinite(x.asOf) && x.fill === "NO_FILL" && !!plan && typeof plan.entry === "number" && typeof plan.stop === "number";
}

/** The receipt already torn for this decision, or null (none, or unreadable). */
export function readRiskReceipt(storage: StoragePort | null, owner: string | null | undefined, decisionId: string | null | undefined): RiskReceipt | null {
  const key = riskReceiptKey(owner, decisionId);
  if (!key || !storage) return null;
  try {
    const raw = storage.getItem(key);
    if (raw == null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isReceipt(parsed) && parsed.decisionId === decisionId ? deepFreeze(parsed) : null;
  } catch {
    return null;
  }
}

export type WriteResult =
  | { readonly ok: true; readonly receipt: RiskReceipt }
  | { readonly ok: false; readonly reason: "ALREADY_TORN"; readonly existing: RiskReceipt }
  | { readonly ok: false; readonly reason: "NOT_DURABLE" };

/**
 * Write once. An existing receipt for this decision is returned untouched and
 * the new one is refused — the first asOf stands. The write is read back
 * before success is claimed.
 */
export function writeRiskReceiptOnce(storage: StoragePort | null, owner: string | null | undefined, receipt: RiskReceipt): WriteResult {
  const key = riskReceiptKey(owner, receipt.decisionId);
  if (!key || !storage) return { ok: false, reason: "NOT_DURABLE" };
  const existing = readRiskReceipt(storage, owner, receipt.decisionId);
  if (existing) return { ok: false, reason: "ALREADY_TORN", existing };
  try {
    const raw = JSON.stringify(receipt);
    storage.setItem(key, raw);
    if (storage.getItem(key) !== raw) return { ok: false, reason: "NOT_DURABLE" };
    return { ok: true, receipt };
  } catch {
    return { ok: false, reason: "NOT_DURABLE" };
  }
}
