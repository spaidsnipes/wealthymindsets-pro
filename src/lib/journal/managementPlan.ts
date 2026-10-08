/**
 * MANAGEMENT PLAN SNAPSHOT — Garden 19 §27 (Founder order 2026-10-07). PURE.
 *
 * When a Decision_ID becomes a trade (the live ticket's send, a paper fill, or
 * a journal entry saved by the trader), the plan the trader actually wrote is
 * FROZEN on that Decision_ID: entry thesis, invalidation, stop, target,
 * management conditions ("move to breakeven after +1R", "reduce at target 1"),
 * expected hold, context, risk, session.
 *
 *   · A field the trader did not enter stays UNRECORDED. It is never defaulted:
 *     no 1R is assumed, no hold is guessed, no session is inferred from a clock.
 *   · The snapshot is immutable after it is frozen. Hindsight cannot rewrite
 *     it — `amendPlan` APPENDS a dated amendment (with an optional "new
 *     evidence" note) and returns a new snapshot whose frozen base is the same
 *     object, untouched.
 *   · A plan frozen at JOURNAL_ENTRY was written after the trade. It is kept,
 *     and it says so (`hindsightRisk`), so Review never presents it as a
 *     pre-trade record.
 *
 * Patience and management live inside the Decision_ID → Trade → Journal →
 * Review lineage. There is no separate indicator, room or dashboard.
 */

import type { FillCaptureIntent, JournalCaptureDraft } from "./journalCaptureFromFill";

export type PlanFreezePoint = "TICKET_SEND" | "PAPER_FILL" | "JOURNAL_ENTRY";
export type PlanDirection = "LONG" | "SHORT";

/** A plan field: what the trader recorded, or UNRECORDED (value null). */
export interface PlanValue<T> {
  readonly value: T | null;
  readonly state: "RECORDED" | "UNRECORDED";
  /** Where it was recorded ("ticket at send", "journal entry"). */
  readonly source: string;
}

export type ManagementConditionKind =
  | "BREAKEVEN_AFTER_R"
  | "REDUCE_AT_TARGET"
  | "TRAIL_STOP"
  | "TIME_STOP"
  | "ADD_ALLOWED"
  /** "Walk away once the stop is protected" — no order changes after protection (Garden 19 §26). */
  | "WALK_AWAY_AFTER_PROTECTION"
  | "OTHER";

/** One management condition, in the trader's words, with the part WM can check. */
export interface ManagementCondition {
  readonly kind: ManagementConditionKind;
  /** The trader's words, kept verbatim (trimmed, capped). */
  readonly text: string;
  /** BREAKEVEN_AFTER_R: the R the move must reach first. */
  readonly triggerR?: number | null;
  /** REDUCE_AT_TARGET: which target (1, 2…). */
  readonly targetIndex?: number | null;
  /** TIME_STOP: minutes after entry. */
  readonly minutes?: number | null;
}

export interface PlanBase {
  readonly decisionId: string;
  readonly symbol: PlanValue<string>;
  readonly direction: PlanValue<PlanDirection>;
  readonly entryPx: PlanValue<number>;
  readonly thesis: PlanValue<string>;
  /** The invalidation in words ("loses the opening range low"). */
  readonly invalidation: PlanValue<string>;
  /** The invalidation as a price, when the trader gave one. */
  readonly invalidationPx: PlanValue<number>;
  readonly stopPx: PlanValue<number>;
  readonly targetPx: PlanValue<number>;
  readonly conditions: readonly ManagementCondition[];
  readonly expectedHoldMin: PlanValue<number>;
  readonly context: PlanValue<string>;
  readonly riskUsd: PlanValue<number>;
  readonly session: PlanValue<string>;
}

/** A dated change to the plan. The frozen base is never edited. */
export interface PlanAmendment {
  readonly atMs: number;
  readonly stopPx?: number | null;
  readonly targetPx?: number | null;
  readonly invalidationPx?: number | null;
  readonly expectedHoldMin?: number | null;
  readonly addConditions?: readonly ManagementCondition[];
  /** What changed in the market that the plan did not know at the freeze. */
  readonly newEvidence: string | null;
  /** The trader's own note on the change (may be empty). */
  readonly note: string | null;
}

export interface ManagementPlanSnapshot {
  readonly kind: "WM_PLAN_SNAPSHOT";
  readonly version: 1;
  readonly frozenAtMs: number;
  readonly frozenAt: PlanFreezePoint;
  /** True when the plan was written after the trade (JOURNAL_ENTRY). */
  readonly hindsightRisk: boolean;
  readonly base: PlanBase;
  readonly amendments: readonly PlanAmendment[];
}

