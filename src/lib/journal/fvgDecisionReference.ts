/**
 * JOURNAL ↔ FVG — A REFERENCE, NEVER A CHECKBOX (Garden 19 §40).
 *
 * A journal entry may reference ONE canonical FVG object by its FVG_3C
 * OBJECT_ID. What is stored is the reference plus a SNAPSHOT of that object
 * AS IT STOOD AT DECISION TIME — read through `fvgStateAsOf(ledger, decisionAt)`,
 * the one as-of accessor, so the journal can never record what the trader
 * could not yet have seen. Never "FVG = YES".
 *
 * The snapshot carries: lifecycle state, mitigation depth, deepest penetration,
 * remaining territory, whether the decision fell in the FIRST interaction, a
 * LATER one, or before any touch, and the evidence available per sense (price
 * geometry from OHLC; other senses only by reference to their owners).
 *
 * The plan/patience lane (managementPlan*, planVsActual) is not touched here.
 *
 * PURE. No IO, no clock.
 */

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import type { FvgMitigation, FvgState } from "@/lib/marketData/fvg/fvgDefinition";
import { detectFvgs, fvgStateAsOf, type FvgObject } from "@/lib/marketData/fvg/fvgEngine";
import { displayPrecisionFor } from "@/lib/chart/pricePrecision";

export const FVG_REF_KIND = "WM_FVG_REFERENCE" as const;

const ID_RE = /^FVG\|([^|\s]{1,40})\|([^|\s]{1,12})\|(-?\d{1,16})\|(BULLISH|BEARISH)\|v([1-9]\d{0,3})$/;

/** The parts of an FVG_3C OBJECT_ID, or null when it is not one. */
export function parseFvgObjectId(id: string | null | undefined): {
  readonly symbol: string; readonly timeframe: string; readonly b2AsOf: number;
  readonly direction: "BULLISH" | "BEARISH"; readonly version: number;
} | null {
  const m = ID_RE.exec((id ?? "").trim());
  if (!m) return null;
  return { symbol: m[1], timeframe: m[2], b2AsOf: Number(m[3]), direction: m[4] as "BULLISH" | "BEARISH", version: Number(m[5]) };
}

/** Where the decision fell in the object's interactions. */
export type FvgDecisionInteraction =
  | "BEFORE_ANY_TOUCH"
  | "DURING_FIRST_INTERACTION"
  | "DURING_LATER_INTERACTION"
  | "AFTER_FIRST_INTERACTION"
  | "AFTER_LATER_INTERACTION";

export interface FvgSnapshotEvidence {
  readonly sense: "PRICE_GEOMETRY" | "ORDER_FLOW" | "DERIVATIVES";
  /** FULL (OHLC) for price; the owner's own word BY REFERENCE; else NOT_ATTACHED. */
  readonly state: string;
  readonly ref: string | null;
}

export interface JournalFvgReference {
  readonly kind: typeof FVG_REF_KIND;
  readonly version: 1;
  readonly objectId: string;
  readonly definitionId: string;
  readonly definitionVersion: number;
  readonly symbol: string;
  readonly timeframe: string;
  /** The decision / fill instant the snapshot was read at (epoch ms). */
  readonly decisionAtMs: number;
  /** Close of the newest bar known at that instant. */
  readonly readAsOfMs: number;
  /** Decimals the instrument's prices print at (pricePrecision.displayPrecisionFor), or null if not stored. */
  readonly priceDp: number | null;
  readonly snapshot: {
    readonly direction: "BULLISH" | "BEARISH";
    readonly bottom: number;
    readonly top: number;
    readonly state: FvgState;
    readonly mitigation: FvgMitigation;
    /** Deepest cumulative penetration at decision time, fraction of size [0, 1]. */
    readonly maxPenetration: number;
    readonly remaining: { readonly bottom: number; readonly top: number } | null;
    readonly interaction: FvgDecisionInteraction;
    /** Interactions that had begun by decision time. */
    readonly interactionsSoFar: number;
    readonly ageBars: number;
    readonly evidence: readonly FvgSnapshotEvidence[];
  };
}

