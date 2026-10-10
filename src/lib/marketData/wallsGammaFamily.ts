/**
 * WALLS & GAMMA — the family's switches and its ONE level composer.
 *
 * Founder (2026-10-10): independently selectable, visually distinct
 * inventions — Liquidity Brick Walls (the existing BRICK_WALLS lens), Call
 * Wall, Put Wall, Gamma Exposure Heatmap, Positive Gamma regions, Negative
 * Gamma regions, Gamma Flip, Gamma concentration levels. "Never rename Call
 * Walls as Gamma; never draw the same line six times under different labels."
 *
 * So the level-shaped inventions (call wall, put wall, gamma flip, gamma
 * concentration) are composed HERE into one list of marks: two inventions that
 * land on the same price become ONE mark carrying both names (each its own
 * measure: "CALL OI" stays open interest, "Γ" stays gamma). Field-shaped
 * inventions (heatmap, regions) are bands, never lines.
 *
 * YIELD RULES (no double drawing):
 *   • Gamma Flip yields to Derivatives Pressure's zero-gamma FRONT while that
 *     field is on — the front is already on the glass.
 *   • Positive / Negative regions yield to the Derivatives Pressure FIELD
 *     while it is on — the field already tints them.
 *   • Brick Walls' own call / put OI ticks yield to Call Wall / Put Wall when
 *     those are on (the same OI strikes, drawn once).
 *
 * PURE.
 */
import type { ConcentrationWall } from "@/lib/marketData/viewModels/selectOptionsBarrierEvidence";
import type { GammaExposureVM } from "@/lib/marketData/gammaExposure";
import { gexWords } from "@/lib/marketData/gammaExposure";

export const WALLS_GAMMA_PARTS = [
  "CALL_WALL", "PUT_WALL", "GAMMA_HEATMAP", "GAMMA_POSITIVE", "GAMMA_NEGATIVE", "GAMMA_FLIP", "GAMMA_CONCENTRATION",
] as const;
export type WallsGammaPart = (typeof WALLS_GAMMA_PARTS)[number];
export type WallsGammaSelection = Readonly<Record<WallsGammaPart, boolean>>;

export const WALLS_GAMMA_OFF: WallsGammaSelection = {
  CALL_WALL: false, PUT_WALL: false, GAMMA_HEATMAP: false, GAMMA_POSITIVE: false, GAMMA_NEGATIVE: false, GAMMA_FLIP: false, GAMMA_CONCENTRATION: false,
};

/** Stored JSON (or anything) → a full selection; unknown keys dropped, missing = off. */
export function parseWallsGamma(raw: unknown): WallsGammaSelection {
  let v: unknown = raw;
  if (typeof raw === "string") { try { v = JSON.parse(raw); } catch { return WALLS_GAMMA_OFF; } }
  if (!v || typeof v !== "object") return WALLS_GAMMA_OFF;
  const o = v as Record<string, unknown>;
  const out: Record<WallsGammaPart, boolean> = { ...WALLS_GAMMA_OFF };
  for (const p of WALLS_GAMMA_PARTS) out[p] = o[p] === true;
  return out;
}

export function anyWallsGamma(sel: WallsGammaSelection): boolean {
  return WALLS_GAMMA_PARTS.some(p => sel[p]);
}
export function anyGammaPart(sel: WallsGammaSelection): boolean {
  return sel.GAMMA_HEATMAP || sel.GAMMA_POSITIVE || sel.GAMMA_NEGATIVE || sel.GAMMA_FLIP || sel.GAMMA_CONCENTRATION;
}

export type WallsGammaMarkKind = "CALL_WALL" | "PUT_WALL" | "GAMMA_FLIP" | "GAMMA_CONC_POS" | "GAMMA_CONC_NEG";

export interface WallsGammaMark {
  readonly price: number;
  /** Every invention this price carries, in a fixed order (walls first). */
  readonly kinds: readonly WallsGammaMarkKind[];
  /** One label naming each measure separately. */
  readonly label: string;
}

