/**
 * WALLS & GAMMA ON GLASS — the family's painter (2026-10-10).
 *
 * Paints, from ONE GEX compilation (gammaExposure.ts) and ONE composed mark
 * list (wallsGammaFamily.composeWallsGammaMarks), never recomputing either:
 *
 *   HEATMAP      a band per strike bucket, Y = price, intensity = |GEX|.
 *                Positive: a solid cool fill with a lit top edge.
 *                Negative: diagonal amber HATCHING (texture, not just hue).
 *                Cut out of every candle body, the newest bars' corridor,
 *                the last-price row and every order line; clipped left of
 *                the price axis.
 *   REGIONS      a rail on the left edge: solid for positive, hatched for
 *                negative — never a second full-width field.
 *   LEVEL MARKS  call wall (solid teal tick), put wall (dashed rose tick),
 *                gamma concentration (diamond-tipped tick in its own lane),
 *                gamma flip (dash-dot line). A price carrying several is ONE
 *                mark with one label naming each measure.
 *
 * Returns label jobs; MainChart's one placer seats them.
 */
import type { GammaExposureVM } from "@/lib/marketData/gammaExposure";
import type { WallsGammaMark, WallsGammaSelection } from "@/lib/marketData/wallsGammaFamily";
import type { GammaHeatPreset } from "@/lib/chart/gammaHeatAppearance";

export interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

export interface WallsGammaGlassEnv {
  readonly ctx: CanvasRenderingContext2D;
  readonly sel: WallsGammaSelection;
  readonly gex: GammaExposureVM | null;
  readonly marks: readonly WallsGammaMark[];
  readonly yOf: (p: number) => number | null;
  readonly plotRight: number;
  readonly top: number;
  readonly bottom: number;
  /** Candle bodies (and wicks) the fills are cut out of. */
  readonly cutRects: readonly Rect[];
  /** The newest bars' corridor — no heat inside it. */
  readonly clearZone: Rect | null;
  /** Rows kept clear of heat: the last price and every order line (y px). */
  readonly keepRows: readonly number[];
  readonly preset: GammaHeatPreset;
  readonly gammaAlpha: number;
  readonly wallsAlpha: number;
  /** Derivatives Pressure's field is on — regions yield to it. */
  readonly pressureFieldOn: boolean;
  readonly wallThickness: number;
  /** The last price — which side of the camera an off-camera mark lies on. */
  readonly lastPrice: number | null;
  /** The trader's call / put wall inks ("r,g,b"); absent = the room's. Call solid, put dashed either way. */
  readonly callRgb?: string;
  readonly putRgb?: string;
}

export interface WallsGammaLabelJob { readonly y: number; readonly text: string; readonly rgb: string; readonly kinds: readonly string[] }

export interface WallsGammaGlassResult {
  readonly heat: string;
  readonly regions: string;
  readonly marks: string;
  readonly labels: readonly WallsGammaLabelJob[];
  /** Heat bands on glass, for Inspect hit-testing (bucket index → rect). */
  readonly heatHits: readonly { readonly i: number; readonly y0: number; readonly y1: number }[];
  /** Marks beyond the camera, nearest first — the glass names them at its edge, never silently drops them. */
  readonly offCamera: { readonly above: readonly WallsGammaMark[]; readonly below: readonly WallsGammaMark[] };
}

/** One edge chip's words: the nearest off-camera mark in full, then how many more. */
export function edgeChipWords(dir: "above" | "below", marks: readonly WallsGammaMark[]): string | null {
  if (!marks.length) return null;
  return `${dir === "above" ? "▲" : "▼"} ${marks[0].label}${marks.length > 1 ? `  +${marks.length - 1} more` : ""}`;
}

/** The room's call / put wall inks; the trader's own (Chart Settings) arrive as env.callRgb / env.putRgb. */
export const CALL_WALL_RGB = "80,190,180";
export const PUT_WALL_RGB = "214,120,150";
const FLIP_RGB = "236,222,190";

const hatchCache = new Map<string, HTMLCanvasElement>();
function hatchTile(rgb: string): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  let c = hatchCache.get(rgb);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = 8; c.height = 8;
  const g = c.getContext("2d");
  if (!g) return null;
  g.strokeStyle = `rgba(${rgb},1)`;
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(-2, 10); g.lineTo(10, -2);
  g.moveTo(-2, 2); g.lineTo(2, -2);
  g.moveTo(6, 10); g.lineTo(10, 6);
  g.stroke();
  hatchCache.set(rgb, c);
  return c;
}

