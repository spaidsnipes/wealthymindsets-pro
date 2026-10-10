/**
 * GAMMA EXPOSURE (GEX) — the WALLS & GAMMA family's ONE model owner.
 *
 * Founder (2026-10-10): "Walls show Call and Put but don't clearly expose
 * Gamma." Call / Put walls are OPEN-INTEREST concentrations
 * (selectOptionsBarrierEvidence) — positioning, not gamma. This module is the
 * gamma side, computed once per chain update and painted by several distinct
 * inventions (heatmap, positive / negative regions, flip, concentration). It
 * never renames a call wall as gamma, and every invention reads THIS result.
 *
 * CONVENTION (stated, user-visible):
 *   GEX(contract) = Γ × OI × multiplier × S² × 0.01 × sign
 *   = the change in the assumed dealer book's delta, in $ of underlying, for a
 *     1% move in the underlying. Units: $ per 1% move.
 *   multiplier: 100 shares per listed equity / index option (Cboe); 1 coin per
 *   Deribit option (OI is quoted in coins); 1 per tastytrade futures option
 *   (as the pressure owner does).
 *
 * SIGN — an ASSUMPTION, never observed dealer inventory: dealers are assumed
 *   LONG calls and SHORT puts (calls +, puts −), the same convention as the
 *   Derivatives Pressure owner, so the two never disagree on a sign.
 *
 * GAMMA: the source's own per-contract gamma when it publishes one (Cboe);
 *   otherwise Black–Scholes from the contract's OWN source IV (Deribit mark
 *   IV), r = MODEL_RATE, q = 0. A contract with no gamma and no IV is EXCLUDED
 *   and counted — never valued at zero, never given another contract's IV.
 *
 * PROFILE (regions, flip): total GEX re-priced at hypothetical spots (sticky-
 *   strike IV, Black–Scholes), only across the chain's own strike range. The
 *   flip is reported ONLY where that profile crosses zero inside the range.
 *
 * WHAT THIS DOES NOT CLAIM: observed dealer positioning; that positive gamma
 *   pins price; that negative gamma guarantees volatility.
 *
 * PURE. DETERMINISTIC (given nowMs). No fetch, no storage, no React.
 */
import type { CboeOptionRow, CboeOptionsReceipt, OptionsPositioningSource } from "@/lib/marketData/cboeDelayedOptions";
import { MODEL_RATE } from "@/lib/marketData/viewModels/selectDerivativesPressure";
import { bsPartials, rowsInScope, type ExpiryScope } from "@/lib/marketData/viewModels/selectOptionsBarrierEvidence";

export const GAMMA_EXPOSURE_VERSION = 1;
export const GEX_CONVENTION = "GEX = Γ × OI × multiplier × S² × 0.01 — $ per 1% move in the underlying";
export const GEX_DEALER_ASSUMPTION = "ASSUMPTION: dealers long calls, short puts (calls +, puts −). Not observed dealer inventory.";
export const GEX_NON_CLAIMS = "Positive gamma does not pin price; negative gamma does not guarantee volatility.";
/** Strikes considered: within ±this fraction of spot. */
export const GEX_WINDOW = 0.3;
/** The profile sweep: ±this fraction of spot, clipped to the chain's strike range. */
export const GEX_SWEEP = 0.2;
export const GEX_SWEEP_STEPS = 120;
/** Fewer priced contracts than this is no gamma picture. */
export const GEX_MIN_CONTRACTS = 20;
/** Excluded share at or above this grades the reading DEGRADED. */
export const GEX_DEGRADED_EXCLUDED_SHARE = 0.25;
/** A chain older than this (hours) is DEGRADED — OI is a daily figure, but not a week's. */
export const GEX_STALE_HOURS = 96;
/** A concentration level holds at least this share of gross |GEX|. */
export const GEX_CONCENTRATION_MIN_SHARE = 0.04;
export const GEX_MAX_CONCENTRATION = 5;

export type GexGrade = "FULL" | "PARTIAL" | "DEGRADED";
export type GexSilence = "NO_CHAIN" | "NO_SPOT" | "NO_CONTRACTS_IN_SCOPE" | "TOO_FEW_PRICED" | "NO_EXPOSURE";

