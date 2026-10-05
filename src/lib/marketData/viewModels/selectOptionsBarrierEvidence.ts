/**
 * OPTIONS BARRIER EVIDENCE — the Brick Wall / Market Sense derivatives
 * extension (Garden 18 super order §5, 2026-10-05). One owner, PURE.
 *
 * This EXTENDS the Derivatives Pressure sense (selectDerivativesPressure.ts —
 * dealer-gamma geography, climate, walls with an observed lifecycle, pockets,
 * IV envelope). It does not replace Brick Wall or Market Sense with a "gamma
 * app", and it imports no vendor formula, brand, accuracy claim or ribbon.
 *
 * What it adds, each with its own fidelity and words:
 *
 *  1. CALL / PUT CONCENTRATION WALLS — strikes where call (or put) OPEN
 *     INTEREST concentrates. OBSERVED positioning, nothing more: a call wall is
 *     NOT resistance and a put wall is NOT support by definition (§5 08:19–10:45).
 *     Volume is carried beside OI, never added to it — OI is not rebuilt from
 *     gross volume (§5 item 8).
 *  2. EVERY ZERO-GAMMA ROOT — the geography can cross zero once, many times or
 *     never. All crossings are returned and the kind is named (NONE / ONE /
 *     MANY). A numerical root is not a behavioural "balance / pinning" level;
 *     that is a hypothesis this module does not make (§5 item 2).
 *  3. GAMMA, VANNA AND CHARM, SEPARATELY — per strike, in stated units, then a
 *     dimensionally consistent COMBINED SCENARIO: for a named price move ΔS,
 *     vol change Δσ and elapsed time Δt, the assumed dealer book's delta change
 *        ΔΔ = Γ·ΔS + Vanna·Δσ + Charm·Δt     (all in underlying units/shares)
 *     and its hedge notional. Each contribution is reported on its own; a
 *     missing input refuses the scenario instead of being set to zero (§5 item 4).
 *        Gamma  ∂Δ/∂S   per $1 of underlying
 *        Vanna  ∂Δ/∂σ   per 1.00 of volatility (per vol POINT = ÷100)
 *        Charm  ∂Δ/∂t   per calendar DAY ELAPSED (t = elapsed time; the
 *               time-to-expiry τ shrinks as t grows, so charm = −∂Δ/∂τ / 365)
 *  4. EXPIRY FILTER — ALL / NEAREST / 0DTE (expiration on today's New York
 *     date). The filter is part of every receipt so a reading names its scope.
 *
 * EPISTEMOLOGY: OI and volume are OBSERVED (at the source's own clock); the
 * dealer side is the same stated ASSUMPTION as the pressure sense (calls +,
 * puts −), so every exposure and scenario is INFERRED; Black–Scholes with each
 * contract's own IV, r = MODEL_RATE, no dividends. Ordinary chain data is never
 * labelled participant-tagged or dealer-inventory evidence (§5 fidelity ladder).
 * No look-ahead: this reads only the receipt it is handed.
 */
import type { CboeOptionRow, CboeOptionsReceipt } from "@/lib/marketData/cboeDelayedOptions";
import { MODEL_RATE } from "@/lib/marketData/viewModels/selectDerivativesPressure";

export const OPTIONS_BARRIER_EVIDENCE_VERSION = 1;
/** A strike must hold this share of side OI (within the window) to be a concentration wall. */
export const OI_WALL_MIN_SHARE = 0.05;
export const MAX_OI_WALLS = 3;
/** Strikes considered: within ±this fraction of spot. */
export const OI_WINDOW = 0.2;

export type ExpiryScope = "ALL" | "NEAREST" | "0DTE";
export type RootKind = "NONE" | "ONE" | "MANY";

export interface ConcentrationWall {
  readonly type: "CALL_OI" | "PUT_OI";
  readonly strike: number;
  /** OBSERVED open interest at this strike (contracts), this side only. */
  readonly openInterest: number;
  /** Share of this side's OI inside the window (0–1). */
  readonly share: number;
  /** OBSERVED session volume at this strike, this side — reported, never added to OI. Null when the source did not carry it. */
  readonly volume: number | null;
  readonly side: "ABOVE" | "BELOW" | "AT";
}

