/**
 * TODAY'S RULE STATE — Personal Edge returned to the Market (Garden 18 v2
 * §68/§70) — PURE.
 *
 * From today's broker episodes only: how many trades, realised net, the last
 * result, and where the profile rules stand (second attempt / no third; −2R
 * stop and +3R shutdown when the trader has stated a 1R). Evidence, not shame:
 * the card answers "what matters right now" and stays silent with no trades.
 */
import type { Episode } from "@/lib/broker/webullLedger";
import { PROFILE_RULES } from "@/lib/broker/dailyRules";

export interface TodayRuleState {
  readonly trades: number;
  readonly open: number;
  readonly net: number;
  readonly lastNet: number | null;
  /** After one trade the next is the second (fresh authorization); after two the next would be a third; three or more is past the rule. */
  readonly attemptState: "NEXT IS THE SECOND" | "NEXT WOULD BE A THIRD" | "PAST THE SECOND";
  readonly stop: "NOT STATED" | "CLEAR" | "REACHED";
  readonly shutdown: "NOT STATED" | "CLEAR" | "REACHED";
  readonly oneR: number | null;
}

export function todayRuleState(todayEpisodes: readonly Episode[], oneR: number | null): TodayRuleState | null {
  const opened = todayEpisodes.filter(e => e.entries.length > 0);
  if (!opened.length) return null;
  const closed = opened.filter(e => e.label === "RECONSTRUCTED" && e.net != null).sort((a, b) => (a.closedAt ?? "").localeCompare(b.closedAt ?? ""));
  const net = Math.round(closed.reduce((s, e) => s + e.net!, 0) * 100) / 100;
  const n = opened.length;
  const r = oneR && oneR > 0 ? oneR : null;
  return {
    trades: n,
    open: opened.filter(e => e.label === "OPEN").length,
    net,
    lastNet: closed.length ? closed[closed.length - 1].net : null,
    attemptState: n >= 3 ? "PAST THE SECOND" : n === 2 ? "NEXT WOULD BE A THIRD" : "NEXT IS THE SECOND",
    stop: r == null ? "NOT STATED" : net <= PROFILE_RULES.dailyStopR * r ? "REACHED" : "CLEAR",
    shutdown: r == null ? "NOT STATED" : net >= PROFILE_RULES.shutdownR * r ? "REACHED" : "CLEAR",
    oneR: r,
  };
}
