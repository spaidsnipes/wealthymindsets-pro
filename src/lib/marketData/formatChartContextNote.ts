/**
 * The bracketed chart line appended to the user's turn before it reaches the
 * model in /api/spaidbot.
 *
 * WHY THIS IS A FILE AND NOT THREE LINES IN THE ROUTE (observed 2026-09-05).
 * The route built the note inline:
 *
 *   if (context.changePct !== undefined)
 *     ctxNote += ` (${context.changePct >= 0 ? "+" : ""}${context.changePct.toFixed(2)}%)`;
 *
 * `!== undefined` is the same too-weak guard that produced "REGIME SIDE
 * +0.00% last session" on the visible chip. useWebSocket leaves change and
 * changePct at their initial 0 until a real prior close arrives, so the
 * zero-pair is the absence sentinel; it is very much `!== undefined`. The
 * chain was fully wired:
 *
 *   ChartsDashboard  data-ctx={JSON.stringify({ ... changePct: ticker.changePct })}
 *   SpaidBotButton   JSON.parse(el.dataset.ctx)  ->  POST body.context
 *   /api/spaidbot    "[Current chart: GC1! @ $4,476.60 (+0.00%)]"
 *
 * So on a closed Saturday the assistant was told the market was flat, as fact,
 * in its own context block — while that same route's SYSTEM_PROMPT instructs
 * it "Never invent current prices" and "When live evidence is missing, say
 * exactly what is missing". The model cannot disclose a gap it was never shown.
 *
 * This is worse than the visible chip, not better. A chip sits beside a
 * fidelity badge and a SESSION CLOSED label that a trader can weigh. Prose
 * from an assistant carries authority and arrives with no badge at all.
 *
 * Two properties, both enforced here:
 *   1. A percentage is printed only when selectTickerChangeDisplay — the one
 *      owner of "is this change backed by a real reference close" — says so.
 *   2. Absence is DISCLOSED, not omitted. Saying nothing leaves the model free
 *      to assume the chart is unremarkable; the route already promises to name
 *      what is missing, so the note names it.
 *
 * The route re-derives from the raw numbers rather than trusting a flag in the
 * request body. /api/spaidbot is reachable by any authenticated client, so a
 * hand-crafted POST must not be able to talk the server into printing a change
 * it cannot justify.
 *
 * PURE — no I/O, no clock.
 */

import { selectTickerChangeDisplay } from "./selectTickerChangeDisplay";

export interface ChartContextInput {
  readonly symbol?: unknown;
  readonly price?: unknown;
  readonly change?: unknown;
  readonly changePct?: unknown;
}

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/**
 * Returns the note to append, or "" when there is no symbol to talk about.
 * Never throws on a malformed body — every field is treated as `unknown`.
 */
export function formatChartContextNote(context: ChartContextInput | null | undefined): string {
  if (!context) return "";
  const symbol = typeof context.symbol === "string" ? context.symbol.trim() : "";
  if (!symbol) return "";

  let note = `[Current chart: ${symbol}`;

  const price = num(context.price);
  // > 0, not truthiness: a price of 0 is not a price, and the old `if
  // (context.price)` already skipped it by accident rather than on purpose.
  if (price !== null && price > 0) note += ` @ $${price.toLocaleString("en-US")}`;

  const change = selectTickerChangeDisplay({
    change: num(context.change),
    changePct: num(context.changePct),
  });

  if (change.displayable) {
    const sign = change.changePct >= 0 ? "+" : "";
    note += ` (${sign}${change.changePct.toFixed(2)}%)`;
  } else {
    // Named, not silent. This sentence is the whole point of the file.
    note += ", day change unavailable — do not state or imply a daily move";
  }

  return `\n\n${note}]`;
}