export interface GreekContribution {
  readonly strike: number;
  /** Assumed-dealer delta change per $1 underlying move (shares). */
  readonly gamma: number;
  /** Assumed-dealer delta change per 1 vol POINT (shares). */
  readonly vannaPerVolPoint: number;
  /** Assumed-dealer delta change per calendar day elapsed (shares). */
  readonly charmPerDay: number;
}

export interface Scenario {
  /** Underlying move in price units (e.g. +25 = up $25). */
  readonly dS: number;
  /** Volatility change in vol POINTS (e.g. −2 = IV down two points). */
  readonly dVolPoints: number;
  /** Calendar days elapsed. */
  readonly dDays: number;
}

export interface ScenarioResult {
  readonly scenario: Scenario;
  /** Each contribution to the assumed dealer delta change, in underlying units/shares. */
  readonly fromGamma: number;
  readonly fromVanna: number;
  readonly fromCharm: number;
  readonly total: number;
  /** total × spot: the hedge notional in quote currency (INFERRED). */
  readonly hedgeNotional: number;
  /** + = the assumed dealer book must BUY underlying to stay hedged; − = SELL. */
  readonly hedgeSide: "BUY" | "SELL" | "NONE";
}

export type OptionsBarrierEvidenceVM =
  | {
      readonly drawn: true;
      readonly version: number;
      readonly underlying: string;
      readonly spot: number;
      readonly scope: ExpiryScope;
      readonly expiries: readonly string[];
      readonly callWalls: readonly ConcentrationWall[];
      readonly putWalls: readonly ConcentrationWall[];
      readonly zeroGammaRoots: readonly number[];
      readonly rootKind: RootKind;
      readonly contributions: readonly GreekContribution[];
      /** Book totals per greek (shares), each reported separately. */
      readonly totals: { readonly gamma: number; readonly vannaPerVolPoint: number; readonly charmPerDay: number };
      /** Contracts used, and contracts excluded for a missing IV (never valued at zero). */
      readonly contracts: number;
      readonly excludedNoIv: number;
      readonly epistemic: { readonly positioning: "OBSERVED"; readonly exposure: "INFERRED" };
      readonly assumption: string;
      readonly receipt: string;
    }
  | {
      readonly drawn: false;
      readonly version: number;
      readonly underlying: string;
      readonly scope: ExpiryScope;
      readonly reason: "NO_CHAIN" | "NO_SPOT" | "NO_CONTRACTS_IN_SCOPE";
      readonly receipt: string;
    };

const SQRT2PI = Math.sqrt(2 * Math.PI);
const phi = (x: number) => Math.exp(-(x * x) / 2) / SQRT2PI;

/** Black–Scholes partials (no dividends). τ in years. Zeroes are returned only for degenerate inputs, which callers exclude. */
export function bsPartials(S: number, K: number, sigma: number, tau: number, r = MODEL_RATE): { gamma: number; vanna: number; charmPerYear: number } | null {
  if (!(S > 0 && K > 0 && sigma > 0 && tau > 0)) return null;
  const st = sigma * Math.sqrt(tau);
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * tau) / st;
  const d2 = d1 - st;
  const gamma = phi(d1) / (S * st);
  // ∂Δ/∂σ — identical for calls and puts.
  const vanna = (-phi(d1) * d2) / sigma;
  // ∂Δ/∂t with t = ELAPSED time (τ decreasing) — identical for calls and puts
  // without dividends (put Δ = call Δ − 1).
  const charmPerYear = (-phi(d1) * (2 * r * tau - d2 * st)) / (2 * tau * st);
  return [gamma, vanna, charmPerYear].every(Number.isFinite) ? { gamma, vanna, charmPerYear } : null;
}

const ET_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
const tauYears = (expiration: string, nowMs: number) => Math.max(Date.parse(`${expiration}T20:00:00Z`) - nowMs, 3_600_000) / (365 * 86_400_000);

/** Rows inside the expiry scope (expired contracts are never counted). */
export function rowsInScope(rows: readonly CboeOptionRow[], scope: ExpiryScope, nowMs: number): { rows: CboeOptionRow[]; expiries: string[] } {
  const today = ET_DATE.format(new Date(nowMs));
  const live = rows.filter(r => r.expiration >= today);
  const all = [...new Set(live.map(r => r.expiration))].sort();
  const keep = scope === "ALL" ? new Set(all) : scope === "NEAREST" ? new Set(all.slice(0, 1)) : new Set(all.filter(e => e === today));
  return { rows: live.filter(r => keep.has(r.expiration)), expiries: [...keep].sort() };
}

