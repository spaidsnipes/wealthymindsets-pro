/**
 * EXPECTED ENVELOPE + ANALOGUE SURPRISE — H-801.
 *
 * Child: EXPECTED ENVELOPE (typical reach from the session open) and SURPRISE
 * (how unusual today's reach already is). Parent: F03 Memory / F13 Lenses.
 * Class: LENS on the same camera.
 *
 * "Expected" here is a MEASUREMENT of this chart's own past, never a forecast:
 *
 *   For every COMPLETED session in the loaded bars (the one session splitter,
 *   `sessionsByGap`), take how far price travelled ABOVE its open (high − open)
 *   and BELOW it (open − low). The envelope is today's open + the median up-
 *   reach and − the median down-reach of those sessions. It says where a
 *   typical session of THIS market reached, not where this one will.
 *
 *   SURPRISE is a count, not a probability: of the N prior sessions, how many
 *   reached at least as far as today already has (per side). "1 of 8" means
 *   today is already further than seven of the last eight sessions went.
 *
 * Fewer than MIN_SESSIONS completed sessions → a named refusal. A 24/7 feed
 * with no session gaps is ONE session → refusal (no clock cut is invented).
 *
 * THE ANALOGUE FAN (v2, 2026-09-25 — canon F03 / H-801 "plan of current
 * session candles inside a dashed expected-path envelope"). The same prior
 * sessions, read bar by bar instead of only at their extremes: at every step
 * k bars after the open, each prior session's close − open is one sample, and
 * the fan is the p10 · p25 · p50 · p75 · p90 of those samples laid on TODAY's
 * open. It covers the steps today has already printed (the candles ride
 * inside it) and the steps the prior sessions went on to print after this
 * one (projected right of NOW). A step is fanned only while at least
 * MIN_SESSIONS prior sessions reached it; the fan stops where the sample does.
 *
 *   MARKET SURPRISE — today's newest close outside p10…p90 at its own step,
 *   with the count of prior sessions that stood at least as far there and
 *   the first bar of the run that left the fan (the live event). A count,
 *   not a probability; the fan is what happened before, never a forecast.
 *
 * PURE. DETERMINISTIC.
 */

import type { LegacyOhlcvTuple } from "../canonicalBar";
import { medianInterval, sessionsByGap } from "./sessionsByGap";

export const EXPECTED_ENVELOPE_VERSION = 2;
export const MIN_SESSIONS = 3;
export const MAX_SESSIONS = 10;

/** The canonical bar's own fields — no private bar shape (M8). */
export type EnvelopeBar = Pick<LegacyOhlcvTuple, "time" | "open" | "high" | "low" | "close">;

export interface SideSurprise {
  /** Today's reach from the open on this side, in price. */
  readonly reach: number;
  /** Prior sessions that reached at least this far on this side. */
  readonly matchedBy: number;
  /** Beyond the envelope's edge on this side. */
  readonly outside: boolean;
}

/** The quantiles the fan draws, lowest to highest. */
export const FAN_QUANTILES = [0.1, 0.25, 0.5, 0.75, 0.9] as const;

export interface EnvelopeFanStep {
  /** Bars since the open (0 = the opening bar), on the chart's own bar interval. */
  readonly k: number;
  /** Prior sessions that reached this step — the sample behind this column. */
  readonly n: number;
  /** Today's open + each quantile of the prior sessions' close − open at this step. */
  readonly p10: number;
  readonly p25: number;
  readonly p50: number;
  readonly p75: number;
  readonly p90: number;
}

export interface EnvelopeSurprise {
  readonly side: "ABOVE" | "BELOW";
  /** The live bar's step, time and close. */
  readonly k: number;
  readonly time: number;
  readonly price: number;
  /** The first bar of the run that is still outside on this side — the live event. */
  readonly leftAt: number;
  /** Prior sessions that stood at least this far at this step, of `n`. */
  readonly matchedBy: number;
  readonly n: number;
}

export interface EnvelopeFan {
  readonly stepSeconds: number;
  /** Today's newest bar's step. Steps above it are projected right of NOW. */
  readonly nowK: number;
  readonly steps: readonly EnvelopeFanStep[];
  /** Null while the newest close rides inside the fan, or its step is past the sample. */
  readonly surprise: EnvelopeSurprise | null;
}

