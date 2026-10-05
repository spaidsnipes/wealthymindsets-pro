/**
 * A clock reading that carries its date when it is not from today
 * (garden pass 2026-10-05, SPOILED_STOCK). A time alone — "3:42 PM" — on a
 * record kept across days reads as this afternoon: last Friday's heat map on
 * Monday morning, last Tuesday's paper fill in "today's" list. The zone is
 * named so the reading is one instant for every reader.
 */
export function dayAwareStamp(ms: number, nowMs: number = Date.now(), withSeconds = false): string {
  const d = new Date(ms);
  const sameDay = d.toDateString() === new Date(nowMs).toDateString();
  return d.toLocaleString("en-US", {
    ...(sameDay ? {} : { month: "short", day: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
    timeZoneName: "short",
  });
}
