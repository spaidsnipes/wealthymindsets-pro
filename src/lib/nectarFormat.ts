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
