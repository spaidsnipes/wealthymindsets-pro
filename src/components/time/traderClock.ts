/**
 * THE TRADER'S CLOCK (sheriff sweep 2026-10-07, F2).
 *
 * One /charts screen printed three clocks: "asOf 13:25:23 ET", "BAR OPENED
 * 12:25 PM CDT" and "asOf 17:25:24Z", and the Big Trades table printed bare UTC
 * ("17:26:32" under TIME (UTC)). RULE: wherever the trader reads a time it is
 * the viewer's local time WITH its zone abbreviation; UTC ("…Z") stays only
 * inside machine receipts (data-* attributes, copied receipts, logs) and where
 * a canon test pins it. PURE apart from the viewer's own zone.
 */
export function traderClock(ms: number | null | undefined, opts: { seconds?: boolean; nowMs?: number } = {}): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  // A time on another day than `nowMs` names its day ("Oct 7, 11:47 AM CDT"):
  // a bare clock from yesterday reads as a clock hours ahead (Sheriff batch 3).
  const dayOf = (x: Date) => x.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
  const prefix = opts.nowMs != null && Number.isFinite(opts.nowMs) && dayOf(d) !== dayOf(new Date(opts.nowMs))
    ? `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ` : "";
  return prefix + d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    ...(opts.seconds === false ? {} : { second: "2-digit" }),
    timeZoneName: "short",
  });
}
