/**
 * THE WAITING TRAY's row words (Founder ruling 2026-11-12: word-only tools ON "with a clean, neatly placed
 * 'waiting…' state — not cluttered"). A tool's silence line ("ANATOMY CARDS · ON · SELECT AN ABSORPTION SHELF…",
 * "RISK ON PRICE · NO POSITION DRAWN") becomes one short row: the tool's name, then what it waits for, in sentence
 * case. The full line stays in Tools › Active.
 */
const ON_WORDS = /^(?:ON|ACTIVE|SILENT|WAITING)$/i;

export function waitingRowWords(line: string): string {
  const parts = line.split("·").map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  const name = parts[0].replace(/\s+/g, " ").toUpperCase();
  const reasons = parts.slice(1).filter(p => !ON_WORDS.test(p));
  let why = (reasons[0] ?? "waiting").replace(/…$/, "").replace(/\s+/g, " ").trim();
  why = why.charAt(0).toUpperCase() + why.slice(1).toLowerCase();
  if (why.length > 44) why = `${why.slice(0, 43).trimEnd()}…`;
  return `${name} — ${why}`;
}
