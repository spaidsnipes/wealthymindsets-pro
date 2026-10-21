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
}

export const EMPTY_SESSION_PLAN: SessionPlanInputs = {
  symbol: "", stopTicks: null, riskPerTradeCents: null, feesPerContractCents: null,
  dailyLossLimitCents: null, netTodayCents: null, attempts: 1, maxTradesPerDay: null,
};

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
  const verdictLine = verdict === "BREAKS_A_LIMIT"
    ? `This plan breaks ${plural(breaks.length, "limit")} as typed: ${breaks.map(b => b.label.toLowerCase()).join("; ")}. Smaller size, a closer stop on structure, or fewer attempts would change that.`
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

/** Storage (this device only, beside the desk record). Anything malformed reads as nothing. */
export const SESSION_PLAN_STORAGE_KIND = "WM_PROP_SESSION_PLAN" as const;
/** The plan is kept beside the desk's own owner-scoped record. */
export const sessionPlanKeyFor = (deskKey: string): string => `${deskKey}:session-plan`;
export function readStoredSessionPlan(raw: unknown): SessionPlanInputs | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.kind !== SESSION_PLAN_STORAGE_KIND || r.version !== 1 || !r.plan || typeof r.plan !== "object") return null;
  const p = r.plan as Record<string, unknown>;
  const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : null);
  const attempts = SESSION_ATTEMPTS.find(a => a === p.attempts) ?? 1;
  return {
    symbol: typeof p.symbol === "string" ? p.symbol.slice(0, 16) : "",
    stopTicks: int(p.stopTicks), riskPerTradeCents: int(p.riskPerTradeCents), feesPerContractCents: int(p.feesPerContractCents),
    dailyLossLimitCents: int(p.dailyLossLimitCents), netTodayCents: int(p.netTodayCents), attempts, maxTradesPerDay: int(p.maxTradesPerDay),
  };
}

/** The sample desk's plan — SYNTHETIC, no one's account; shown only under the SAMPLE ACCOUNT banner. */
export function sessionSamplePlan(): SessionPlanInputs {
  return { symbol: "MNQ1!", stopTicks: 40, riskPerTradeCents: 15_000, feesPerContractCents: 104, dailyLossLimitCents: 50_000, netTodayCents: 0, attempts: 1, maxTradesPerDay: 2 };
}