/** Every sign change of a sampled curve, linearly located. */
export function zeroRoots(samples: readonly { price: number; net: number }[]): number[] {
  const roots: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    if ((a.net < 0 && b.net > 0) || (a.net > 0 && b.net < 0)) {
      roots.push(a.price + ((b.price - a.price) * Math.abs(a.net)) / (Math.abs(a.net) + Math.abs(b.net)));
    } else if (a.net === 0 && i === 1) {
      roots.push(a.price);
    } else if (b.net === 0 && i < samples.length - 1) {
      const c = samples[i + 1];
      if ((a.net < 0 && c.net > 0) || (a.net > 0 && c.net < 0)) roots.push(b.price);
    }
  }
  return roots;
}

export function rootKind(roots: readonly number[]): RootKind {
  return roots.length === 0 ? "NONE" : roots.length === 1 ? "ONE" : "MANY";
}

function concentration(rows: readonly CboeOptionRow[], type: "call" | "put", spot: number): ConcentrationWall[] {
  const byStrike = new Map<number, { oi: number; vol: number | null }>();
  for (const r of rows) {
    if (r.type !== type || !(r.openInterest > 0) || Math.abs(r.strike / spot - 1) > OI_WINDOW) continue;
    const cur = byStrike.get(r.strike) ?? { oi: 0, vol: null };
    cur.oi += r.openInterest;
    if (r.volume != null && Number.isFinite(r.volume)) cur.vol = (cur.vol ?? 0) + r.volume;
    byStrike.set(r.strike, cur);
  }
  const total = [...byStrike.values()].reduce((s, v) => s + v.oi, 0);
  if (!(total > 0)) return [];
  return [...byStrike.entries()]
    .filter(([, v]) => v.oi / total >= OI_WALL_MIN_SHARE)
    .sort((a, b) => b[1].oi - a[1].oi)
    .slice(0, MAX_OI_WALLS)
    .map(([strike, v]) => ({
      type: type === "call" ? "CALL_OI" as const : "PUT_OI" as const,
      strike,
      openInterest: v.oi,
      share: v.oi / total,
      volume: v.vol,
      side: Math.abs(strike - spot) / spot < 0.0005 ? "AT" as const : strike > spot ? "ABOVE" as const : "BELOW" as const,
    }))
    .sort((a, b) => a.strike - b.strike);
}

