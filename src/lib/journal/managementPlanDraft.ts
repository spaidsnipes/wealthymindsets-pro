/**
 * THE PRE-TRADE PLAN, BEFORE IT IS FROZEN — Garden 19 §27. Storage injected.
 *
 * The plan card (on the live ticket and the paper ticket) keeps what the
 * trader writes BEFORE the trade — invalidation, management conditions,
 * expected hold, context, session — as a DRAFT for the market in view. A draft
 * is editable until the trade exists. At the moment the Decision_ID becomes a
 * trade (the live ticket's send, or the first paper fill of that decision) the
 * draft is merged into the frozen snapshot and consumed.
 *
 * A draft only joins a freeze when it was written BEFORE that moment
 * (`updatedAtMs <= atMs`) and within DRAFT_MAX_AGE_MS of it: a plan typed after
 * the fill is not a pre-trade plan, and yesterday's plan is not today's.
 */

import type { FillCaptureIntent } from "./journalCaptureFromFill";
import { freezePlanSnapshot, planSnapshotFromTicket, type ManagementPlanSnapshot, type TraderPlanInput } from "./managementPlan";
import { sessionPlanForFreeze } from "./managementDayRules";
import { freezePlanOnce, readAllPlans, readPlanForDecision, type FreezeOutcome } from "./managementPlanStore";

export const MANAGEMENT_PLAN_DRAFT_KEY = "wm:management-plan-draft:v1";
export const DRAFT_MAX_AGE_MS = 12 * 3_600_000;

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

export interface PlanDraft {
  readonly symbol: string;
  readonly plan: TraderPlanInput;
  readonly updatedAtMs: number;
}

export const draftKey = (symbol: string | null | undefined): string | null => {
  const s = (symbol ?? "").trim().toUpperCase();
  return s && s.length <= 40 ? s : null;
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.slice(0, 400) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);

function readPlanInput(v: unknown): TraderPlanInput {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    thesis: str(o.thesis), invalidation: str(o.invalidation), invalidationPx: num(o.invalidationPx),
    conditions: Array.isArray(o.conditions) ? o.conditions.filter((c): c is string => typeof c === "string" && c.trim() !== "").slice(0, 12) : null,
    expectedHoldMin: num(o.expectedHoldMin), context: str(o.context), session: str(o.session), riskUsd: num(o.riskUsd),
  };
}

function readDrafts(storage: Storage | null | undefined): Record<string, PlanDraft> {
  if (!storage) return {};
  try {
    const v = JSON.parse(storage.getItem(MANAGEMENT_PLAN_DRAFT_KEY) ?? "{}") as unknown;
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: Record<string, PlanDraft> = {};
    for (const [k, r] of Object.entries(v as Record<string, unknown>)) {
      const o = (r ?? {}) as Record<string, unknown>;
      if (draftKey(k) !== k || typeof o.updatedAtMs !== "number") continue;
      out[k] = { symbol: k, plan: readPlanInput(o.plan), updatedAtMs: o.updatedAtMs };
    }
    return out;
  } catch { return {}; }
}

function writeDrafts(storage: Storage, all: Record<string, PlanDraft>): void {
  try { storage.setItem(MANAGEMENT_PLAN_DRAFT_KEY, JSON.stringify(all)); } catch { /* this visit only */ }
}

export function readDraft(storage: Storage | null | undefined, symbol: string | null | undefined): PlanDraft | null {
  const k = draftKey(symbol);
  return k ? readDrafts(storage)[k] ?? null : null;
}

/** Save the trader's draft for a market. An empty draft removes it. */
export function writeDraft(storage: Storage | null | undefined, symbol: string, plan: TraderPlanInput, nowMs: number): PlanDraft | null {
  const k = draftKey(symbol);
  if (!storage || !k) return null;
  const all = readDrafts(storage);
  const clean = readPlanInput(plan);
  const empty = Object.values(clean).every(v => v == null || (Array.isArray(v) && v.length === 0));
  if (empty) { delete all[k]; writeDrafts(storage, all); return null; }
  const d: PlanDraft = { symbol: k, plan: clean, updatedAtMs: nowMs };
  writeDrafts(storage, { ...all, [k]: d });
  return d;
}

