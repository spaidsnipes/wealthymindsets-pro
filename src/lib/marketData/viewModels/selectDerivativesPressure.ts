/**
 * DERIVATIVES PRESSURE SENSE — one owner (Garden 15 §2–§7, Garden 16 §20/§26).
 *
 * Turns Cboe DELAYED option positioning (open interest, iv — cboeDelayedOptions)
 * and the chart's OWN bars into the pressure world the canvas paints:
 *
 *   GEOGRAPHY   net dealer-gamma exposure if price stood at each level (a sweep
 *               of hypothetical spots). Positive → DAMPING (counter-move hedging
 *               expected: compression, defence). Negative → AMPLIFYING
 *               (same-direction hedging expected: expansion, acceleration).
 *               Garden 15 §3: never "positive = bullish".
 *   CLIMATE     the geography's value AT the current price, relative to gross:
 *               DAMPING / AMPLIFYING / MIXED / INSUFFICIENT_EVIDENCE.
 *   FRONT       zero-gamma transition: where the geography changes sign.
 *   WALLS       positive-exposure concentrations at strikes (defence), with a
 *               LIFECYCLE read from OBSERVED bars: tests → cracks, closes beyond
 *               → BREAKING / BROKEN, history → SCAR. Actual underlying response
 *               outranks the model (Garden 15 §3).
 *   POCKETS     negative-exposure concentrations — acceleration corridors.
 *   ENVELOPE    expected move from IV30 (one session and to the nearest expiry).
 *
 * EPISTEMOLOGY (§35): positioning is OBSERVED (Cboe OI, prior session), the
 * dealer side is an ASSUMPTION (calls +, puts −: dealers long calls / short
 * puts), so every exposure figure is INFERRED; the envelope is DERIVED from IV;
 * wall tests/breaks are OBSERVED from the chart's bars. Clocks travel along:
 * CHAIN_ASOF, UNDERLYING_ASOF, OI_ASOF (prior session), MODEL_ASOF.
 *
 * PURE. DETERMINISTIC (given `nowMs`). No fetch, no storage, no React.
 */

import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import type { CboeOptionRow, CboeOptionsReceipt, OptionsPositioningSource } from "@/lib/marketData/cboeDelayedOptions";

export const DERIVATIVES_PRESSURE_VERSION = 1;
/** Risk-free rate assumed by the gamma model (stated, not observed). */
export const MODEL_RATE = 0.04;
/** The sweep: hypothetical spots from −SWEEP to +SWEEP around the current price. */
export const SWEEP = 0.2;
export const SWEEP_STEPS = 160;
/** |net| / gross below this at the current price is MIXED, not a climate. */
export const MIXED_BAND = 0.12;
/** A strike must hold this share of gross exposure to be a wall / pocket. */
export const WALL_MIN_SHARE = 0.035;
export const MAX_WALLS = 4;
export const MAX_POCKETS = 3;
/** Fewer contracts with OI than this is not a positioning picture. */
export const MIN_ROWS = 40;
/** Observed wall tests count only inside this window (days): positioning is this cycle's, not last year's. */
export const WALL_TEST_WINDOW_DAYS = 7;

/**
 * WHAT PART OF THE CHAIN WAS HEARD (Garden 16 §20: never manufacture wall
 * heat). Serving NQ1! / ES1!, 2026-10-08: walls, the zero-gamma front and the
 * field were built from the ~125 contracts within ±4% of price as if they were
 * the whole chain — the front drifted 800 points in 21 minutes as the window
 * followed price. One field, read by the glass, Inspect, the ⓘ truth line and
 * SpaidBot alike.
 */
export type ChainScope =
  | { readonly kind: "WHOLE" }
  | { readonly kind: "NEAR_MONEY_SUBSET"; readonly contracts: number; readonly reachPct: number };

/** In a near-money subset, a strike in the outer EDGE_BAND of the window cannot be a wall: the edge is the window's, not the market's. */
export const SUBSET_EDGE_BAND = 0.25;

/** The scope in the words every surface prints; null for a whole chain. */
export function chainScopeWords(scope: ChainScope): string | null {
  return scope.kind === "WHOLE" ? null : `NEAR-PRICE OPEN INTEREST · ${scope.contracts} CONTRACTS · ±${scope.reachPct}%`;
}
/** Why the front / field / climate are withheld on a subset; null for a whole chain. */
export function chainScopeWithheldWords(scope: ChainScope): string | null {
  return scope.kind === "WHOLE" ? null : `ZERO-GAMMA · WITHHELD — ONLY THE ~${scope.contracts} CONTRACTS NEAREST PRICE ARE HEARD, NOT THE WHOLE CHAIN`;
}
/** The highest ⓘ grade the reading may claim: a subset is never FULL. */
export function chainScopeGrade(scope: ChainScope): "FULL" | "PARTIAL" {
  return scope.kind === "WHOLE" ? "FULL" : "PARTIAL";
}

