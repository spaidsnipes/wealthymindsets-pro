/**
 * EDGE BEACONS — Garden 19 finish-line plate 22b (Founder 2026-10-15).
 *
 * The camera fits the candles on camera; a level beyond it (a call / put wall, a gamma
 * concentration, a flip) is never allowed to stretch the price scale. It becomes one pill
 * at the pane edge in the direction it lies — "▲ Call wall 30,900 · Show me" — and the pill
 * is the Show-me target (src/lib/chart/cameraReveal.ts). One pill per direction: the level
 * nearest price leads, the rest are counted ("+2"), so the edge never fills with chips.
 *
 * Plate 21 type law: 15px / 600, bright ivory on a solid dark pill, a gold hairline rim,
 * nothing under 13px, no blur. The painter here is the only one that draws an off-camera
 * level; the brick stack and the walls/gamma chips feed it candidates.
 */

export type BeaconDir = "above" | "below";

export interface BeaconCandidate {
  readonly dir: BeaconDir;
  readonly price: number;
  /** What it is, as a receipt word: CALL_WALL · PUT_WALL · CALL_PUT_WALL · GAMMA_POS · GAMMA_NEG · GAMMA_FLIP · WALL. */
  readonly what: string;
  /** Formatted price, in the instrument's precision. */
  readonly priceText: string;
  /** For a brick wall: the strike the wall ticket selects. */
  readonly wallStrike?: number;
}

export interface BeaconChoice {
  readonly lead: BeaconCandidate;
  readonly more: number;
}

const NAME: Readonly<Record<string, string>> = {
  CALL_WALL: "Call wall",
  PUT_WALL: "Put wall",
  CALL_PUT_WALL: "Call + put wall",
  GAMMA_POS: "+Gamma level",
  GAMMA_NEG: "−Gamma level",
  GAMMA_FLIP: "Gamma flip",
  WALL: "Wall",
};

/** The receipt word for a walls/gamma mark's kinds (walls first, as the family orders them). */
export function beaconKindOf(kinds: readonly string[]): string {
  const call = kinds.includes("CALL_WALL"), put = kinds.includes("PUT_WALL");
  if (call && put) return "CALL_PUT_WALL";
  if (call) return "CALL_WALL";
  if (put) return "PUT_WALL";
  if (kinds.includes("GAMMA_FLIP")) return "GAMMA_FLIP";
  if (kinds.includes("GAMMA_CONC_NEG")) return "GAMMA_NEG";
  if (kinds.includes("GAMMA_CONC_POS")) return "GAMMA_POS";
  return "WALL";
}

/** "▲ Call wall 30,900 · Show me" — "+N" counts the other levels beyond the same edge. */
export function beaconWords(c: BeaconCandidate, more: number): string {
  return `${c.dir === "above" ? "▲" : "▼"} ${NAME[c.what] ?? NAME.WALL} ${c.priceText}${more > 0 ? ` +${more}` : ""} · Show me`;
}

/**
 * One beacon per direction: the candidate nearest `spot` leads; duplicates at the same price
 * (a brick wall and the walls/gamma mark for the same strike) count once.
 */
export function chooseBeacons(cands: readonly BeaconCandidate[], spot: number): BeaconChoice[] {
  const out: BeaconChoice[] = [];
  for (const dir of ["above", "below"] as const) {
    const byPrice = new Map<number, BeaconCandidate>();
    for (const c of cands) {
      if (c.dir !== dir || !Number.isFinite(c.price)) continue;
      const prev = byPrice.get(c.price);
      // A brick wall carries the strike its ticket selects; keep it over a bare mark.
      if (!prev || (prev.wallStrike == null && c.wallStrike != null)) byPrice.set(c.price, c);
    }
    const list = [...byPrice.values()].sort((a, b) => Math.abs(a.price - spot) - Math.abs(b.price - spot));
    if (list.length) out.push({ lead: list[0], more: list.length - 1 });
  }
  return out;
}

export interface BeaconRect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
export interface PlacedBeacon extends BeaconRect { readonly choice: BeaconChoice; readonly words: string }

export const BEACON_FONT = "600 15px Inter, ui-sans-serif, system-ui, sans-serif";
export const BEACON_H = 28;
const PAD_X = 12;

/** Where a beacon sits: centred toward the right of the plot (clear of the left reading cards), stepping aside for blockers. */
export function placeBeacon(
  dir: BeaconDir, w: number,
  frame: { readonly plotLeft: number; readonly plotRight: number; readonly top: number; readonly bottom: number },
  blockers: readonly BeaconRect[],
): BeaconRect {
  const y = dir === "above" ? frame.top + 6 : frame.bottom - 6 - BEACON_H;
  const span = Math.max(0, frame.plotRight - frame.plotLeft - w - 8);
  const hits = (r: BeaconRect) => blockers.some(b => r.x < b.x + b.w && r.x + r.w > b.x && r.y < b.y + b.h && r.y + r.h > b.y);
  for (const f of [0.62, 0.45, 0.8, 0.3, 0.95, 0.15]) {
    const r = { x: Math.round(frame.plotLeft + 4 + span * f), y, w, h: BEACON_H };
    if (!hits(r)) return r;
  }
  return { x: Math.round(frame.plotLeft + 4 + span * 0.62), y, w, h: BEACON_H };
}

type BeaconCtx = Pick<CanvasRenderingContext2D,
  "save" | "restore" | "font" | "measureText" | "fillStyle" | "strokeStyle" | "lineWidth" | "beginPath" | "roundRect" | "fill" | "stroke" | "fillText" | "textAlign" | "textBaseline" | "globalAlpha">;

/** Paint the chosen beacons; returns where each landed (the Show-me hit targets). */
export function paintEdgeBeacons(
  ctx: BeaconCtx, choices: readonly BeaconChoice[],
  frame: { readonly plotLeft: number; readonly plotRight: number; readonly top: number; readonly bottom: number },
  blockers: readonly BeaconRect[],
  /** Called with each pill before its words paint (the chart declares it an opaque card to its word gate). */
  onPill?: (r: BeaconRect) => void,
): PlacedBeacon[] {
  const placed: PlacedBeacon[] = [];
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.font = BEACON_FONT;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  for (const choice of choices) {
    const words = beaconWords(choice.lead, choice.more);
    const w = Math.ceil(ctx.measureText(words).width) + PAD_X * 2;
    const r = placeBeacon(choice.lead.dir, w, frame, [...blockers, ...placed]);
    ctx.fillStyle = "rgba(12,10,8,0.94)";
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 7); ctx.fill();
    ctx.strokeStyle = "rgba(212,175,55,0.95)";
    ctx.lineWidth = 1.25;
    ctx.beginPath(); ctx.roundRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 7); ctx.stroke();
    onPill?.(r);
    ctx.fillStyle = "#F3EBDD";
    ctx.fillText(words, r.x + PAD_X, r.y + r.h / 2 + 0.5);
    placed.push({ ...r, choice, words });
  }
  ctx.restore();
  return placed;
}

/** The overlay receipt: "ABOVE:CALL_WALL@30900+0:x,y|BELOW:…" (centre in glass px), or NONE. */
export function beaconReceipt(placed: readonly PlacedBeacon[]): string {
  return placed.map(p => `${p.choice.lead.dir.toUpperCase()}:${p.choice.lead.what}@${p.choice.lead.price}+${p.choice.more}:${Math.round(p.x + p.w / 2)},${Math.round(p.y + p.h / 2)}`).join("|") || "NONE";
}
