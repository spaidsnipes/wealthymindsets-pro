/**
 * THE MORNING PROTOCOL — one trader's routine, faith words, trigger play and today's plan (Founder brief 2026-10-20:
 * "Personal Performance Protocol" + "A+ Student System"). The founder's configuration is the first one, not a
 * separate product: every member gets the same shape, saved to their own account, seeded from these defaults.
 *
 * Pure: shapes, defaults and sanitisers only. The routes own storage; the room owns display. Nothing here reads the
 * market — the market-data check is the trader's own pass/fail against the chart's badge, and says so.
 */

export const PROTOCOL_VERSION = 1 as const;

export interface MorningProtocol {
  readonly v: typeof PROTOCOL_VERSION;
  /** "HH:MM", 24h, the trader's own clock. */
  readonly wakeTime: string;
  readonly scripture: { readonly ref: string; readonly text: string; readonly version: string };
  readonly reflection: string;
  readonly prayer: string;
  /** The words said in the 10-second interruption. */
  readonly anchor: string;
  /** The thoughts that start the pressure — the trader's own words. */
  readonly triggers: readonly string[];
  readonly watchlist: readonly string[];
  /** The most the trader will lose today, in dollars; null = not set (the checklist says so). */
  readonly dailyRiskUsd: number | null;
  readonly maxTrades: number | null;
  /** The most a single trade may lose, in dollars (the founder's $50, 2026-10-20). null = not set. */
  readonly riskPerTradeUsd: number | null;
}

/** The founder's protocol (2026-10-20). Scripture is the public-domain KJV text. */
export const DEFAULT_PROTOCOL: MorningProtocol = {
  v: PROTOCOL_VERSION,
  wakeTime: "05:00",
  scripture: {
    ref: "Proverbs 16:3",
    text: "Commit thy works unto the LORD, and thy thoughts shall be established.",
    version: "KJV",
  },
  reflection: "My work today is preparation and patience. The result is not mine to force.",
  prayer: "Lord, steady my hands, slow my mind, and let me take only what the evidence gives.",
  anchor: "I don't trade to prove who I am. I trade the evidence in front of me.",
  triggers: [
    "I have to prove I can do it again.",
    "I need to make this money today.",
    "I need to recover that loss.",
    "I cannot miss this setup.",
    "The platform looks wrong, but I want to trade anyway.",
  ],
  watchlist: ["NQ1!", "ES1!"],
  dailyRiskUsd: null,
  maxTrades: null,
  riskPerTradeUsd: 50,
};

/** The day's sequence, in order (brief §1). Ids are stable — saved days refer to them. */
export const DAY_STEPS = [
  { id: "wake", name: "Wake and reset", hint: "Hydration, prayer, bathing, tea or breakfast, preparation." },
  { id: "faith", name: "Scripture and mindset", hint: "Read the passage, the reflection and your anchor." },
  { id: "brief", name: "Market briefing", hint: "Economic releases, news, session, your watchlist." },
  { id: "health", name: "Market-data health check", hint: "Ticks, candles, timestamps and the instrument agree." },
  { id: "topdown", name: "Top-down analysis", hint: "4H → 1H → 15M → 5M → 1M → 15s." },
  { id: "plan", name: "Trade plan", hint: "Regime, direction, structure, location, flow, confirmation, invalidation, R." },
  { id: "ready", name: "Mental readiness", hint: "Pressure, urgency, revenge, FOMO — and the risk limit." },
  { id: "execute", name: "Execution and review", hint: "Trade the plan or wait; journal what happened." },
  { id: "student", name: "Student of the Game", hint: "One lesson reviewed, one skill practised." },
] as const;
export type DayStepId = (typeof DAY_STEPS)[number]["id"];

export const TOP_DOWN_TFS = ["4h", "1h", "15m", "5m", "1m", "15s"] as const;

