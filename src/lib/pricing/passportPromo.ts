/**
 * HOLIDAY SPECIAL (Founder final ruling 2026-10-25; supersedes the open-ended intro offer of 2026-10-06):
 * the first month of WM Pro Premium ($20, the Passport tier) is $10, half off, through December 25, 2026,
 * 11:59 PM CT. Then the standard price. The same holiday special runs on WAVEMOTION Creator.
 *
 * The deadline is code, so the offer disappears by itself: on or after it, passportPromo() is inactive, the
 * pricing card drops the line and checkout stops applying the coupon (passportIntroCoupon). The optional
 * NEXT_PUBLIC_PASSPORT_PROMO_ENDS (ISO date, end of that day in US Central) can only END it earlier, never later.
 * The mechanism is unchanged: the Founder's Stripe coupon WM_STRIPE_COUPON_PASSPORT_INTRO (50% off, once).
 */
export const PASSPORT_STANDARD_MONTHLY = 20;
export const PASSPORT_PROMO_FIRST_MONTH = PASSPORT_STANDARD_MONTHLY / 2;
/** Dec 25 2026 11:59:59 PM CST (UTC−6). */
export const HOLIDAY_ENDS_AT = Date.UTC(2026, 11, 26, 5, 59, 59);
export const HOLIDAY_DEADLINE_LABEL = "December 25, 2026, 11:59 PM CT";

export type PassportPromo =
  | { readonly active: false }
  | { readonly active: true; readonly firstMonth: number; readonly thenMonthly: number; readonly endsLabel: string; readonly endsAt: number };

/** Last millisecond of a calendar day in America/Chicago, as epoch ms. */
function endOfChicagoDay(y: number, m: number, d: number): number {
  const noon = Date.UTC(y, m - 1, d, 12);
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", hourCycle: "h23" }).format(noon));
  const offsetHours = 12 - hour; // 6 in winter (CST), 5 in summer (CDT)
  return Date.UTC(y, m - 1, d + 1, offsetHours) - 1;
}

export function passportPromo(endsIso: string | undefined | null, nowMs: number = Date.now()): PassportPromo {
  let endsAt = HOLIDAY_ENDS_AT, endsLabel = HOLIDAY_DEADLINE_LABEL;
  const raw = endsIso?.trim();
  if (raw) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!m) return { active: false }; // a malformed date never extends an offer
    const configured = endOfChicagoDay(Number(m[1]), Number(m[2]), Number(m[3]));
    if (!Number.isFinite(configured)) return { active: false };
    if (configured < endsAt) {
      endsAt = configured;
      const day = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
      endsLabel = `${day}, 11:59 PM CT`;
    }
  }
  if (!Number.isFinite(nowMs) || nowMs > endsAt) return { active: false };
  return { active: true, firstMonth: PASSPORT_PROMO_FIRST_MONTH, thenMonthly: PASSPORT_STANDARD_MONTHLY, endsLabel, endsAt };
}

export function passportPromoLine(p: PassportPromo): string | null {
  if (!p.active) return null;
  return `Holiday special: your first month of WM Pro Premium is $${p.firstMonth} (half off) when you subscribe by ${p.endsLabel}. Then $${p.thenMonthly}/month until you cancel.`;
}
