/**
 * QUANTIFY · QUALIFY · SIMPLIFY THE TRADING DAY — after Myron Golden's "Quantum-ply" (Founder's Nov 12 transcripts;
 * principles only, in our own words, credited where taught). Read from HIS OWN journal entries, nothing estimated:
 *   QUANTIFY  the baseline: days traded, trades per day, win rate, average win / loss, net per day, best day.
 *   QUALIFY   the inputs, not the outputs: how many trades had a named setup, a planned risk, and a followed plan —
 *             and what the followed-plan trades made against the broken-rule ones.
 *   SIMPLIFY  the 20%: the fewest setups that made at least 80% of his gross profit, and the setups that lost money.
 * PURE — no IO, no clock, no storage. Money in dollars as the journal stores it.
 */
export interface QuantumTrade {
  readonly date: string;
  readonly pnl: number;
  readonly setup?: string | null;
  readonly processQuality?: string | null;
  readonly plannedRDollars?: number | null;
}

export interface SetupLine { readonly setup: string; readonly trades: number; readonly net: number; readonly winRate: number }

export type QuantumDay =
  | { readonly known: false; readonly why: string }
  | {
      readonly known: true;
      readonly window: { readonly days: number; readonly trades: number; readonly from: string; readonly to: string };
      readonly quantify: { readonly tradesPerDay: number; readonly winRate: number; readonly avgWin: number | null; readonly avgLoss: number | null; readonly netPerDay: number; readonly bestDay: { readonly date: string; readonly net: number } | null; readonly greenDays: number };
      readonly qualify: { readonly withSetup: number; readonly withPlannedRisk: number; readonly followedPlan: number; readonly brokeRules: number; readonly netFollowed: number; readonly netBroke: number };
      readonly simplify: { readonly core: readonly SetupLine[]; readonly coreShare: number; readonly cut: readonly SetupLine[]; readonly unnamedNet: number };
    };

/** The fewest trading days to look back over (his last N days that have trades). */
export const QUANTUM_DAYS = 20;
export const QUANTUM_MIN_TRADES = 5;

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const round2 = (n: number) => Math.round(n * 100) / 100;

export function readQuantumDay(all: readonly QuantumTrade[], days: number = QUANTUM_DAYS): QuantumDay {
  const trades = all.filter(t => finite(t.pnl) && typeof t.date === "string" && t.date.length >= 10);
  const dayKeys = [...new Set(trades.map(t => t.date.slice(0, 10)))].sort().slice(-days);
  const inWin = trades.filter(t => dayKeys.includes(t.date.slice(0, 10)));
  if (inWin.length < QUANTUM_MIN_TRADES) return { known: false, why: `Journal ${QUANTUM_MIN_TRADES} trades or more to see your baseline (you have ${inWin.length}).` };
  const wins = inWin.filter(t => t.pnl > 0), losses = inWin.filter(t => t.pnl < 0);
  const byDay = new Map<string, number>();
  for (const t of inWin) byDay.set(t.date.slice(0, 10), (byDay.get(t.date.slice(0, 10)) ?? 0) + t.pnl);
  const net = inWin.reduce((s, t) => s + t.pnl, 0);
  let best: { date: string; net: number } | null = null;
  for (const [d, n] of byDay) if (!best || n > best.net) best = { date: d, net: round2(n) };
  const named = (t: QuantumTrade) => (t.setup ?? "").trim();
  const followed = inWin.filter(t => t.processQuality === "FOLLOWED_PLAN"), broke = inWin.filter(t => t.processQuality === "BROKE_RULES");
  // SIMPLIFY — per named setup.
  const bySetup = new Map<string, QuantumTrade[]>();
  for (const t of inWin) { const k = named(t); if (!k) continue; const key = k.toUpperCase(); bySetup.set(key, [...(bySetup.get(key) ?? []), t]); }
  const lines: SetupLine[] = [...bySetup].map(([setup, ts]) => ({ setup, trades: ts.length, net: round2(ts.reduce((s, t) => s + t.pnl, 0)), winRate: ts.filter(t => t.pnl > 0).length / ts.length }));
  const earners = lines.filter(l => l.net > 0).sort((a, b) => b.net - a.net);
  const gross = earners.reduce((s, l) => s + l.net, 0);
  const core: SetupLine[] = []; let acc = 0;
  for (const l of earners) { if (gross > 0 && acc / gross >= 0.8) break; core.push(l); acc += l.net; }
  return {
    known: true,
    window: { days: dayKeys.length, trades: inWin.length, from: dayKeys[0], to: dayKeys[dayKeys.length - 1] },
    quantify: {
      tradesPerDay: round2(inWin.length / dayKeys.length),
      winRate: wins.length / inWin.length,
      avgWin: wins.length ? round2(wins.reduce((s, t) => s + t.pnl, 0) / wins.length) : null,
      avgLoss: losses.length ? round2(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : null,
      netPerDay: round2(net / dayKeys.length),
      bestDay: best,
      greenDays: [...byDay.values()].filter(n => n > 0).length,
    },
    qualify: {
      withSetup: inWin.filter(t => named(t)).length / inWin.length,
      withPlannedRisk: inWin.filter(t => finite(t.plannedRDollars) && (t.plannedRDollars as number) > 0).length / inWin.length,
      followedPlan: followed.length / inWin.length,
      brokeRules: broke.length / inWin.length,
      netFollowed: round2(followed.reduce((s, t) => s + t.pnl, 0)),
      netBroke: round2(broke.reduce((s, t) => s + t.pnl, 0)),
    },
    simplify: {
      core, coreShare: gross > 0 ? acc / gross : 0,
      cut: lines.filter(l => l.net < 0).sort((a, b) => a.net - b.net),
      unnamedNet: round2(inWin.filter(t => !named(t)).reduce((s, t) => s + t.pnl, 0)),
    },
  };
}
