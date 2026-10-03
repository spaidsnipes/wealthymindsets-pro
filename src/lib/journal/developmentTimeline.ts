/**
 * TRADER DEVELOPMENT TIMELINE (Garden 18 v2 §41) — PURE.
 *
 * WHO I WAS → WHAT KEPT HAPPENING → WHAT CHANGED → WHAT STILL BREAKS → WHAT MY
 * CURRENT EDGE ACTUALLY IS, assembled only from evidence already computed
 * (months, patterns, edge groups, recent windows). Every line carries its
 * numbers; a chapter with no evidence says so. Not motivation, not a verdict.
 */
import type { LedgerEdge } from "@/lib/broker/ledgerEdge";
import type { Change, MonthBehaviour, WindowStats } from "@/lib/broker/ledgerTimeline";
import type { PatternEvidence } from "./behaviorTags";

export interface Chapter { readonly id: string; readonly title: string; readonly lines: readonly string[] }

const usd = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}$${Math.abs(v).toFixed(2)}`;
const pct = (v: number) => `${Math.round(v * 100)}%`;

export function developmentTimeline(input: {
  readonly months: readonly MonthBehaviour[];
  readonly windows: readonly WindowStats[];
  readonly changes: readonly Change[];
  readonly patterns: readonly PatternEvidence[];
  readonly edge: LedgerEdge;
}): Chapter[] {
  const { months, windows, changes, patterns, edge } = input;
  const first = months.slice(0, 3);
  const whoIWas = first.length
    ? first.map(m => `${m.month}: ${m.trades} trades on ${m.days} days (${m.tradesPerDay}/day), win ${pct(m.winRate)}, ${usd(m.expectancy)} per trade, bracket at entry ${pct(m.bracketShare)}.`)
    : ["No closed trades yet."];

  const supported = patterns.filter(p => p.evidence === "SUPPORTED");
  const kept = supported.length
    ? supported.map(p => `${p.label}: ${p.n} trades (${p.firstSeen.slice(0, 10)} → ${p.lastSeen.slice(0, 10)}), ${usd(p.expectancy)} per trade vs ${p.withoutExpectancy == null ? "—" : usd(p.withoutExpectancy)} without.`)
    : ["No behaviour has reached 20 cases yet."];

  const changed = changes.length ? changes.slice(-5).map(c => `${c.measure}: ${c.before} in ${c.from} → ${c.after} in ${c.month}.`) : ["No large month-to-month shift yet."];

  const breaks = supported.filter(p => p.withoutExpectancy != null && p.expectancy < p.withoutExpectancy && p.recentShare != null && p.earlierShare != null && p.recentShare >= p.earlierShare);
  const stillBreaks = breaks.length
    ? breaks.map(p => `${p.label}: ${pct(p.recentShare!)} of your last 100 trades vs ${pct(p.earlierShare!)} before, ${usd(p.expectancy)} per trade vs ${usd(p.withoutExpectancy!)} without.`)
    : ["No supported costly pattern is as frequent lately as before."];

  const last = windows.find(w => w.label === "Last 100 trades");
  const whole = windows.find(w => w.label === "Whole record");
  const positives = edge.dimensions.flatMap(d => d.buckets.filter(b => b.evidence === "SUPPORTED" && b.expectancy > 0).map(b => `${d.title}: ${b.key} — ${b.n} trades, ${usd(b.expectancy)} per trade.`));
  const edgeNow = [
    last && whole ? `Last ${last.n} trades: win ${last.winRate == null ? "—" : pct(last.winRate)}, ${last.expectancy == null ? "—" : usd(last.expectancy)} per trade (whole record ${whole.expectancy == null ? "—" : usd(whole.expectancy)}).` : "Not enough trades for a recent window.",
    ...(positives.length ? positives : ["No condition with 20+ trades shows a positive result per trade yet — a measured edge has not shown up in these fills."]),
  ];

  return [
    { id: "who", title: "Who I was", lines: whoIWas },
    { id: "kept", title: "What kept happening", lines: kept },
    { id: "changed", title: "What changed", lines: changed },
    { id: "breaks", title: "What still breaks", lines: stillBreaks },
    { id: "edge", title: "What my current edge actually is", lines: edgeNow },
  ];
}