export function selectOptionsBarrierEvidence(
  receipt: CboeOptionsReceipt | null,
  spotIn: number | null,
  nowMs: number,
  scope: ExpiryScope = "ALL",
): OptionsBarrierEvidenceVM {
  const underlying = receipt?.underlying ?? "";
  const refuse = (reason: Extract<OptionsBarrierEvidenceVM, { drawn: false }>["reason"]): OptionsBarrierEvidenceVM =>
    ({ drawn: false, version: OPTIONS_BARRIER_EVIDENCE_VERSION, underlying, scope, reason, receipt: `OPTEVID:SILENT:${reason}:${scope}` });
  if (!receipt) return refuse("NO_CHAIN");
  const spot = spotIn != null && spotIn > 0 ? spotIn : receipt.spot;
  if (!(spot != null && spot > 0)) return refuse("NO_SPOT");
  const { rows, expiries } = rowsInScope(receipt.rows, scope, nowMs);
  if (rows.length === 0) return refuse("NO_CONTRACTS_IN_SCOPE");

  const mult = receipt.source === "DERIBIT_PUBLIC" || receipt.source === "TASTYTRADE_LIVE" ? 1 : 100;
  const iv30 = receipt.iv30 != null && receipt.iv30 > 0 ? receipt.iv30 / 100 : null;
  let excludedNoIv = 0;
  const priced: { row: CboeOptionRow; sign: 1 | -1; sigma: number; tau: number }[] = [];
  for (const row of rows) {
    if (!(row.openInterest > 0) || Math.abs(row.strike / spot - 1) > OI_WINDOW * 1.5) continue;
    const sigma = row.iv != null && row.iv > 0.01 ? row.iv : iv30;
    if (!sigma) { excludedNoIv++; continue; }
    priced.push({ row, sign: row.type === "call" ? 1 : -1, sigma, tau: tauYears(row.expiration, nowMs) });
  }

  const contribByStrike = new Map<number, { gamma: number; vanna: number; charm: number }>();
  for (const p of priced) {
    const g = bsPartials(spot, p.row.strike, p.sigma, p.tau);
    if (!g) { excludedNoIv++; continue; }
    const units = p.row.openInterest * mult * p.sign;
    const cur = contribByStrike.get(p.row.strike) ?? { gamma: 0, vanna: 0, charm: 0 };
    cur.gamma += g.gamma * units;
    cur.vanna += (g.vanna / 100) * units;
    cur.charm += (g.charmPerYear / 365) * units;
    contribByStrike.set(p.row.strike, cur);
  }
  const contributions: GreekContribution[] = [...contribByStrike.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([strike, c]) => ({ strike, gamma: c.gamma, vannaPerVolPoint: c.vanna, charmPerDay: c.charm }));
  const totals = contributions.reduce(
    (t, c) => ({ gamma: t.gamma + c.gamma, vannaPerVolPoint: t.vannaPerVolPoint + c.vannaPerVolPoint, charmPerDay: t.charmPerDay + c.charmPerDay }),
    { gamma: 0, vannaPerVolPoint: 0, charmPerDay: 0 },
  );

  // The same dealer-gamma geography, re-swept inside this scope, for honest roots.
  const geography: { price: number; net: number }[] = [];
  const STEPS = 160;
  for (let i = 0; i <= STEPS; i++) {
    const S = spot * (1 - OI_WINDOW + (2 * OI_WINDOW * i) / STEPS);
    let net = 0;
    for (const p of priced) {
      const g = bsPartials(S, p.row.strike, p.sigma, p.tau);
      if (g) net += g.gamma * p.row.openInterest * mult * S * S * 0.01 * p.sign;
    }
    geography.push({ price: S, net });
  }
  const roots = zeroRoots(geography);

  const callWalls = concentration(rows, "call", spot);
  const putWalls = concentration(rows, "put", spot);
  const receiptStr = [
    `OPTEVID:${scope}`,
    `CALLOI:${callWalls.map(w => w.strike).join(",") || "NONE"}`,
    `PUTOI:${putWalls.map(w => w.strike).join(",") || "NONE"}`,
    `ROOTS:${rootKind(roots)}:${roots.length}`,
    `N:${priced.length}`,
    `NOIV:${excludedNoIv}`,
  ].join("|");

  return {
    drawn: true,
    version: OPTIONS_BARRIER_EVIDENCE_VERSION,
    underlying,
    spot,
    scope,
    expiries,
    callWalls,
    putWalls,
    zeroGammaRoots: roots,
    rootKind: rootKind(roots),
    contributions,
    totals,
    contracts: priced.length,
    excludedNoIv,
    epistemic: { positioning: "OBSERVED", exposure: "INFERRED" },
    assumption:
      "Open interest and volume are observed at the source's clock. Exposure assumes dealers long calls / short puts (calls +, puts −); Black–Scholes at each contract's IV, r = 4%, no dividends. A concentration wall is positioning, not support or resistance; a zero-gamma root is a numerical crossing, not a pin.",
    receipt: receiptStr,
  };
}

/**
 * The combined scenario, in one dimension (assumed-dealer delta change in
 * underlying units). Refuses — returns null — when any input is missing or
 * non-finite rather than treating it as zero.
 */
export function scenarioHedge(vm: OptionsBarrierEvidenceVM, s: Partial<Scenario>): ScenarioResult | null {
  if (!vm.drawn) return null;
  if (![s.dS, s.dVolPoints, s.dDays].every(v => typeof v === "number" && Number.isFinite(v))) return null;
  const scenario = s as Scenario;
  // `|| 0` folds −0 (a negative greek × a zero input) into 0, so no surface prints "−0".
  const fromGamma = vm.totals.gamma * scenario.dS || 0;
  const fromVanna = vm.totals.vannaPerVolPoint * scenario.dVolPoints || 0;
  const fromCharm = vm.totals.charmPerDay * scenario.dDays || 0;
  const total = fromGamma + fromVanna + fromCharm;
  // The book's delta moved by `total`; staying hedged means trading the opposite.
  const hedge = -total;
  return {
    scenario, fromGamma, fromVanna, fromCharm, total,
    hedgeNotional: hedge * vm.spot,
    hedgeSide: Math.abs(hedge) < 1e-9 ? "NONE" : hedge > 0 ? "BUY" : "SELL",
  };
}