/** What the trader entered. Everything is optional; nothing is defaulted. */
export interface TraderPlanInput {
  readonly symbol?: string | null;
  readonly direction?: PlanDirection | null;
  readonly entryPx?: number | null;
  readonly thesis?: string | null;
  readonly invalidation?: string | null;
  readonly invalidationPx?: number | null;
  readonly stopPx?: number | null;
  readonly targetPx?: number | null;
  /** Management conditions in the trader's words, one per item. */
  readonly conditions?: readonly string[] | null;
  readonly expectedHoldMin?: number | null;
  readonly context?: string | null;
  readonly riskUsd?: number | null;
  readonly session?: string | null;
}

const MAX_TEXT = 400;

const text = (v: unknown, source: string): PlanValue<string> =>
  typeof v === "string" && v.trim() !== ""
    ? { value: v.trim().slice(0, MAX_TEXT), state: "RECORDED", source }
    : { value: null, state: "UNRECORDED", source: "not recorded" };

const price = (v: unknown, source: string): PlanValue<number> =>
  typeof v === "number" && Number.isFinite(v) && v > 0
    ? { value: v, state: "RECORDED", source }
    : { value: null, state: "UNRECORDED", source: "not recorded" };

const positive = price;

const dir = (v: unknown, source: string): PlanValue<PlanDirection> =>
  v === "LONG" || v === "SHORT" ? { value: v, state: "RECORDED", source } : { value: null, state: "UNRECORDED", source: "not recorded" };

/**
 * Read a management condition the trader wrote. The words are kept; only the
 * machine-checkable part is parsed. Anything WM cannot check is OTHER — kept,
 * shown, and never silently dropped.
 */
