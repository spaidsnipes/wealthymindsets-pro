/**
 * PROP SESSION PLAN — today's risk, sized against the evaluation's own rules (Megazord order §6, 2026-10-20). PURE.
 *
 * The Prop Evaluation desk already reads the ACCOUNT (target, consistency, drawdown headroom). This turns
 * that into the plan for ONE session: how many contracts a chosen risk buys at a stop, what the whole day
 * could cost at 1, 2 or 3 attempts, and whether that fits the daily loss limit and the drawdown headroom.
 *
 * LAWS
 *   · MONEY IS INTEGER CENTS. Per-contract risk is rounded UP to the cent; contracts are rounded DOWN
 *     to a whole contract (calculatePositionSize), so the risk shown is the risk actually carried.
 *   · POINT AND TICK VALUE COME FROM ONE OWNER, instrumentEconomics. An instrument it refuses is not
 *     sized; no multiplier is guessed.
 *   · THE CUSHIONS ARE THE TRADER'S OWN NUMBERS. Drawdown headroom is the desk's reading (UNKNOWN stays
 *     UNKNOWN); the daily loss limit is what the trader types from the firm or from their own rules.
 *   · TOUCHING THE FLOOR IS A BREACH. A loss that would leave exactly zero headroom breaks the rule.
 *   · THE LOSS COUNT IS AN ILLUSTRATION: equal full-stop losses, before slippage and gaps. Not a forecast.
 *   · ATTEMPTS ARE PERMITTED, NOT PRESCRIBED. Fitting three attempts is never a reason to take three.
 *   · UNVERIFIED IN, "CANNOT SAY" OUT. A plan over figures not read back from the firm is never "within
 *     limits"; a limit it breaks as typed is still said.
 *
 * No IO, no clock, no storage.
 */

import { instrumentEconomics } from "@/lib/marketData/contractEconomics";
import { calculatePositionSize } from "@/lib/riskKernel";
import { formatCents, type Cents, type Known } from "./propEvaluation";

export const SESSION_ATTEMPTS = [1, 2, 3] as const;
export type SessionAttempts = (typeof SESSION_ATTEMPTS)[number];
export const SESSION_ATTEMPTS_LABEL: Readonly<Record<SessionAttempts, string>> = {
  1: "One and done",
  2: "Two attempts",
  3: "Three attempts",
};
export const SESSION_ILLUSTRATION_LABEL = "ILLUSTRATION — equal full-stop losses, before slippage and gaps. Not a forecast.";
export const SESSION_ATTEMPTS_LINE = "The arithmetic permits these attempts. It is not a reason to take them.";

export interface SessionPlanInputs {
  /** The instrument, as the chart names it (MNQ1!, /MES, ES=F …). */
  readonly symbol: string;
  /** Whole ticks from entry to stop. */
  readonly stopTicks: number | null;
  /** The most the trader chooses to lose on one trade at the stop, fees included. */
  readonly riskPerTradeCents: Cents | null;
  /** Round-trip commissions and fees for ONE contract. */
  readonly feesPerContractCents: Cents | null;
  /** The daily loss limit, as a positive amount (the firm's, or the trader's own if tighter). */
  readonly dailyLossLimitCents: Cents | null;
  /** Today's realized result so far, signed (a loss is negative). */
  readonly netTodayCents: Cents | null;
  readonly attempts: SessionAttempts;
  /** The trader's own maximum trades for the day, if they keep one. */
  readonly maxTradesPerDay: number | null;
  /** The setup the trader is waiting for, in their own words (Megazord §6 premarket: setup → invalidation → size). */
  readonly setup: string;
  /** Where that idea is wrong — the invalidation, in their own words. */
  readonly invalidation: string;
}

export const EMPTY_SESSION_PLAN: SessionPlanInputs = {
  symbol: "", stopTicks: null, riskPerTradeCents: null, feesPerContractCents: null,
  dailyLossLimitCents: null, netTodayCents: null, attempts: 1, maxTradesPerDay: null, setup: "", invalidation: "",
};
/** The longest setup or invalidation kept, in characters. */
export const SESSION_TEXT_MAX = 140;

