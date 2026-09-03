/**
 * selectChannelCoverageHealth — ONE authoritative reduction of channel
 * coverage to a single health verdict.
 *
 * Canon: Visual Systems Execution Canon Asset 10 — a single evidence tally
 * with ONE owner, read by many surfaces. LIVING-PIXEL LAW — "No stale
 * provider state presented as live."
 *
 * Real from-USE defect (2026-09-03), /nectar: two panels on one page reduced
 * the SAME `channels` array with different logic and disagreed.
 *
 *   Vault Ribbon CHANNELS tile : "6 · no gaps recorded"   (resolved/gold tone)
 *   Session Intelligence Strip : "OBSERVING 0 · STALE 6 · GAPS 0"
 *
 * The ribbon only inspected `channels.length` and `gapCount`. It never read
 * `coverageState`, so six dead channels with zero recorded gaps rendered as a
 * verified, gold "no gaps recorded" claim. Gaps and staleness are different
 * failures: a channel that stopped emitting entirely accumulates NO gap count,
 * because there is no later event to reveal the hole. Zero gaps is therefore
 * not evidence of health — it can equally mean nothing arrived at all.
 *
 * Every surface that reports channel health MUST read this selector so the
 * two-writer disagreement cannot reappear.
 *
 * PURE — no I/O, no clock. Never fabricates: an empty channel set degrades to
 * NONE/unknown rather than an implied all-clear.
 */

/** Presentation tone shared with the context-ribbon vocabulary. */
export type CoverageHealthTone = "resolved" | "warn" | "pending" | "unknown";

export type CoverageHealthVerdict =
  | "NONE"
  | "UNAVAILABLE"
  | "STALE"
  | "GAPPED"
  | "PARTIAL"
  | "CONNECTING"
  | "OBSERVING";

/** Minimal shape needed — matches MarketChannelCoverage structurally. */
export interface CoverageHealthInputChannel {
  readonly coverageState: string;
  readonly gapCount: number;
}

export interface ChannelCoverageHealth {
  readonly total: number;
  readonly observing: number;
  readonly stale: number;
  readonly unavailable: number;
  readonly gapped: number;
  readonly connecting: number;
  readonly gaps: number;
  readonly verdict: CoverageHealthVerdict;
  readonly tone: CoverageHealthTone;
  /** Short honest sentence for a ribbon tile's detail line. */
  readonly detail: string;
}

function plural(n: number, one: string, many = `${one}s`): string {
  return n === 1 ? one : many;
}

export function selectChannelCoverageHealth(
  channels: readonly CoverageHealthInputChannel[] | null | undefined,
): ChannelCoverageHealth {
  const list = channels ?? [];
  const total = list.length;

  let observing = 0;
  let stale = 0;
  let unavailable = 0;
  let gapped = 0;
  let connecting = 0;
  let gaps = 0;

  for (const c of list) {
    switch (c.coverageState) {
      case "COLLECTING": observing += 1; break;
      case "STALE": stale += 1; break;
      case "UNAVAILABLE": unavailable += 1; break;
      case "GAPPED": gapped += 1; break;
      case "CONNECTING": connecting += 1; break;
      default: break;
    }
    const g = Number(c.gapCount);
    if (Number.isFinite(g) && g > 0) gaps += g;
  }

  const base = { total, observing, stale, unavailable, gapped, connecting, gaps };

  // Ordered worst-honest-first. A "resolved" tone is reachable ONLY when at
  // least one channel is actively collecting AND nothing is stale, gapped or
  // unavailable.
  if (total === 0) {
    return { ...base, verdict: "NONE", tone: "unknown", detail: "no channel coverage yet" };
  }

  if (unavailable === total) {
    return {
      ...base,
      verdict: "UNAVAILABLE",
      tone: "unknown",
      detail: `all ${total} ${plural(total, "channel")} unavailable`,
    };
  }

  // The defect case: channels exist, none are collecting, some have gone stale.
  // Zero recorded gaps here means "nothing arrived", not "healthy".
  if (observing === 0 && stale > 0) {
    return {
      ...base,
      verdict: "STALE",
      tone: "warn",
      detail: `${stale} stale · none observing`,
    };
  }

  if (gaps > 0 || gapped > 0) {
    const n = gaps > 0 ? gaps : gapped;
    return {
      ...base,
      verdict: "GAPPED",
      tone: "warn",
      detail: `${n} coverage ${plural(n, "gap")}`,
    };
  }

  if (stale > 0 || unavailable > 0) {
    const degraded = stale + unavailable;
    return {
      ...base,
      verdict: "PARTIAL",
      tone: "warn",
      detail: `${observing} observing · ${degraded} degraded`,
    };
  }

  if (observing > 0) {
    return {
      ...base,
      verdict: "OBSERVING",
      tone: "resolved",
      detail: `${observing} observing · no gaps recorded`,
    };
  }

  if (connecting > 0) {
    return {
      ...base,
      verdict: "CONNECTING",
      tone: "pending",
      detail: `${connecting} connecting`,
    };
  }

  // Channels present but in no recognised state — never claim health.
  return {
    ...base,
    verdict: "NONE",
    tone: "unknown",
    detail: "coverage state unrecognised",
  };
}
