/**
 * APPEARANCE LAW — the trader may restyle anything; nothing may become a lie.
 *
 * Founder order §5 (2026-10-09): "opacity, color, readability: complete
 * control". The coordinator's rule beside it: customization may not make two
 * semantically different objects identical. A bull candle the colour of a bear
 * candle, an up volume bar the colour of a down one, a call wall the colour of
 * a put wall — each is a chart that can be read backwards.
 *
 * So the chart reads its appearance through ONE pass, here, before it paints:
 * every opposed PAIR is checked, and a pair the trader made identical (or so
 * close a trader could not tell them apart) falls back to the room's own pair
 * — both halves, so the two never end up half-custom. Nothing else is
 * touched; defaults are byte-identical.
 */

export interface InkPair { readonly a: string; readonly b: string }

/** "#rrggbb" / "#rgb" / "rgb(a)(…)" → [r,g,b] (0–255). null = not a colour this can judge. */
export function rgbOf(c: string | null | undefined): [number, number, number] | null {
  if (typeof c !== "string") return null;
  const s = c.trim().toLowerCase();
  let m = /^#([0-9a-f]{6})$/.exec(s);
  if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
  m = /^#([0-9a-f]{3})$/.exec(s);
  if (m) return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16)];
  const r = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/.exec(s);
  if (r) return [Number(r[1]), Number(r[2]), Number(r[3])];
  return null;
}

/** Below this RGB distance two inks read as one at chart size. */
export const MIN_PAIR_DISTANCE = 40;

export function inksDistinct(a: string, b: string): boolean {
  const x = rgbOf(a), y = rgbOf(b);
  if (!x || !y) return a.trim().toLowerCase() !== b.trim().toLowerCase();
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) >= MIN_PAIR_DISTANCE;
}

/** The trader's pair if its halves can be told apart; else the room's pair, whole. */
export function lawfulPair(chosen: InkPair, room: InkPair): InkPair {
  return inksDistinct(chosen.a, chosen.b) ? chosen : room;
}

/** A trader's volume hex at the room's own alpha (the bars stay held back behind price). */
export function volumeInk(hex: string | undefined, roomInk: string): string {
  const rgb = rgbOf(hex);
  if (!rgb) return roomInk;
  const alpha = /rgba\([^)]*,\s*([\d.]+)\s*\)/.exec(roomInk)?.[1] ?? "1";
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

type Pairable = object;
/** The opposed pairs a chart's settings carry: [keyA, keyB]. */
export const OPPOSED_PAIRS: readonly (readonly [string, string])[] = [
  ["candleUp", "candleDown"], ["wickUp", "wickDown"], ["borderUp", "borderDown"],
  ["volumeUp", "volumeDown"], ["bigTradeBuy", "bigTradeSell"], ["deltaBuy", "deltaSell"],
];

/**
 * The settings with every opposed pair made lawful against `room` (the shipped
 * defaults for the same keys). Keys the trader never set stay unset. PURE;
 * returns the SAME object when nothing needed changing (stable identity).
 */
export function lawfulSettings<T extends Pairable>(s: T | null | undefined, room: Pairable): T | null | undefined {
  if (!s) return s;
  const src = s as Record<string, unknown>, rm = room as Record<string, unknown>;
  let out: Record<string, unknown> | null = null;
  for (const [ka, kb] of OPPOSED_PAIRS) {
    const a = (src[ka] ?? rm[ka]) as string | undefined, b = (src[kb] ?? rm[kb]) as string | undefined;
    if (typeof a !== "string" || typeof b !== "string") continue;
    if (inksDistinct(a, b)) continue;
    out = out ?? { ...src };
    out[ka] = rm[ka]; out[kb] = rm[kb];
  }
  return (out ?? s) as T;
}
