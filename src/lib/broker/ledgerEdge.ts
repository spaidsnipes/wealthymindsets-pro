/**
 * PERSONAL EDGE FROM THE BROKER LEDGER (Garden 18 v2 §38/§39/§53/§59) — PURE.
 *
 * Closed episodes grouped by conditions the broker record itself establishes
 * — time of day, hold time, attempt number that day, days to expiry, call or
 * put, entry order type, whether a bracket was attached — each group with its
 * sample size, wins, losses, net and expectancy, and its difference from the
 * trader's overall expectancy.
 *
 * Evidence law: a group under MIN_SAMPLE trades is INSUFFICIENT EVIDENCE and is
 * shown as such, never ranked; a difference is a CORRELATION across these
 * trades, never a cause. Nothing here names an emotion or a motive — fills
 * cannot establish them (§59).
 */
import type { Episode } from "./webullLedger";

export const MIN_SAMPLE = 20;

export type EvidenceState = "SUPPORTED" | "INSUFFICIENT EVIDENCE";

export interface EdgeBucket {
  readonly key: string;
  readonly n: number;
  readonly wins: number;
  readonly losses: number;
  readonly net: number;
  readonly expectancy: number;
  readonly winRate: number;
  /** Expectancy minus the overall expectancy (same trades universe). */
  readonly vsOverall: number;
  readonly evidence: EvidenceState;
}

export interface EdgeDimension {
  readonly id: string;
  readonly title: string;
  readonly question: string;
  readonly buckets: readonly EdgeBucket[];
}

export interface DailyAttempts {
  readonly days: number;
  /** Days with 1, 2, 3+ closed trades. */
  readonly byCount: readonly { readonly key: string; readonly days: number; readonly net: number }[];
  /** Days with a third or later trade, and what those later trades netted. */
  readonly thirdPlusDays: number;
  readonly thirdPlusTrades: number;
  readonly thirdPlusNet: number;
}

export interface LedgerEdge {
  readonly universe: number;
  readonly overallExpectancy: number;
  readonly dimensions: readonly EdgeDimension[];
  readonly daily: DailyAttempts;
}

const cents = (x: number) => Math.round(x * 100) / 100;

/** New York wall-clock parts of an ISO instant. */
function nyParts(iso: string): { ymd: string; minutes: number; weekday: string } {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" });
  const p = Object.fromEntries(f.formatToParts(new Date(iso)).map(x => [x.type, x.value]));
  return { ymd: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute), weekday: p.weekday };
}

const TIME_BINS: readonly [number, number, string][] = [
  [0, 570, "Pre-market"], [570, 600, "09:30–10:00 ET"], [600, 660, "10:00–11:00 ET"], [660, 780, "11:00–13:00 ET"],
  [780, 900, "13:00–15:00 ET"], [900, 960, "15:00–16:00 ET"], [960, 1440, "After hours"],
];
const timeBin = (m: number) => TIME_BINS.find(([a, b]) => m >= a && m < b)?.[2] ?? "After hours";
const holdBin = (ms: number) => ms < 60_000 ? "< 1 min" : ms < 300_000 ? "1–5 min" : ms < 900_000 ? "5–15 min" : ms < 3_600_000 ? "15–60 min" : ms < 86_400_000 ? "1 h – 1 day" : "> 1 day";
const dteBin = (e: Episode, ymd: string) => {
  const m = /\s(\d{4}-\d{2}-\d{2})\s/.exec(e.instrumentKey);
  if (!m) return "Stock / ETF";
  const d = Math.round((Date.parse(`${m[1]}T00:00:00Z`) - Date.parse(`${ymd}T00:00:00Z`)) / 86_400_000);
  return d <= 0 ? "0DTE" : d <= 2 ? "1–2 DTE" : d <= 7 ? "3–7 DTE" : "> 7 DTE";
};
const rightOf = (e: Episode) => (/\d(C|P)$/.exec(e.instrumentKey)?.[1] === "C" ? "Calls" : /\d(C|P)$/.exec(e.instrumentKey)?.[1] === "P" ? "Puts" : "Shares");