/** What the desk already knows about the account. */
export interface SessionAccountContext {
  readonly drawdownHeadroomCents: Known<Cents>;
  readonly contractLimit: number | null;
  readonly verified: boolean;
}

export type CheckState = "OK" | "BREAKS" | "CANNOT_SAY";
export interface SessionCheck {
  readonly id: "daily-open" | "trade-daily" | "day-daily" | "trade-drawdown" | "day-drawdown" | "trades-max";
  readonly label: string;
  readonly state: CheckState;
  readonly words: string;
}

export type SessionVerdict = "WITHIN_LIMITS" | "BREAKS_A_LIMIT" | "CANNOT_SAY";

export type SessionPlan =
  | { readonly status: "NOT_SIZED"; readonly why: string }
  | {
      readonly status: "SIZED";
      readonly root: string;
      readonly tickValue: number;
      /** Stop distance × tick value, rounded up to the cent, plus fees: one contract's loss at the stop. */
      readonly perContractRiskCents: Cents;
      readonly contracts: number;
      /** True when the contract limit, not the chosen risk, set the size. */
      readonly cappedByContractLimit: boolean;
      /** contracts × per-contract risk — what one trade actually carries. */
      readonly tradeRiskCents: Cents;
      /** The chosen risk not used because contracts are whole. */
      readonly unusedRiskCents: Cents;
      readonly attempts: SessionAttempts;
      /** tradeRisk × attempts — the most the day can cost if every attempt stops out. */
      readonly dayExposureCents: Cents;
      readonly dailyRemainingCents: Known<Cents>;
      readonly drawdownHeadroomCents: Known<Cents>;
      /** Equal full-stop losses before the daily limit / the drawdown floor is reached. ILLUSTRATION. */
      readonly lossesToDailyLimit: Known<number>;
      readonly lossesToDrawdownFloor: Known<number>;
      readonly checks: readonly SessionCheck[];
      readonly verdict: SessionVerdict;
      readonly verdictLine: string;
    };