/** The draft that may join a freeze at `atMs`: written before it, and recently. Removed when taken. */
export function takeDraftForFreeze(storage: Storage | null | undefined, symbol: string | null | undefined, atMs: number): TraderPlanInput | null {
  const k = draftKey(symbol);
  if (!storage || !k) return null;
  const all = readDrafts(storage);
  const d = all[k];
  if (!d || d.updatedAtMs > atMs || atMs - d.updatedAtMs > DRAFT_MAX_AGE_MS) return null;
  delete all[k];
  writeDrafts(storage, all);
  return d.plan;
}

/**
 * The live ticket's send (called from rememberTicketAtSend): the ticket's stop,
 * target and View, plus the trader's pre-trade draft for that market. A
 * decision already frozen is left alone and its draft is not consumed.
 */
export function freezeAtTicketSend(storage: Storage | null | undefined, ticket: FillCaptureIntent, nowMs: number): FreezeOutcome {
  if (!storage || !ticket.decisionId) return "NOT_STORED";
  if (readPlanForDecision(storage, ticket.decisionId)) return "ALREADY_FROZEN";
  const at = ticket.sentAtMs ?? nowMs;
  const draft = takeDraftForFreeze(storage, ticket.chartSymbol, at) ?? {};
  const day = draft.session ? null : sessionPlanForFreeze(storage, at);
  return freezePlanOnce(storage, planSnapshotFromTicket(ticket, day ? { ...draft, session: day } : draft, at, day ? { session: "morning prep session plan" } : undefined));
}

/** The subset of a paper Trade this reads. */
export interface PaperFillFact {
  readonly symbol: string;
  readonly side: "buy" | "sell";
  readonly px: number;
  readonly ts: number;
  readonly decisionId?: string;
}

/**
 * The FIRST paper fill of a decision freezes the trader's pre-trade draft for
 * that market at PAPER_FILL. A fill with no draft written before it freezes
 * nothing (the Review then says no plan was recorded, and the trader may still
 * record one, marked as written after the trade).
 */
export function freezePaperFillPlans(storage: Storage | null | undefined, trades: readonly PaperFillFact[]): number {
  if (!storage) return 0;
  const first = new Map<string, PaperFillFact>();
  for (const t of trades) {
    if (!t.decisionId || !Number.isFinite(t.ts)) continue;
    const cur = first.get(t.decisionId);
    if (!cur || t.ts < cur.ts) first.set(t.decisionId, t);
  }
  let frozen = 0;
  for (const [decisionId, t] of first) {
    if (readPlanForDecision(storage, decisionId)) continue;
    const draft = takeDraftForFreeze(storage, t.symbol, t.ts);
    if (!draft) continue;
    const day = draft.session ? null : sessionPlanForFreeze(storage, t.ts);
    const snap = freezePlanSnapshot({
      decisionId, frozenAt: "PAPER_FILL", atMs: t.ts, source: "plan card before the paper fill",
      plan: { ...draft, ...(day ? { session: day } : {}), symbol: t.symbol, direction: t.side === "buy" ? "LONG" : "SHORT" },
      ...(day ? { fieldSources: { session: "morning prep session plan" } } : {}),
    });
    if (freezePlanOnce(storage, snap) === "FROZEN") frozen++;
  }
  return frozen;
}

/** The latest plan frozen for a market since `sinceMs` — what the card shows once the trade exists. */
export function latestPlanForSymbol(storage: Storage | null | undefined, symbol: string | null | undefined, sinceMs: number): ManagementPlanSnapshot | null {
  const k = draftKey(symbol);
  if (!k) return null;
  let best: ManagementPlanSnapshot | null = null;
  for (const s of Object.values(readAllPlans(storage))) {
    if (draftKey(s.base.symbol.value) !== k || s.frozenAtMs < sinceMs) continue;
    if (!best || s.frozenAtMs > best.frozenAtMs) best = s;
  }
  return best;
}