export function paintWallsGamma(env: WallsGammaGlassEnv): WallsGammaGlassResult {
  const { ctx, sel, gex, yOf, plotRight, top, bottom, preset } = env;
  const heatHits: { i: number; y0: number; y1: number }[] = [];
  let heat = sel.GAMMA_HEATMAP ? (gex?.drawn ? "" : `SILENCE:${gex ? gex.reason : "WAITING_FOR_CHAIN"}`) : "OFF";
  let regions = sel.GAMMA_POSITIVE || sel.GAMMA_NEGATIVE ? "" : "OFF";
  const labels: WallsGammaLabelJob[] = [];
  const degradedK = gex?.drawn && gex.grade === "DEGRADED" ? 0.6 : 1;

  // ── HEATMAP ──────────────────────────────────────────────────────────────
  if (sel.GAMMA_HEATMAP && gex?.drawn && gex.maxAbsBucket > 0) {
    ctx.save();
    const clip = new Path2D();
    clip.rect(0, top, plotRight, Math.max(0, bottom - top));
    for (const r of env.cutRects) clip.rect(r.x, r.y, r.w, r.h);
    if (env.clearZone) clip.rect(env.clearZone.x, env.clearZone.y, env.clearZone.w, env.clearZone.h);
    for (const y of env.keepRows) clip.rect(0, y - 4, plotRight, 8);
    ctx.clip(clip, "evenodd");
    const tile = hatchTile(preset.negRgb);
    const pattern = tile ? ctx.createPattern(tile, "repeat") : null;
    let pos = 0, neg = 0;
    gex.buckets.forEach((b, i) => {
      const k = Math.abs(b.net) / gex.maxAbsBucket;
      if (k < preset.floor) return;
      const ya = yOf(b.hi), yb = yOf(b.lo);
      if (ya == null || yb == null) return;
      const y0 = Math.min(ya, yb), y1 = Math.max(ya, yb);
      if (y1 < top || y0 > bottom) return;
      const h = Math.max(1, y1 - y0 - 1); // a 1px seam between strikes
      const a = Math.min(1, preset.maxAlpha * Math.sqrt(k) * env.gammaAlpha * degradedK);
      // Codex plate 01 side by side with serving ES1! 15m (2026-10-16): a full-width hatched film over the
      // candles muddied the call / put wall bands on the same strikes and never read as exposure. Gamma is an
      // EXPOSURE PROFILE now: a solid bar per strike bucket anchored at the plot's left edge, length ∝ |net|
      // (linear, the largest bucket = profileMax), teal + / orange − with the hatch inside the bar so the sign
      // never rests on colour alone, a crisp edge. Price geography is unchanged; the candles stay cut out.
      const profileMax = Math.min(260, plotRight * 0.26);
      const len = Math.max(14, profileMax * k);
      const aBar = Math.min(0.9, (0.38 + 0.5 * k) * env.gammaAlpha * degradedK);
      if (b.net >= 0) {
        if (preset.focus === "NEGATIVE") return;
        ctx.fillStyle = `rgba(${preset.posRgb},${aBar.toFixed(3)})`;
        ctx.fillRect(0, y0, len, h);
        ctx.fillStyle = `rgba(${preset.posRgb},${Math.min(1, aBar * 1.6).toFixed(3)})`;
        ctx.fillRect(0, y0, len, 1);
        ctx.fillRect(len - 2, y0, 2, h);
        pos++;
      } else {
        if (preset.focus === "POSITIVE") return;
        ctx.fillStyle = `rgba(${preset.negRgb},${(aBar * 0.7).toFixed(3)})`;
        ctx.fillRect(0, y0, len, h);
        if (pattern) {
          const prev = ctx.globalAlpha;
          ctx.globalAlpha = prev * Math.min(1, aBar * 1.4);
          ctx.fillStyle = pattern;
          ctx.fillRect(0, y0, len, h);
          ctx.globalAlpha = prev;
        }
        ctx.fillStyle = `rgba(${preset.negRgb},${Math.min(1, aBar * 1.6).toFixed(3)})`;
        ctx.fillRect(len - 2, y0, 2, h);
        neg++;
      }
      heatHits.push({ i, y0, y1: y0 + h });
    });
    ctx.restore();
    heat = `ON:${gex.grade}:POS${pos}:NEG${neg}:${preset.id}`;

    /* THE GAMMA LADDER (Founder's Garden 19 finish-line order §3, 2026-10-15). Serving AAPL 5m:
       the two positive buckets were $5 strike steps and the viewport spanned $4.5, so the
       "heatmap" was one uniform film over the whole plot — painted, and invisible, because a
       band with no edge on camera is not a band. Every heat band on camera now also has a solid
       column at the plot's left edge (sign colour, intensity = its share of the largest bucket),
       a tick at each strike boundary, and words naming the strike range, the sign and the
       intensity. A band is identifiable at any zoom, and the words go through the one placer. */
    ctx.save();
    const LADDER_W = 10;
    for (const hit of heatHits) {
      const b = gex.buckets[hit.i];
      if (!b) continue;
      const k = Math.abs(b.net) / gex.maxAbsBucket;
      const posB = b.net >= 0;
      const rgb = posB ? preset.posRgb : preset.negRgb;
      const y0 = Math.max(top, hit.y0), y1 = Math.min(bottom, hit.y1);
      if (y1 - y0 < 1) continue;
      ctx.fillStyle = `rgba(${rgb},${(Math.min(1, (0.3 + 0.6 * Math.sqrt(k)) * env.gammaAlpha * degradedK)).toFixed(3)})`;
      ctx.fillRect(0, y0, LADDER_W, y1 - y0);
      ctx.strokeStyle = `rgba(${rgb},${(0.95 * env.gammaAlpha * degradedK).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y0 + 0.5); ctx.lineTo(LADDER_W + 8, y0 + 0.5);
      ctx.moveTo(0, y1 - 0.5); ctx.lineTo(LADDER_W + 8, y1 - 0.5);
      ctx.stroke();
      const fmt = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: Number.isInteger(v) ? 0 : 2 });
      // Plain words (Garden 19 §13, serving b3be2cc NQ1! 5m: "+GEX 30215–30225 · 7% · NEAR-MONEY" ×10 over
      // the newest candles). The status line says PARTIAL / near-money once; a faint band (< 30% of the
      // strongest) keeps its band and its ladder tick, its words wait in the event list.
      if (k >= 0.3) labels.push({ y: (y0 + y1) / 2, text: `${posB ? "+" : "−"}Gamma ${fmt(b.lo)}–${fmt(b.hi)} · ${Math.round(k * 100)}%`, rgb, kinds: [posB ? "GAMMA_HEAT_POS" : "GAMMA_HEAT_NEG"] });
    }
    ctx.restore();
  }

  // ── REGIONS — a left rail, yielding to the pressure field ────────────────
  if ((sel.GAMMA_POSITIVE || sel.GAMMA_NEGATIVE) && !env.pressureFieldOn) {
    if (!gex?.drawn) regions = `SILENCE:${gex ? gex.reason : "WAITING_FOR_CHAIN"}`;
    else if (!gex.regions.length) regions = "SILENCE:PROFILE_WITHHELD";
    else {
      const tile = hatchTile(preset.negRgb);
      const pattern = tile ? ctx.createPattern(tile, "repeat") : null;
      const shown: string[] = [];
      for (const r of gex.regions) {
        const want = r.sign === "POSITIVE" ? sel.GAMMA_POSITIVE : sel.GAMMA_NEGATIVE;
        if (!want) continue;
        const ya = yOf(r.to), yb = yOf(r.from);
        if (ya == null || yb == null) continue;
        const y0 = Math.max(top, Math.min(ya, yb)), y1 = Math.min(bottom, Math.max(ya, yb));
        if (y1 - y0 < 2) continue;
        ctx.save();
        if (r.sign === "POSITIVE") {
          ctx.fillStyle = `rgba(${preset.posRgb},${(0.55 * env.gammaAlpha * degradedK).toFixed(3)})`;
          ctx.fillRect(2, y0, 7, y1 - y0);
        } else {
          ctx.fillStyle = `rgba(${preset.negRgb},${(0.18 * env.gammaAlpha * degradedK).toFixed(3)})`;
          ctx.fillRect(2, y0, 7, y1 - y0);
          if (pattern) { ctx.fillStyle = pattern; ctx.globalAlpha = Math.min(1, 0.9 * env.gammaAlpha * degradedK); ctx.fillRect(2, y0, 7, y1 - y0); }
        }
        ctx.restore();
        // Bracket ends so a region reads as a span, not a stripe.
        ctx.strokeStyle = `rgba(${r.sign === "POSITIVE" ? preset.posRgb : preset.negRgb},${(0.8 * env.gammaAlpha).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(2, y0 + 0.5); ctx.lineTo(14, y0 + 0.5);
        ctx.moveTo(2, y1 - 0.5); ctx.lineTo(14, y1 - 0.5);
        ctx.stroke();
        shown.push(`${r.sign === "POSITIVE" ? "+" : "-"}${r.from.toFixed(2)}-${r.to.toFixed(2)}`);
      }
      regions = shown.length ? `ON:${shown.join(",")}` : "ON:OFF_CAMERA";
    }
  } else if ((sel.GAMMA_POSITIVE || sel.GAMMA_NEGATIVE) && env.pressureFieldOn) regions = "YIELDS_TO_PRESSURE_FIELD";

  // ── LEVEL MARKS ──────────────────────────────────────────────────────────
  const markWords: string[] = [];
  const above: WallsGammaMark[] = [], below: WallsGammaMark[] = [];
  for (const m of env.marks) {
    const y = yOf(m.price);
    if (y == null || y < top || y > bottom) {
      markWords.push(`${m.kinds.join("+")}@${m.price}:OFF_CAMERA`);
      const up = y != null ? y < top : env.lastPrice != null ? m.price > env.lastPrice : false;
      (up ? above : below).push(m);
      continue;
    }
    let rgb = FLIP_RGB;
    for (const kind of m.kinds) {
      ctx.save();
      if (kind === "CALL_WALL" || kind === "PUT_WALL") {
        const call = kind === "CALL_WALL";
        rgb = call ? (env.callRgb ?? CALL_WALL_RGB) : (env.putRgb ?? PUT_WALL_RGB);
        ctx.strokeStyle = `rgba(${rgb},${(0.9 * env.wallsAlpha).toFixed(3)})`;
        ctx.lineWidth = 2.5 * env.wallThickness;
        // Call solid, put dashed: told apart without colour.
        ctx.setLineDash(call ? [] : [5, 3]);
        ctx.beginPath(); ctx.moveTo(plotRight - 56, y); ctx.lineTo(plotRight, y); ctx.stroke();
        // Garden 19 §13 / Codex plate 01 (2026-10-16): a wall is a fixed-strike BAND with visible mass across the
        // plot (was only this 56px stroke at the axis), clipped out of the keep-clear rects like the flip.
        ctx.save();
        const clipW = new Path2D();
        clipW.rect(0, top, plotRight, Math.max(0, bottom - top));
        for (const r of env.cutRects) clipW.rect(r.x, r.y, r.w, r.h);
        ctx.clip(clipW, "evenodd");
        ctx.setLineDash([]);
        // Codex plate 01 side by side with serving ES1! 15m (2026-10-16): the band read as a 6px strip at 12% ink
        // ("walls must occupy price"). It is now a GLOWING BAND — 16px × thickness, a vertical gradient that is
        // brightest at its two edges, crisp 1.5px edge rules. A strike that is BOTH a call and a put wall splits
        // its band: call ink on the upper half, put ink on the lower (one band, both truths, never stacked twice).
        const both = m.kinds.includes("CALL_WALL") && m.kinds.includes("PUT_WALL");
        const half = 8 * env.wallThickness;
        const y0 = both ? (call ? y - half : y) : y - half;
        const y1 = both ? (call ? y : y + half) : y + half;
        const aW = env.wallsAlpha;
        const g = ctx.createLinearGradient(0, y0, 0, y1);
        g.addColorStop(0, `rgba(${rgb},${(0.62 * aW).toFixed(3)})`);
        g.addColorStop(0.5, `rgba(${rgb},${(0.3 * aW).toFixed(3)})`);
        g.addColorStop(1, `rgba(${rgb},${(0.62 * aW).toFixed(3)})`);
        ctx.fillStyle = g;
        ctx.fillRect(16, y0, Math.max(0, plotRight - 72), y1 - y0);
        ctx.strokeStyle = `rgba(${rgb},${Math.min(1, 0.95 * aW + 0.05).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash(call ? [] : [6, 3]);
        ctx.beginPath();
        if (!both || call) { ctx.moveTo(16, Math.round(y0) + 0.75); ctx.lineTo(plotRight - 56, Math.round(y0) + 0.75); }
        if (!both || !call) { ctx.moveTo(16, Math.round(y1) - 0.75); ctx.lineTo(plotRight - 56, Math.round(y1) - 0.75); }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      } else if (kind === "GAMMA_CONC_POS" || kind === "GAMMA_CONC_NEG") {
        const posK = kind === "GAMMA_CONC_POS";
        const c = posK ? preset.posRgb : preset.negRgb;
        if (!m.kinds.includes("CALL_WALL") && !m.kinds.includes("PUT_WALL")) rgb = c;
        ctx.strokeStyle = `rgba(${c},${(0.95 * env.gammaAlpha * degradedK).toFixed(3)})`;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = 2;
        ctx.setLineDash(posK ? [] : [3, 2]);
        ctx.beginPath(); ctx.moveTo(plotRight - 84, y); ctx.lineTo(plotRight - 62, y); ctx.stroke();
        ctx.setLineDash([]);
        // Diamond tip: gamma's own glyph.
        ctx.beginPath(); ctx.moveTo(plotRight - 88, y); ctx.lineTo(plotRight - 84, y - 4); ctx.lineTo(plotRight - 80, y); ctx.lineTo(plotRight - 84, y + 4); ctx.closePath();
        if (posK) ctx.fill(); else ctx.stroke();
        // Garden 19 §13: a concentration is a RIDGE across the plot (was a 22px tick and a diamond at the axis —
        // "anything named Gamma does not work"), solid for +, dashed for −, clipped out of the keep-clear rects.
        ctx.save();
        const clipC = new Path2D();
        clipC.rect(0, top, plotRight, Math.max(0, bottom - top));
        for (const r of env.cutRects) clipC.rect(r.x, r.y, r.w, r.h);
        ctx.clip(clipC, "evenodd");
        ctx.strokeStyle = `rgba(${c},${(0.42 * env.gammaAlpha * degradedK).toFixed(3)})`;
        ctx.lineWidth = 3;
        ctx.setLineDash(posK ? [] : [7, 4]);
        ctx.beginPath(); ctx.moveTo(16, y); ctx.lineTo(plotRight - 92, y); ctx.stroke();
        ctx.restore();
      } else if (kind === "GAMMA_FLIP") {
        if (m.kinds.length === 1) rgb = FLIP_RGB;
        ctx.strokeStyle = `rgba(${FLIP_RGB},${(0.85 * env.gammaAlpha * degradedK).toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([8, 3, 2, 3]);
        const clip = new Path2D();
        clip.rect(0, top, plotRight, Math.max(0, bottom - top));
        for (const r of env.cutRects) clip.rect(r.x, r.y, r.w, r.h);
        ctx.clip(clip, "evenodd");
        ctx.beginPath(); ctx.moveTo(16, y); ctx.lineTo(plotRight - 90, y); ctx.stroke();
      }
      ctx.restore();
    }
    labels.push({ y, text: m.label, rgb, kinds: m.kinds });
    markWords.push(`${m.kinds.join("+")}@${m.price}`);
  }
  // Nearest the camera first.
  above.sort((a, b) => a.price - b.price);
  below.sort((a, b) => b.price - a.price);
  return { heat, regions, marks: markWords.join("|") || "NONE", labels, heatHits, offCamera: { above, below } };
}

/**
 * NARROW GLASS — ONE FOLDED LINE (phone, 2026-10-10). On 390 every family word
 * (status line, edge chips, mark labels) was folded away into the phone's
 * summary. Narrow glass gets ONE line instead, seated left at the silence
 * column: the truth (grade · source · OI clock · as-of · MODEL) first, then the
 * off-camera levels. Words are never cut: the line wraps between " · " pieces
 * onto as few rows as the width needs.
 */
export function foldNarrowLine(segments: readonly string[], maxW: number, measure: (t: string) => number): string[] {
  const pieces = segments.flatMap(s => s.split(" · ")).map(p => p.trim()).filter(Boolean);
  const rows: string[] = [];
  let cur = "";
  for (const p of pieces) {
    const next = cur ? `${cur} · ${p}` : p;
    if (!cur || measure(next) <= maxW) { cur = next; continue; }
    rows.push(cur);
    cur = p;
  }
  if (cur) rows.push(cur);
  return rows;
}

/** The off-camera levels in the fewest words: "▲ CALL WALL 790 +1" / "▼ PUT WALL 740". */
export function offCameraShortWords(off: { readonly above: readonly WallsGammaMark[]; readonly below: readonly WallsGammaMark[] }): string[] {
  const head = (m: WallsGammaMark) => m.label.split(" · ")[0];
  const out: string[] = [];
  if (off.above.length) out.push(`▲ ${head(off.above[0])}${off.above.length > 1 ? ` +${off.above.length - 1}` : ""}`);
  if (off.below.length) out.push(`▼ ${head(off.below[0])}${off.below.length > 1 ? ` +${off.below.length - 1}` : ""}`);
  return out;
}