export const READINESS_CHECKS = [
  { id: "prove", q: "Am I trying to prove myself today?" },
  { id: "urgency", q: "Do I feel I must trade soon?" },
  { id: "revenge", q: "Am I trying to win back a loss?" },
  { id: "fomo", q: "Am I afraid of missing a move?" },
] as const;

/** How I am — yes is good. Missing one is information, not failure. */
export const READY_STATES = [
  { id: "calm", q: "Calm" }, { id: "focused", q: "Focused" }, { id: "patient", q: "Patient" },
  { id: "alert", q: "Alert" }, { id: "standAside", q: "Willing to stand aside" },
] as const;

/** The clean-runway test for a continuation entry (the "missed the bus" insight) — evidence, not permission to chase. */
export const RUNWAY_CHECKS = [
  { id: "direction", q: "Direction is established by evidence" },
  { id: "runway", q: "Clean runway to the next opposing structure" },
  { id: "trigger", q: "A real trigger — a tested pause, pullback or retest, not just a fast candle" },
  { id: "invalidation", q: "The structural invalidation is clear" },
  { id: "size", q: "Size keeps the loss inside my per-trade limit" },
  { id: "worth", q: "The remaining target still justifies the risk" },
  { id: "fresh", q: "Not already extended, not invalidated" },
] as const;

export interface DayRecord {
  readonly date: string;
  readonly done: readonly DayStepId[];
  readonly tfDone: readonly string[];
  /** The trader's own pass/fail against the chart's feed badge. FAIL blocks today's trading in this room's words. */
  readonly health: "PASS" | "FAIL" | null;
  readonly plan: {
    readonly regime: string; readonly direction: string; readonly structure: string; readonly location: string;
    readonly orderFlow: string; readonly confirmation: string; readonly invalidation: string; readonly availableR: string;
    readonly decision: "TRADE" | "WAIT" | "NO_TRADE" | null;
  };
  /** true = "yes, that pressure is here today". */
  readonly readiness: Readonly<Record<string, boolean>>;
  readonly respectRisk: boolean | null;
  /** READY_STATES, true = "yes, I am". */
  readonly states: Readonly<Record<string, boolean>>;
  /** RUNWAY_CHECKS for today's continuation idea, true = holds. */
  readonly runway: Readonly<Record<string, boolean>>;
  readonly lesson: string;
  readonly skill: string;
  /** Process, separately from money: did I follow my rules? */
  readonly followedRules: boolean | null;
  readonly reviewNote: string;
}

export const emptyDay = (date: string): DayRecord => ({
  date, done: [], tfDone: [], health: null,
  plan: { regime: "", direction: "", structure: "", location: "", orderFlow: "", confirmation: "", invalidation: "", availableR: "", decision: null },
  readiness: {}, respectRisk: null, states: {}, runway: {}, lesson: "", skill: "", followedRules: null, reviewNote: "",
});

export interface TriggerEntry {
  readonly at: number;
  readonly trigger: string;
  /** 1–10. */
  readonly intensity: number;
  readonly action: string;
  readonly interrupted: boolean;
  readonly followedRules: boolean;
}

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const strs = (v: unknown, maxItems: number, maxLen: number): string[] =>
  Array.isArray(v) ? v.map(x => str(x, maxLen)).filter(Boolean).slice(0, maxItems) : [];
const numOrNull = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : null;
const boolOrNull = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);