const isWhole = (n: number | null): n is number => n !== null && Number.isInteger(n) && n > 0;
const isCents = (c: Cents | null): c is Cents => c !== null && Number.isInteger(c);
const unknown = <T,>(why: string): Known<T> => ({ known: false, why });
const known = <T,>(value: T): Known<T> => ({ known: true, value });
const DAILY_POINTER = "no daily loss limit entered";
const HEADROOM_POINTER = "drawdown headroom is not known (see the account above)";
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function readSessionPlan(x: SessionPlanInputs, account: SessionAccountContext): SessionPlan {
  const symbol = x.symbol.trim();
  if (!symbol) return { status: "NOT_SIZED", why: "Enter the instrument you plan to trade." };
  const econ = instrumentEconomics(symbol, null);
  if (econ.status !== "PRICED") return { status: "NOT_SIZED", why: `WM cannot size ${symbol}: ${econ.reason}.` };
  if (econ.unit !== "contract" || econ.tickSize === null || econ.tickValue === null) {
    return { status: "NOT_SIZED", why: `This plan sizes futures contracts; ${econ.root} is priced per ${econ.unit}.` };
  }
  if (!isWhole(x.stopTicks)) return { status: "NOT_SIZED", why: "Enter the stop distance in whole ticks." };
  if (!isCents(x.riskPerTradeCents) || x.riskPerTradeCents <= 0) return { status: "NOT_SIZED", why: "Enter the most you choose to risk on one trade." };
  const fees = isCents(x.feesPerContractCents) && x.feesPerContractCents >= 0 ? x.feesPerContractCents : null;
  if (fees === null) return { status: "NOT_SIZED", why: "Enter round-trip fees per contract (0 if you have none)." };

  const perContractRiskCents = Math.ceil(x.stopTicks * econ.tickValue * 100 - 1e-9) + fees;
  const size = calculatePositionSize({
    accountRiskBudget: x.riskPerTradeCents,
    riskPerUnit: perContractRiskCents,
    quantityStep: 1,
    maxQuantity: account.contractLimit,
  });
  if (size.status !== "AVAILABLE") {
    return { status: "NOT_SIZED", why: `${formatCents(x.riskPerTradeCents)} does not cover one ${econ.root} contract at this stop (${formatCents(perContractRiskCents)} with fees).` };
  }
  const contracts = size.quantity;
  const cappedByContractLimit = account.contractLimit !== null && contracts === account.contractLimit &&
    Math.floor(x.riskPerTradeCents / perContractRiskCents) > account.contractLimit;
  const tradeRiskCents = contracts * perContractRiskCents;
  const dayExposureCents = tradeRiskCents * x.attempts;

  // Today's profit is not added to the daily room: firms differ on that, so the plan keeps the stricter reading.
  const dailyRemainingCents: Known<Cents> = !isCents(x.dailyLossLimitCents) || x.dailyLossLimitCents <= 0
    ? unknown("Enter the daily loss limit")
    : known(x.dailyLossLimitCents - Math.max(0, -(isCents(x.netTodayCents) ? x.netTodayCents : 0)));
  const headroom = account.drawdownHeadroomCents;
  // An unknown room is explained once, on its own figure; the checks and the count point back to it.
  const lossesTo = (room: Known<Cents>, touchBreaks: boolean, pointer: string): Known<number> =>
    !room.known ? unknown(pointer) : known(Math.max(0, Math.floor((room.value - (touchBreaks ? 1 : 0)) / tradeRiskCents)));

  const fit = (id: SessionCheck["id"], label: string, cost: Cents, room: Known<Cents>, strict: boolean, what: string, pointer: string): SessionCheck => {
    if (!room.known) return { id, label, state: "CANNOT_SAY", words: `Cannot say — ${pointer}.` };
    const ok = strict ? cost < room.value : cost <= room.value;
    return {
      id, label, state: ok ? "OK" : "BREAKS",
      words: ok
        ? `${formatCents(cost)} fits inside ${formatCents(room.value)} of ${what}.`
        : `${formatCents(cost)} is more than the ${formatCents(room.value)} of ${what}${strict && cost === room.value ? " (a loss that reaches the floor is a breach)" : ""}.`,
    };
  };

  const checks: SessionCheck[] = [];
  if (dailyRemainingCents.known && dailyRemainingCents.value <= 0) {
    checks.push({ id: "daily-open", label: "Daily loss limit", state: "BREAKS", words: "Today's losses have reached your daily loss limit. Your own rule says the session is over." });
  }
  checks.push(fit("trade-daily", "One trade against today's room", tradeRiskCents, dailyRemainingCents, false, "daily loss room left", DAILY_POINTER));
  checks.push(fit("day-daily", `${SESSION_ATTEMPTS_LABEL[x.attempts]} against today's room`, dayExposureCents, dailyRemainingCents, false, "daily loss room left", DAILY_POINTER));
  checks.push(fit("trade-drawdown", "One trade against the drawdown floor", tradeRiskCents, headroom, true, "drawdown headroom", HEADROOM_POINTER));
  checks.push(fit("day-drawdown", `${SESSION_ATTEMPTS_LABEL[x.attempts]} against the drawdown floor`, dayExposureCents, headroom, true, "drawdown headroom", HEADROOM_POINTER));
  if (x.maxTradesPerDay !== null) {
    const ok = x.attempts <= x.maxTradesPerDay;
    checks.push({ id: "trades-max", label: "Your maximum trades for the day", state: ok ? "OK" : "BREAKS",
      words: ok ? `${plural(x.attempts, "attempt")} within your maximum of ${x.maxTradesPerDay}.` : `${plural(x.attempts, "attempt")} is more than your maximum of ${x.maxTradesPerDay}.` });
  }

  const breaks = checks.filter(c => c.state === "BREAKS");
  const verdict: SessionVerdict = breaks.length ? "BREAKS_A_LIMIT"
    : checks.some(c => c.state === "CANNOT_SAY") || !account.verified ? "CANNOT_SAY" : "WITHIN_LIMITS";
  // The way back depends on what broke: a reached daily limit ends the session; a trade count needs fewer
  // attempts; a money limit needs less risk per trade or fewer attempts.
  const remedy = breaks.some(b => b.id === "daily-open") ? "Your own rule says the session is over."
    : breaks.every(b => b.id === "trades-max") ? "Fewer attempts would change that."
    : "Smaller size, a closer stop on structure, or fewer attempts would change that.";
  const verdictLine = verdict === "BREAKS_A_LIMIT"
    ? `This plan breaks ${plural(breaks.length, "limit")} as typed: ${breaks.map(b => b.label.toLowerCase()).join("; ")}. ${remedy}`
    : verdict === "CANNOT_SAY"
    ? account.verified ? "Cannot say yet — a limit above is not entered." : "Cannot say yet — the account figures are UNVERIFIED. Read them back from the firm's dashboard first."
    : `Within the limits entered: ${plural(contracts, "contract")}, ${formatCents(tradeRiskCents)} a trade, ${formatCents(dayExposureCents)} for the day at most.`;

  return {
    status: "SIZED",
    root: econ.root,
    tickValue: econ.tickValue,
    perContractRiskCents,
    contracts,
    cappedByContractLimit,
    tradeRiskCents,
    unusedRiskCents: size.unusedRiskBudget,
    attempts: x.attempts,
    dayExposureCents,
    dailyRemainingCents,
    drawdownHeadroomCents: headroom,
    lossesToDailyLimit: lossesTo(dailyRemainingCents, false, "not known"),
    lossesToDrawdownFloor: lossesTo(headroom, true, "not known"),
    checks,
    verdict,
    verdictLine,
  };
}