export type Climate = "DAMPING" | "AMPLIFYING" | "MIXED" | "INSUFFICIENT_EVIDENCE";
export type WallLife = "BORN" | "TESTED" | "DEFENDED" | "WEAKENING" | "BREAKING" | "BROKEN" | "SCARRED";
/**
 * SCARRED (order §11: BORN → TESTED → DEFENDED → WEAKENED → BROKEN → SCARRED,
 * 2026-10-10): a broken wall whose break the market has ACCEPTED — this many
 * consecutive observed session closes beyond it. BROKEN is the fresh break
 * (2–3 sessions); SCARRED is history: the strike still holds open interest,
 * but price has lived on the far side. Observed closes only, never inferred.
 */
export const WALL_SCAR_SESSIONS = 4;
/** The canon's word for each lifecycle state (WEAKENING is drawn and said as WEAKENED). */
export function wallLifeWord(life: WallLife): string {
  return life === "WEAKENING" ? "WEAKENED" : life;
}

/** The chart's own bar shape (M8: no private bar shapes). */
export type PressureBar = Pick<LegacyOhlcvTuple, "time" | "open" | "high" | "low" | "close">;

export interface GeographySample {
  readonly price: number;
  /** Net exposure ($ per 1% move) if price stood here. */
  readonly net: number;
}

export interface PressureWall {
  readonly strike: number;
  /** $ gamma exposure per 1% move at the current price (INFERRED). */
  readonly exposure: number;
  /** Share of gross exposure (0–1): the wall's materiality. */
  readonly share: number;
  readonly callOi: number;
  readonly putOi: number;
  /** Price is above / below the wall now. */
  readonly side: "ABOVE" | "BELOW";
  readonly life: WallLife;
  /** Observed bars that reached the wall and closed back on the origin side. */
  readonly tests: number;
  /** Observed consecutive newest closes beyond the wall (acceptance). */
  readonly closesBeyond: number;
  /** Time of the first observed test (unix s), for a scar's age. */
  readonly firstTestTime: number | null;
  /** Every observed test's session time (unix s), oldest first — where the damage belongs (master order §XXX). */
  readonly testTimes: readonly number[];
}

export interface PressurePocket {
  readonly strike: number;
  readonly exposure: number;
  readonly share: number;
}

export interface ExpectedMove {
  /** ± price for one session from IV30 (DERIVED). */
  readonly session: number;
  /** ± price to the nearest listed expiry (DERIVED), with its date. */
  readonly toExpiry: number | null;
  readonly expiry: string | null;
}

export type DerivativesPressureVM =
  | {
      readonly drawn: true;
      readonly version: number;
      readonly underlying: string;
      readonly spot: number;
      readonly climate: Climate;
      /** net / gross at the current price, −1…1. */
      readonly climateRatio: number;
      readonly netAtSpot: number;
      readonly gross: number;
      readonly geography: readonly GeographySample[];
      readonly zeroGamma: number | null;
      readonly walls: readonly PressureWall[];
      /**
       * The span of bars the wall tests were actually counted over (seconds).
       * A 1m chart loads hours, a 15m chart a week: the same wall read BORN on
       * one and DEFENDED ×2 on the other (serving BTC, 2026-09-28). Surfaces
       * say the span when it is shorter than the test window.
       */
      readonly testSpanSec: number;
      readonly pockets: readonly PressurePocket[];
      readonly envelope: ExpectedMove | null;
      readonly contracts: number;
      /** §20: WHOLE chain, or the near-money subset that was heard. On a subset the front, field, pockets and climate are withheld. */
      readonly chainScope: ChainScope;
      readonly clocks: { readonly chainAsOf: string | null; readonly underlyingAsOf: string | null; readonly oiAsOf: "PRIOR_SESSION" | "CURRENT"; readonly modelAsOf: number };
      readonly source: OptionsPositioningSource;
      /** DELAYED (Cboe ≈15 min) or SNAPSHOT (Deribit public, polled). */
      readonly fidelity: "DELAYED" | "SNAPSHOT";
      readonly epistemic: { readonly exposure: "INFERRED"; readonly envelope: "DERIVED"; readonly tests: "OBSERVED" };
      readonly assumption: string;
      readonly receipt: string;
    }
  | {
      readonly drawn: false;
      readonly version: number;
      readonly underlying: string;
      readonly reason: "NO_CHAIN" | "NO_SPOT" | "TOO_FEW_CONTRACTS" | "NO_EXPOSURE" | "AFTER_REPLAY_CLOCK";
      readonly contracts: number;
      readonly receipt: string;
    };