const ORDERS: Readonly<Record<string, readonly string[]>> = {
  time: TIME_BINS.map(b => b[2]),
  hold: ["< 1 min", "1–5 min", "5–15 min", "15–60 min", "1 h – 1 day", "> 1 day"],
  attempt: ["1st trade of the day", "2nd trade of the day", "3rd trade of the day", "4th+ trade of the day"],
  dte: ["0DTE", "1–2 DTE", "3–7 DTE", "> 7 DTE", "Stock / ETF"],
  weekday: ["Mon", "Tue", "Wed", "Thu", "Fri"],
};

export interface EpisodeConditions { readonly time: string; readonly attempt: string; readonly hold: string; readonly dte: string; readonly right: string }

/** The broker-established conditions of every closed episode, by episode id (§82 comparable episodes). */
export function episodeConditions(episodes: readonly Episode[]): Map<string, EpisodeConditions> {
  const closed = episodes.filter(e => e.label === "RECONSTRUCTED" && e.net != null).sort((a, b) => a.openedAt.localeCompare(b.openedAt));
  const perDay = new Map<string, number>();
  const out = new Map<string, EpisodeConditions>();
  for (const e of closed) {
    const p = nyParts(e.openedAt);
    const a = (perDay.get(p.ymd) ?? 0) + 1;
    perDay.set(p.ymd, a);
    out.set(e.id, { time: timeBin(p.minutes), attempt: a >= 4 ? "4th+ trade of the day" : ORDERS.attempt[a - 1], hold: holdBin(e.holdMs ?? 0), dte: dteBin(e, p.ymd), right: rightOf(e) });
  }
  return out;
}

export interface Comparables { readonly n: number; readonly wins: number; readonly net: number; readonly expectancy: number | null; readonly evidence: EvidenceState; readonly conditions: EpisodeConditions }

/** Other closed trades sharing this one's entry window, attempt number, DTE bucket and call/put (not hold — that is the outcome side). */
export function comparablesFor(id: string, episodes: readonly Episode[], conds = episodeConditions(episodes)): Comparables | null {
  const c = conds.get(id);
  if (!c) return null;
  const peers = episodes.filter(e => e.id !== id && e.label === "RECONSTRUCTED" && e.net != null).filter(e => {
    const o = conds.get(e.id);
    return o && o.time === c.time && o.attempt === c.attempt && o.dte === c.dte && o.right === c.right;
  });
  const net = peers.reduce((s, e) => s + e.net!, 0);
  return { n: peers.length, wins: peers.filter(e => e.net! > 0).length, net: cents(net), expectancy: peers.length ? cents(net / peers.length) : null, evidence: peers.length >= MIN_SAMPLE ? "SUPPORTED" : "INSUFFICIENT EVIDENCE", conditions: c };
}

/** The bucket key one episode falls in for a dimension — the same keys computeLedgerEdge groups by (§64 rehearse filter). */
export function episodeBucket(dimId: string, e: Episode, conds: Map<string, EpisodeConditions>): string | null {
  const c = conds.get(e.id);
  if (!c) return null;
  switch (dimId) {
    case "time": return c.time;
    case "attempt": return c.attempt;
    case "hold": return c.hold;
    case "dte": return c.dte;
    case "right": return c.right;
    case "entryType": return (e.entries[0]?.orderType ?? "UNKNOWN").replace("_", " ");
    case "bracket": return e.entries[0]?.comboType === "MASTER" ? "Bracket attached" : "No bracket at entry";
    case "weekday": return nyParts(e.openedAt).weekday;
    default: return null;
  }
}

