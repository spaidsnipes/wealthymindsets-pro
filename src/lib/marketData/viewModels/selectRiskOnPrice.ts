/**
 * RISK ON PRICE — H-1001 / F17 (price-axis risk brackets) · V13.
 *
 * Sheet H-1001: "Risk is not in a room, it is bracketed on the price axis.
 * Manage prioritizes live-position risk on the book. Not in a risk room. Not
 * by rewriting history." Demolished: the risk page that hides the chart.
 *
 * WHAT IS BRACKETED — the trader's OWN plan, drawn on this chart with
 * Draw › Long / Short Position (entry · target · stop). Nothing else: no
 * broker position is read here, so nothing here is called a fill.
 *
 *   RISK      entry → stop, per unit and as % of entry.
 *   REWARD    entry → target, and R = reward ÷ risk.
 *   LIVE      the chart's last price against the plan, in R, and its
 *             distance to the stop.
 *   ON PRICE  what the bars did SINCE the plan was placed: the first bar
 *             that traded through the entry, then the first that reached
 *             the stop or the target. Both in one bar → AMBIGUOUS_BAR: this
 *             timeframe cannot say which came first, so neither is claimed.
 *
 * NAMED REFUSALS (never estimated): size (the drawing carries none), equity
 * risk (no account is connected to the chart), fill (nothing was executed).
 *
 * PURE. DETERMINISTIC.
 */

export const RISK_ON_PRICE_VERSION = 1;

export interface PositionPlanInput {
  readonly side: "LONG" | "SHORT";
  readonly entry: number;
  readonly target: number | null;
  readonly stop: number | null;
  /** Unix seconds of the entry anchor — where the plan was placed in time. */
  readonly placedAt: number;
}

export interface RiskBar {
  readonly time: number;
  readonly high: number;
  readonly low: number;
}

export type RiskState =
  | "WAITING_FOR_ENTRY"
  | "LIVE_ON_PRICE"
  | "STOP_TOUCHED"
  | "TARGET_TOUCHED"
  | "AMBIGUOUS_BAR";

export interface RiskOnPriceVM {
  readonly version: number;
  readonly drawn: boolean;
  readonly reason: "BRACKETED" | "NO_POSITION_DRAWN" | "NO_STOP_ON_DRAWING" | "STOP_ON_WRONG_SIDE";
  /** Position drawings on this chart; the newest placed one is bracketed. */
  readonly plans: number;
  readonly side: "LONG" | "SHORT" | null;
  readonly entry: number | null;
  readonly stop: number | null;
  readonly target: number | null;
  readonly riskPerUnit: number | null;
  readonly riskPct: number | null;
  readonly rewardPerUnit: number | null;
  readonly rr: number | null;
  readonly live: { readonly price: number; readonly r: number; readonly toStop: number } | null;
  readonly entryAt: number | null;
  readonly stopAt: number | null;
  readonly targetAt: number | null;
  readonly state: RiskState | null;
  readonly refusals: readonly string[];
}

export const RISK_REFUSALS: readonly string[] = [
  "SIZE — the drawing carries no size",
  "EQUITY RISK — no account is connected to this chart",
  "FILL — nothing was executed; this is your plan on price",
];

const touches = (b: RiskBar, level: number) => b.low <= level && level <= b.high;

export function selectRiskOnPrice(
  plans: readonly PositionPlanInput[],
  bars: readonly RiskBar[],
  lastPrice: number | null,
): RiskOnPriceVM {
  const valid = plans.filter(p => Number.isFinite(p.entry) && p.entry > 0 && Number.isFinite(p.placedAt));
  const empty = {
    version: RISK_ON_PRICE_VERSION, drawn: false, plans: valid.length,
    side: null, entry: null, stop: null, target: null, riskPerUnit: null, riskPct: null,
    rewardPerUnit: null, rr: null, live: null, entryAt: null, stopAt: null, targetAt: null,
    state: null, refusals: RISK_REFUSALS,
  } as const;
  if (!valid.length) return { ...empty, reason: "NO_POSITION_DRAWN" };

  // The newest placed plan; on a tie, the one drawn last.
  const plan = valid.reduce((a, b) => (b.placedAt >= a.placedAt ? b : a));
  const base = { ...empty, side: plan.side, entry: plan.entry, target: plan.target, stop: plan.stop };
  if (plan.stop == null || !Number.isFinite(plan.stop)) return { ...base, stop: null, reason: "NO_STOP_ON_DRAWING" };
  const long = plan.side === "LONG";
  if (long ? plan.stop >= plan.entry : plan.stop <= plan.entry) return { ...base, reason: "STOP_ON_WRONG_SIDE" };

  const risk = Math.abs(plan.entry - plan.stop);
  const target = plan.target != null && Number.isFinite(plan.target) ? plan.target : null;
  const reward = target == null ? null : (long ? target - plan.entry : plan.entry - target);
  const rewardOk = reward != null && reward > 0 ? reward : null;

  // What the bars did since the plan was placed.
  const after = [...bars].filter(b => b.time >= plan.placedAt).sort((a, b) => a.time - b.time);
  const entryBar = after.find(b => touches(b, plan.entry)) ?? null;
  let stopAt: number | null = null;
  let targetAt: number | null = null;
  if (entryBar) {
    const since = after.filter(b => b.time >= entryBar.time);
    stopAt = since.find(b => (long ? b.low <= plan.stop! : b.high >= plan.stop!))?.time ?? null;
    targetAt = target == null || rewardOk == null ? null : since.find(b => (long ? b.high >= target : b.low <= target))?.time ?? null;
  }
  const state: RiskState =
    !entryBar ? "WAITING_FOR_ENTRY"
    : stopAt != null && targetAt != null && stopAt === targetAt ? "AMBIGUOUS_BAR"
    : stopAt != null && (targetAt == null || stopAt < targetAt) ? "STOP_TOUCHED"
    : targetAt != null ? "TARGET_TOUCHED"
    : "LIVE_ON_PRICE";

  const live = lastPrice != null && Number.isFinite(lastPrice)
    ? {
        price: lastPrice,
        r: ((long ? lastPrice - plan.entry : plan.entry - lastPrice) / risk),
        toStop: long ? lastPrice - plan.stop : plan.stop - lastPrice,
      }
    : null;

  return {
    ...base,
    drawn: true,
    reason: "BRACKETED",
    target: rewardOk == null ? null : target,
    riskPerUnit: risk,
    riskPct: (risk / plan.entry) * 100,
    rewardPerUnit: rewardOk,
    rr: rewardOk == null ? null : rewardOk / risk,
    live,
    entryAt: entryBar?.time ?? null,
    stopAt,
    targetAt,
    state,
  };
}

/**
 * A chart drawing → a plan, or null. Long / Short Position anchors are
 * [entry, target, stop] (the order Draw places them in).
 */
export function planFromDrawing(d: { readonly tool: string; readonly pts: readonly { readonly price: number; readonly time: number }[] }): PositionPlanInput | null {
  if (d.tool !== "long-position" && d.tool !== "short-position") return null;
  const [e, t, s] = d.pts;
  if (!e) return null;
  return {
    side: d.tool === "long-position" ? "LONG" : "SHORT",
    entry: e.price,
    target: t ? t.price : null,
    stop: s ? s.price : null,
    placedAt: e.time,
  };
}

export default selectRiskOnPrice;
