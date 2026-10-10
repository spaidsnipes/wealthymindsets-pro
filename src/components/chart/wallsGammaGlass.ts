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
}

export interface WallsGammaLabelJob { readonly y: number; readonly text: string; readonly rgb: string; readonly kinds: readonly string[] }

export interface WallsGammaGlassResult {
  readonly heat: string;
  readonly regions: string;
  readonly marks: string;
  readonly labels: readonly WallsGammaLabelJob[];
  /** Heat bands on glass, for Inspect hit-testing (bucket index → rect). */
  readonly heatHits: readonly { readonly i: number; readonly y0: number; readonly y1: number }[];
}

const CALL_RGB = "80,190,180";
const PUT_RGB = "214,120,150";
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
      if (b.net >= 0) {
        if (preset.focus === "NEGATIVE") return;
        ctx.fillStyle = `rgba(${preset.posRgb},${a.toFixed(3)})`;
        ctx.fillRect(0, y0, plotRight, h);
        // Edge treatment: a lit top seam — positive reads as a plate.
        ctx.fillStyle = `rgba(${preset.posRgb},${Math.min(1, a * 2.2).toFixed(3)})`;
        ctx.fillRect(0, y0, plotRight, 1);
        pos++;
      } else {
        if (preset.focus === "POSITIVE") return;
        // Hatched texture, with a faint wash so it reads at small heights.
        ctx.fillStyle = `rgba(${preset.negRgb},${(a * 0.35).toFixed(3)})`;
        ctx.fillRect(0, y0, plotRight, h);
        if (pattern) {
          const prev = ctx.globalAlpha;
          ctx.globalAlpha = prev * Math.min(1, a * 2.4);
          ctx.fillStyle = pattern;
          ctx.fillRect(0, y0, plotRight, h);
          ctx.globalAlpha = prev;
        }
        neg++;
      }
      heatHits.push({ i, y0, y1: y0 + h });
    });
    ctx.restore();
    heat = `ON:${gex.grade}:POS${pos}:NEG${neg}:${preset.id}`;
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
  for (const m of env.marks) {
    const y = yOf(m.price);
    if (y == null || y < top || y > bottom) { markWords.push(`${m.kinds.join("+")}@${m.price}:OFF_CAMERA`); continue; }
    let rgb = FLIP_RGB;
    for (const kind of m.kinds) {
      ctx.save();
      if (kind === "CALL_WALL" || kind === "PUT_WALL") {
        const call = kind === "CALL_WALL";
        rgb = call ? CALL_RGB : PUT_RGB;
        ctx.strokeStyle = `rgba(${rgb},${(0.9 * env.wallsAlpha).toFixed(3)})`;
        ctx.lineWidth = 2.5 * env.wallThickness;
        // Call solid, put dashed: told apart without colour.
        ctx.setLineDash(call ? [] : [5, 3]);
        ctx.beginPath(); ctx.moveTo(plotRight - 56, y); ctx.lineTo(plotRight, y); ctx.stroke();
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
  return { heat, regions, marks: markWords.join("|") || "NONE", labels, heatHits };
}