// ── LOCK BEFORE THE SESSION (Megazord §6: "lock plan before outcome") ──────────────────────────────────
// The trader locks the plan before the bell. The locked plan is kept as it was; any later change is still
// allowed (it is the trader's account) but is APPENDED as a dated amendment, never written over the lock.
// Review compares the day with the plan as locked, and sees every change made after it.

export interface SessionPlanAmendment {
  readonly at: number;
  readonly field: keyof SessionPlanInputs;
  readonly from: string;
  readonly to: string;
}
export interface SessionPlanRecord {
  readonly plan: SessionPlanInputs;
  readonly lockedAtMs: number | null;
  /** The plan exactly as it stood when locked. */
  readonly lockedPlan: SessionPlanInputs | null;
  readonly amendments: readonly SessionPlanAmendment[];
}
export const EMPTY_SESSION_RECORD: SessionPlanRecord = { plan: EMPTY_SESSION_PLAN, lockedAtMs: null, lockedPlan: null, amendments: [] };

export const SESSION_FIELD_LABEL: Readonly<Record<keyof SessionPlanInputs, string>> = {
  symbol: "Instrument", stopTicks: "Stop (ticks)", riskPerTradeCents: "Risk per trade", feesPerContractCents: "Fees per contract",
  dailyLossLimitCents: "Daily loss limit", netTodayCents: "Today's result", attempts: "Attempts", maxTradesPerDay: "Maximum trades",
  setup: "Setup", invalidation: "Where it's wrong",
};
const fieldWords = (field: keyof SessionPlanInputs, v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (field === "attempts") return SESSION_ATTEMPTS_LABEL[v as SessionAttempts] ?? String(v);
  if (field.endsWith("Cents")) return formatCents(v as Cents);
  return String(v);
};

export function lockSessionPlan(r: SessionPlanRecord, nowMs: number): SessionPlanRecord {
  return r.lockedAtMs !== null ? r : { ...r, lockedAtMs: nowMs, lockedPlan: r.plan, amendments: [] };
}

/** Edits to the same field this close together are one change (typing "MNQ" is one amendment, not three). */
export const AMEND_COALESCE_MS = 60_000;

/**
 * Edit the plan. Before the lock it is a draft; after the lock every changed field is appended as an amendment.
 * A burst of edits to one field folds into its latest amendment — the first "from", the final "to" — and a
 * burst that ends where it started leaves no amendment. Earlier amendments are never touched.
 */