/** Anything from the wire becomes a valid protocol; missing fields take the defaults. */
export function sanitizeProtocol(raw: unknown): MorningProtocol {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const s = (r.scripture && typeof r.scripture === "object" ? r.scripture : {}) as Record<string, unknown>;
  const wake = str(r.wakeTime, 5);
  const triggers = strs(r.triggers, 12, 160);
  const watch = strs(r.watchlist, 12, 16).map(x => x.toUpperCase()).filter(x => /^[A-Z0-9!./=_-]{1,16}$/.test(x));
  return {
    v: PROTOCOL_VERSION,
    wakeTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(wake) ? wake : DEFAULT_PROTOCOL.wakeTime,
    scripture: {
      ref: str(s.ref, 80) || DEFAULT_PROTOCOL.scripture.ref,
      text: str(s.text, 1200) || DEFAULT_PROTOCOL.scripture.text,
      version: str(s.version, 24) || DEFAULT_PROTOCOL.scripture.version,
    },
    reflection: typeof r.reflection === "string" ? str(r.reflection, 600) : DEFAULT_PROTOCOL.reflection,
    prayer: typeof r.prayer === "string" ? str(r.prayer, 600) : DEFAULT_PROTOCOL.prayer,
    anchor: str(r.anchor, 200) || DEFAULT_PROTOCOL.anchor,
    triggers: triggers.length ? triggers : DEFAULT_PROTOCOL.triggers,
    watchlist: watch.length ? watch : DEFAULT_PROTOCOL.watchlist,
    dailyRiskUsd: numOrNull(r.dailyRiskUsd, 1, 10_000_000),
    maxTrades: numOrNull(r.maxTrades, 1, 500),
    riskPerTradeUsd: r.riskPerTradeUsd === undefined ? DEFAULT_PROTOCOL.riskPerTradeUsd : numOrNull(r.riskPerTradeUsd, 1, 1_000_000),
  };
}

const STEP_IDS = new Set<string>(DAY_STEPS.map(s => s.id));
const DECISIONS = new Set(["TRADE", "WAIT", "NO_TRADE"]);

export function sanitizeDay(raw: unknown, date: string): DayRecord {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const p = (r.plan && typeof r.plan === "object" ? r.plan : {}) as Record<string, unknown>;
  const rd = (r.readiness && typeof r.readiness === "object" ? r.readiness : {}) as Record<string, unknown>;
  const readiness: Record<string, boolean> = {};
  for (const c of READINESS_CHECKS) if (typeof rd[c.id] === "boolean") readiness[c.id] = rd[c.id] as boolean;
  const pick = (src: unknown, ids: readonly { id: string }[]) => {
    const o = (src && typeof src === "object" ? src : {}) as Record<string, unknown>;
    const out: Record<string, boolean> = {};
    for (const c of ids) if (typeof o[c.id] === "boolean") out[c.id] = o[c.id] as boolean;
    return out;
  };
  return {
    date,
    done: strs(r.done, 20, 16).filter(x => STEP_IDS.has(x)) as DayStepId[],
    tfDone: strs(r.tfDone, 10, 6).filter(x => (TOP_DOWN_TFS as readonly string[]).includes(x)),
    health: r.health === "PASS" || r.health === "FAIL" ? r.health : null,
    plan: {
      regime: str(p.regime, 200), direction: str(p.direction, 200), structure: str(p.structure, 300),
      location: str(p.location, 300), orderFlow: str(p.orderFlow, 300), confirmation: str(p.confirmation, 300),
      invalidation: str(p.invalidation, 300), availableR: str(p.availableR, 40),
      decision: DECISIONS.has(p.decision as string) ? (p.decision as DayRecord["plan"]["decision"]) : null,
    },
    readiness,
    respectRisk: boolOrNull(r.respectRisk),
    states: pick(r.states, READY_STATES),
    runway: pick(r.runway, RUNWAY_CHECKS),
    lesson: str(r.lesson, 600),
    skill: str(r.skill, 300),
    followedRules: boolOrNull(r.followedRules),
    reviewNote: str(r.reviewNote, 1200),
  };
}

export function sanitizeTrigger(raw: unknown, nowMs: number): TriggerEntry | null {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const trigger = str(r.trigger, 200);
  const intensity = typeof r.intensity === "number" ? Math.round(r.intensity) : NaN;
  if (!trigger || !(intensity >= 1 && intensity <= 10)) return null;
  return {
    at: nowMs,
    trigger,
    intensity,
    action: str(r.action, 400),
    interrupted: r.interrupted === true,
    followedRules: r.followedRules === true,
  };
}

