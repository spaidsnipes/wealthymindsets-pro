/**
 * PROFILE CANON GLASS — the one geometry grammar every profile species on
 * /charts shares with the canon plates. P-110 (Living Profile stack), M47
 * (TSLA Volume Profile Full), H-601 (profile organism family: "one generic
 * profile, one standard"), H-201 / F03A (memory is a ghost, not a spray).
 *
 * Founder, 2026-09-25 13:58 CDT: "STOP BUILDING FROM MEMORY … WORK SIDE BY
 * SIDE WITH THE VISUALS CANON … I STILL HAVE A LOT OF JUST CARDS". Opened side
 * by side with the plates, the live glass (TSLA 15m desktop) showed hairline
 * grey histograms through the newest candles, level words printed ON candle
 * bodies, TPO letters over the oldest candles, a Structure histogram crammed
 * inside a 13-bar leg, Fusion silent without saying so, and Memory as a spray
 * of fifteen dim level names. Each of those is a decision this file now owns:
 *
 *   · THE LEVEL CHIP — P-110 / M47 name a level with ONE right-edge gold price
 *     chip on the level's own row (`levelChipSlots`: on the rule, then just
 *     above it, then just below it; the keep-out owner decides among them).
 *   · STRUCTURE READABILITY — a leg too short or too close to "now" to hold a
 *     legible histogram draws its POC rule and a NAMED silence instead
 *     (`structureProfileForm`, `structureSilenceWords`).
 *   · FUSION'S SILENCE — Fusion with fewer than two species on, or with no
 *     agreement, says which (`fusionSilenceWords`).
 *   · MEMORY'S CAP — the nearest few remembered levels to price, the count set
 *     by the attention tier the governor gives Memory (`nearestMemoryLevels`).
 *   · THE P-110 BODY — the Living body's ink strengths (`LIVING_BODY_CANON`).
 *
 * What this file does NOT own: the candle cut-out rects (chartKeepOut
 * `candleCutOutRects`), placement against candles and chips
 * (`placeClearOfKeepOut`), colours (`profileFamilyInk` roles), loudness
 * (`selectAttentionGovernor`), or any market reading (the species' selectors).
 *
 * PURE. DETERMINISTIC. No canvas, no React, no clock.
 */

import type { ScreenRect } from "@/lib/chartKeepOut";
import type { AttentionTier } from "./selectAttentionGovernor";
import type { ProfileFusionVM } from "./selectProfileFusion";

export const PROFILE_CANON_GLASS_VERSION = 1;

/* ── THE P-110 BODY ─────────────────────────────────────────────────────────
 * P-110 paints the Living Profile as ONE solid luminous gold mass: value is
 * the densest gold, the tails quieter, a lit rim along the silhouette, a
 * glowing POC dot on the body, VAH/VAL as solid gold rules across the plot
 * and the POC as a dashed one. These are INK STRENGTHS (the alpha of a role's
 * rgba); the layer's loudness stays the attention governor's globalAlpha.
 * The candles are never under this ink: the body paints inside the one candle
 * cut-out, so a solid body cannot tint a candle. It stops short of opaque on
 * purpose: the chart's own series lines (a moving average, a VWAP) are drawn
 * UNDER the overlay and must still read through the mass (the plate is a
 * picture; the glass carries real lines the plate does not).
 */
export const LIVING_BODY_CANON = Object.freeze({
  /** Outside value, at the lane (base) → at the tips. */
  tailBase: 0.46,
  tailTip: 0.58,
  /** Inside value (VAL…VAH), at the lane (base) → at the tips. */
  valueBase: 0.76,
  valueTip: 0.88,
  /** The lit rim traced along the silhouette's edge. */
  rimAlpha: 0.95,
  rimWidth: 1.4,
  rimGlow: 8,
  /** Row seams, so the mass still reads as rows (P-110's striations). */
  seamAlpha: 0.22,
  seamMinRowPx: 5,
  /** VAH / VAL rules across the plot; the POC rule (dashed) across the plot. */
  edgeRuleAlpha: 0.78,
  pocRuleAlpha: 0.72,
  pocRuleDash: [4, 4] as readonly number[],
  /** The POC mark on the body. */
  pocDotRadius: 6,
  pocGlowRadius: 18,
});

