/**
 * THE ORDER-RATE LIMITER AND THE DAILY CAP (Founder list → built 2026-10-10).
 *
 * Per owner, per broker: at most `maxOrdersPerMinute` live sends in a calendar
 * minute and `maxOrdersPerDay` in an Eastern-time day, both from the
 * server-held limits record. Unset → refused (preflight already says so).
 *
 * WHERE IT SITS in both submit doors:
 *   1. `checkOrderRate` — read only — right after the gate (preflight) passes and
 *      BEFORE the first broker call: an exhausted budget refuses with nothing
 *      sent to the broker.
 *   2. `reserveOrderSend` — immediately before the one call that places the
 *      order, after every other check (account, dry run / preview) passed. It
 *      re-reads, refuses if the budget ran out meanwhile, and records the send.
 *      If the count cannot be written, the order is NOT sent (fail closed).
 * Only a send that reaches the broker's place call is counted; cancels never.
 * Arming and the confirm press are untouched.
 *
 * Storage: the Worker's existing KV (the order ledger's namespace). KV is not
 * transactional, so two presses in the same instant could both pass — the
 * minute cap is a guard against a runaway loop and a long day, not a lock.
 */
import type { ServerOrderLimits } from "./liveOrderPreflight";

export type RateBroker = "tastytrade" | "webull";
export interface RateKv {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

const SAFE = /^[A-Za-z0-9_-]{1,96}$/;

/** The Eastern-time calendar date (YYYY-MM-DD) and the ms at which it ends. */
export function etDay(nowMs: number): { readonly date: string; readonly endsAtMs: number } {
  const parts = (ms: number) => {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(ms));
    const g = (t: string) => Number(p.find(x => x.type === t)?.value);
    return { y: g("year"), mo: g("month"), d: g("day"), h: g("hour"), mi: g("minute"), s: g("second") };
  };
  const now = parts(nowMs);
  const date = `${now.y}-${String(now.mo).padStart(2, "0")}-${String(now.d).padStart(2, "0")}`;
  // Seconds left until midnight ET, from the wall clock (DST days are 23 or 25 hours; the wall clock is right on both).
  const msIntoDay = ((now.h * 60 + now.mi) * 60 + now.s) * 1000 + (nowMs % 1000);
  let endsAtMs = nowMs - msIntoDay + 24 * 3_600_000;
  // Correct a DST-change day: step until the ET date actually changes.
  for (let i = 0; i < 2; i++) {
    const p = parts(endsAtMs);
    const d2 = `${p.y}-${String(p.mo).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
    if (d2 === date) endsAtMs += (24 - p.h) * 3_600_000 - (p.mi * 60 + p.s) * 1000;
    else if (p.h !== 0 || p.mi !== 0) endsAtMs -= (p.h * 60 + p.mi) * 60_000 + p.s * 1000;
  }
  return { date, endsAtMs };
}

export const orderRateDayKey = (broker: RateBroker, owner: string, date: string) => `order-rate:v1:${broker}:${owner}:day:${date}`;
export const orderRateMinuteKey = (broker: RateBroker, owner: string, minute: number) => `order-rate:v1:${broker}:${owner}:min:${minute}`;

const count = (raw: string | null) => { const n = Number(raw); return Number.isInteger(n) && n >= 0 ? n : 0; };
const clock = (ms: number) => new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(ms));

export interface OrderRateStanding {
  readonly perMinute: number | null;
  readonly perDay: number | null;
  readonly usedThisMinute: number;
  readonly usedToday: number;
  readonly remainingToday: number | null;
  readonly dayResetsAtMs: number;
  readonly minuteResetsAtMs: number;
  readonly etDate: string;
}

export type OrderRateCheck =
  | { readonly ok: true; readonly standing: OrderRateStanding }
  | { readonly ok: false; readonly code: "ORDER_RATE_UNSET" | "OVER_ORDERS_PER_MINUTE" | "OVER_ORDERS_PER_DAY" | "ORDER_RATE_UNREADABLE"; readonly reason: string; readonly standing: OrderRateStanding | null };

/** Read only: how much of this owner's budget on this broker is used, and what is left. */
export async function readOrderRate(kv: RateKv | null, input: { readonly broker: RateBroker; readonly ownerId: string; readonly limits: ServerOrderLimits | null; readonly nowMs: number }): Promise<OrderRateStanding | null> {
  if (!kv || !SAFE.test(input.ownerId)) return null;
  const day = etDay(input.nowMs);
  const minute = Math.floor(input.nowMs / 60_000);
  const [d, m] = await Promise.all([kv.get(orderRateDayKey(input.broker, input.ownerId, day.date)), kv.get(orderRateMinuteKey(input.broker, input.ownerId, minute))]);
  const perDay = input.limits?.maxOrdersPerDay ?? null;
  const usedToday = count(d);
  return {
    perMinute: input.limits?.maxOrdersPerMinute ?? null, perDay, usedThisMinute: count(m), usedToday,
    remainingToday: perDay == null ? null : Math.max(0, perDay - usedToday),
    dayResetsAtMs: day.endsAtMs, minuteResetsAtMs: (minute + 1) * 60_000, etDate: day.date,
  };
}

/** The verdict, in trader words with when it resets. */
export async function checkOrderRate(kv: RateKv | null, input: { readonly broker: RateBroker; readonly ownerId: string; readonly limits: ServerOrderLimits | null; readonly nowMs: number }): Promise<OrderRateCheck> {
  const name = input.broker === "webull" ? "Webull" : "tastytrade";
  if (input.limits?.maxOrdersPerMinute == null || input.limits?.maxOrdersPerDay == null) {
    return { ok: false, code: "ORDER_RATE_UNSET", reason: "Set a maximum number of live orders per minute and per day on the server (Settings › Execution); until then nothing live can be sent.", standing: null };
  }
  let st: OrderRateStanding | null = null;
  try { st = await readOrderRate(kv, input); } catch { st = null; }
  if (!st) return { ok: false, code: "ORDER_RATE_UNREADABLE", reason: "The order count could not be read, so nothing live is sent. Try again in a moment.", standing: null };
  if (st.usedToday >= input.limits.maxOrdersPerDay) {
    return { ok: false, code: "OVER_ORDERS_PER_DAY", reason: `You have sent ${st.usedToday} live ${name} orders today — your daily limit is ${input.limits.maxOrdersPerDay}. It resets at midnight Eastern (${clock(st.dayResetsAtMs)}). Cancelling stays open.`, standing: st };
  }
  if (st.usedThisMinute >= input.limits.maxOrdersPerMinute) {
    return { ok: false, code: "OVER_ORDERS_PER_MINUTE", reason: `You have sent ${st.usedThisMinute} live ${name} orders this minute — your limit is ${input.limits.maxOrdersPerMinute} a minute. Try again at ${clock(st.minuteResetsAtMs)}.`, standing: st };
  }
  return { ok: true, standing: st };
}

/**
 * Immediately before the place call: re-check, then record the send. A count
 * that cannot be written refuses — the order is never sent uncounted.
 */
export async function reserveOrderSend(kv: RateKv | null, input: { readonly broker: RateBroker; readonly ownerId: string; readonly limits: ServerOrderLimits | null; readonly nowMs: number }): Promise<OrderRateCheck> {
  const check = await checkOrderRate(kv, input);
  if (!check.ok) return check;
  const st = check.standing;
  try {
    await kv!.put(orderRateDayKey(input.broker, input.ownerId, st.etDate), String(st.usedToday + 1), { expirationTtl: 3 * 86_400 });
    await kv!.put(orderRateMinuteKey(input.broker, input.ownerId, Math.floor(input.nowMs / 60_000)), String(st.usedThisMinute + 1), { expirationTtl: 120 });
  } catch {
    return { ok: false, code: "ORDER_RATE_UNREADABLE", reason: "The order count could not be recorded, so this order was NOT sent. Try again in a moment.", standing: st };
  }
  return { ok: true, standing: { ...st, usedToday: st.usedToday + 1, usedThisMinute: st.usedThisMinute + 1, remainingToday: st.remainingToday == null ? null : Math.max(0, st.remainingToday - 1) } };
}
