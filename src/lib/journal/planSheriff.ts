/**
 * THE SHERIFF'S THREE COLUMNS — Garden 19 §64 final patience / management
 * test. PURE.
 *
 * Review of a completed trade states three things apart, never blended:
 *
 *   WHAT THE MARKET DID          the price path's own facts (MARKET TRUTH):
 *                                high / low after entry, and whether — and
 *                                when — the plan's target, stop and
 *                                invalidation printed, during the hold and
 *                                after the exit;
 *   WHAT THE TRADER PLANNED      the frozen snapshot and every dated amendment
 *                                with its new-evidence note (TRADER TRUTH);
 *   WHAT THE TRADER ACTUALLY DID the fills, stop / target moves and the exit,
 *                                as the broker or journal reported them.
 *
 * A column with no facts says which facts are missing. No column reads
 * another's mind: there are no reasons here, only facts.
 */

import { effectivePlanAt, fmtPx, type ManagementPlanSnapshot } from "./managementPlan";
import type { PathBar, PricePath, TradeActuals } from "./planVsActual";

export interface SheriffColumns {
  readonly market: readonly string[];
  readonly planned: readonly string[];
  readonly actual: readonly string[];
}

const clock = (ms: number) => new Date(ms).toISOString().slice(11, 16) + "Z";
const lastExitAt = (a: TradeActuals | null) => {
  const t = (a?.exits ?? []).map(e => e.atMs);
  return t.length && t.every(x => x != null) ? Math.max(...(t as number[])) : null;
};

function extremes(bars: readonly PathBar[]) {
  let hi = bars[0], lo = bars[0];
  for (const b of bars) { if (b.h > hi.h) hi = b; if (b.l < lo.l) lo = b; }
  return { hi, lo };
}

function firstPrint(bars: readonly PathBar[], level: number, up: boolean): PathBar | null {
  return bars.find(b => (up ? b.h >= level : b.l <= level)) ?? null;
}

function marketColumn(plan: ManagementPlanSnapshot | null, a: TradeActuals | null, path: PricePath | null | undefined): string[] {
  const entryAt = a?.entry?.atMs ?? null;
  if (!path || !path.bars.length) return ["The price path for this hold is not loaded, so WM states no market facts here."];
  if (entryAt == null) return ["The entry fill time was not reported, so the path cannot be placed against the trade."];
  const exitAt = lastExitAt(a);
  const after = path.bars.filter(b => b.t + path.barMs > entryAt).sort((x, y) => x.t - y.t);
  if (!after.length) return ["The loaded path has no bars after the entry."];
  const hold = exitAt != null ? after.filter(b => b.t <= exitAt) : after;
  const post = exitAt != null ? after.filter(b => b.t > exitAt) : [];
  const out: string[] = [`Source: ${path.source}; ${after.length} bars from the entry bar (${clock(after[0].t)}).`];
  if (hold.length) {
    const { hi, lo } = extremes(hold);
    out.push(`During the hold: high ${fmtPx(hi.h)} (${clock(hi.t)}), low ${fmtPx(lo.l)} (${clock(lo.t)}).`);
  }
  if (post.length) {
    const { hi, lo } = extremes(post);
    out.push(`After the exit, to ${clock(post[post.length - 1].t)}: high ${fmtPx(hi.h)}, low ${fmtPx(lo.l)}.`);
  }
  const dir = plan?.base.direction.value ?? a?.direction ?? null;
  if (plan && dir) {
    const e = effectivePlanAt(plan, plan.frozenAtMs);
    const up = dir === "LONG";
    const levels: [string, number | null, boolean][] = [
      ["target", e.targetPx, up],
      ["stop", e.stopPx, !up],
      ...(e.invalidationFrom === "PLAN INVALIDATION" ? [["invalidation", e.invalidationPx, !up] as [string, number | null, boolean]] : []),
    ];
    for (const [name, lv, side] of levels) {
      if (lv == null) { out.push(`The plan recorded no ${name}.`); continue; }
      const inHold = firstPrint(hold, lv, side);
      const inPost = inHold ? null : firstPrint(post, lv, side);
      out.push(inHold ? `The planned ${name} ${fmtPx(lv)} printed during the hold (bar ${clock(inHold.t)}).`
        : inPost ? `The planned ${name} ${fmtPx(lv)} printed after the exit (bar ${clock(inPost.t)}).`
        : `The planned ${name} ${fmtPx(lv)} did not print in the bars loaded.`);
    }
  }
  return out;
}

