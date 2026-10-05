/**
 * The trader's own calendar day as YYYY-MM-DD — what an <input type="date">
 * shows and what "today" means at his desk.
 *
 * `new Date().toISOString().slice(0, 10)` is the UTC day: from 7 PM CDT a new
 * journal entry was dated tomorrow, and the Journal's "today" session read
 * (shutdown R) emptied mid-evening. Measured on serving 2026-10-03 19:24 CDT:
 * the New Trade form read 2026-10-04.
 */
export function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const ET_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });

/**
 * The US market day (New York) as YYYY-MM-DD — the journal's "today".
 *
 * Founder ruling 2026-10-05 ("use ET time"): the session-scoped reads —
 * shutdown advice (−2R / two losses), the steward verdict, the daily process
 * score, unreviewed closes — and a new entry's default date all key on the
 * New York day, so a trader in Tokyo or London has one day per US session,
 * not one split at their own midnight.
 */
export function marketDayKey(d: Date = new Date()): string {
  return ET_DAY.format(d);
}