export function editSessionPlan(r: SessionPlanRecord, patch: Partial<SessionPlanInputs>, nowMs: number): SessionPlanRecord {
  const plan = { ...r.plan, ...patch };
  if (r.lockedAtMs === null) return { ...r, plan };
  // Today's running result is a fact of the day, not a change of plan: it is updated without an amendment.
  const changed = (Object.keys(patch) as (keyof SessionPlanInputs)[]).filter(k => k !== "netTodayCents" && patch[k] !== r.plan[k]);
  const amendments = [...r.amendments];
  for (const field of changed) {
    const last = amendments[amendments.length - 1];
    const to = fieldWords(field, plan[field]);
    if (last && last.field === field && nowMs - last.at <= AMEND_COALESCE_MS) {
      amendments.pop();
      if (last.from !== to) amendments.push({ at: nowMs, field, from: last.from, to });
    } else amendments.push({ at: nowMs, field, from: fieldWords(field, r.plan[field]), to });
  }
  return { ...r, plan, amendments };
}

/** A new day: keep the trader's settings as a draft, clear the lock and its amendments, and zero today's result. */
export function startNewSessionPlan(r: SessionPlanRecord): SessionPlanRecord {
  return { plan: { ...r.plan, netTodayCents: 0 }, lockedAtMs: null, lockedPlan: null, amendments: [] };
}

/** Storage (this device only, beside the desk record). Anything malformed reads as nothing. v1 had no lock. */
export const SESSION_PLAN_STORAGE_KIND = "WM_PROP_SESSION_PLAN" as const;
/** The plan is kept beside the desk's own owner-scoped record. */
export const sessionPlanKeyFor = (deskKey: string): string => `${deskKey}:session-plan`;
function readPlanFields(raw: unknown): SessionPlanInputs | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : null);
  const text = (v: unknown) => (typeof v === "string" ? v.slice(0, SESSION_TEXT_MAX) : "");
  const attempts = SESSION_ATTEMPTS.find(a => a === p.attempts) ?? 1;
  return {
    symbol: typeof p.symbol === "string" ? p.symbol.slice(0, 16) : "",
    stopTicks: int(p.stopTicks), riskPerTradeCents: int(p.riskPerTradeCents), feesPerContractCents: int(p.feesPerContractCents),
    dailyLossLimitCents: int(p.dailyLossLimitCents), netTodayCents: int(p.netTodayCents), attempts, maxTradesPerDay: int(p.maxTradesPerDay),
    setup: text(p.setup), invalidation: text(p.invalidation),
  };
}
export function readStoredSessionRecord(raw: unknown): SessionPlanRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.kind !== SESSION_PLAN_STORAGE_KIND || (r.version !== 1 && r.version !== 2)) return null;
  const plan = readPlanFields(r.plan);
  if (!plan) return null;
  if (r.version === 1) return { ...EMPTY_SESSION_RECORD, plan };
  const lockedAtMs = typeof r.lockedAtMs === "number" && Number.isFinite(r.lockedAtMs) ? r.lockedAtMs : null;
  const lockedPlan = lockedAtMs === null ? null : readPlanFields(r.lockedPlan);
  const amendments = lockedPlan && Array.isArray(r.amendments)
    ? r.amendments.filter((a): a is SessionPlanAmendment => !!a && typeof a.at === "number" && typeof a.field === "string" && a.field in SESSION_FIELD_LABEL && typeof a.from === "string" && typeof a.to === "string").slice(0, 200)
    : [];
  return { plan, lockedAtMs: lockedPlan ? lockedAtMs : null, lockedPlan, amendments };
}
export const storedSessionRecord = (r: SessionPlanRecord) => ({ kind: SESSION_PLAN_STORAGE_KIND, version: 2 as const, ...r });
/** v1 reader kept for callers that only want today's plan. */
export function readStoredSessionPlan(raw: unknown): SessionPlanInputs | null {
  return readStoredSessionRecord(raw)?.plan ?? null;
}