export function parseManagementCondition(raw: string): ManagementCondition | null {
  const t = raw.trim().slice(0, MAX_TEXT);
  if (!t) return null;
  // Read first: "walk away once the stop is at breakeven" names protection, then hands off.
  if (/\b(?:walk\s*away|hands\s*off|leave\s*it(?:\s*alone)?|set\s*(?:it\s*)?and\s*forget|don'?t\s*touch)\b/i.test(t)) return { kind: "WALK_AWAY_AFTER_PROTECTION", text: t };
  const be = /break\s*-?\s*even\b[^\d+]*\+?\s*(\d+(?:\.\d+)?)\s*R\b/i.exec(t) ?? /\b(?:BE|b\/e)\b[^\d+]*\+?\s*(\d+(?:\.\d+)?)\s*R\b/i.exec(t);
  if (be) return { kind: "BREAKEVEN_AFTER_R", text: t, triggerR: Number(be[1]) };
  const red = /\b(?:reduce|trim|scale\s*out|take\s*(?:a\s*)?partials?)\b.*?\b(?:target|T|TP)\s*(\d)\b/i.exec(t);
  if (red) return { kind: "REDUCE_AT_TARGET", text: t, targetIndex: Number(red[1]) };
  const time = /\b(?:time\s*stop|exit|out|flat)\b[^\d]*(?:after|within|by)?\s*(\d{1,4})\s*(?:min|mins|minutes|m)\b/i.exec(t);
  if (time) return { kind: "TIME_STOP", text: t, minutes: Number(time[1]) };
  if (/\btrail/i.test(t)) return { kind: "TRAIL_STOP", text: t };
  if (/\b(?:add|scale\s*in|pyramid)\b/i.test(t)) return { kind: "ADD_ALLOWED", text: t };
  return { kind: "OTHER", text: t };
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
  }
  return o;
}

export interface FreezePlanInput {
  readonly decisionId: string;
  readonly frozenAt: PlanFreezePoint;
  readonly atMs: number;
  /** Where these fields were recorded, in words. */
  readonly source: string;
  readonly plan: TraderPlanInput;
  /** Where a field came from when not the same as `source` (e.g. session ← "morning prep"). */
  readonly fieldSources?: Partial<Record<keyof TraderPlanInput, string>>;
}

/** Freeze the plan. Returns null when there is no Decision_ID to freeze it on. */
export function freezePlanSnapshot(input: FreezePlanInput): ManagementPlanSnapshot | null {
  const id = typeof input.decisionId === "string" ? input.decisionId.trim() : "";
  if (!id || !Number.isFinite(input.atMs)) return null;
  const p = input.plan;
  const s = input.source;
  const conditions = (p.conditions ?? [])
    .map(c => (typeof c === "string" ? parseManagementCondition(c) : null))
    .filter((c): c is ManagementCondition => c !== null)
    .slice(0, 12);
  return deepFreeze<ManagementPlanSnapshot>({
    kind: "WM_PLAN_SNAPSHOT",
    version: 1,
    frozenAtMs: input.atMs,
    frozenAt: input.frozenAt,
    hindsightRisk: input.frozenAt === "JOURNAL_ENTRY",
    base: {
      decisionId: id.slice(0, 120),
      symbol: text(p.symbol, s),
      direction: dir(p.direction, s),
      entryPx: price(p.entryPx, s),
      thesis: text(p.thesis, s),
      invalidation: text(p.invalidation, s),
      invalidationPx: price(p.invalidationPx, s),
      stopPx: price(p.stopPx, s),
      targetPx: price(p.targetPx, s),
      conditions,
      expectedHoldMin: positive(p.expectedHoldMin, s),
      context: text(p.context, s),
      riskUsd: positive(p.riskUsd, s),
      session: text(p.session, input.fieldSources?.session ?? s),
    },
    amendments: [],
  });
}

const isBuy = (a: string | null | undefined) => (a ?? "").toLowerCase().startsWith("buy");
const isClose = (a: string | null | undefined) => /to close/i.test(a ?? "");

/** The ticket's direction: an opening buy is LONG; a closing sell closes a LONG. */
export function directionFromAction(action: string | null | undefined): PlanDirection | null {
  if (!action) return null;
  const buy = isBuy(action);
  return isClose(action) ? (buy ? "SHORT" : "LONG") : buy ? "LONG" : "SHORT";
}

/**
 * The ticket at send → a plan frozen at TICKET_SEND. The ticket's own fields
 * (stop, target, view) are recorded; anything the ticket did not carry and the
 * trader did not add stays UNRECORDED.
 */
export function planSnapshotFromTicket(intent: FillCaptureIntent, extra: TraderPlanInput = {}, atMs?: number, fieldSources?: FreezePlanInput["fieldSources"]): ManagementPlanSnapshot | null {
  if (!intent.decisionId) return null;
  const at = atMs ?? intent.sentAtMs ?? null;
  if (at == null) return null;
  const entry = intent.limitPx ?? intent.entryTriggerPx ?? null;
  return freezePlanSnapshot({
    decisionId: intent.decisionId,
    frozenAt: "TICKET_SEND",
    atMs: at,
    source: "ticket at send",
    fieldSources,
    plan: {
      symbol: intent.chartSymbol ?? null,
      direction: directionFromAction(intent.action),
      entryPx: isClose(intent.action) ? null : entry,
      thesis: intent.view ?? null,
      stopPx: intent.protectiveStopPx ?? intent.plannedStopPx ?? null,
      targetPx: intent.targetPx ?? null,
      ...stripNullish(extra),
    },
  });
}

/**
 * A captured fill (the journal draft) → a plan. The ticket-intent fields of
 * the capture are the plan as it left; the freeze point is TICKET_SEND only
 * when the capture carries a send time — otherwise JOURNAL_ENTRY (after the fact).
 */
export function planSnapshotFromCapture(draft: JournalCaptureDraft, extra: TraderPlanInput = {}, journalAtMs: number): ManagementPlanSnapshot | null {
  const d = draft.decisionId.value;
  if (!d) return null;
  const ticket = (f: { value: unknown; provenance: string }) => (f.provenance === "TICKET-INTENT" ? f.value : null);
  return freezePlanSnapshot({
    decisionId: d,
    frozenAt: "JOURNAL_ENTRY",
    atMs: journalAtMs,
    source: "ticket at send (via the journal capture)",
    plan: {
      symbol: (ticket(draft.chartSymbol) as string | null) ?? null,
      direction: directionFromAction(draft.action.value),
      thesis: (ticket(draft.view) as string | null) ?? null,
      stopPx: (ticket(draft.stopPx) as number | null) ?? null,
      targetPx: (ticket(draft.targetPx) as number | null) ?? null,
      ...stripNullish(extra),
    },
  });
}

function stripNullish(o: TraderPlanInput): TraderPlanInput {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v != null && !(typeof v === "string" && v.trim() === "")) out[k] = v;
  return out as TraderPlanInput;
}

