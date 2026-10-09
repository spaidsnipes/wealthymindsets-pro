/**
 * THE CONTEXT A GAP DECISION WAS TAKEN IN, KEPT WITH THE JOURNAL ENTRY — Garden 19 §40 (2026-10-09). PURE.
 *
 * §40: "Do not merely add FVG = YES. Preserve context: object; lifecycle state at decision time; first /
 * later interaction; penetration; STRUCTURE CONTEXT; PROFILE CONTEXT; available evidence; plan; result;
 * management behavior." The reference (fvgDecisionReference) keeps the object, its state, interaction,
 * penetration and evidence. This keeps the rest of the market context beside it, read from the SAME bars
 * at the SAME moment, so Personal Edge's context splits (§23) are real on a real book instead of
 * "NOT RECORDED":
 *
 *   structure   the structure owner's relationships to the gap (broke / reclaimed / swing inside), or SILENCE
 *   profile     the profile of the bars BEFORE formation (POC / VAH / VAL / HVN / LVN), or SILENCE
 *   wall        SILENCE from bars alone (no chain, no book) — said, never assumed absent
 *   effort      the Response Matrix cell of the displacement bar — SILENT where the market reports no traded volume
 *   regime      the gap's regime tag at b2 ("UNTAGGED" when no regime reading was attached)
 *
 * AS OF THE DECISION: only bars that had CLOSED by the reference's `readAsOfMs` are read. Nothing after
 * the decision can change a stored context (future-leak test). A record that does not carry a context
 * keeps reading "NOT RECORDED" — never back-filled from today's chart.
 */

import { readEffortResponseField } from "@/lib/chart/effortResponseField";
import type { ResponseCell } from "@/lib/chart/effortEvidence";
import { volumeTruthFor } from "@/lib/chart/volumeTruth";
import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { fvgBarContext, fvgBarOnlyRelationships } from "@/lib/marketData/fvg/fvgBarContext";

import type { JournalFvgReference } from "./fvgDecisionReference";
import { fvgLedgerFromClosedBars } from "./planFvgLoader";

export const FVG_CONTEXT_KIND = "WM_FVG_DECISION_CONTEXT" as const;
const FAMILIES = ["STRUCTURE", "PROFILE", "WALL"] as const;
const CELLS: readonly string[] = ["ABSORBED", "INITIATIVE", "VACUUM", "QUIET", "ORDINARY", "SILENT"];

export interface JournalFvgContext {
  readonly kind: typeof FVG_CONTEXT_KIND;
  readonly version: 1;
  /** The object and instant this context belongs to — it is only used with the reference that names the same two. */
  readonly objectId: string;
  readonly decisionAtMs: number;
  readonly readAsOfMs: number;
  /** Relationships found, by family and kind (the splits need no more). */
  readonly relationships: readonly { readonly family: string; readonly kind: string }[];
  /** Every owner consulted with its evidence word — SILENCE included. */
  readonly sources: readonly { readonly family: string; readonly evidence: string }[];
  readonly effortCell: ResponseCell | "SILENT";
  readonly regime: string;
  /** How many closed bars were read (the as-of window). */
  readonly barsRead: number;
}

export type FvgContextResult = { readonly ok: true; readonly context: JournalFvgContext } | { readonly ok: false; readonly reason: string };

/** The bars that had closed by `asOfMs` (bar length = the smallest positive step between bar opens). */
export function barsClosedBy(bars: readonly CanonicalBar[], asOfMs: number): CanonicalBar[] {
  let step = Infinity;
  for (let i = 1; i < bars.length; i++) { const d = bars[i].asOf - bars[i - 1].asOf; if (d > 0 && d < step) step = d; }
  if (!Number.isFinite(step)) return [];
  return bars.filter(b => b.asOf + step <= asOfMs);
}

/** Read the context for a reference from the bars it was read from. */
export function fvgContextAtDecision(ref: JournalFvgReference, bars: readonly CanonicalBar[]): FvgContextResult {
  const known = barsClosedBy(bars, ref.readAsOfMs);
  if (known.length < 3) return { ok: false, reason: "Too few closed bars at the decision time to read its context." };
  const ledger = fvgLedgerFromClosedBars(known, ref.symbol, ref.timeframe);
  const o = ledger.objects.find(x => x.objectId === ref.objectId);
  if (!o) return { ok: false, reason: "The gap is not in the bars that had closed by the decision time — no context is recorded rather than a guess." };
  const ctx = fvgBarContext(known, ref.symbol, ref.timeframe);
  const rel = fvgBarOnlyRelationships(ctx, o);
  const i2 = ctx.indexById.get(o.bars.b2.barId);
  let effortCell: JournalFvgContext["effortCell"] = "SILENT";
  if (i2 !== undefined && volumeTruthFor(ref.symbol, known).real) {
    const tuples = known.map(x => ({ time: x.asOf / 1000, open: x.open, high: x.high, low: x.low, close: x.close, volume: x.volume }));
    const field = readEffortResponseField(tuples, Math.max(0, i2 - 99), i2, { volumeReal: true });
    // The cell of b2 itself; when the owner did not read b2 it is SILENT — never a neighbour's cell.
    if (field.state === "DRAWN" && field.bars.length && field.bars[field.bars.length - 1].time === tuples[i2].time) effortCell = field.bars[field.bars.length - 1].cell;
  }
  return {
    ok: true,
    context: {
      kind: FVG_CONTEXT_KIND, version: 1, objectId: ref.objectId, decisionAtMs: ref.decisionAtMs, readAsOfMs: ref.readAsOfMs,
      relationships: rel.relationships.map(r => ({ family: r.family, kind: r.kind })),
      sources: rel.sources.map(s => ({ family: s.family, evidence: s.evidence })),
      effortCell, regime: o.regime, barsRead: known.length,
    },
  };
}