/* ── THE LEVEL CHIP ─────────────────────────────────────────────────────────
 * M47: "248.73" in a filled gold chip at the axis edge, on the level's row.
 * P-110: "VAH 5,338.25" right-aligned at the plot's right edge, just above
 * its rule. A chip is 13px tall; its three slots are the rule's own row, the
 * row just above the rule and the row just below it. The caller hands them to
 * `placeClearOfKeepOut` with every candle body and wick under them as the
 * keep-out, so a chip moves off a candle before it may print; the rule itself
 * is the leader back to the price.
 */
export const LEVEL_CHIP_H = 15;
/**
 * The chip's type: the house's 11px readable floor (PHRASE_MIN_PX), bold — on
 * serving the levels were 9px grey words the Founder could not read ("tiny
 * grey 'TPO VAH 372.00'"); the plates print them large and gold.
 */
export const LEVEL_CHIP_FONT = "700 11px ui-sans-serif, system-ui, sans-serif";
/** Horizontal padding inside a chip (both sides together). */
export const LEVEL_CHIP_PAD = 10;
/** Air between a chip and the plot's right edge (the price axis). */
export const LEVEL_CHIP_EDGE_GAP = 3;
/** A chip whose centre is further than this from its price draws a leader. */
export const LEVEL_CHIP_LEADER_PX = 3;

export interface LevelChipSlotInput {
  /** The level's y (the rule's row), in canvas px. */
  readonly y: number;
  /** The chip's width (text + LEVEL_CHIP_PAD). */
  readonly w: number;
  /** The chip's right end — the plot's right edge less the gap, or a column's end. */
  readonly rightX: number;
  /** Highest top a chip may take (the header band's floor on the right side). */
  readonly floorY: number;
  /** Lowest bottom a chip may take (the candle pane's foot). */
  readonly footY: number;
}

export interface LevelChipSlots {
  readonly preferred: ScreenRect;
  readonly alternates: readonly ScreenRect[];
  /** The rows the slots span — the band whose candles are the keep-out. */
  readonly top: number;
  readonly bottom: number;
}

export function levelChipSlots(input: LevelChipSlotInput): LevelChipSlots {
  const h = LEVEL_CHIP_H;
  const x = input.rightX - input.w;
  const lo = input.floorY;
  const hi = Math.max(lo, input.footY - h);
  const clampY = (y: number) => Math.min(hi, Math.max(lo, y));
  const rows = [input.y - h / 2, input.y - h - 2, input.y + 2].map(clampY);
  // A clamped slot that lands on an earlier one is the same slot, not an alternate.
  const unique: number[] = [];
  for (const r of rows) if (!unique.some(u => Math.abs(u - r) < 1)) unique.push(r);
  const [first, ...rest] = unique.map(y => ({ x, y, w: input.w, h }));
  return {
    preferred: first,
    alternates: rest,
    top: Math.min(...unique),
    bottom: Math.max(...unique) + h,
  };
}

/** Whether a placed chip needs a dotted leader back to its price. */
export function levelChipNeedsLeader(rect: ScreenRect, y: number, slid: boolean): boolean {
  return slid || Math.abs(rect.y + rect.h / 2 - y) > LEVEL_CHIP_LEADER_PX;
}

/* ── STRUCTURE READABILITY ──────────────────────────────────────────────────
 * Serving TSLA 15m, 2026-09-25: a 13-bar leg drew its histogram INSIDE the
 * newest candle cluster (x≈1150–1250) — rows 2px apart across 40px, unreadable.
 * A profile of a leg is a claim about where the leg built value; below these
 * floors the shape is noise at the camera's scale, so the glass draws what it
 * can state (the leg's POC as a rule from its swing) and names the silence.
 */
export const STRUCTURE_MIN_READABLE_BARS = 21;
export const STRUCTURE_MIN_READABLE_PX = 48;

export type StructureProfileForm = "HISTOGRAM" | "RULE_SHORT_LEG" | "RULE_NO_ROOM";

/**
 * `roomPx` is the room between the leg's swing bar and the profile stack's
 * left edge — the width the histogram could take without being pinned away
 * from its own swing.
 */
export function structureProfileForm(legBars: number, roomPx: number): StructureProfileForm {
  if (!(legBars >= STRUCTURE_MIN_READABLE_BARS)) return "RULE_SHORT_LEG";
  if (!(roomPx >= STRUCTURE_MIN_READABLE_PX)) return "RULE_NO_ROOM";
  return "HISTOGRAM";
}

export interface StructureSilenceInput {
  readonly form: StructureProfileForm;
  readonly kind: "HIGH" | "LOW";
  readonly anchorPrice: number;
  readonly legBars: number;
  readonly poc: number | null;
  /** The market's decimals (pricePrecision.ts). */
  readonly dp: number;
}

