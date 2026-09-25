/**
 * NEAR TAPE — canon plate H-501 (WM_A_H501_SEMANTIC_ZOOM), right panel:
 * "TAPE TICKS". At NEAR the last executions this chart captured stand beside
 * the live candle: price and which side initiated.
 *
 * WHO INITIATED IS ONLY AS TRUE AS ITS METHOD. A venue stamp (PROVIDER, or the
 * maker side inverted) is OBSERVED. A tick-rule or quote-test guess is
 * INFERRED — the equity relay tape is TICK_RULE for every print — and a print
 * with no disclosed method is UNKNOWN. Each row carries its fidelity and a
 * glyph that says it (`+` / `~+` / `?+`), and the column carries a legend
 * whenever any row is not observed: the same OBSERVED / INFERRED / UNKNOWN
 * vocabulary the Inspect ticket and the print tickets use, so one frame never
 * shows a guessed side as a fact beside a ticket that says SIDE INFERRED.
 *
 * NEVER A PER-FRAME HISTORY SORT. The accumulator keeps every print of every
 * bar (no per-bar cap), and a busy tape holds tens of thousands in the last
 * two bars. Prints are appended but NOT in time order (each flush pushes a
 * newest-first batch), so the tail is not "the newest ten". The cache below
 * is exact and cheap: nothing new → the previous result; new prints appended
 * to the same two bars → merge only those into the previous top rows; a new
 * bar (or a reset tape) → one bounded scan of the two newest bars.
 *
 * PURE apart from the cache object the caller hands back each frame.
 */

import type { BigTradeTick } from "@/lib/bigTradeLevels";
import { formatBubblePrice } from "@/lib/bubbleClaim";
import type { AggressorMethod } from "@/lib/marketData/marketEvent";

export const NEAR_TAPE_ROWS = 10;

export type SideFidelity = "OBSERVED" | "INFERRED" | "UNKNOWN";

export interface NearTapeRow {
  readonly timeMs: number;
  /** Formatted with the house price formatter (sub-dollar keeps its digits). */
  readonly price: string;
  readonly buy: boolean;
  readonly fidelity: SideFidelity;
  /** `+`/`−` observed · `~+`/`~−` inferred · `?+`/`?−` method undisclosed. */
  readonly glyph: string;
}

export interface NearTapeVM {
  /** Newest first. */
  readonly rows: readonly NearTapeRow[];
  /** The legend the column must print; null only when every side is observed. */
  readonly fidelityNote: string | null;
}

export type TapeAccumulator = ReadonlyMap<number, readonly BigTradeTick[]>;

export interface NearTapeCache {
  readonly acc: TapeAccumulator;
  readonly k1: number;
  readonly k2: number;
  readonly a1: readonly BigTradeTick[] | undefined;
  readonly a2: readonly BigTradeTick[] | undefined;
  readonly n1: number;
  readonly n2: number;
  readonly top: readonly BigTradeTick[];
  readonly vm: NearTapeVM;
}

export function sideFidelity(method: AggressorMethod | undefined): SideFidelity {
  if (method === "PROVIDER" || method === "MAKER_SIDE_INVERTED") return "OBSERVED";
  if (method === "TICK_RULE" || method === "QUOTE_TEST") return "INFERRED";
  return "UNKNOWN";
}

const GLYPH_PREFIX: Readonly<Record<SideFidelity, string>> = { OBSERVED: "", INFERRED: "~", UNKNOWN: "?" };

/** Insert arr[from..to) into `top` (newest first, at most `limit`). */
function mergeNewest(top: BigTradeTick[], arr: readonly BigTradeTick[] | undefined, from: number, to: number, limit: number): void {
  if (!arr) return;
  for (let i = from; i < to; i++) {
    const t = arr[i];
    const ms = t?.timeMs;
    if (ms == null || !Number.isFinite(ms)) continue;
    if (top.length >= limit && ms <= (top[top.length - 1].timeMs as number)) continue;
    let j = top.length;
    while (j > 0 && (top[j - 1].timeMs as number) < ms) j--;
    top.splice(j, 0, t);
    if (top.length > limit) top.pop();
  }
}

function project(top: readonly BigTradeTick[]): NearTapeVM {
  let inferred = 0, unknown = 0;
  const rows = top.map((t): NearTapeRow => {
    const fidelity = sideFidelity(t.aggressorMethod);
    if (fidelity === "INFERRED") inferred++;
    if (fidelity === "UNKNOWN") unknown++;
    const buy = t.ask > t.bid;
    return { timeMs: t.timeMs as number, price: formatBubblePrice(t.price), buy, fidelity, glyph: `${GLYPH_PREFIX[fidelity]}${buy ? "+" : "−"}` };
  });
  const fidelityNote = inferred > 0 && unknown > 0 ? "~ INFERRED · ? UNKNOWN"
    : inferred > 0 ? "~ = SIDE INFERRED"
    : unknown > 0 ? "? = SIDE UNKNOWN"
    : null;
  return { rows, fidelityNote };
}

/**
 * The newest `limit` captured prints of the two newest bars in the
 * accumulator. Hand the returned cache back on the next frame.
 */
export function selectNearTape(acc: TapeAccumulator, cache: NearTapeCache | null, limit: number = NEAR_TAPE_ROWS): NearTapeCache {
  // The two newest bar keys: one pass over at most a few hundred numbers,
  // no key array, no sort.
  let k1 = -Infinity, k2 = -Infinity;
  for (const k of acc.keys()) {
    if (k > k1) { k2 = k1; k1 = k; } else if (k > k2) k2 = k;
  }
  const a1 = acc.get(k1), a2 = acc.get(k2);
  const n1 = a1?.length ?? 0, n2 = a2?.length ?? 0;

  if (cache && cache.acc === acc && cache.k1 === k1 && cache.k2 === k2 && cache.a1 === a1 && cache.a2 === a2
    && n1 >= cache.n1 && n2 >= cache.n2) {
    if (n1 === cache.n1 && n2 === cache.n2) return cache;
    // Bars only ever gain prints, so the newest rows are the old top rows
    // plus whatever arrived since — nothing older can re-enter.
    const top = cache.top.slice();
    mergeNewest(top, a1, cache.n1, n1, limit);
    mergeNewest(top, a2, cache.n2, n2, limit);
    return { acc, k1, k2, a1, a2, n1, n2, top, vm: project(top) };
  }

  const top: BigTradeTick[] = [];
  mergeNewest(top, a1, 0, n1, limit);
  mergeNewest(top, a2, 0, n2, limit);
  return { acc, k1, k2, a1, a2, n1, n2, top, vm: project(top) };
}