export interface GexExpirySlice {
  readonly expiration: string;
  readonly net: number;
  readonly oi: number;
}

export interface GexBucket {
  /** Bucket centre (the strike itself at the chain's own step). */
  readonly price: number;
  readonly lo: number;
  readonly hi: number;
  readonly callGex: number;
  readonly putGex: number;
  readonly net: number;
  readonly callOi: number;
  readonly putOi: number;
  readonly contracts: number;
  /** OI-weighted mean IV of the contracts here (decimal), null when none carried IV. */
  readonly iv: number | null;
  /** Per-expiry contributions, largest |net| first (Inspect). */
  readonly expiries: readonly GexExpirySlice[];
}

export interface GexRegion {
  readonly sign: "POSITIVE" | "NEGATIVE";
  readonly from: number;
  readonly to: number;
  /** Largest |total GEX| inside the region ($ per 1%). */
  readonly peak: number;
}

export interface GexConcentration {
  readonly price: number;
  readonly net: number;
  /** Share of gross |GEX| (0–1). */
  readonly share: number;
  readonly sign: "POSITIVE" | "NEGATIVE";
}

export type GexFlip =
  | { readonly kind: "LEVEL"; readonly level: number; readonly crossings: number }
  | { readonly kind: "NONE"; readonly reason: "NO_CROSSING_IN_STRIKE_RANGE" | "WITHHELD_NEAR_MONEY_SUBSET" | "PROFILE_UNPRICED" };

export type GammaExposureVM =
  | {
      readonly drawn: true;
      readonly version: number;
      readonly underlying: string;
      readonly source: OptionsPositioningSource;
      readonly grade: GexGrade;
      /** Why the grade is below FULL, in words (empty for FULL). */
      readonly gradeWhy: readonly string[];
      readonly spot: number;
      readonly spotFrom: "CHAIN_SNAPSHOT" | "CHART_LAST";
      readonly multiplier: number;
      readonly scope: ExpiryScope;
      readonly expiries: readonly string[];
      readonly bucketWidth: number;
      readonly buckets: readonly GexBucket[];
      /** max |net| over buckets (the heatmap's intensity scale). */
      readonly maxAbsBucket: number;
      readonly netTotal: number;
      readonly grossTotal: number;
      readonly profile: readonly { readonly price: number; readonly net: number }[];
      readonly regions: readonly GexRegion[];
      readonly flip: GexFlip;
      readonly concentration: readonly GexConcentration[];
      readonly contracts: { readonly priced: number; readonly gammaFromSource: number; readonly gammaFromModel: number; readonly excludedNoIv: number; readonly sweepPriced: number };
      readonly strikeRange: { readonly lo: number; readonly hi: number };
      readonly clocks: { readonly chainAsOf: string | null; readonly oiAsOf: "PRIOR_SESSION" | "CURRENT"; readonly calcAt: number };
      readonly model: { readonly convention: string; readonly assumption: string; readonly nonClaims: string; readonly r: number; readonly q: number };
      readonly receipt: string;
    }
  | {
      readonly drawn: false;
      readonly version: number;
      readonly underlying: string;
      readonly reason: GexSilence;
      readonly scope: ExpiryScope;
      readonly receipt: string;
    };

export function gexMultiplier(source: OptionsPositioningSource): number {
  return source === "DERIBIT_PUBLIC" || source === "TASTYTRADE_LIVE" ? 1 : 100;
}

const tauYears = (expiration: string, nowMs: number, source: OptionsPositioningSource) => {
  // Deribit settles 08:00 UTC; listed US options at the 16:00 ET close (≈20:00 UTC).
  const hh = source === "DERIBIT_PUBLIC" ? "08" : "20";
  return Math.max(Date.parse(`${expiration}T${hh}:00:00Z`) - nowMs, 3_600_000) / (365 * 86_400_000);
};