const SQRT2PI = Math.sqrt(2 * Math.PI);

/** Black–Scholes gamma. Returns 0 for any non-finite or degenerate input. */
export function bsGamma(S: number, K: number, sigma: number, T: number, r = MODEL_RATE): number {
  if (!(S > 0 && K > 0 && sigma > 0 && T > 0)) return 0;
  const vt = sigma * Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / vt;
  const g = Math.exp(-(d1 * d1) / 2) / SQRT2PI / (S * vt);
  return Number.isFinite(g) ? g : 0;
}

const yearsTo = (expiration: string, nowMs: number) => {
  const ms = Date.parse(`${expiration}T20:00:00Z`) - nowMs;
  return Math.max(ms, 3_600_000) / (365 * 86_400_000);
};

/** `mult`: units per contract — 100 shares on a listed equity option, 1 coin on Deribit. */
interface Prepared { readonly row: CboeOptionRow; readonly sign: 1 | -1; readonly sigma: number; readonly T: number; readonly mult: number }

/** $ gamma exposure per 1% move if price stood at S (calls +, puts −). */
function netExposureAt(S: number, prepared: readonly Prepared[]): { net: number; gross: number; byStrike: Map<number, number> } {
  let net = 0, gross = 0;
  const byStrike = new Map<number, number>();
  for (const p of prepared) {
    const e = bsGamma(S, p.row.strike, p.sigma, p.T) * p.row.openInterest * p.mult * S * S * 0.01 * p.sign;
    net += e;
    gross += Math.abs(e);
    byStrike.set(p.row.strike, (byStrike.get(p.row.strike) ?? 0) + e);
  }
  return { net, gross, byStrike };
}

/**
 * SESSIONS, NOT BARS. A wall's test count may not depend on the timeframe it is
 * viewed on (found in the Founder's Chrome: TSLA 5m read WEAKENING, 1D read
 * DEFENDED ×2 for the same wall and the same week). The window's bars are
 * folded into trading days (US Eastern, a fixed −4h offset) first; a DAY
 * tests the wall, and a day's close is its acceptance.
 */
export function sessionsOf(bars: readonly PressureBar[]): PressureBar[] {
  const days: PressureBar[] = [];
  let key: number | null = null;
  for (const b of bars) {
    const k = Math.floor((b.time - 4 * 3600) / 86_400);
    if (k !== key) { days.push({ time: b.time, open: b.open, high: b.high, low: b.low, close: b.close }); key = k; continue; }
    const d = days[days.length - 1];
    days[days.length - 1] = { time: d.time, open: d.open, high: Math.max(d.high, b.high), low: Math.min(d.low, b.low), close: b.close };
  }
  return days;
}

/** Wall lifecycle from the chart's OWN bars, read per session: tests, acceptance, scar. */
export function wallLife(strike: number, barsIn: readonly PressureBar[], spot: number): Pick<PressureWall, "life" | "tests" | "closesBeyond" | "firstTestTime" | "testTimes" | "side"> {
  const bars = sessionsOf(barsIn);
  const side: "ABOVE" | "BELOW" = spot >= strike ? "ABOVE" : "BELOW";
  let tests = 0;
  let firstTestTime: number | null = null;
  const testTimes: number[] = [];
  // A test: the bar reached the wall and closed back on the side it came from.
  for (let i = 1; i < bars.length; i++) {
    const b = bars[i], prev = bars[i - 1];
    const fromBelow = prev.close < strike, fromAbove = prev.close > strike;
    const reached = b.high >= strike && b.low <= strike;
    if (!reached) continue;
    if ((fromBelow && b.close < strike) || (fromAbove && b.close > strike)) {
      tests++;
      testTimes.push(b.time);
      if (firstTestTime == null) firstTestTime = b.time;
    }
  }
  // Acceptance: consecutive newest closes on the far side of where price came from.
  let closesBeyond = 0;
  const origin = bars.length >= 2 ? (bars[0].close >= strike ? "ABOVE" : "BELOW") : side;
  for (let i = bars.length - 1; i >= 0; i--) {
    const c = bars[i].close;
    const beyond = origin === "BELOW" ? c > strike : c < strike;
    if (!beyond) break;
    closesBeyond++;
  }
  const crossed = closesBeyond > 0 && origin !== side ? closesBeyond : 0;
  let life: WallLife;
  if (crossed >= WALL_SCAR_SESSIONS) life = "SCARRED";
  else if (crossed >= 2) life = "BROKEN";
  else if (crossed >= 1) life = "BREAKING";
  else if (tests >= 4) life = "WEAKENING";
  else if (tests >= 2) life = "DEFENDED";
  else if (tests === 1) life = "TESTED";
  else life = "BORN";
  return { life, tests, closesBeyond: crossed, firstTestTime, testTimes, side };
}