function plannedColumn(plan: ManagementPlanSnapshot | null): string[] {
  if (!plan) return ["No plan was frozen for this decision."];
  const b = plan.base;
  const at = plan.frozenAt === "TICKET_SEND" ? "at the ticket's send" : plan.frozenAt === "PAPER_FILL" ? "at the paper fill" : "after the trade (journal) — not a pre-trade record";
  const v = <T,>(x: { value: T | null }, f: (t: T) => string) => (x.value == null ? "UNRECORDED" : f(x.value));
  const out = [
    `Frozen ${at}, ${clock(plan.frozenAtMs)}. Decision_ID ${b.decisionId}.`,
    `Thesis: ${v(b.thesis, t => t)}.`,
    `Stop ${v(b.stopPx, fmtPx)} · target ${v(b.targetPx, fmtPx)} · invalidation ${b.invalidationPx.value != null ? fmtPx(b.invalidationPx.value) : b.invalidation.value ?? "UNRECORDED"}${b.invalidationPx.value != null && b.invalidation.value ? ` (${b.invalidation.value})` : ""}.`,
    `Management: ${b.conditions.length ? b.conditions.map(c => `“${c.text}”`).join("; ") : "UNRECORDED"}.`,
    `Expected hold: ${v(b.expectedHoldMin, m => `${m} min`)} · session: ${v(b.session, s => s)}${b.session.source === "morning prep session plan" ? " (Morning Prep)" : ""} · context: ${v(b.context, s => s)}.`,
  ];
  if (!plan.amendments.length) out.push("No amendments.");
  for (const a of plan.amendments) {
    const ch = [a.stopPx != null ? `stop → ${fmtPx(a.stopPx)}` : "", a.targetPx != null ? `target → ${fmtPx(a.targetPx)}` : "", a.invalidationPx != null ? `invalidation → ${fmtPx(a.invalidationPx)}` : "", a.expectedHoldMin != null ? `hold → ${a.expectedHoldMin} min` : ""].filter(Boolean).join(", ");
    out.push(`Amended ${clock(a.atMs)}: ${ch || "note only"} — ${a.newEvidence ? `new evidence: ${a.newEvidence}` : "no new evidence recorded"}${a.note ? ` · note: ${a.note}` : ""}.`);
  }
  return out;
}

function actualColumn(a: TradeActuals | null): string[] {
  if (!a) return ["No trade facts were reported."];
  const t = (ms: number | null) => (ms != null ? ` at ${clock(ms)}` : " (time not reported)");
  const q = (n: number | null) => (n != null ? `${n} @ ` : "");
  const out: string[] = [`Reported by: ${a.source}.`];
  out.push(a.entry ? `Entry ${q(a.entry.qty)}${fmtPx(a.entry.px)}${t(a.entry.atMs)}${a.direction ? ` (${a.direction.toLowerCase()})` : ""}.` : "No entry fill reported.");
  for (const x of a.adds) out.push(`Added ${q(x.qty)}${fmtPx(x.px)}${t(x.atMs)}.`);
  for (const m of a.stopMoves) out.push(`Stop order ${m.fromPx != null ? `${fmtPx(m.fromPx)} → ` : "at "}${fmtPx(m.toPx)}${t(m.atMs)}.`);
  for (const m of a.targetMoves) out.push(`Target order ${m.fromPx != null ? `${fmtPx(m.fromPx)} → ` : "at "}${fmtPx(m.toPx)}${t(m.atMs)}.`);
  if (!a.exits.length) out.push("No exit fill reported.");
  for (const x of a.exits) out.push(`Exit ${q(x.qty)}${fmtPx(x.px)}${t(x.atMs)}.`);
  return out;
}

export function sheriffColumns(input: { readonly plan: ManagementPlanSnapshot | null; readonly actuals: TradeActuals | null; readonly path?: PricePath | null }): SheriffColumns {
  return {
    market: marketColumn(input.plan, input.actuals, input.path),
    planned: plannedColumn(input.plan),
    actual: actualColumn(input.actuals),
  };
}
