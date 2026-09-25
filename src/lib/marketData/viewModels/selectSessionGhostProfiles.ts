/**
 * SESSION GHOST PROFILES — canon plate P-110 (WM_A_P110_LIVING_PROFILE_STACK).
 *
 * The plate draws the live session as one gold silhouette and the sessions
 * before it as GREY silhouettes behind it: memory as a shape, not as a list
 * of numbers. This compiles those shapes.
 *
 * Only bars are available for completed sessions (the tape is session-only),
 * so each bar's volume is spread evenly across its [low, high] — the same
 * bar-distributed approximation the Session VP already uses. The VM says so
 * (`fidelity: "BAR_DISTRIBUTED"`) so no caller can present it as a tape
 * profile. Sessions come from the ONE splitter the profile family shares.
 */
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import { sessionsByGap } from "./sessionsByGap";

export const SESSION_GHOST_VERSION = 1;
export const MAX_GHOST_SESSIONS = 2;
export const GHOST_ROWS = 72;
export const MIN_GHOST_BARS = 12;

export type SessionGhostReason = "DRAWN" | "NO_BARS" | "NO_PRIOR_SESSION";

export interface GhostRow {
  readonly price: number;
  /** Volume share of the session's heaviest row, 0..1. */
  readonly share: number;
}

export interface SessionGhost {
  /** 1 = the session before the current one. */
  readonly sessionsAgo: number;
  readonly rows: readonly GhostRow[];
  readonly poc: number;
  readonly bars: number;
  readonly startTime: number;
  readonly endTime: number;
}

export interface SessionGhostVM {
  readonly version: number;
  readonly drawn: boolean;
  readonly reason: SessionGhostReason;
  readonly fidelity: "BAR_DISTRIBUTED";
  readonly ghosts: readonly SessionGhost[];
}

const none = (reason: Exclude<SessionGhostReason, "DRAWN">): SessionGhostVM => ({
  version: SESSION_GHOST_VERSION, drawn: false, reason, fidelity: "BAR_DISTRIBUTED", ghosts: [],
});

export function selectSessionGhostProfiles(
  bars: readonly LegacyOhlcvTuple[] | null | undefined,
  maxSessions = MAX_GHOST_SESSIONS,
): SessionGhostVM {
  const sorted = [...(bars ?? [])]
    .filter(b => Number.isFinite(b.time) && Number.isFinite(b.high) && Number.isFinite(b.low) && b.high >= b.low)
    .sort((a, b) => a.time - b.time);
  if (sorted.length === 0) return none("NO_BARS");
  const sessionOf = sessionsByGap(sorted.map(b => b.time));
  const current = sessionOf[sessionOf.length - 1];
  if (current === 0) return none("NO_PRIOR_SESSION");

  const ghosts: SessionGhost[] = [];
  for (let ago = 1; ago <= maxSessions && current - ago >= 0; ago++) {
    const sess = sorted.filter((_, i) => sessionOf[i] === current - ago);
    if (sess.length < MIN_GHOST_BARS) continue;
    let lo = Infinity, hi = -Infinity;
    for (const b of sess) { lo = Math.min(lo, b.low); hi = Math.max(hi, b.high); }
    if (!(hi > lo)) continue;
    const step = (hi - lo) / GHOST_ROWS;
    const vol = new Array<number>(GHOST_ROWS).fill(0);
    for (const b of sess) {
      const v = Number.isFinite(b.volume) && b.volume > 0 ? b.volume : 0;
      if (v === 0) continue;
      const i0 = Math.min(GHOST_ROWS - 1, Math.floor((b.low - lo) / step));
      const i1 = Math.min(GHOST_ROWS - 1, Math.floor((b.high - lo) / step));
      const per = v / (i1 - i0 + 1);
      for (let i = i0; i <= i1; i++) vol[i] += per;
    }
    const max = Math.max(...vol);
    if (!(max > 0)) continue;
    const pocIdx = vol.indexOf(max);
    ghosts.push({
      sessionsAgo: ago,
      rows: vol.map((v, i) => ({ price: lo + (i + 0.5) * step, share: v / max })),
      poc: lo + (pocIdx + 0.5) * step,
      bars: sess.length,
      startTime: sess[0].time,
      endTime: sess[sess.length - 1].time,
    });
  }
  if (ghosts.length === 0) return none("NO_PRIOR_SESSION");
  return { version: SESSION_GHOST_VERSION, drawn: true, reason: "DRAWN", fidelity: "BAR_DISTRIBUTED", ghosts };
}