/** The named silence for a leg that draws its rule and not its histogram; null for HISTOGRAM. */
export function structureSilenceWords(s: StructureSilenceInput): string | null {
  if (s.form === "HISTOGRAM") return null;
  const swing = `SWING ${s.kind} ${s.anchorPrice.toFixed(s.dp)}`;
  const poc = s.poc != null && Number.isFinite(s.poc) ? ` · LEG POC ${s.poc.toFixed(s.dp)}` : "";
  return s.form === "RULE_SHORT_LEG"
    ? `STRUCTURE · ${s.legBars}-BAR LEG FROM ${swing} · TOO SHORT TO PROFILE (${STRUCTURE_MIN_READABLE_BARS}+)${poc}`
    : `STRUCTURE · LEG FROM ${swing} BEGAN TOO NEAR NOW TO PROFILE${poc}`;
}

/* ── FUSION'S SILENCE ───────────────────────────────────────────────────────
 * Serving TSLA 15m, 2026-09-25: Fusion switched on alone painted nothing and
 * said nothing — the one profile layer that broke "every painting layer names
 * its silence". The words come from the fusion owner's own verdict.
 */
export function fusionSilenceWords(
  vm: Pick<ProfileFusionVM, "reason" | "speciesOffered" | "tolerance">,
  dp: number,
): string | null {
  if (vm.reason === "DRAWN") return null;
  const n = vm.speciesOffered.length;
  const list = n > 0 ? ` (${vm.speciesOffered.join(", ")})` : "";
  if (vm.reason === "FEWER_THAN_TWO_SPECIES") {
    return `PROFILE FUSION · silent — needs 2 profile species on, ${n} on${list}`;
  }
  const tol = vm.tolerance != null && Number.isFinite(vm.tolerance) ? ` within ±${vm.tolerance.toFixed(dp)}` : "";
  return `PROFILE FUSION · silent — ${n} species on${list}, no levels agree${tol}`;
}

/* ── MEMORY'S CAP ───────────────────────────────────────────────────────────
 * H-201 / F03A: memory is a ghost on the slab, not a destination — and on
 * serving it was fifteen dim "S-5 VAH … · NAKED" names across the camera. The
 * trader reads memory near price; a level eight sessions and forty points away
 * is Inspect's to list, not the glass's. How many survive is the attention
 * tier's call: Memory at rest (MEMORY) keeps four, a selected Memory level
 * (SELECTED) keeps nine, a stale feed keeps two.
 */
export const MEMORY_LEVEL_CAP: Readonly<Record<AttentionTier, number>> = Object.freeze({
  SELECTED: 9,
  LIVE: 6,
  SUPPORTING: 5,
  MEMORY: 4,
  STALE: 2,
  CHROME: 4,
});

export interface CappedMemory<T> {
  readonly kept: readonly T[];
  readonly withheld: number;
}

const KIND_ORDER: Readonly<Record<string, number>> = { POC: 0, VAH: 1, VAL: 2 };

/**
 * The `cap` levels nearest to `lastPrice` (ties: the more recent session, then
 * POC before VAH before VAL), returned in the INPUT order so paint order is
 * unchanged. No last price → the most recent sessions' levels.
 */
export function nearestMemoryLevels<T extends { readonly price: number; readonly sessionsAgo: number; readonly kind: string }>(
  levels: readonly T[],
  lastPrice: number | null,
  cap: number,
): CappedMemory<T> {
  const n = Math.max(0, Math.floor(Number.isFinite(cap) ? cap : 0));
  const clean = levels.filter(l => Number.isFinite(l.price));
  const ranked = clean
    .map((l, i) => ({ l, i }))
    .sort((a, b) => {
      const da = lastPrice != null && Number.isFinite(lastPrice) ? Math.abs(a.l.price - lastPrice) : 0;
      const db = lastPrice != null && Number.isFinite(lastPrice) ? Math.abs(b.l.price - lastPrice) : 0;
      return da - db
        || a.l.sessionsAgo - b.l.sessionsAgo
        || (KIND_ORDER[a.l.kind] ?? 9) - (KIND_ORDER[b.l.kind] ?? 9)
        || a.i - b.i;
    });
  const keep = new Set(ranked.slice(0, n).map(r => r.i));
  const kept = clean.filter((_, i) => keep.has(i));
  return { kept, withheld: levels.length - kept.length };
}