/** A stored context, or null. Anything malformed is dropped whole — never a partial or guessed context. */
export function readJournalFvgContext(raw: unknown): JournalFvgContext | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.kind !== FVG_CONTEXT_KIND || o.version !== 1) return null;
  if (typeof o.objectId !== "string" || !o.objectId.startsWith("FVG|")) return null;
  const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
  if (!fin(o.decisionAtMs) || !fin(o.readAsOfMs) || !fin(o.barsRead) || o.readAsOfMs > o.decisionAtMs) return null;
  if (typeof o.effortCell !== "string" || !CELLS.includes(o.effortCell) || typeof o.regime !== "string" || !o.regime) return null;
  const rows = (v: unknown, second: "kind" | "evidence"): { family: string; second: string }[] | null => {
    if (!Array.isArray(v) || v.length > 60) return null;
    const out: { family: string; second: string }[] = [];
    for (const x of v) {
      if (!x || typeof x !== "object") return null;
      const r = x as Record<string, unknown>;
      if (typeof r.family !== "string" || typeof r[second] !== "string" || !(FAMILIES as readonly string[]).includes(r.family)) return null;
      out.push({ family: r.family, second: (r[second] as string).slice(0, 40) });
    }
    return out;
  };
  const rel = rows(o.relationships, "kind");
  const src = rows(o.sources, "evidence");
  if (!rel || !src) return null;
  const relationships = rel.map(r => ({ family: r.family, kind: r.second }));
  const sources = src.map(r => ({ family: r.family, evidence: r.second }));
  return {
    kind: FVG_CONTEXT_KIND, version: 1, objectId: o.objectId, decisionAtMs: o.decisionAtMs, readAsOfMs: o.readAsOfMs,
    relationships, sources,
    effortCell: o.effortCell as JournalFvgContext["effortCell"], regime: o.regime.slice(0, 40), barsRead: o.barsRead,
  };
}

/** The context belongs to this reference only when both name the same object at the same instant. */
export function contextFor(ref: JournalFvgReference, ctx: JournalFvgContext | null | undefined): JournalFvgContext | null {
  return ctx && ctx.objectId === ref.objectId && ctx.decisionAtMs === ref.decisionAtMs && ctx.readAsOfMs === ref.readAsOfMs ? ctx : null;
}

/** What the context splits read from a stored context (absent → the splits say NOT RECORDED). */
export function splitContextOf(ref: JournalFvgReference, ctx: JournalFvgContext | null | undefined): {
  readonly relationships: { readonly relationships: JournalFvgContext["relationships"]; readonly sources: JournalFvgContext["sources"] } | null;
  readonly effortCell: JournalFvgContext["effortCell"] | null;
  readonly regime: string | null;
} {
  const c = contextFor(ref, ctx);
  return c ? { relationships: { relationships: c.relationships, sources: c.sources }, effortCell: c.effortCell, regime: c.regime } : { relationships: null, effortCell: null, regime: null };
}

/** One line for the Journal: what context is kept with this reference, in the trader's words. */
export function fvgContextNote(ref: JournalFvgReference, ctx: JournalFvgContext | null | undefined): string {
  const c = contextFor(ref, ctx);
  if (!c) return "Context at the decision: not recorded with this reference.";
  const fam = (f: string) => {
    const kinds = [...new Set(c.relationships.filter(r => r.family === f).map(r => r.kind.replace(/_/g, " ").toLowerCase()))];
    if (kinds.length) return kinds.join(", ");
    const src = c.sources.filter(s => s.family === f);
    return src.length && src.every(s => s.evidence === "SILENCE") ? "silence" : "none";
  };
  return `Context at the decision (from ${c.barsRead} closed bars): structure ${fam("STRUCTURE")} · profile ${fam("PROFILE")} · wall ${fam("WALL")} · displacement bar ${c.effortCell} · regime ${c.regime}.`;
}