/** The sample desk's plan — SYNTHETIC, no one's account; shown only under the SAMPLE ACCOUNT banner. */
export function sessionSamplePlan(): SessionPlanInputs {
  return { symbol: "MNQ1!", stopTicks: 40, riskPerTradeCents: 15_000, feesPerContractCents: 104, dailyLossLimitCents: 50_000, netTodayCents: 0, attempts: 1, maxTradesPerDay: 2,
    setup: "Opening-range retest after the first 15 minutes", invalidation: "A 5-minute close back inside the range" };
}

// ── AFTER THE SESSION: the plan as locked, beside the day as journaled ─────────────────────────────────
// Read-only. The locked plan is the yardstick (or the draft, said so when nothing was locked). The day is
// the trader's own journal entries for the market day — self-reported unless an entry carries broker
// facts. A difference is described as a difference, never as a verdict on the trader.

export interface JournaledTrade { readonly date: string; readonly pnl: number; readonly dayModel?: string; readonly brokerConfirmed?: boolean }
export type DayDifference = "MORE_TRADES" | "LOSS_ABOVE_PLANNED_RISK" | "DAY_PAST_DAILY_LIMIT";
export interface SessionVsDay {
  readonly basis: "LOCKED" | "DRAFT";
  readonly day: string;
  readonly tradesPlanned: number;
  readonly tradesJournaled: number;
  readonly brokerConfirmed: number;
  readonly dayNetCents: Cents;
  readonly largestLossCents: Cents;
  /** The planned risk per trade, when the compared plan sizes. */
  readonly plannedTradeRiskCents: Cents | null;
  readonly differences: readonly { readonly id: DayDifference; readonly words: string }[];
  readonly line: string;
}

export function readSessionAgainstDay(r: SessionPlanRecord, trades: readonly JournaledTrade[], day: string, account: SessionAccountContext): SessionVsDay {
  const basis = r.lockedPlan ? "LOCKED" : "DRAFT";
  const yard = r.lockedPlan ?? r.plan;
  const sized = readSessionPlan(yard, account);
  const today = trades.filter(t => t.date === day && t.dayModel !== "M0" && Number.isFinite(t.pnl));
  const cents = today.map(t => Math.round(t.pnl * 100));
  const dayNetCents = cents.reduce((a, c) => a + c, 0);
  const largestLossCents = Math.max(0, ...cents.map(c => -c));
  const plannedTradeRiskCents = sized.status === "SIZED" ? sized.tradeRiskCents : null;
  const differences: { id: DayDifference; words: string }[] = [];
  if (today.length > yard.attempts) differences.push({ id: "MORE_TRADES", words: `${today.length} trades journaled against ${plural(yard.attempts, "planned attempt")}.` });
  if (plannedTradeRiskCents !== null && largestLossCents > plannedTradeRiskCents) differences.push({ id: "LOSS_ABOVE_PLANNED_RISK", words: `The largest loss, ${formatCents(largestLossCents)}, was more than the ${formatCents(plannedTradeRiskCents)} planned for one trade.` });
  if (isCents(yard.dailyLossLimitCents) && yard.dailyLossLimitCents > 0 && -dayNetCents > yard.dailyLossLimitCents) differences.push({ id: "DAY_PAST_DAILY_LIMIT", words: `The day's result, ${formatCents(dayNetCents)}, went past the ${formatCents(yard.dailyLossLimitCents)} daily loss limit.` });
  const line = !today.length
    ? `No trades journaled for ${day} yet.`
    : differences.length
    ? `The day differed from the ${basis === "LOCKED" ? "locked" : "draft"} plan in ${plural(differences.length, "way")} — worth a look in Review.`
    : `The day stayed inside the ${basis === "LOCKED" ? "locked" : "draft"} plan.`;
  return { basis, day, tradesPlanned: yard.attempts, tradesJournaled: today.length, brokerConfirmed: today.filter(t => t.brokerConfirmed).length,
    dayNetCents, largestLossCents, plannedTradeRiskCents, differences, line };
}
