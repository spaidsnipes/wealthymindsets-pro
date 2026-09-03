/**
 * nectarFormat — pure formatters used by /nectar and /nectar/[symbol].
 *
 * Extracted out of the page components so tone/format decisions can be
 * unit-tested without a React render harness. Every helper is
 * deterministic — no clock reads except `formatMemoryAge` (takes an
 * explicit `nowSec` parameter to remain pure for tests).
 */

import { WM } from "./design/wmTokens";

export function fmtNum(n: number): string {
  const abs = Math.abs(n);
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(2)}K`;
  return `${sign}${abs.toFixed(2)}`;
}

export function formatMemoryAge(startedAtSec: number, nowSec: number = Math.floor(Date.now() / 1000)): string {
  const secs = Math.max(0, Math.floor(nowSec - startedAtSec));
  if (secs < 60) return `${secs}s memory`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m memory`;
  const hrs = Math.floor(mins / 60);
  const remMin = mins % 60;
  if (hrs < 24) return remMin ? `${hrs}h ${remMin}m memory` : `${hrs}h memory`;
  const days = Math.floor(hrs / 24);
  return `${days}d memory`;
}

export function relTime(t: number, now: number = Date.now()): string {
  const diff = now - t;
  if (diff < 1_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function fidelityToTone(fidelity: string | null): string {
  if (!fidelity) return WM.text.dim;
  const upper = fidelity.toUpperCase();
  if (upper.includes("OBSERVED") || upper.includes("LIVE") || upper.includes("FULL")) return WM.state.ok;
  if (upper.includes("DERIVED") || upper.includes("PARTIAL")) return WM.state.watch;
  if (upper.includes("INFERRED") || upper.includes("STALE") || upper.includes("UNAVAILABLE")) return WM.state.warn;
  return WM.text.muted;
}

export function coverageTone(state: string): string {
  if (state === "LIVE") return WM.state.ok;
  if (state === "CONNECTING" || state === "DEGRADED") return WM.state.watch;
  if (state === "STALE" || state === "UNAVAILABLE") return WM.state.warn;
  return WM.text.muted;
}

export function memoryStateTone(state: string): string {
  if (state === "RETAINED" || state === "SUMMARY_ONLY") return WM.state.ok;
  if (state === "SESSION_ONLY") return WM.state.watch;
  return WM.text.dim;
}

export function persistenceRightTone(right: string): string {
  if (right === "ALLOWED") return WM.state.ok;
  return WM.state.warn;
}

/**
 * Channel liveness presentation for a per-symbol card.
 *
 * `fidelity` (OBSERVED / DERIVED / INFERRED …) describes WHAT KIND of evidence
 * a channel produces. `coverageState` describes WHETHER IT IS STILL FLOWING.
 * They are independent, and only the pair is the truth.
 *
 * Real from-USE defect (2026-09-03): /nectar symbol cards rendered a green
 * "OBSERVED" chip for BTC/ETH while the same page's strip proved
 * CHANNELS OBSERVING 0 / CHANNELS STALE 6. The card surfaced the static
 * fidelity class and never read coverageState, so a dead channel kept its
 * live-looking badge — LIVING-PIXEL LAW: "No stale provider state presented
 * as live."
 *
 * A channel that is not actively COLLECTING may never render in the "ok" tone,
 * no matter how strong its evidence class is.
 */
export interface ChannelLivenessPresentation {
  /** Fidelity label to render (unchanged — the evidence class is still true). */
  readonly fidelity: string | null;
  /** Tone for the fidelity chip, downgraded when coverage is not flowing. */
  readonly tone: string;
  /** True when the channel is no longer collecting. */
  readonly degraded: boolean;
  /** Short badge label when degraded, else null. */
  readonly badge: string | null;
  /** Human explanation for the badge's title attribute. */
  readonly badgeTitle: string | null;
}

export function selectChannelLiveness(
  fidelity: string | null,
  coverageState: string | null | undefined,
): ChannelLivenessPresentation {
  const state = (coverageState ?? "").toUpperCase();

  if (state === "STALE") {
    return {
      fidelity,
      tone: WM.state.warn,
      degraded: true,
      badge: "STALE",
      badgeTitle:
        "This channel stopped emitting. The fidelity class describes the evidence it produced, not current liveness.",
    };
  }

  if (state === "UNAVAILABLE") {
    return {
      fidelity,
      tone: WM.state.warn,
      degraded: true,
      badge: "UNAVAILABLE",
      badgeTitle: "This channel is unavailable in this session.",
    };
  }

  if (state === "CONNECTING") {
    return {
      fidelity,
      tone: WM.state.watch,
      degraded: true,
      badge: "CONNECTING",
      badgeTitle: "This channel has not delivered evidence yet.",
    };
  }

  // COLLECTING / GAPPED / unknown-state: keep the evidence-class tone. GAPPED
  // already surfaces its own "! GAPS n" badge next to this chip.
  return {
    fidelity,
    tone: fidelityToTone(fidelity),
    degraded: false,
    badge: null,
    badgeTitle: null,
  };
}
