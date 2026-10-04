/**
 * Minutes in a catalogue duration label — "4h 20m", "4h", "18m" — or null
 * when the label is not one of those shapes. The Academy's time tile used to
 * print a typed "40h+" while its own modules summed to 34h 05m.
 */
export function durationMinutes(label: string): number | null {
  const m = /^\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*$/i.exec(label);
  if (!m || (m[1] == null && m[2] == null)) return null;
  return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
}

/** "34h 05m" from minutes. */
export function formatHoursMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const mm = total % 60;
  return mm ? `${h}h ${String(mm).padStart(2, "0")}m` : `${h}h`;
}

/** Total of the labels that parse; null if none do. */
export function catalogueMinutes(labels: readonly string[]): number | null {
  const parsed = labels.map(durationMinutes).filter((n): n is number => n != null);
  return parsed.length ? parsed.reduce((a, b) => a + b, 0) : null;
}