export type AmendResult =
  | { readonly ok: true; readonly snapshot: ManagementPlanSnapshot }
  | { readonly ok: false; readonly reason: string };

/**
 * Append a dated amendment. Refuses an amendment dated before the freeze or
 * before the last amendment (hindsight cannot slip a change in earlier), and
 * one that changes nothing. The frozen base is carried by reference.
 */
export function amendPlan(snap: ManagementPlanSnapshot, a: PlanAmendment): AmendResult {
  if (!Number.isFinite(a.atMs) || a.atMs < snap.frozenAtMs) {
    return { ok: false, reason: "An amendment cannot be dated before the plan was frozen." };
  }
  const last = snap.amendments[snap.amendments.length - 1];
  if (last && a.atMs < last.atMs) return { ok: false, reason: "Amendments are kept in time order; this one is dated before the last." };
  const fin = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
  const amendment: PlanAmendment = {
    atMs: a.atMs,
    stopPx: fin(a.stopPx),
    targetPx: fin(a.targetPx),
    invalidationPx: fin(a.invalidationPx),
    expectedHoldMin: fin(a.expectedHoldMin),
    addConditions: (a.addConditions ?? []).slice(0, 6),
    newEvidence: typeof a.newEvidence === "string" && a.newEvidence.trim() ? a.newEvidence.trim().slice(0, MAX_TEXT) : null,
    note: typeof a.note === "string" && a.note.trim() ? a.note.trim().slice(0, MAX_TEXT) : null,
  };
  const changes = amendment.stopPx != null || amendment.targetPx != null || amendment.invalidationPx != null
    || amendment.expectedHoldMin != null || (amendment.addConditions?.length ?? 0) > 0;
  if (!changes && !amendment.newEvidence && !amendment.note) return { ok: false, reason: "The amendment changes nothing." };
  return { ok: true, snapshot: deepFreeze({ ...snap, amendments: [...snap.amendments, amendment] }) };
}

/** The plan in force at a moment: the frozen base with every amendment dated at or before it. */
export interface EffectivePlan {
  readonly stopPx: number | null;
  readonly targetPx: number | null;
  readonly invalidationPx: number | null;
  /** Where the invalidation price came from — the plan's own, or the stop standing in for it. */
  readonly invalidationFrom: "PLAN INVALIDATION" | "PLANNED STOP" | "AMENDMENT" | "UNRECORDED";
  readonly expectedHoldMin: number | null;
  readonly conditions: readonly ManagementCondition[];
  readonly amendmentsApplied: readonly PlanAmendment[];
}

export function effectivePlanAt(snap: ManagementPlanSnapshot, atMs: number): EffectivePlan {
  const b = snap.base;
  let stop = b.stopPx.value, target = b.targetPx.value, inv = b.invalidationPx.value, hold = b.expectedHoldMin.value;
  let invFrom: EffectivePlan["invalidationFrom"] = inv != null ? "PLAN INVALIDATION" : "UNRECORDED";
  const conditions = [...b.conditions];
  const applied: PlanAmendment[] = [];
  for (const a of snap.amendments) {
    if (a.atMs > atMs) break;
    applied.push(a);
    if (a.stopPx != null) stop = a.stopPx;
    if (a.targetPx != null) target = a.targetPx;
    if (a.invalidationPx != null) { inv = a.invalidationPx; invFrom = "AMENDMENT"; }
    if (a.expectedHoldMin != null) hold = a.expectedHoldMin;
    conditions.push(...(a.addConditions ?? []));
  }
  if (inv == null && stop != null) { inv = stop; invFrom = "PLANNED STOP"; }
  return { stopPx: stop, targetPx: target, invalidationPx: inv, invalidationFrom: invFrom, expectedHoldMin: hold, conditions, amendmentsApplied: applied };
}

/* ── parse a stored snapshot (never trusted) ────────────────────────────── */

const readValue = <T,>(v: unknown, ok: (x: unknown) => x is T): PlanValue<T> => {
  const o = (v ?? {}) as Record<string, unknown>;
  return o.state === "RECORDED" && ok(o.value)
    ? { value: o.value, state: "RECORDED", source: typeof o.source === "string" ? o.source.slice(0, 120) : "recorded" }
    : { value: null, state: "UNRECORDED", source: "not recorded" };
};
const isStr = (x: unknown): x is string => typeof x === "string" && x.trim() !== "";
const isPx = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x > 0;
const isDir = (x: unknown): x is PlanDirection => x === "LONG" || x === "SHORT";
const KINDS: readonly ManagementConditionKind[] = ["BREAKEVEN_AFTER_R", "REDUCE_AT_TARGET", "TRAIL_STOP", "TIME_STOP", "ADD_ALLOWED", "WALK_AWAY_AFTER_PROTECTION", "OTHER"];

