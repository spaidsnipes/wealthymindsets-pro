/**
 * INDEX → FUTURES MAPPING (Garden 18 ATHOS order §6, 2026-10-05). PURE.
 *
 * The deepest option positioning for NQ / ES traders sits on the CASH-INDEX
 * chains (NDX, SPX), not on the futures. Those levels may be shown on a futures
 * chart only through a lawful, same-time basis — and never as native futures
 * evidence:
 *
 *   basis   = futures price AT the index's own observation time − index spot
 *             at that time (the futures bar that contains that instant)
 *   mapped  = index level + basis, rounded to the futures tick
 *
 * Both numbers travel together ("NDX 31,000 → NQ 31,252.25"). The basis is
 * stamped with its instant; the uncertainty is that futures bar's own range
 * (the basis is known only to within it). A missing, stale or out-of-session
 * futures bar REFUSES the mapping — a stale basis never maps. Cross-index
 * correlation (SPX → NQ) is not a conversion and is not offered.
 *
 * Time conventions (measured on Cboe's delayed feed, 2026-10-05): the index's
 * `last_trade_time` is New York LOCAL time with no zone; after the cash close
 * the index freezes at its close while futures trade on — which is exactly why
 * the basis is taken at the index's instant, not "now".
 */
import type { CboeOptionsReceipt } from "@/lib/marketData/cboeDelayedOptions";
import type { ConcentrationWall } from "@/lib/marketData/viewModels/selectOptionsBarrierEvidence";

export const INDEX_FOR_FUTURES: Readonly<Record<string, { index: "SPX" | "NDX"; tick: number }>> = {
  ES: { index: "SPX", tick: 0.25 },
  MES: { index: "SPX", tick: 0.25 },
  NQ: { index: "NDX", tick: 0.25 },
  MNQ: { index: "NDX", tick: 0.25 },
};

/** "NQ1!", "/NQZ6", "MNQ" → "NQ" / "MNQ"; null when not a mapped future. */
export function mappedFuturesRoot(symbol: string): string | null {
  const s = (symbol ?? "").toUpperCase().replace(/^\//, "");
  for (const root of ["MNQ", "MES", "NQ", "ES"]) {
    if (s === root || s.startsWith(`${root}1!`) || new RegExp(`^${root}[FGHJKMNQUVXZ]\\d{1,2}$`).test(s)) return root;
  }
  return null;
}

/** A New-York wall-clock string ("2026-10-05T16:14:59") → epoch seconds. */
export function nyLocalToEpoch(local: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})$/.exec((local ?? "").trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number) as unknown as number[];
  const asUtc = Date.UTC(y, mo - 1, d, h, mi, s);
  // New York's offset at that instant (handles EST / EDT).
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(asUtc));
  const g = (t: string) => Number(parts.find(p => p.type === t)?.value);
  const shown = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"), g("second"));
  return Math.round((asUtc + (asUtc - shown)) / 1000);
}

export interface FuturesBar { readonly time: number; readonly high: number; readonly low: number; readonly close: number }

export interface MappedLevel {
  readonly kind: ConcentrationWall["type"];
  readonly indexLevel: number;
  readonly futuresLevel: number;
  readonly openInterest: number;
}

export type IndexFuturesMappingVM =
  | {
      readonly mapped: true;
      readonly index: "SPX" | "NDX";
      readonly futuresRoot: string;
      readonly indexSpot: number;
      readonly futuresAtInstant: number;
      readonly basis: number;
      /** ± the futures bar's own range at the instant: the basis is known only to within it. */
      readonly uncertainty: number;
      /** Epoch seconds of the index observation the basis was taken at. */
      readonly basisAt: number;
      readonly levels: readonly MappedLevel[];
      readonly receipt: string;
    }
  | {
      readonly mapped: false;
      readonly index: "SPX" | "NDX" | null;
      readonly futuresRoot: string | null;
      readonly reason: "NOT_A_MAPPED_FUTURE" | "NO_INDEX_CHAIN" | "NO_INDEX_TIME" | "NO_FUTURES_BAR_AT_INSTANT" | "NO_WALLS";
      readonly receipt: string;
    };

const roundTo = (v: number, tick: number) => Math.round(v / tick) * tick;

export function selectIndexFuturesMapping(input: {
  readonly futuresSymbol: string;
  readonly indexReceipt: CboeOptionsReceipt | null;
  readonly indexWalls: readonly ConcentrationWall[];
  readonly futuresBars: readonly FuturesBar[];
  /** The futures bar interval in seconds (a bar "contains" an instant within it). */
  readonly barSeconds: number;
}): IndexFuturesMappingVM {
  const root = mappedFuturesRoot(input.futuresSymbol);
  const pair = root ? INDEX_FOR_FUTURES[root] : null;
  const refuse = (reason: Extract<IndexFuturesMappingVM, { mapped: false }>["reason"]): IndexFuturesMappingVM =>
    ({ mapped: false, index: pair?.index ?? null, futuresRoot: root, reason, receipt: `IDXMAP:SILENT:${reason}` });
  if (!root || !pair) return refuse("NOT_A_MAPPED_FUTURE");
  const r = input.indexReceipt;
  if (!r || !(r.spot != null && r.spot > 0)) return refuse("NO_INDEX_CHAIN");
  const at = r.underlyingAsOf ? nyLocalToEpoch(r.underlyingAsOf) : null;
  if (at == null) return refuse("NO_INDEX_TIME");
  // The futures bar that CONTAINS the index's instant — never the nearest one
  // from another session, never "now".
  const bar = input.futuresBars.find(b => b.time <= at && at < b.time + input.barSeconds);
  if (!bar || !(bar.close > 0)) return refuse("NO_FUTURES_BAR_AT_INSTANT");
  if (input.indexWalls.length === 0) return refuse("NO_WALLS");
  const basis = bar.close - r.spot;
  const uncertainty = Math.max(pair.tick, bar.high - bar.low);
  const levels = input.indexWalls.map(w => ({
    kind: w.type, indexLevel: w.strike, futuresLevel: roundTo(w.strike + basis, pair.tick), openInterest: w.openInterest,
  }));
  return {
    mapped: true, index: pair.index, futuresRoot: root, indexSpot: r.spot, futuresAtInstant: bar.close,
    basis, uncertainty, basisAt: at, levels,
    receipt: `IDXMAP:${pair.index}->${root}|BASIS:${basis.toFixed(2)}±${uncertainty.toFixed(2)}@${at}|N:${levels.length}`,
  };
}