export interface ExpectedEnvelopeVM {
  readonly version: number;
  readonly drawn: boolean;
  readonly reason: "DRAWN" | "TOO_FEW_SESSIONS";
  readonly sessions: number;
  readonly sessionStart: number | null;
  readonly open: number | null;
  readonly upper: number | null;
  readonly lower: number | null;
  readonly up: SideSurprise | null;
  readonly down: SideSurprise | null;
  /** The analogue fan, or null when the prior sessions give fewer than two steps. */
  readonly fan: EnvelopeFan | null;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

export function selectExpectedEnvelope(input: readonly EnvelopeBar[] | null | undefined): ExpectedEnvelopeVM {
  const bars = [...(input ?? [])]
    .filter(b => [b.time, b.open, b.high, b.low, b.close].every(Number.isFinite))
    .sort((a, b) => a.time - b.time);
  const idx = sessionsByGap(bars.map(b => b.time));
  const groups = new Map<number, EnvelopeBar[]>();
  bars.forEach((b, i) => { const g = groups.get(idx[i]) ?? []; g.push(b); groups.set(idx[i], g); });
  const ordered = [...groups.keys()].sort((a, b) => a - b).map(k => groups.get(k)!);
  const today = ordered.at(-1) ?? null;
  const prior = ordered.slice(0, -1).slice(-MAX_SESSIONS);
  const none: ExpectedEnvelopeVM = {
    version: EXPECTED_ENVELOPE_VERSION, drawn: false, reason: "TOO_FEW_SESSIONS", sessions: prior.length,
    sessionStart: null, open: null, upper: null, lower: null, up: null, down: null, fan: null,
  };
  if (!today || prior.length < MIN_SESSIONS) return none;

  const ups = prior.map(s => Math.max(...s.map(b => b.high)) - s[0].open);
  const downs = prior.map(s => s[0].open - Math.min(...s.map(b => b.low)));
  const open = today[0].open;
  const upper = open + median(ups);
  const lower = open - median(downs);
  const upReach = Math.max(0, Math.max(...today.map(b => b.high)) - open);
  const downReach = Math.max(0, open - Math.min(...today.map(b => b.low)));
  return {
    version: EXPECTED_ENVELOPE_VERSION,
    drawn: true,
    reason: "DRAWN",
    sessions: prior.length,
    sessionStart: today[0].time,
    open,
    upper,
    lower,
    up: { reach: upReach, matchedBy: ups.filter(u => u >= upReach).length, outside: open + upReach > upper },
    down: { reach: downReach, matchedBy: downs.filter(d => d >= downReach).length, outside: open - downReach < lower },
    fan: analogueFan(prior, today, medianInterval(bars.map(b => b.time))),
  };
}

/** Nearest-rank quantile of an ascending list. */
const quantile = (asc: readonly number[], q: number) =>
  asc[Math.min(asc.length - 1, Math.max(0, Math.round(q * (asc.length - 1))))];

/**
 * One session's close − open at every step from its open to its last bar. A
 * step the session has no bar for (a halt, a missing print) carries the last
 * close forward — the session stood there; nothing is interpolated.
 */
function pathFromOpen(s: readonly EnvelopeBar[], step: number): number[] {
  const t0 = s[0].time, o = s[0].open;
  const at = new Map<number, number>();
  for (const b of s) at.set(Math.round((b.time - t0) / step), b.close - o);
  const lastK = Math.max(...Array.from(at.keys()));
  const out: number[] = [];
  let cur = 0;
  for (let k = 0; k <= lastK; k++) {
    const v = at.get(k);
    if (v != null) cur = v;
    out.push(cur);
  }
  return out;
}

function analogueFan(prior: readonly EnvelopeBar[][], today: readonly EnvelopeBar[], step: number): EnvelopeFan | null {
  if (!(step > 0) || today.length === 0) return null;
  const paths = prior.map(s => pathFromOpen(s, step));
  const open = today[0].open;
  const steps: EnvelopeFanStep[] = [];
  for (let k = 0; ; k++) {
    const vals = paths.filter(p => k < p.length).map(p => p[k]).sort((a, b) => a - b);
    // A path covers every step up to its own last bar, so the sample only
    // shrinks as k grows: once it is too thin, every later step is too.
    if (vals.length < MIN_SESSIONS) break;
    const [p10, p25, p50, p75, p90] = FAN_QUANTILES.map(q => open + quantile(vals, q));
    steps.push({ k, n: vals.length, p10, p25, p50, p75, p90 });
  }
  if (steps.length < 2) return null;

  const todayPath = pathFromOpen(today, step);
  const nowK = todayPath.length - 1;
  const last = today[today.length - 1];
  let surprise: EnvelopeSurprise | null = null;
  const col = steps[nowK];
  if (col) {
    const side = last.close > col.p90 ? "ABOVE" : last.close < col.p10 ? "BELOW" : null;
    if (side) {
      const move = last.close - open;
      const matchedBy = paths.filter(p => nowK < p.length && (side === "ABOVE" ? p[nowK] >= move : p[nowK] <= move)).length;
      // Walk back through today's bars while each one closed outside on the
      // same side at its own step: the first of that run is when it left.
      let leftAt = last.time;
      for (let i = today.length - 1; i >= 0; i--) {
        const b = today[i];
        const c = steps[Math.round((b.time - today[0].time) / step)];
        if (!c || !(side === "ABOVE" ? b.close > c.p90 : b.close < c.p10)) break;
        leftAt = b.time;
      }
      surprise = { side, k: nowK, time: last.time, price: last.close, leftAt, matchedBy, n: col.n };
    }
  }
  return { stepSeconds: step, nowK, steps, surprise };
}

export default selectExpectedEnvelope;