function readConditions(v: unknown): ManagementCondition[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap(c => {
    const o = (c ?? {}) as Record<string, unknown>;
    if (!isStr(o.text)) return [];
    const parsed = parseManagementCondition(o.text);
    return parsed && KINDS.includes(o.kind as ManagementConditionKind) ? [parsed] : [];
  }).slice(0, 18);
}

export function readPlanSnapshot(raw: unknown): ManagementPlanSnapshot | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const b = (o.base ?? {}) as Record<string, unknown>;
  const frozenAt = o.frozenAt === "TICKET_SEND" || o.frozenAt === "PAPER_FILL" || o.frozenAt === "JOURNAL_ENTRY" ? o.frozenAt : null;
  if (o.kind !== "WM_PLAN_SNAPSHOT" || !frozenAt || !isPx(o.frozenAtMs) || !isStr(b.decisionId)) return null;
  const amendments: PlanAmendment[] = [];
  for (const a of Array.isArray(o.amendments) ? o.amendments : []) {
    const x = (a ?? {}) as Record<string, unknown>;
    if (!isPx(x.atMs)) continue;
    amendments.push({
      atMs: x.atMs,
      stopPx: isPx(x.stopPx) ? x.stopPx : null,
      targetPx: isPx(x.targetPx) ? x.targetPx : null,
      invalidationPx: isPx(x.invalidationPx) ? x.invalidationPx : null,
      expectedHoldMin: isPx(x.expectedHoldMin) ? x.expectedHoldMin : null,
      addConditions: readConditions(x.addConditions),
      newEvidence: isStr(x.newEvidence) ? x.newEvidence.slice(0, MAX_TEXT) : null,
      note: isStr(x.note) ? x.note.slice(0, MAX_TEXT) : null,
    });
  }
  amendments.sort((x, y) => x.atMs - y.atMs);
  return deepFreeze<ManagementPlanSnapshot>({
    kind: "WM_PLAN_SNAPSHOT",
    version: 1,
    frozenAtMs: o.frozenAtMs as number,
    frozenAt,
    hindsightRisk: frozenAt === "JOURNAL_ENTRY",
    base: {
      decisionId: (b.decisionId as string).slice(0, 120),
      symbol: readValue(b.symbol, isStr),
      direction: readValue(b.direction, isDir),
      entryPx: readValue(b.entryPx, isPx),
      thesis: readValue(b.thesis, isStr),
      invalidation: readValue(b.invalidation, isStr),
      invalidationPx: readValue(b.invalidationPx, isPx),
      stopPx: readValue(b.stopPx, isPx),
      targetPx: readValue(b.targetPx, isPx),
      conditions: readConditions(b.conditions),
      expectedHoldMin: readValue(b.expectedHoldMin, isPx),
      context: readValue(b.context, isStr),
      riskUsd: readValue(b.riskUsd, isPx),
      session: readValue(b.session, isStr),
    },
    amendments,
  });
}

/** "stop 21,380 · target 21,450 · invalidation UNRECORDED …" — the plan in one line. */
export function planLine(snap: ManagementPlanSnapshot): string {
  const b = snap.base;
  const n = (v: PlanValue<number>) => (v.value == null ? "UNRECORDED" : fmtPx(v.value));
  const parts = [
    `stop ${n(b.stopPx)}`,
    `target ${n(b.targetPx)}`,
    `invalidation ${b.invalidationPx.value != null ? fmtPx(b.invalidationPx.value) : b.invalidation.value ?? "UNRECORDED"}`,
    `management ${b.conditions.length ? b.conditions.map(c => c.text).join("; ") : "UNRECORDED"}`,
    `expected hold ${b.expectedHoldMin.value != null ? `${b.expectedHoldMin.value} min` : "UNRECORDED"}`,
  ];
  if (b.session.value) parts.push(`session ${b.session.value}${b.session.source === "morning prep session plan" ? " (Morning Prep)" : ""}`);
  return parts.join(" · ");
}

export function fmtPx(x: number): string {
  const abs = Math.abs(x);
  const dp = abs >= 1000 ? 2 : abs >= 1 ? 2 : 4;
  return x.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: dp });
}