/** The trading date the routine belongs to, on the New York calendar (the session the trader prepares for). */
export function protocolDate(nowMs: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(nowMs));
}

/** Minutes from now until the New York cash open (09:30 ET); negative once it has passed today. */
export function minutesToNyOpen(nowMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(nowMs));
  const h = Number(parts.find(p => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find(p => p.type === "minute")?.value ?? 0);
  return 9 * 60 + 30 - (h * 60 + m);
}

/**
 * Running behind? The steps done against the time used since the wake target, toward the open. A late start never
 * shortens the list — it only says so (brief: "never compensate for a late start by skipping risk checks").
 */
export function prepPace(input: { readonly wakeMinutesLocal: number; readonly nowMinutesLocal: number; readonly minutesToOpen: number; readonly stepsDone: number; readonly stepsTotal: number }): "NOT_STARTED" | "ON_PACE" | "BEHIND" | "OPEN" {
  if (input.minutesToOpen <= 0) return "OPEN";
  const sinceWake = input.nowMinutesLocal - input.wakeMinutesLocal;
  if (sinceWake < 0) return "NOT_STARTED";
  const window = sinceWake + input.minutesToOpen;
  const expected = window > 0 ? (sinceWake / window) * input.stepsTotal : 0;
  return input.stepsDone + 1 < expected ? "BEHIND" : "ON_PACE";
}

/** What the trader's OWN log shows — counts only, never a guess about their mind. */
export function triggerPattern(entries: readonly TriggerEntry[]): { readonly n: number; readonly topTrigger: string | null; readonly topCount: number; readonly interruptedPct: number | null; readonly followedPct: number | null; readonly avgIntensity: number | null } {
  const n = entries.length;
  if (!n) return { n: 0, topTrigger: null, topCount: 0, interruptedPct: null, followedPct: null, avgIntensity: null };
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.trigger, (counts.get(e.trigger) ?? 0) + 1);
  let topTrigger: string | null = null, topCount = 0;
  for (const [t, c] of counts) if (c > topCount) { topTrigger = t; topCount = c; }
  return {
    n,
    topTrigger,
    topCount,
    interruptedPct: Math.round((entries.filter(e => e.interrupted).length / n) * 100),
    followedPct: Math.round((entries.filter(e => e.followedRules).length / n) * 100),
    avgIntensity: Math.round((entries.reduce((s, e) => s + e.intensity, 0) / n) * 10) / 10,
  };
}

/** KV keys — per account; the routes check the id before they are built. */
export const protocolKey = (uid: string) => `prep:protocol:v1:${uid}`;
export const dayKey = (uid: string, date: string) => `prep:day:v1:${uid}:${date}`;
export const triggersKey = (uid: string) => `prep:triggers:v1:${uid}`;
export const SAFE_UID = /^[A-Za-z0-9_-]{3,96}$/;
export const TRIGGER_LOG_CAP = 300;

/**
 * THE DATA-CHECK GATE (brief: "If the data check fails, the trading workflow remains blocked"). Read by the live order
 * route on every send. Only a NEW position is refused — a closing order or a cancel always goes, so a failed check can
 * never trap a position. Unreadable record → no refusal from this gate (the other server limits still hold).
 */
export function dataCheckRefusal(dayJson: string | null, action: string): string | null {
  if (!/to Open$/.test(action)) return null;
  let health: unknown = null;
  try { health = dayJson ? (JSON.parse(dayJson) as { health?: unknown }).health : null; } catch { return null; }
  return health === "FAIL"
    ? "Today's market-data check is marked FAILED in your Morning Command Center. No new position is sent until the chart's feed is resolved and the check is passed. Closing orders and cancels are not blocked."
    : null;
}