export type FvgReferenceResult =
  | { readonly ok: true; readonly ref: JournalFvgReference }
  | { readonly ok: false; readonly reason: string };

function interactionAt(o: FvgObject): FvgDecisionInteraction {
  const n = o.interactions.length;
  if (n === 0) return "BEFORE_ANY_TOUCH";
  const running = o.interactions[n - 1].endAt === null;
  if (n === 1) return running ? "DURING_FIRST_INTERACTION" : "AFTER_FIRST_INTERACTION";
  return running ? "DURING_LATER_INTERACTION" : "AFTER_LATER_INTERACTION";
}

/** The reference, read from bars through the one engine and the one as-of accessor. */
export function fvgReferenceAtDecision(input: {
  readonly objectId: string;
  readonly decisionAtMs: number;
  /** Closed canonical bars for the object's own symbol and timeframe. */
  readonly bars: readonly CanonicalBar[];
  readonly extendedHours?: boolean;
}): FvgReferenceResult {
  const id = parseFvgObjectId(input.objectId);
  if (!id) return { ok: false, reason: "That is not an FVG object id (FVG|symbol|timeframe|time|direction|version)." };
  if (!Number.isFinite(input.decisionAtMs)) return { ok: false, reason: "The decision time is not known, so the gap's state at that moment cannot be read." };
  const full = detectFvgs(input.bars, { symbolId: id.symbol, timeframe: id.timeframe, extendedHours: input.extendedHours });
  if (!full.objects.some(o => o.objectId === input.objectId)) {
    return { ok: false, reason: "This gap is not in the bars on hand (it may be older than the history read) — nothing is recorded rather than a guess." };
  }
  const asOf = fvgStateAsOf(full, input.decisionAtMs);
  const o = asOf.objects.find(x => x.objectId === input.objectId);
  if (!o || asOf.asOf === null) {
    return { ok: false, reason: "At the decision time this gap did not exist yet (its third bar had not closed)." };
  }
  const evidence: FvgSnapshotEvidence[] = [
    { sense: "PRICE_GEOMETRY", state: "FULL", ref: "OHLC" },
    ...(["ORDER_FLOW", "DERIVATIVES"] as const).map(sense => {
      const s = o.senses[sense];
      return s.state === "BY_REFERENCE"
        ? { sense, state: s.ownerState, ref: `${s.owner} ${s.ref}` }
        : { sense, state: "NOT_ATTACHED", ref: null };
    }),
  ];
  return {
    ok: true,
    ref: {
      kind: FVG_REF_KIND,
      version: 1,
      objectId: o.objectId,
      definitionId: o.definitionId,
      definitionVersion: o.definitionVersion,
      symbol: id.symbol,
      timeframe: id.timeframe,
      decisionAtMs: input.decisionAtMs,
      readAsOfMs: asOf.asOf,
      priceDp: displayPrecisionFor(id.symbol, input.bars),
      snapshot: {
        direction: o.direction,
        bottom: o.bottom,
        top: o.top,
        state: o.state,
        mitigation: o.mitigation,
        maxPenetration: o.maxPenetration,
        remaining: o.remaining,
        interaction: interactionAt(o),
        interactionsSoFar: o.interactions.length,
        ageBars: o.ageBars,
        evidence,
      },
    },
  };
}

const INTERACTION_WORDS: Readonly<Record<FvgDecisionInteraction, string>> = {
  BEFORE_ANY_TOUCH: "before price had touched it",
  DURING_FIRST_INTERACTION: "during the first interaction",
  DURING_LATER_INTERACTION: "during a later interaction",
  AFTER_FIRST_INTERACTION: "after the first interaction had ended",
  AFTER_LATER_INTERACTION: "after a later interaction had ended",
};

