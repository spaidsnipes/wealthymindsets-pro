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
  /**
   * The visible chart timeframe (`1m` / `5m` / `15m` / `1H` / `D` …). Optional
   * on the wire because a hand-crafted POST may not carry it, but when the
   * ChartsDashboard is the sender it is always supplied — the whole point of
   * adding it is to end the CROSS_WIRED sentence the model kept receiving.
   *
   * When absent, the note names the absence explicitly rather than silently
   * dropping it. The route already promises to name what is missing; a
   * silently-omitted timeframe teaches the model that "timeframe unspecified"
   * is a normal state to invent one for.
   */
  readonly timeframe?: unknown;
  /**
   * Canonical MarketQualityState — "LIVE" | "DELAYED" | "STALE" | "PARTIAL" |
   * "PROXY" | "REPLAY" | "UNAVAILABLE". Optional on the wire; when absent the
   * note prints "role UNKNOWN" so the model cannot assume streaming truth from
   * silence. The route re-validates against the canonical string set — a
   * hostile client cannot mint a role of its choosing.
   */
  readonly role?: unknown;
  readonly price?: unknown;
  /**
   * WHAT KIND OF PRICE `price` IS — "PRINT" | "BAR_CLOSE". Optional; absent is
   * read as PRINT, which is what every caller meant before this field existed.
   *
   * ── WHY THE MODEL NEEDS THIS AND THE HUMAN ALREADY HAD IT ─────────────
   * `price` used to be fed straight from `state.price.last`, which is null
   * whenever no live trade has printed. On /command-deck that meant the model
   * was told NOTHING about price while the trader was looking at a chart with
   * 120 candles on it — the assistant would answer "I don't have sufficient
   * price data" about a screen that was showing a price. Sending the bar close
   * instead closes that gap, but ONLY if it arrives labelled: an unlabelled
   * 356.58 is precisely how the model learns to quote a close as a live print,
   * which is the failure this whole file was written to prevent.
   *
   * Re-validated against the canonical token set below for the same reason
   * `role` is: this value crosses the wire from a client and is not trusted.
   */
  readonly priceProvenance?: unknown;
  readonly change?: unknown;
  readonly changePct?: unknown;
}

/**
 * Only the canonical role strings survive validation. Anything else — a
 * capitalisation drift, a made-up word, a number — collapses to null and the
 * note prints "role UNKNOWN". The set is duplicated verbatim from
 * MarketQualityState so this file has no import into the market-data layer
 * (kept pure) but a REGRESSION test in spaidbotChartContextTruth pins the two
 * lists to each other so they cannot drift.
 */
const CANONICAL_ROLES = new Set<string>([
  "LIVE", "DELAYED", "STALE", "PARTIAL", "PROXY", "REPLAY", "UNAVAILABLE",
]);

function canonicalRole(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().toUpperCase();
  return CANONICAL_ROLES.has(t) ? t : null;
}

/**
 * Anything that is not the literal string "BAR_CLOSE" is treated as a print.
 * Deliberately fail-LOUD in one direction only: an unrecognised token must
 * never silently downgrade a real print into a hedged one (that would teach
 * the model to distrust live data), and an unrecognised token must never
 * silently upgrade a close into a print either — which is why the default is
 * PRINT and the ONLY way to get the hedge is to ask for it by name.
 */
function isBarClose(v: unknown): boolean {
  return typeof v === "string" && v.trim().toUpperCase() === "BAR_CLOSE";
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

  // Timeframe rides right after the symbol so the model reads "TSLA 15m @ …"
  // as one identity — the way a trader reads their own tab. Founder TIMEFRAME
  // LAW: 1m = execution/response, 5–15m = location/ORB, 1H–D = regime. Blending
  // any two into one unlabeled sentence is CROSS_WIRED.
  const timeframe = typeof context.timeframe === "string" ? context.timeframe.trim() : "";
  const tfLabel = timeframe.length > 0 ? ` ${timeframe}` : " (timeframe unspecified)";

  let note = `[Current chart: ${symbol}${tfLabel}`;

  const price = num(context.price);
  // > 0, not truthiness: a price of 0 is not a price, and the old `if
  // (context.price)` already skipped it by accident rather than on purpose.
  if (price !== null && price > 0) {
    note += ` @ $${price.toLocaleString("en-US")}`;
    // The hedge is bound to the number, before the role, so the model cannot
    // read the figure without reading what it is. The timeframe is already
    // stated above, so this does not repeat it.
    if (isBarClose(context.priceProvenance)) {
      note += " (last bar close, NOT a live print)";
    }
  }

  // Role rides right after the price so the model reads "$365.25 STALE" as
  // one bound fact — the way the strip's role glyph sits beside the price on
  // the visible surface. Silence is never allowed: an unlabeled price is
  // exactly what taught the model to quote a stale close as if it were live.
  const role = canonicalRole(context.role);
  note += role !== null ? ` [role ${role}]` : ` [role UNKNOWN]`;

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
