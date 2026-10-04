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
