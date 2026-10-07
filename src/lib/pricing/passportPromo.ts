/**
 * PASSPORT INTRO OFFER (Founder, 2026-10-06): the first month of Passport is
 * half off until the promotion ends, then the standard price.
 *
 * The end date is configuration, not code: NEXT_PUBLIC_PASSPORT_PROMO_ENDS
 * (ISO date, e.g. "2026-12-31"). Unset → the offer runs "for a limited time"
 * with no invented deadline. On or after the end date the offer disappears
 * by itself. Display only: billing is not connected to WM Pro yet, so this
 * never charges, discounts or grants anything.
 */
export const PASSPORT_STANDARD_MONTHLY = 20;
export const PASSPORT_PROMO_FIRST_MONTH = PASSPORT_STANDARD_MONTHLY / 2;

export type PassportPromo =
  | { readonly active: false }
  | { readonly active: true; readonly firstMonth: number; readonly thenMonthly: number; readonly endsLabel: string };

export function passportPromo(endsIso: string | undefined | null, nowMs: number = Date.now()): PassportPromo {
  const raw = endsIso?.trim();
  if (!raw) {
    return { active: true, firstMonth: PASSPORT_PROMO_FIRST_MONTH, thenMonthly: PASSPORT_STANDARD_MONTHLY, endsLabel: "for a limited time" };
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return { active: false }; // a malformed date never extends an offer
  // The offer runs through the end of the stated day (US Eastern is close
  // enough to end of day UTC+0 that we take the next UTC midnight).
  const endsAt = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 1);
  if (!Number.isFinite(endsAt) || nowMs >= endsAt) return { active: false };
  const label = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  return { active: true, firstMonth: PASSPORT_PROMO_FIRST_MONTH, thenMonthly: PASSPORT_STANDARD_MONTHLY, endsLabel: `through ${label}` };
}

export function passportPromoLine(p: PassportPromo): string | null {
  if (!p.active) return null;
  return `Intro offer: your first month is $${p.firstMonth} (half off), ${p.endsLabel} — then $${p.thenMonthly}/month.`;
}