export function selectDerivativesPressure(
  receipt: CboeOptionsReceipt | null,
  bars: readonly PressureBar[],
  nowMs: number,
): DerivativesPressureVM {
  const underlying = receipt?.underlying ?? "";
  const refuse = (reason: Extract<DerivativesPressureVM, { drawn: false }>["reason"], contracts = 0): DerivativesPressureVM =>
    ({ drawn: false, version: DERIVATIVES_PRESSURE_VERSION, underlying, reason, contracts, receipt: `PRESSURE:SILENT:${reason}` });
  if (!receipt) return refuse("NO_CHAIN");
  // The chart's own newest close is the price the geography is read at; the
  // delayed snapshot's spot is the fallback when no bars are loaded.
  const lastClose = bars.length ? bars[bars.length - 1].close : null;
  const spot = lastClose != null && lastClose > 0 ? lastClose : receipt.spot;
  if (!(spot != null && spot > 0)) return refuse("NO_SPOT");
  const iv30 = receipt.iv30 != null && receipt.iv30 > 0 ? receipt.iv30 / 100 : null;
  const prepared: Prepared[] = [];
  for (const row of receipt.rows) {
    if (!(row.openInterest > 0)) continue;
    if (row.strike < spot * (1 - SWEEP * 1.5) || row.strike > spot * (1 + SWEEP * 1.5)) continue;
    const sigma = row.iv != null && row.iv > 0.01 ? row.iv : iv30;
    if (!sigma) continue;
    prepared.push({ row, sign: row.type === "call" ? 1 : -1, sigma, T: yearsTo(row.expiration, nowMs), mult: receipt.source === "DERIBIT_PUBLIC" || receipt.source === "TASTYTRADE_LIVE" ? 1 : 100 });
  }
  if (prepared.length < MIN_ROWS) return refuse("TOO_FEW_CONTRACTS", prepared.length);

  const atSpot = netExposureAt(spot, prepared);
  if (!(atSpot.gross > 0)) return refuse("NO_EXPOSURE", prepared.length);
  const ratio = atSpot.net / atSpot.gross;
  const chainScope: ChainScope = receipt.scope?.kind === "NEAR_MONEY_SUBSET"
    ? { kind: "NEAR_MONEY_SUBSET", contracts: prepared.length, reachPct: receipt.scope.reachPct }
    : { kind: "WHOLE" };
  const subset = chainScope.kind === "NEAR_MONEY_SUBSET";
  // A net-over-gross of a window that follows price is not the market's climate.
  const climate: Climate = subset ? "INSUFFICIENT_EVIDENCE" : ratio > MIXED_BAND ? "DAMPING" : ratio < -MIXED_BAND ? "AMPLIFYING" : "MIXED";

  const geography: GeographySample[] = [];
  // The field (and the front read off it) is withheld on a subset.
  for (let i = 0; !subset && i <= SWEEP_STEPS; i++) {
    const price = spot * (1 - SWEEP + (2 * SWEEP * i) / SWEEP_STEPS);
    geography.push({ price, net: netExposureAt(price, prepared).net });
  }
  // Zero-gamma front: the sign change nearest the current price (linear between samples).
  let zeroGamma: number | null = null;
  for (let i = 1; i < geography.length; i++) {
    const a = geography[i - 1], b = geography[i];
    if ((a.net <= 0 && b.net > 0) || (a.net >= 0 && b.net < 0)) {
      const z = a.price + ((b.price - a.price) * Math.abs(a.net)) / (Math.abs(a.net) + Math.abs(b.net) || 1);
      if (zeroGamma == null || Math.abs(z - spot) < Math.abs(zeroGamma - spot)) zeroGamma = z;
    }
  }

  const oiAt = (strike: number, type: "call" | "put") =>
    prepared.reduce((s, p) => (p.row.strike === strike && p.row.type === type ? s + p.row.openInterest : s), 0);
  // On a subset, the outer band of the heard window cannot hold a wall.
  const wallReach = chainScope.kind === "NEAR_MONEY_SUBSET" ? (chainScope.reachPct / 100) * (1 - SUBSET_EDGE_BAND) : SWEEP;
  const strikes = [...atSpot.byStrike.entries()].filter(([k]) => Math.abs(k / spot - 1) <= wallReach);
  const walls: PressureWall[] = strikes
    .filter(([, e]) => e > 0 && e / atSpot.gross >= WALL_MIN_SHARE)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_WALLS)
    .map(([strike, exposure]) => ({
      strike, exposure, share: exposure / atSpot.gross,
      callOi: oiAt(strike, "call"), putOi: oiAt(strike, "put"),
      ...wallLife(strike, bars, spot),
    }))
    .sort((a, b) => a.strike - b.strike);
  const pockets: PressurePocket[] = (subset ? [] : strikes)
    .filter(([, e]) => e < 0 && -e / atSpot.gross >= WALL_MIN_SHARE)
    .sort((a, b) => a[1] - b[1])
    .slice(0, MAX_POCKETS)
    .map(([strike, exposure]) => ({ strike, exposure, share: -exposure / atSpot.gross }))
    .sort((a, b) => a.strike - b.strike);

  const nearest = [...new Set(prepared.map(p => p.row.expiration))].sort()[0] ?? null;
  const envelope: ExpectedMove | null = iv30
    ? {
        // Crypto trades every day of the year; listed equities ~252 sessions.
        session: spot * iv30 * Math.sqrt(1 / (receipt.source === "DERIBIT_PUBLIC" ? 365 : 252)),
        toExpiry: nearest ? spot * iv30 * Math.sqrt(yearsTo(nearest, nowMs)) : null,
        expiry: nearest,
      }
    : null;

  const receiptStr = [
    `PRESSURE:${climate}:${ratio.toFixed(2)}`,
    `ZG:${zeroGamma != null ? zeroGamma.toFixed(2) : "NONE"}`,
    `WALLS:${walls.map(w => `${w.strike}/${w.life}`).join(",") || "NONE"}`,
    `POCKETS:${pockets.map(p => p.strike).join(",") || "NONE"}`,
    `N:${prepared.length}`,
    ...(subset ? [`SCOPE:NEAR_MONEY_SUBSET:±${chainScope.kind === "NEAR_MONEY_SUBSET" ? chainScope.reachPct : 0}%`] : []),
  ].join("|");

  return {
    drawn: true,
    version: DERIVATIVES_PRESSURE_VERSION,
    underlying,
    spot,
    climate,
    climateRatio: ratio,
    netAtSpot: atSpot.net,
    gross: atSpot.gross,
    geography,
    zeroGamma,
    walls,
    testSpanSec: bars.length >= 2 ? Math.max(0, bars[bars.length - 1].time - bars[0].time) : 0,
    pockets,
    envelope,
    contracts: prepared.length,
    chainScope,
    clocks: { chainAsOf: receipt.chainAsOf, underlyingAsOf: receipt.underlyingAsOf, oiAsOf: receipt.source === "DERIBIT_PUBLIC" ? "CURRENT" : "PRIOR_SESSION", modelAsOf: Math.floor(nowMs / 1000) },
    source: receipt.source,
    fidelity: receipt.source === "DERIBIT_PUBLIC" ? "SNAPSHOT" : "DELAYED",
    epistemic: { exposure: "INFERRED", envelope: "DERIVED", tests: "OBSERVED" },
    assumption: receipt.source === "DERIBIT_PUBLIC"
      ? "Dealers assumed long calls / short puts (calls +, puts −) — on crypto this convention is weaker than on listed equities; Black–Scholes gamma at each contract's Deribit mark IV, r = 4%."
      : "Dealers assumed long calls / short puts (calls +, puts −); Black–Scholes gamma at each contract's Cboe IV, r = 4%.",
    receipt: receiptStr,
  };
}

/** "6h seen" / "3.2d seen" when the tests were counted over less than the window; null when the window was covered. */
export function wallTestSpanWords(spanSec: number): string | null {
  if (!(spanSec >= 0) || spanSec >= (WALL_TEST_WINDOW_DAYS - 0.5) * 86_400) return null;
  const h = spanSec / 3600;
  return h < 48 ? `${Math.max(1, Math.round(h))}h seen` : `${(h / 24).toFixed(1)}d seen`;
}
