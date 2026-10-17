/**
 * SCAFFOLDING ON THE GLASS — canon plate S-12G (Drive 1iSG1S89OG8kifCsPOq3r9ymtOOqKbkfz, 2026-10-16).
 *
 * Founder 2026-10-16: "the scaffolding shouldn't be just cards … foundation view, six steps, lower highs and
 * lows, buyers out-trading — you should actually SEE this stuff." The six steps are drawn where their evidence is:
 *   1 STRUCTURE   a gold staircase through the confirmed swings, each tagged HH / HL / LH / LL
 *   2 EFFORT      earlier-half vs recent-half effort as two bars on the volume floor
 *   3 RESULT      a travel arrow for each half (earlier ivory, recent blue)
 *   4 LOCATION    the swing price is pushing into (its dashed rule is the room's own), tagged
 *   5 ORDER FLOW  the absorption zone boxed on its bars, the exhausted push ringed at its price
 *   6 CAUTION     ONE plaque at price: the flags counted, the conclusion said
 * INTERMEDIATE keeps 2 · 3 · 4 and the plaque, unnumbered (the plate's compressed view). Every tag is placed
 * clear of candle bodies, wicks and words already on the glass; a tag with no clear place is LISTED, never laid
 * on price. Every word is the read's own (selectScaffoldingRead) — nothing here decides anything.
 */
import type { ScaffoldingReadVM } from "@/lib/marketData/viewModels/selectScaffoldingRead";
import type { MarketStructureVM } from "@/lib/marketData/viewModels/selectMarketStructure";
import type { AbsorptionZone } from "@/lib/marketData/selectAbsorptionAnatomy";
import type { ExhaustionReading } from "@/lib/marketData/viewModels/selectExhaustion";

export interface GlassBox { x: number; y: number; w: number; h: number }

export interface ScaffoldGlassInput {
  readonly depth: "FOUNDATION" | "INTERMEDIATE";
  readonly sc: ScaffoldingReadVM;
  readonly structure: MarketStructureVM | null;
  readonly zones: readonly AbsorptionZone[];
  readonly exhaustion: readonly ExhaustionReading[];
  readonly xOf: (t: number) => number | null;
  readonly yOf: (p: number) => number | null;
  /** The price pane's free plot: words and marks stay inside it. */
  readonly plot: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
  /** y of the effort bars (the volume floor's top). */
  readonly effortY: number;
  /** Candle bodies + wicks and every word already on the glass. */
  readonly avoid: readonly GlassBox[];
  readonly barSpacing: number;
  readonly fmtPx: (p: number) => string;
  readonly sans: string;
}

export interface ScaffoldGlassResult {
  readonly receipt: string;
  readonly rects: GlassBox[];
  readonly listed: { text: string; x: number; y: number }[];
}

export const SCAFFOLD_GLASS_INK = {
  GOLD: "232,196,104", GOLD2: "243,215,138", BLUE: "95,168,255", RED: "248,113,113", AMBER: "245,165,36", IVORY: "237,230,211",
} as const;

const hits = (r: GlassBox, boxes: readonly GlassBox[]) =>
  boxes.some(b => r.x < b.x + b.w && r.x + r.w > b.x && r.y < b.y + b.h && r.y + r.h > b.y);

/** First short clause of an evidence line ("recent-half effort +38% vs earlier half · net delta +12" → its head). */
export const headClause = (s: string): string => s.split(" · ")[0] ?? s;

type Ctx = CanvasRenderingContext2D;