export interface ComposeInput {
  readonly selection: WallsGammaSelection;
  readonly callWalls: readonly ConcentrationWall[];
  readonly putWalls: readonly ConcentrationWall[];
  readonly gex: GammaExposureVM | null;
  /** Derivatives Pressure's field is on (its front + field are on the glass). */
  readonly pressureFieldOn: boolean;
  /** Two prices closer than this are one mark (≈ half the chain's strike step). */
  readonly mergeWithin: number;
  readonly fmt: (p: number) => string;
}

const ORDER: readonly WallsGammaMarkKind[] = ["CALL_WALL", "PUT_WALL", "GAMMA_CONC_POS", "GAMMA_CONC_NEG", "GAMMA_FLIP"];
const kOi = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));

export interface ComposeResult {
  readonly marks: readonly WallsGammaMark[];
  /** Parts that yielded to another lens, with why (for the receipt and the ⓘ). */
  readonly yielded: Readonly<Partial<Record<WallsGammaPart, string>>>;
}

export function composeWallsGammaMarks(input: ComposeInput): ComposeResult {
  const { selection: sel, gex, fmt } = input;
  const raw: { price: number; kind: WallsGammaMarkKind; words: string }[] = [];
  const yielded: Partial<Record<WallsGammaPart, string>> = {};
  if (sel.CALL_WALL) for (const w of input.callWalls) raw.push({ price: w.strike, kind: "CALL_WALL", words: `CALL WALL ${fmt(w.strike)} · OI ${kOi(w.openInterest)}` });
  if (sel.PUT_WALL) for (const w of input.putWalls) raw.push({ price: w.strike, kind: "PUT_WALL", words: `PUT WALL ${fmt(w.strike)} · OI ${kOi(w.openInterest)}` });
  if (gex?.drawn && sel.GAMMA_CONCENTRATION) {
    for (const c of gex.concentration) raw.push({ price: c.price, kind: c.sign === "POSITIVE" ? "GAMMA_CONC_POS" : "GAMMA_CONC_NEG", words: `Γ ${fmt(c.price)} ${gexWords(c.net)}` });
  }
  if (gex?.drawn && sel.GAMMA_FLIP) {
    if (input.pressureFieldOn) yielded.GAMMA_FLIP = "shown by the Derivatives Pressure zero-gamma front";
    else if (gex.flip.kind === "LEVEL") raw.push({ price: gex.flip.level, kind: "GAMMA_FLIP", words: `Γ FLIP ≈ ${fmt(gex.flip.level)} · MODEL` });
  }
  if (input.pressureFieldOn && (sel.GAMMA_POSITIVE || sel.GAMMA_NEGATIVE)) {
    if (sel.GAMMA_POSITIVE) yielded.GAMMA_POSITIVE = "shown by the Derivatives Pressure field";
    if (sel.GAMMA_NEGATIVE) yielded.GAMMA_NEGATIVE = "shown by the Derivatives Pressure field";
  }
  raw.sort((a, b) => a.price - b.price || ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  const marks: { price: number; kinds: WallsGammaMarkKind[]; parts: string[] }[] = [];
  for (const r of raw) {
    const last = marks[marks.length - 1];
    if (last && Math.abs(r.price - last.price) <= input.mergeWithin && !last.kinds.includes(r.kind)) {
      last.kinds.push(r.kind);
      last.parts.push(r.words);
      continue;
    }
    marks.push({ price: r.price, kinds: [r.kind], parts: [r.words] });
  }
  return {
    marks: marks.map(m => {
      const order = m.kinds.map((k, i) => ({ k, w: m.parts[i] })).sort((a, b) => ORDER.indexOf(a.k) - ORDER.indexOf(b.k));
      return { price: m.price, kinds: order.map(o => o.k), label: order.map(o => o.w).join(" · ") };
    }),
    yielded,
  };
}