export function computeLedgerEdge(episodes: readonly Episode[]): LedgerEdge {
  const closed = episodes.filter(e => e.label === "RECONSTRUCTED" && e.net != null).sort((a, b) => a.openedAt.localeCompare(b.openedAt));
  const n = closed.length;
  const overall = n ? closed.reduce((s, e) => s + e.net!, 0) / n : 0;

  // Attempt number: the order of this trade's OPEN among that day's trades (all underlyings, all accounts).
  const attemptOf = new Map<string, number>();
  const perDay = new Map<string, Episode[]>();
  for (const e of closed) {
    const d = nyParts(e.openedAt).ymd;
    (perDay.get(d) ?? perDay.set(d, []).get(d)!).push(e);
  }
  for (const list of perDay.values()) list.forEach((e, i) => attemptOf.set(e.id, i + 1));

  const group = (id: string, title: string, question: string, keyOf: (e: Episode) => string): EdgeDimension => {
    const m = new Map<string, Episode[]>();
    for (const e of closed) { const k = keyOf(e); (m.get(k) ?? m.set(k, []).get(k)!).push(e); }
    const order = ORDERS[id];
    const buckets = [...m.entries()].map(([key, xs]) => {
      const net = xs.reduce((s, e) => s + e.net!, 0);
      const wins = xs.filter(e => e.net! > 0).length, losses = xs.filter(e => e.net! < 0).length;
      const expectancy = net / xs.length;
      return { key, n: xs.length, wins, losses, net: cents(net), expectancy: cents(expectancy), winRate: wins / xs.length, vsOverall: cents(expectancy - overall), evidence: (xs.length >= MIN_SAMPLE ? "SUPPORTED" : "INSUFFICIENT EVIDENCE") as EvidenceState };
    }).sort((a, b) => order ? order.indexOf(a.key) - order.indexOf(b.key) : b.n - a.n);
    return { id, title, question, buckets };
  };

  const dims: EdgeDimension[] = [
    group("time", "Time of entry", "When in the session were trades opened?", e => timeBin(nyParts(e.openedAt).minutes)),
    group("attempt", "Attempt number that day", "Was it the day's first trade, or a later one?", e => { const a = attemptOf.get(e.id) ?? 1; return a >= 4 ? "4th+ trade of the day" : ORDERS.attempt[a - 1]; }),
    group("hold", "Hold time", "How long was the position held?", e => holdBin(e.holdMs ?? 0)),
    group("dte", "Days to expiry at entry", "How close to expiry was the contract?", e => dteBin(e, nyParts(e.openedAt).ymd)),
    group("right", "Calls, puts or shares", "Which way was the trade expressed?", rightOf),
    group("entryType", "Entry order type", "How was the entry filled?", e => (e.entries[0]?.orderType ?? "UNKNOWN").replace("_", " ")),
    group("bracket", "Protection attached at entry", "Did the entry carry a bracket (stop / target) from the start?", e => (e.entries[0]?.comboType === "MASTER" ? "Bracket attached" : "No bracket at entry")),
    group("weekday", "Day of week", "Which weekday was it?", e => nyParts(e.openedAt).weekday),
  ];

  const dayRows = [...perDay.entries()].map(([d, xs]) => ({ d, count: xs.length, net: xs.reduce((s, e) => s + e.net!, 0), later: xs.slice(2) }));
  const byCount = ["1 trade", "2 trades", "3+ trades"].map(key => {
    const rows = dayRows.filter(r => key === "3+ trades" ? r.count >= 3 : r.count === Number(key[0]));
    return { key, days: rows.length, net: cents(rows.reduce((s, r) => s + r.net, 0)) };
  });
  const third = dayRows.filter(r => r.count >= 3);
  return {
    universe: n,
    overallExpectancy: cents(overall),
    dimensions: dims,
    daily: {
      days: dayRows.length,
      byCount,
      thirdPlusDays: third.length,
      thirdPlusTrades: third.reduce((s, r) => s + r.later.length, 0),
      thirdPlusNet: cents(third.reduce((s, r) => s + r.later.reduce((t, e) => t + e.net!, 0), 0)),
    },
  };
}
