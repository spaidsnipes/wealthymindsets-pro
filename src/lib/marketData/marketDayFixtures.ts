/**
 * ET-ANCHORED CALENDAR DAYS FOR TESTS — the single owner of "what day is it?"
 * in this repo's session fixtures.
 *
 * THE DEFECT these exist to kill:
 *
 *   const SATURDAY = new Date(2026, 8, 5);
 *
 * That is midnight in THE RUNNER'S local zone. Every session selector in this
 * codebase reads `marketWeekdayET` — America/New_York — because a market
 * session is a fact about the exchange, not about the laptop. The two agree in
 * US Central, where these fixtures were written, and disagree in UTC, where CI
 * runs: midnight UTC on Saturday the 5th is 20:00 ET on FRIDAY the 4th.
 *
 * So six test files asserted "Saturday ⇒ CLOSED" and CI, standing in a
 * different timezone, was handed a Friday and correctly answered "SESSION ?".
 * Green on the author's machine, red on main, and the selector innocent both
 * times. A FIXTURE THAT DEPENDS ON WHERE IT IS RUN IS NOT A FIXTURE — it is a
 * second, unowned clock, which is the very multi-truth defect (canon
 * Weakness #1) that the session work was opened to eliminate, hiding in the
 * tests instead of the product.
 *
 * Every day here is anchored at 16:00Z — midday in New York under both EST
 * (UTC-5) and EDT (UTC-4) — so the ET calendar date is unambiguous no matter
 * what TZ the process carries. `marketDayFixtures.test.ts` proves each
 * constant's ET weekday rather than trusting this comment.
 */

/** The ET weekday name of an instant, read the way the selectors read it. */
export function etWeekday(at: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  }).format(at);
}

/**
 * An instant that is unambiguously midday of `isoDate` in New York.
 *
 * Takes the calendar date, NOT an offset, because the intent a fixture wants
 * to express is always "this ET day" and never "this many hours from UTC
 * midnight" — writing the offset by hand is how the original bug got in.
 */
export function etDay(isoDate: `${number}-${number}-${number}`): Date {
  return new Date(`${isoDate}T16:00:00Z`);
}

/** The Saturday the SESSION ? / SESSION CLOSED contradiction was read live. */
export const SATURDAY = etDay("2026-09-05");
export const SUNDAY = etDay("2026-09-06");
export const WEDNESDAY = etDay("2026-09-02");

/**
 * One instant per ET weekday, indexed BY that weekday: `ET_DAY_BY_INDEX[6]` is
 * a Saturday, matching `Date.prototype.getDay()` / `marketWeekdayET` ordering.
 * Callers that loop "for each day of the week" should use this rather than
 * incrementing a date, so the index and the day can never drift apart.
 */
export const ET_DAY_BY_INDEX: readonly Date[] = [
  etDay("2026-09-06"), // 0 Sun
  etDay("2026-09-07"), // 1 Mon
  etDay("2026-09-08"), // 2 Tue
  etDay("2026-09-09"), // 3 Wed
  etDay("2026-09-10"), // 4 Thu
  etDay("2026-09-11"), // 5 Fri
  etDay("2026-09-05"), // 6 Sat
];

/**
 * Seven CONSECUTIVE ET days (Tue 2026-09-01 → Mon 2026-09-07). For coverage
 * assertions of the form "every reachable label across a full week", where
 * what matters is that all seven weekdays occur, not which index each is at.
 */
export const ET_CONSECUTIVE_WEEK: readonly Date[] = [
  etDay("2026-09-01"),
  etDay("2026-09-02"),
  etDay("2026-09-03"),
  etDay("2026-09-04"),
  etDay("2026-09-05"),
  etDay("2026-09-06"),
  etDay("2026-09-07"),
];