/** The chain's own strike step near spot: the most common gap between adjacent strikes. */
export function chainStrikeStep(strikes: readonly number[]): number {
  const s = [...new Set(strikes)].sort((a, b) => a - b);
  const counts = new Map<number, number>();
  for (let i = 1; i < s.length; i++) {
    const d = +(s[i] - s[i - 1]).toFixed(6);
    if (d > 0) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  let best = 0, n = -1;
  for (const [d, c] of counts) if (c > n || (c === n && d < best)) { best = d; n = c; }
  return best > 0 ? best : 1;
}

interface Priced { readonly row: CboeOptionRow; readonly gamma: number; readonly sign: 1 | -1; readonly sigma: number | null; readonly tau: number; readonly fromSource: boolean }

export interface GammaExposureInput {
  readonly receipt: CboeOptionsReceipt | null;
  /** The chart's last price — used only when the chain carries no spot of its own. */
  readonly chartSpot: number | null;
  readonly nowMs: number;
  readonly scope?: ExpiryScope;
  /** Bucket width in price; default = the chain's own strike step. */
  readonly bucketWidth?: number;
}

export function selectGammaExposure(input: GammaExposureInput): GammaExposureVM {
  const { receipt, chartSpot, nowMs } = input;
  const scope: ExpiryScope = input.scope ?? "ALL";
  const underlying = receipt?.underlying ?? "";
  const silence = (reason: GexSilence): GammaExposureVM =>
    ({ drawn: false, version: GAMMA_EXPOSURE_VERSION, underlying, reason, scope, receipt: `GEX:SILENCE:${reason}:${scope}` });
  if (!receipt) return silence("NO_CHAIN");
  // Source gamma was computed at the chain's own spot: the profile is read there.
  const spotFrom = receipt.spot != null && receipt.spot > 0 ? "CHAIN_SNAPSHOT" as const : "CHART_LAST" as const;
  const spot = spotFrom === "CHAIN_SNAPSHOT" ? receipt.spot! : chartSpot;
  if (!(spot != null && spot > 0)) return silence("NO_SPOT");
  const { rows, expiries } = rowsInScope(receipt.rows, scope, nowMs);
  const inWindow = rows.filter(r => r.openInterest > 0 && Math.abs(r.strike / spot - 1) <= GEX_WINDOW);
  if (!inWindow.length) return silence("NO_CONTRACTS_IN_SCOPE");

  const mult = gexMultiplier(receipt.source);
  const priced: Priced[] = [];
  let excludedNoIv = 0;
  for (const row of inWindow) {
    const sigma = row.iv != null && row.iv > 0.01 ? row.iv : null;
    const tau = tauYears(row.expiration, nowMs, receipt.source);
    const sign: 1 | -1 = row.type === "call" ? 1 : -1;
    if (row.gamma != null && row.gamma > 0) { priced.push({ row, gamma: row.gamma, sign, sigma, tau, fromSource: true }); continue; }
    const bs = sigma != null ? bsPartials(spot, row.strike, sigma, tau, MODEL_RATE) : null;
    if (!bs) { excludedNoIv++; continue; }
    priced.push({ row, gamma: bs.gamma, sign, sigma, tau, fromSource: false });
  }
  if (priced.length < GEX_MIN_CONTRACTS) return silence("TOO_FEW_PRICED");

  // ── PER-STRIKE BUCKETS at the current spot ───────────────────────────────
  const width = input.bucketWidth && input.bucketWidth > 0 ? input.bucketWidth : chainStrikeStep(priced.map(p => p.row.strike));
  const k = (strike: number) => Math.round(strike / width);
  type Acc = { callGex: number; putGex: number; callOi: number; putOi: number; contracts: number; ivW: number; ivOi: number; exp: Map<string, { net: number; oi: number }> };
  const acc = new Map<number, Acc>();
  const s2 = spot * spot * 0.01;
  let netTotal = 0, grossTotal = 0;
  for (const p of priced) {
    const e = p.gamma * p.row.openInterest * mult * s2 * p.sign;
    netTotal += e; grossTotal += Math.abs(e);
    const key = k(p.row.strike);
    const a = acc.get(key) ?? { callGex: 0, putGex: 0, callOi: 0, putOi: 0, contracts: 0, ivW: 0, ivOi: 0, exp: new Map() };
    if (p.sign > 0) { a.callGex += e; a.callOi += p.row.openInterest; } else { a.putGex += e; a.putOi += p.row.openInterest; }
    a.contracts++;
    if (p.sigma != null) { a.ivW += p.sigma * p.row.openInterest; a.ivOi += p.row.openInterest; }
    const x = a.exp.get(p.row.expiration) ?? { net: 0, oi: 0 };
    x.net += e; x.oi += p.row.openInterest;
    a.exp.set(p.row.expiration, x);
    acc.set(key, a);
  }
  if (!(grossTotal > 0)) return silence("NO_EXPOSURE");
  const buckets: GexBucket[] = [...acc.entries()].sort((a, b) => a[0] - b[0]).map(([key, a]) => ({
    price: key * width,
    lo: key * width - width / 2,
    hi: key * width + width / 2,
    callGex: a.callGex,
    putGex: a.putGex,
    net: a.callGex + a.putGex,
    callOi: a.callOi,
    putOi: a.putOi,
    contracts: a.contracts,
    iv: a.ivOi > 0 ? a.ivW / a.ivOi : null,
    expiries: [...a.exp.entries()].map(([expiration, v]) => ({ expiration, net: v.net, oi: v.oi })).sort((x, y) => Math.abs(y.net) - Math.abs(x.net)),
  }));
  const maxAbsBucket = Math.max(0, ...buckets.map(b => Math.abs(b.net)));

  // ── PROFILE across the chain's own strike range (sticky-strike BS) ───────
  const strikes = priced.map(p => p.row.strike);
  const strikeRange = { lo: Math.min(...strikes), hi: Math.max(...strikes) };
  const sweepable = priced.filter(p => p.sigma != null);
  const subset = receipt.scope?.kind === "NEAR_MONEY_SUBSET";
  const profile: { price: number; net: number }[] = [];
  const pLo = Math.max(strikeRange.lo, spot * (1 - GEX_SWEEP));
  const pHi = Math.min(strikeRange.hi, spot * (1 + GEX_SWEEP));
  if (!subset && sweepable.length >= GEX_MIN_CONTRACTS && pHi > pLo) {
    for (let i = 0; i <= GEX_SWEEP_STEPS; i++) {
      const S = pLo + ((pHi - pLo) * i) / GEX_SWEEP_STEPS;
      let net = 0;
      for (const p of sweepable) {
        const g = bsPartials(S, p.row.strike, p.sigma!, p.tau, MODEL_RATE);
        if (g) net += g.gamma * p.row.openInterest * mult * S * S * 0.01 * p.sign;
      }
      profile.push({ price: S, net });
    }
  }
  const regions: GexRegion[] = [];
  for (const s of profile) {
    const sign = s.net >= 0 ? "POSITIVE" as const : "NEGATIVE" as const;
    const last = regions[regions.length - 1];
    if (last && last.sign === sign) regions[regions.length - 1] = { ...last, to: s.price, peak: Math.max(last.peak, Math.abs(s.net)) };
    else regions.push({ sign, from: s.price, to: s.price, peak: Math.abs(s.net) });
  }
  const roots: number[] = [];
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1], b = profile[i];
    if ((a.net < 0 && b.net > 0) || (a.net > 0 && b.net < 0)) roots.push(a.price + ((b.price - a.price) * Math.abs(a.net)) / (Math.abs(a.net) + Math.abs(b.net)));
  }
  const flip: GexFlip = subset
    ? { kind: "NONE", reason: "WITHHELD_NEAR_MONEY_SUBSET" }
    : !profile.length
      ? { kind: "NONE", reason: "PROFILE_UNPRICED" }
      : roots.length
        ? { kind: "LEVEL", level: roots.reduce((best, r) => (Math.abs(r - spot) < Math.abs(best - spot) ? r : best)), crossings: roots.length }
        : { kind: "NONE", reason: "NO_CROSSING_IN_STRIKE_RANGE" };

  // ── CONCENTRATION: the buckets holding the most gross |GEX| ──────────────
  const concentration: GexConcentration[] = buckets
    .map(b => ({ price: b.price, net: b.net, share: Math.abs(b.net) / grossTotal, sign: b.net >= 0 ? "POSITIVE" as const : "NEGATIVE" as const }))
    .filter(c => c.share >= GEX_CONCENTRATION_MIN_SHARE)
    .sort((a, b) => b.share - a.share)
    .slice(0, GEX_MAX_CONCENTRATION)
    .sort((a, b) => a.price - b.price);

  // ── GRADE ────────────────────────────────────────────────────────────────
  const gradeWhy: string[] = [];
  const excludedShare = excludedNoIv / (excludedNoIv + priced.length);
  const asOfMs = Date.parse(receipt.chainAsOf ?? "");
  const stale = Number.isFinite(asOfMs) && nowMs - asOfMs > GEX_STALE_HOURS * 3_600_000;
  if (excludedShare >= GEX_DEGRADED_EXCLUDED_SHARE) gradeWhy.push(`${excludedNoIv} of ${excludedNoIv + priced.length} contracts carry no gamma or IV — excluded`);
  if (stale) gradeWhy.push(`chain as of ${receipt.chainAsOf} is older than ${GEX_STALE_HOURS}h`);
  const degraded = gradeWhy.length > 0;
  if (!degraded && excludedNoIv > 0) gradeWhy.push(`${excludedNoIv} contracts without gamma or IV excluded`);
  if (subset) gradeWhy.push("only the strikes nearest price were heard — flip and regions withheld");
  if (!subset && !profile.length) gradeWhy.push("too few contracts carry IV to re-price the profile — regions and flip withheld");
  const grade: GexGrade = degraded ? "DEGRADED" : gradeWhy.length ? "PARTIAL" : "FULL";

  const fromSource = priced.filter(p => p.fromSource).length;
  const receiptStr = [
    `GEX:${grade}:${scope}`,
    `NET:${netTotal.toExponential(2)}`,
    `FLIP:${flip.kind === "LEVEL" ? flip.level.toFixed(2) : flip.reason}`,
    `CONC:${concentration.map(c => `${c.price}${c.sign === "POSITIVE" ? "+" : "-"}`).join(",") || "NONE"}`,
    `N:${priced.length}/X:${excludedNoIv}`,
    `W:${width}`,
  ].join("|");

  return {
    drawn: true,
    version: GAMMA_EXPOSURE_VERSION,
    underlying,
    source: receipt.source,
    grade,
    gradeWhy,
    spot,
    spotFrom,
    multiplier: mult,
    scope,
    expiries,
    bucketWidth: width,
    buckets,
    maxAbsBucket,
    netTotal,
    grossTotal,
    profile,
    regions,
    flip,
    concentration,
    contracts: { priced: priced.length, gammaFromSource: fromSource, gammaFromModel: priced.length - fromSource, excludedNoIv, sweepPriced: profile.length ? sweepable.length : 0 },
    strikeRange,
    clocks: { chainAsOf: receipt.chainAsOf, oiAsOf: receipt.source === "DERIBIT_PUBLIC" ? "CURRENT" : "PRIOR_SESSION", calcAt: Math.floor(nowMs / 1000) },
    model: { convention: GEX_CONVENTION, assumption: GEX_DEALER_ASSUMPTION, nonClaims: GEX_NON_CLAIMS, r: MODEL_RATE, q: 0 },
    receipt: receiptStr,
  };
}

/** "$1.2B" / "−$340M" per 1% — the one way every surface prints a GEX figure. */
export function gexWords(v: number): string {
  const a = Math.abs(v);
  const s = v < 0 ? "−" : "+";
  const body = a >= 1e9 ? `${(a / 1e9).toFixed(1)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `${(a / 1e3).toFixed(0)}K` : a.toFixed(0);
  return `${s}$${body}/1%`;
}

/** The bucket a price falls in, or null (Inspect on the heatmap). */
export function gexBucketAt(vm: GammaExposureVM, price: number): GexBucket | null {
  if (!vm.drawn) return null;
  return vm.buckets.find(b => price >= b.lo && price < b.hi) ?? null;
}