/** One plain sentence for the entry. Facts only — no grade, no fill expectation. */
export function fvgReferenceSentence(r: JournalFvgReference): string {
  const s = r.snapshot;
  const pen = Math.round(s.maxPenetration * 100);
  const p = (x: number) => (r.priceDp !== null ? x.toFixed(r.priceDp) : String(Number(x.toPrecision(7))));
  const rem = s.remaining ? `${p(s.remaining.bottom)}–${p(s.remaining.top)} unvisited` : "no unvisited territory";
  return `${s.direction.toLowerCase()} gap ${p(s.bottom)}–${p(s.top)} on ${r.symbol} ${r.timeframe} (${r.definitionId} v${r.definitionVersion}): `
    + `at decision time it was ${s.state.replace(/_/g, " ").toLowerCase()}, ${INTERACTION_WORDS[s.interaction]} `
    + `(${s.interactionsSoFar} interaction${s.interactionsSoFar === 1 ? "" : "s"} so far), deepest penetration ${pen}%, ${rem}, ${s.ageBars} bars old.`;
}

/* ── STORAGE: read a stored reference field by field ─────────────────────── */

const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const STATES = new Set(["BORN", "OPEN", "APPROACHING", "TOUCHED", "PARTIALLY_MITIGATED", "DEEPLY_MITIGATED", "FULLY_MITIGATED", "REJECTED", "ACCEPTED", "TRADED_THROUGH", "MEMORY"]);
const MITS = new Set(["NONE", "TOUCHED", "PARTIAL", "DEEP", "FULL"]);
const INTS = new Set(Object.keys(INTERACTION_WORDS));

/** A stored reference, or null when anything material does not validate (never a partial guess). */
export function readJournalFvgReference(raw: unknown): JournalFvgReference | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const s = (r.snapshot && typeof r.snapshot === "object" ? r.snapshot : null) as Record<string, unknown> | null;
  const id = typeof r.objectId === "string" ? parseFvgObjectId(r.objectId) : null;
  if (r.kind !== FVG_REF_KIND || r.version !== 1 || !id || !s) return null;
  if (typeof r.definitionId !== "string" || !fin(r.definitionVersion) || !fin(r.decisionAtMs) || !fin(r.readAsOfMs)) return null;
  if ((s.direction !== "BULLISH" && s.direction !== "BEARISH") || !fin(s.bottom) || !fin(s.top) || !(s.top > s.bottom)) return null;
  if (typeof s.state !== "string" || !STATES.has(s.state) || typeof s.mitigation !== "string" || !MITS.has(s.mitigation)) return null;
  if (!fin(s.maxPenetration) || typeof s.interaction !== "string" || !INTS.has(s.interaction) || !fin(s.interactionsSoFar) || !fin(s.ageBars)) return null;
  const rem = s.remaining as Record<string, unknown> | null;
  const remaining = rem && fin(rem.bottom) && fin(rem.top) ? { bottom: rem.bottom, top: rem.top } : null;
  const evidence = (Array.isArray(s.evidence) ? s.evidence : [])
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .filter(e => (e.sense === "PRICE_GEOMETRY" || e.sense === "ORDER_FLOW" || e.sense === "DERIVATIVES") && typeof e.state === "string")
    .map(e => ({ sense: e.sense as FvgSnapshotEvidence["sense"], state: String(e.state).slice(0, 40), ref: typeof e.ref === "string" ? e.ref.slice(0, 80) : null }));
  return {
    kind: FVG_REF_KIND,
    version: 1,
    objectId: r.objectId as string,
    definitionId: r.definitionId,
    definitionVersion: r.definitionVersion,
    symbol: id.symbol,
    timeframe: id.timeframe,
    decisionAtMs: r.decisionAtMs,
    readAsOfMs: r.readAsOfMs,
    priceDp: fin(r.priceDp) && Number.isInteger(r.priceDp) && r.priceDp >= 0 && r.priceDp <= 10 ? r.priceDp : null,
    snapshot: {
      direction: s.direction,
      bottom: s.bottom,
      top: s.top,
      state: s.state as FvgState,
      mitigation: s.mitigation as FvgMitigation,
      maxPenetration: s.maxPenetration,
      remaining,
      interaction: s.interaction as FvgDecisionInteraction,
      interactionsSoFar: s.interactionsSoFar,
      ageBars: s.ageBars,
      evidence,
    },
  };
}