export function paintScaffoldOnGlass(ctx: Ctx, g: ScaffoldGlassInput): ScaffoldGlassResult {
  const { sc, plot, xOf, yOf } = g;
  const I = SCAFFOLD_GLASS_INK;
  const rgba = (rgb: string, a: number) => `rgba(${rgb},${a})`;
  const taken: GlassBox[] = [...g.avoid];
  const rects: GlassBox[] = [];
  const listed: { text: string; x: number; y: number }[] = [];
  const listedWhy: string[] = [];
  let discOnly = 0;
  const foundation = g.depth === "FOUNDATION";
  let painted = 0;
  const inPlot = (r: GlassBox) => r.x >= plot.x0 && r.x + r.w <= plot.x1 && r.y >= plot.y0 && r.y + r.h <= plot.y1;

  /* A step tag: number disc, title in the step's ink, one line of evidence. Placed around its anchor, clear of
     everything taken; a dotted leader ties it back. No clear place → listed. */
  // A phone's plot (< 520px) takes the compact form: one line — number + the verdict — no evidence line.
  const compact = plot.x1 - plot.x0 < 520;
  const tag = (n: number | null, ax: number, ay: number, title0: string, sub0: string, ink: string, listOnFail = true): boolean => {
    const title = compact ? title0.replace(/^[A-Z ]+ — /, "") : title0;
    const sub = compact ? "" : sub0;
    ctx.font = `800 ${compact ? 11.5 : 13}px ${g.sans}`;
    const tw = ctx.measureText(title).width;
    ctx.font = `500 12px ${g.sans}`;
    const sw = sub ? ctx.measureText(sub).width : 0;
    const disc = n == null ? 0 : compact ? 20 : 26;
    const w = Math.ceil(Math.max(tw, sw) + (compact ? 14 : 24) + disc), h = compact ? 22 : 40;
    const cands: GlassBox[] = [
      [16, -h - 16], [16, 16], [-w - 16, -h - 16], [-w - 16, 16], [16, -h - 60], [-w - 16, -h - 60], [16, 60], [-w - 16, 60],
      [-w / 2, -h - 30], [-w / 2, 30], [16, -h - 110], [-w - 16, -h - 110],
    ].map(([dx, dy]) => ({ x: Math.round(ax + dx), y: Math.round(ay + dy), w, h }));
    // Then the plate's rails: clear slots down the left and right of the plot, tied back by the leader
    // (a crowded newest edge must not cost a step its place on the glass).
    const rail: GlassBox[] = [];
    for (let k = 0; k < 9; k++) {
      const y = plot.y0 + 8 + k * (h + 8);
      rail.push({ x: Math.round(plot.x0 + 8), y, w, h }, { x: Math.round(plot.x1 - w - 8), y, w, h });
    }
    // A phone's plot also steps across the top and bottom bands (its side rails are mostly candles).
    if (compact) for (let k = 0; k < 12; k++) for (let c = 0; c < 4; c++) {
      const x = Math.round(plot.x0 + 6 + c * Math.max(1, (plot.x1 - plot.x0 - w - 12) / 3));
      rail.push({ x, y: plot.y0 + 6 + k * (h + 4), w, h }, { x, y: plot.y1 - h - 6 - k * (h + 4), w, h });
    }
    rail.sort((p, q) => Math.hypot(p.x + p.w / 2 - ax, p.y + p.h / 2 - ay) - Math.hypot(q.x + q.w / 2 - ax, q.y + q.h / 2 - ay));
    const r = cands.find(c => inPlot(c) && !hits(c, taken)) ?? rail.find(c => inPlot(c) && !hits(c, taken));
    if (!r) {
      if (!listOnFail) return false;
      listed.push({ text: `${title} — ${sub}`, x: ax, y: ay }); listedWhy.push(`${n ?? "-"}:${w}x${h}`);
      // Phone: the words are listed, but the step's numbered disc still stands on its evidence (18px, clear of candles).
      if (compact && n != null) {
        const d = [[10, -26], [-28, -26], [10, 8], [-28, 8], [-9, -34], [-9, 16]].map(([dx, dy]) => ({ x: Math.round(ax + dx), y: Math.round(ay + dy), w: 18, h: 18 }))
          .find(c => inPlot(c) && !hits(c, taken));
        if (d) {
          ctx.save();
          ctx.beginPath(); ctx.arc(d.x + 9, d.y + 9, 8.5, 0, Math.PI * 2); ctx.fillStyle = "rgba(8,7,6,1)"; ctx.fill();
          ctx.strokeStyle = rgba(ink, 1); ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = rgba(ink, 1); ctx.font = `800 10.5px ${g.sans}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(String(n), d.x + 9, d.y + 9.5);
          ctx.restore();
          taken.push(d); rects.push(d); discOnly++;
          return true;
        }
      }
      return false;
    }
    // Leader: anchor → nearest edge of the tag.
    const ex = ax < r.x ? r.x : ax > r.x + r.w ? r.x + r.w : ax;
    const ey = ay < r.y ? r.y : ay > r.y + r.h ? r.y + r.h : ay;
    ctx.save();
    ctx.strokeStyle = rgba(ink, 0.7); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(12,11,9,0.95)";
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 7); ctx.fill();
    ctx.strokeStyle = rgba(ink, 0.9); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.roundRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 7); ctx.stroke();
    let tx = r.x + (compact ? 7 : 12);
    if (n != null) {
      const cr = compact ? 7.5 : 10, cx = r.x + (compact ? 12 : 19);
      ctx.beginPath(); ctx.arc(cx, r.y + h / 2, cr, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(8,7,6,1)"; ctx.fill();
      ctx.strokeStyle = rgba(ink, 1); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = rgba(ink, 1); ctx.font = `800 ${compact ? 10 : 12}px ${g.sans}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(n), cx, r.y + h / 2 + 0.5);
      tx = r.x + (compact ? 24 : 36);
    }
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.font = `800 ${compact ? 11.5 : 13}px ${g.sans}`; ctx.fillStyle = rgba(ink, 1);
    ctx.fillText(title, tx, compact ? r.y + h / 2 + 0.5 : r.y + 13);
    if (sub) { ctx.font = `500 12px ${g.sans}`; ctx.fillStyle = rgba(I.IVORY, 0.92); ctx.fillText(sub, tx, r.y + 29); }
    ctx.restore();
    taken.push(r); rects.push(r);
    return true;
  };

  const step = (n: number) => sc.steps.find(s => s.n === n);
  const win = sc.window;
  const half = Math.floor(win.length / 2);
  const earlier = win.slice(0, half), recent = win.slice(win.length - half);

  /* 1 · STRUCTURE — the swing staircase (Foundation). */
  if (foundation && g.structure?.measured) {
    const pts = [
      ...g.structure.swingHighs.map(p => ({ ...p, k: "H" as const })),
      ...g.structure.swingLows.map(p => ({ ...p, k: "L" as const })),
    ].sort((a, b) => a.time - b.time);
    // Alternate: two highs in a row keep the higher, two lows the lower.
    const alt: typeof pts = [];
    for (const p of pts) {
      const last = alt[alt.length - 1];
      if (last && last.k === p.k) { if ((p.k === "H" && p.price > last.price) || (p.k === "L" && p.price < last.price)) alt[alt.length - 1] = p; }
      else alt.push(p);
    }
    const onGlass = alt.map(p => ({ ...p, x: xOf(p.time), y: yOf(p.price) }))
      .filter((p): p is typeof p & { x: number; y: number } => p.x != null && p.y != null && p.x >= plot.x0 && p.x <= plot.x1)
      .slice(-6);
    if (onGlass.length >= 2) {
      ctx.save();
      ctx.strokeStyle = rgba(I.GOLD, 0.95); ctx.lineWidth = 2.5; ctx.setLineDash([7, 4]);
      ctx.shadowColor = rgba(I.GOLD, 0.6); ctx.shadowBlur = 6;
      ctx.beginPath(); onGlass.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      ctx.restore();
      // The swing words: each point named against the one before it of its kind.
      let prevH: number | null = null, prevL: number | null = null;
      const before = alt.slice(0, alt.length - onGlass.length);
      for (const b of before) { if (b.k === "H") prevH = b.price; else prevL = b.price; }
      ctx.save();
      for (const p of onGlass) {
        const word = p.k === "H" ? (prevH == null || p.price > prevH ? "HH" : "LH") : (prevL == null || p.price > prevL ? "HL" : "LL");
        if (p.k === "H") prevH = p.price; else prevL = p.price;
        const r = { x: Math.round(p.x - 16), y: Math.round(p.k === "H" ? p.y - 28 : p.y + 8), w: 32, h: 19 };
        if (!inPlot(r) || hits(r, taken)) continue;
        ctx.fillStyle = "rgba(11,10,8,0.95)"; ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 5); ctx.fill();
        ctx.strokeStyle = rgba(I.GOLD, 1); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.roundRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 5); ctx.stroke();
        ctx.fillStyle = rgba(I.GOLD2, 1); ctx.font = `800 11.5px ${g.sans}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(word, r.x + r.w / 2, r.y + r.h / 2 + 0.5);
        taken.push(r); rects.push(r);
      }
      ctx.restore();
      const s1 = step(1);
      const a = onGlass[Math.max(0, onGlass.length - 2)];
      if (s1 && tag(1, a.x, a.y, `STRUCTURE — ${s1.verdict}`, "the swing staircase on this timeframe", I.GOLD)) painted++;
    }
  }

  /* 2 · EFFORT — earlier vs recent effort on the volume floor. */
  const mean = (xs: readonly { effortNorm: number }[]) => (xs.length ? xs.reduce((t, b) => t + b.effortNorm, 0) / xs.length : 0);
  const effE = mean(earlier), effR = mean(recent);
  const xa0 = earlier.length ? xOf(earlier[0].time) : null, xa1 = earlier.length ? xOf(earlier[earlier.length - 1].time) : null;
  const xb0 = recent.length ? xOf(recent[0].time) : null, xb1 = recent.length ? xOf(recent[recent.length - 1].time) : null;
  const hb = g.barSpacing / 2;
  if (xa0 != null && xa1 != null && xb0 != null && xb1 != null && Math.max(effE, effR) > 0) {
    const peak = Math.max(effE, effR);
    const bars: [number, number, number, string, string][] = [
      [xa0 - hb, xa1 + hb, effE, I.IVORY, "EARLIER EFFORT"], [xb0 - hb, xb1 + hb, effR, I.GOLD, "RECENT EFFORT"],
    ];
    ctx.save();
    for (const [x0, x1, e, ink, word] of bars) {
      const y = g.effortY;
      ctx.fillStyle = "rgba(255,255,255,0.07)"; ctx.fillRect(x0, y, x1 - x0, 9);
      ctx.fillStyle = rgba(ink, 0.92); ctx.fillRect(x0, y, (x1 - x0) * (e / peak), 9);
      ctx.font = `700 10.5px ${g.sans}`; ctx.fillStyle = rgba(ink, 0.95); ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      const said = ctx.measureText(word).width + 6 <= x1 - x0 ? word : ctx.measureText(word.split(" ")[0]).width + 6 <= x1 - x0 ? word.split(" ")[0] : "";
      if (said) ctx.fillText(said, x0, y - 2);
      const r = { x: x0, y: y - 14, w: x1 - x0, h: 24 };
      taken.push(r); rects.push(r);
    }
    ctx.restore();
    const s2 = step(2);
    const word = foundation ? s2?.verdict ?? "" : sc.dynamics[0] ? `${sc.dynamics[0].label} ${sc.dynamics[0].trend === "UP" ? "↑" : sc.dynamics[0].trend === "DOWN" ? "↓" : "→"}` : "EFFORT";
    if (s2 && tag(foundation ? 2 : null, xb1, g.effortY - 4, foundation ? `EFFORT — ${word}` : word, headClause(s2.evidence), I.GOLD)) painted++;
  }

  /* 3 · RESULT — one travel arrow per half. */
  const arrow = (xa: number, ya: number, xb: number, yb: number, ink: string, w: number) => {
    ctx.save();
    ctx.strokeStyle = "rgba(8,7,6,0.85)"; ctx.lineWidth = w + 3; ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke();
    ctx.strokeStyle = rgba(ink, 0.95); ctx.lineWidth = w; ctx.shadowColor = rgba(ink, 0.6); ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke();
    const ang = Math.atan2(yb - ya, xb - xa), L = 11;
    ctx.beginPath();
    ctx.moveTo(xb, yb); ctx.lineTo(xb - L * Math.cos(ang - 0.45), yb - L * Math.sin(ang - 0.45));
    ctx.moveTo(xb, yb); ctx.lineTo(xb - L * Math.cos(ang + 0.45), yb - L * Math.sin(ang + 0.45));
    ctx.stroke();
    ctx.restore();
  };
  if (earlier.length && recent.length && xa0 != null && xa1 != null && xb0 != null && xb1 != null) {
    const ya0 = yOf(earlier[0].open), ya1 = yOf(earlier[earlier.length - 1].close);
    const yb0 = yOf(recent[0].open), yb1 = yOf(recent[recent.length - 1].close);
    if (ya0 != null && ya1 != null && yb0 != null && yb1 != null) {
      const off = 26;
      arrow(xa0, ya0 + off, xa1, ya1 + off, I.IVORY, 2.4);
      arrow(xb0, yb0 + off, xb1, yb1 + off, I.BLUE, 3.2);
      const s3 = step(3);
      const mx = (xb0 + xb1) / 2, my = (yb0 + yb1) / 2 + off;
      const word = foundation ? `RESULT — ${s3?.verdict ?? ""}` : sc.dynamics[1] ? `RESULT ${sc.dynamics[1].trend === "UP" ? "↑" : sc.dynamics[1].trend === "DOWN" ? "↓" : "→"}` : "RESULT";
      if (s3 && tag(foundation ? 3 : null, mx, my, word, headClause(s3.evidence), I.BLUE)) painted++;
    }
  }

  /* 4 · LOCATION — the swing price is pushing into (the room draws its dashed rule). */
  // The level the VERDICT names (one brain: "AT A SWING ABOVE" is drawn on the swing above), else the one the
  // recent half is pushing into (BTC 5m, Oct 16: the tag said ABOVE and named the swing BELOW).
  const s4 = step(4);
  const side: "SWING ABOVE" | "SWING BELOW" | null = s4?.verdict.includes("ABOVE") ? "SWING ABOVE" : s4?.verdict.includes("BELOW") ? "SWING BELOW"
    : sc.pushingInto ?? (sc.swingAbove != null ? "SWING ABOVE" : sc.swingBelow != null ? "SWING BELOW" : null);
  const lvl = side === "SWING ABOVE" ? sc.swingAbove : side === "SWING BELOW" ? sc.swingBelow : null;
  const yl = lvl == null ? null : yOf(lvl);
  if (yl != null && s4 && lvl != null) {
    const ax = Math.min(plot.x1 - 40, (xb1 ?? plot.x1) - 10);
    ctx.save();
    ctx.strokeStyle = rgba(I.RED, 0.9); ctx.lineWidth = 2; ctx.setLineDash([9, 5]);
    ctx.beginPath(); ctx.moveTo(xa0 ?? plot.x0, yl); ctx.lineTo(plot.x1, yl); ctx.stroke();
    ctx.restore();
    if (tag(foundation ? 4 : null, ax, yl, `LOCATION — ${s4.verdict}`, `${side} ${g.fmtPx(lvl)}`, I.RED)) painted++;
  }

  /* 5 · ORDER FLOW — absorption boxed, exhaustion ringed (Foundation). */
  if (foundation && win.length) {
    const start = win[0].time;
    const zone = g.zones.filter(z => z.endTime >= start).at(-1) ?? null;
    const ex = g.exhaustion.filter(m => m.time >= start).at(-1) ?? null;
    let ax: number | null = null, ay: number | null = null;
    if (zone) {
      const x0 = xOf(zone.startTime), x1 = xOf(zone.endTime), yH = yOf(zone.priceHi), yL = yOf(zone.priceLo);
      if (x0 != null && x1 != null && yH != null && yL != null) {
        ctx.save();
        ctx.fillStyle = rgba(I.AMBER, 0.12); ctx.strokeStyle = rgba(I.AMBER, 0.95); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(x0 - hb, yH - 3, x1 - x0 + 2 * hb, yL - yH + 6, 4); ctx.fill(); ctx.stroke();
        ctx.restore();
        ax = x0 - hb; ay = yL + 3;
      }
    }
    if (ex) {
      const x = xOf(ex.time), y = yOf(ex.price);
      if (x != null && y != null) {
        ctx.save();
        ctx.strokeStyle = rgba(I.AMBER, 1); ctx.lineWidth = 2.4; ctx.shadowColor = rgba(I.AMBER, 0.6); ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(x, y + (ex.direction === "UP" ? -10 : 10), 9, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        if (ax == null) { ax = x; ay = y; }
      }
    }
    const s5 = step(5);
    if (s5 && ax != null && ay != null && tag(5, ax, ay, `ORDER FLOW — ${s5.verdict}`, headClause(s5.evidence), I.AMBER)) painted++;
  }

  /* 6 · CAUTION — one plaque at price. */
  const lastBar = win[win.length - 1];
  const px = lastBar ? xOf(lastBar.time) : null, py = lastBar ? yOf(lastBar.close) : null;
  if (px != null && py != null && compact) {
    // Phone: the caution is one more one-line tag (its rails and leader), never a plaque the glass cannot hold.
    const ink = sc.caution ? I.AMBER : I.GOLD;
    const title = sc.caution ? `CAUTION · ${sc.cautionFlags.length} FLAG${sc.cautionFlags.length > 1 ? "S" : ""}` : "NO FLAG";
    if (tag(foundation ? 6 : null, px, py, title, "", ink)) painted++;
  } else if (px != null && py != null) {
    const ink = sc.caution ? I.AMBER : I.GOLD;
    const title = sc.caution ? `CAUTION · ${sc.cautionFlags.length} FLAG${sc.cautionFlags.length > 1 ? "S" : ""}` : "NO FLAG";
    const line1 = compact ? "" : sc.caution ? sc.cautionFlags.join(" · ") : "no flag fired in the window";
    const line2 = compact ? "" : sc.conclusion;
    ctx.save();
    ctx.font = `800 18px ${g.sans}`; const t0 = ctx.measureText(title).width + 40;
    ctx.font = `500 12px ${g.sans}`; const t1 = ctx.measureText(line1).width;
    ctx.font = `700 12px ${g.sans}`; const t2 = ctx.measureText(line2).width;
    const w = Math.ceil(Math.max(t0, t1, t2) + 28), h = compact ? 34 : 72;
    const cands: GlassBox[] = [
      { x: px + g.barSpacing + 12, y: py - h / 2, w, h }, { x: plot.x1 - w - 4, y: py - h - 30, w, h }, { x: plot.x1 - w - 4, y: py + 30, w, h },
      { x: plot.x1 - w - 4, y: py - h - 90, w, h }, { x: plot.x1 - w - 4, y: py + 90, w, h },
    ].map(r => ({ ...r, x: Math.round(r.x), y: Math.round(r.y) }));
    for (let k = 0; k < 8; k++) {
      const y = Math.round(plot.y0 + 8 + k * (h + 10));
      cands.push({ x: Math.round(plot.x1 - w - 8), y, w, h }, { x: Math.round((plot.x0 + plot.x1) / 2 - w / 2), y, w, h }, { x: Math.round(plot.x0 + 8), y, w, h });
    }
    const r = cands.find(c => inPlot(c) && !hits(c, taken));
    if (r) {
      ctx.strokeStyle = rgba(ink, 0.8); ctx.lineWidth = 1.4; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(px + hb, py); ctx.lineTo(r.x, Math.min(r.y + r.h, Math.max(r.y, py))); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "rgba(20,16,10,0.96)"; ctx.shadowColor = rgba(ink, 0.45); ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = rgba(ink, 1); ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, 10); ctx.stroke();
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      if (foundation) {
        ctx.beginPath(); ctx.arc(r.x + 22, r.y + 20, 11, 0, Math.PI * 2); ctx.strokeStyle = rgba(ink, 1); ctx.lineWidth = 2; ctx.stroke();
        ctx.font = `800 12px ${g.sans}`; ctx.fillStyle = rgba(ink, 1); ctx.textAlign = "center"; ctx.fillText("6", r.x + 22, r.y + 20.5); ctx.textAlign = "left";
      }
      ctx.font = `800 18px ${g.sans}`; ctx.fillStyle = rgba(ink, 1); ctx.fillText(title, r.x + (foundation ? 40 : 14), r.y + 20);
      ctx.font = `500 12px ${g.sans}`; ctx.fillStyle = rgba(I.IVORY, 0.95); ctx.fillText(line1, r.x + 14, r.y + 42);
      ctx.font = `700 12px ${g.sans}`; ctx.fillStyle = rgba(I.GOLD2, 1); ctx.fillText(line2, r.x + 14, r.y + 59);
      taken.push(r); rects.push(r); painted++;
    }
    ctx.restore();
    // No room for the full plaque (tablet): the caution still stands — as a step tag with its flags.
    if (!r && (tag(foundation ? 6 : null, px, py, title, line1, ink, false) || tag(foundation ? 6 : null, px, py, title, "", ink))) painted++;
  }

  const expected = foundation ? 6 : 4;
  return { receipt: `GLASS:${g.depth}|STEPS:${painted}/${expected}|LISTED:${listed.length}${discOnly ? `|DISC:${discOnly}` : ""}${listedWhy.length ? `[${listedWhy.join(",")}]` : ""}|PLOT:${Math.round(plot.x0)},${Math.round(plot.y0)},${Math.round(plot.x1)},${Math.round(plot.y1)}`, rects, listed };
}
