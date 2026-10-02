/**
 * DAILY STOP / SHUTDOWN REPLAY (Garden 18 v2 §31/§59/§78) — PURE.
 *
 * The founder profile's daily rules — stop at −2R, shut down at +3R — replayed
 * over the broker ledger with a 1R the TRADER states (it is not in any broker
 * record). For each New York trading day, closed trades are walked in close
 * order; a trade OPENED after the day's realised net had already reached −2R
 * (or +3R) is a trade the rule would not have allowed. Broker records can
 * establish that; they cannot establish why, and nothing here says why.
 *
 * Always a CURRENT STRATEGY REPLAY: the rule's effective date is not recorded,
 * so this never grades how the trader traded at the time.
 */
import type { Episode } from "./webullLedger";

export const PROFILE_RULES = {
  id: "founder-profile",
  version: 1,
  recordedAt: "2026-10-02",
  effectiveFrom: null as string | null,
  source: "Garden 18 v2 §78 — Founder profile strategy/risk contract",
  dailyStopR: -2,
  shutdownR: 3,
} as const;

export interface DailyRuleReplay {
  readonly oneR: number;
  readonly days: number;
  readonly stopDays: number;
  readonly afterStopTrades: number;
  readonly afterStopNet: number;
  readonly shutdownDays: number;
  readonly afterShutdownTrades: number;
  readonly afterShutdownNet: number;
}

const nyDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const cents = (x: number) => Math.round(x * 100) / 100;

export function replayDailyRules(episodes: readonly Episode[], oneR: number): DailyRuleReplay | null {
  if (!(oneR > 0)) return null;
  const closed = episodes.filter(e => e.label === "RECONSTRUCTED" && e.net != null && e.closedAt);
  const byDay = new Map<string, Episode[]>();
  for (const e of closed) { const d = nyDay(e.openedAt); (byDay.get(d) ?? byDay.set(d, []).get(d)!).push(e); }
  let stopDays = 0, afterStopTrades = 0, afterStopNet = 0, shutdownDays = 0, afterShutdownTrades = 0, afterShutdownNet = 0;
  for (const list of byDay.values()) {
    // Realised net of the day as of any instant = trades CLOSED by then.
    const closes = [...list].sort((a, b) => a.closedAt!.localeCompare(b.closedAt!));
    const netAt = (iso: string) => closes.filter(c => c.closedAt! <= iso).reduce((s, c) => s + c.net!, 0);
    let stopHit = false, shutHit = false;
    for (const e of [...list].sort((a, b) => a.openedAt.localeCompare(b.openedAt))) {
      const before = netAt(e.openedAt);
      if (before <= PROFILE_RULES.dailyStopR * oneR) { stopHit = true; afterStopTrades++; afterStopNet += e.net!; }
      else if (before >= PROFILE_RULES.shutdownR * oneR) { shutHit = true; afterShutdownTrades++; afterShutdownNet += e.net!; }
    }
    if (stopHit) stopDays++;
    if (shutHit) shutdownDays++;
  }
  return { oneR, days: byDay.size, stopDays, afterStopTrades, afterStopNet: cents(afterStopNet), shutdownDays, afterShutdownTrades, afterShutdownNet: cents(afterShutdownNet) };
}
