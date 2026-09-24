/**
 * CONTRADICTION NOT AVERAGED — H-401 / F14.
 *
 * Sheet H-401: "Both truths paint. WAIT may be the honest state. False
 * ripeness if a pretty summary hides the crack. Passport shows both family
 * lines. DO NOT BLEND INTO ONE CLARITY SCORE."
 *
 * Each evidence FAMILY states its own lean at the current price, from its own
 * owner, with the measured fact behind it. Nothing is weighted, counted into a
 * score, or netted against anything else:
 *
 *   STRUCTURE  — the swing sequence (selectMarketStructure): higher highs &
 *                lows → UP, lower highs & lows → DOWN, mixed → no lean.
 *   EXHAUSTION — the newest exhausted push in the window (selectExhaustion):
 *                an exhausted UP push leans DOWN (the up-effort stopped
 *                paying), an exhausted DOWN push leans UP.
 *   ZONE       — a swing-origin zone price is inside or within reach of
 *                (selectStructureZoneObjects): a DEFENDED demand zone leans
 *                UP, a DEFENDED supply zone leans DOWN.
 *   EFFORT     — ONLY on a sided tape: net delta of the newest bars. On a
 *                VOLUME basis the tape never said who pressed, so this family
 *                states no lean at all.
 *
 * CONTRADICTION = at least one family leans UP and at least one leans DOWN.
 * Then both lists are published in full and the state is UNRESOLVED with the
 * posture WAIT. Agreement is published as AGREE; fewer than two leaning
 * families is NOT_ENOUGH — never "clear".
 *
 * PURE. DETERMINISTIC.
 */

export const CONTRADICTION_VERSION = 1;
export const EFFORT_BARS = 5;

export type Lean = "UP" | "DOWN";
export type FamilyId = "STRUCTURE" | "EXHAUSTION" | "ZONE" | "EFFORT";

export interface FamilyLine {
  readonly family: FamilyId;
  readonly lean: Lean;
  /** The measured fact, in one line. */
  readonly evidence: string;
}

export interface ContradictionVM {
  readonly version: number;
  readonly state: "UNRESOLVED" | "AGREE" | "NOT_ENOUGH";
  readonly up: readonly FamilyLine[];
  readonly down: readonly FamilyLine[];
  /** Families that were asked and stated no lean, with why. */
  readonly silent: readonly { readonly family: FamilyId; readonly why: string }[];
  readonly posture: string;
  /** Price band the contradiction is about (the zone, or the newest bar's range). */
  readonly bandLow: number | null;
  readonly bandHigh: number | null;
}

export interface ContradictionInput {
  readonly lastClose: number | null;
  readonly lastBarLow: number | null;
  readonly lastBarHigh: number | null;
  readonly structureBias: "HIGHER_HIGHS" | "LOWER_LOWS" | "RANGE" | "UNCLEAR" | null;
  readonly structureNote: string | null;
  /** The last two confirmed swing highs and lows — the sequence as prices. */
  readonly structurePivots?: { readonly h1: number; readonly h2: number; readonly l1: number; readonly l2: number } | null;
  readonly exhaustion: { readonly direction: "UP" | "DOWN"; readonly price: number; readonly followThrough: number | null } | null;
  readonly zones: readonly {
    readonly side: "DEMAND" | "SUPPLY";
    readonly low: number;
    readonly high: number;
    readonly state: string;
  }[];
  /** Median bar range — how near a zone must be to count as "at price". */
  readonly medianRange: number;
  /** Per-bar signed delta of the newest bars, or null when the tape is unsided. */
  readonly recentDelta: readonly number[] | null;
}

const f2 = (n: number) => n.toFixed(2);

export function selectContradiction(input: ContradictionInput): ContradictionVM {
  const up: FamilyLine[] = [];
  const down: FamilyLine[] = [];
  const silent: { family: FamilyId; why: string }[] = [];
  const push = (l: FamilyLine) => (l.lean === "UP" ? up : down).push(l);

  // STRUCTURE — the confirmed pivots themselves when known, else the owner's note.
  const pv = input.structurePivots;
  const seq = pv ? `highs ${f2(pv.h1)} → ${f2(pv.h2)} · lows ${f2(pv.l1)} → ${f2(pv.l2)}` : null;
  if (input.structureBias === "HIGHER_HIGHS") push({ family: "STRUCTURE", lean: "UP", evidence: seq ?? input.structureNote ?? "higher highs and higher lows" });
  else if (input.structureBias === "LOWER_LOWS") push({ family: "STRUCTURE", lean: "DOWN", evidence: seq ?? input.structureNote ?? "lower highs and lower lows" });
  else silent.push({ family: "STRUCTURE", why: input.structureBias ? "mixed swings — no sequence" : "structure not readable" });

  // EXHAUSTION
  if (input.exhaustion) {
    const e = input.exhaustion;
    push({
      family: "EXHAUSTION",
      lean: e.direction === "UP" ? "DOWN" : "UP",
      evidence: `${e.direction === "UP" ? "up" : "down"}-push exhausted at ${f2(e.price)} · follow-through ${e.followThrough ?? "—"}/3`,
    });
  } else silent.push({ family: "EXHAUSTION", why: "no exhausted push in the window" });

  // ZONE — defended zone at or within one median range of price
  let band: { lo: number; hi: number } | null = null;
  const p = input.lastClose;
  const reach = Math.max(0, input.medianRange);
  const near = p == null ? [] : input.zones.filter(z => p >= z.low - reach && p <= z.high + reach && z.state === "DEFENDED");
  if (near.length) {
    for (const z of near) {
      push({ family: "ZONE", lean: z.side === "DEMAND" ? "UP" : "DOWN", evidence: `${z.side.toLowerCase()} zone ${f2(z.low)}–${f2(z.high)} defended` });
      band = band ? { lo: Math.min(band.lo, z.low), hi: Math.max(band.hi, z.high) } : { lo: z.low, hi: z.high };
    }
  } else silent.push({ family: "ZONE", why: "no defended zone at price" });

  // EFFORT — sided tape only
  if (input.recentDelta && input.recentDelta.length) {
    const d = input.recentDelta.slice(-EFFORT_BARS).reduce((s, x) => s + x, 0);
    if (d > 0) push({ family: "EFFORT", lean: "UP", evidence: `net delta +${Math.round(d)} over ${Math.min(EFFORT_BARS, input.recentDelta.length)} bars` });
    else if (d < 0) push({ family: "EFFORT", lean: "DOWN", evidence: `net delta ${Math.round(d)} over ${Math.min(EFFORT_BARS, input.recentDelta.length)} bars` });
    else silent.push({ family: "EFFORT", why: "net delta flat" });
  } else silent.push({ family: "EFFORT", why: "tape states no aggressor side — effort has no lean" });

  if (!band && input.lastBarLow != null && input.lastBarHigh != null) band = { lo: input.lastBarLow, hi: input.lastBarHigh };

  const state: ContradictionVM["state"] =
    up.length && down.length ? "UNRESOLVED" : up.length + down.length >= 2 ? "AGREE" : "NOT_ENOUGH";
  return {
    version: CONTRADICTION_VERSION,
    state,
    up,
    down,
    silent,
    posture: state === "UNRESOLVED" ? "WAIT · BOTH TRUTHS PAINT" : state === "AGREE" ? "FAMILIES AGREE · STILL YOUR READ" : "NOT ENOUGH FAMILIES LEAN",
    bandLow: band?.lo ?? null,
    bandHigh: band?.hi ?? null,
  };
}

export default selectContradiction;
