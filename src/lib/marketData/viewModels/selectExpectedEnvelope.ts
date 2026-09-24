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
 * PURE. DETERMINISTIC.
 */

import type { LegacyOhlcvTuple } from "../canonicalBar";
import { sessionsByGap } from "./sessionsByGap";

export const EXPECTED_ENVELOPE_VERSION = 1;
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
    sessionStart: null, open: null, upper: null, lower: null, up: null, down: null,
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
  };
}

export default selectExpectedEnvelope;
