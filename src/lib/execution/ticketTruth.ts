/**
 * TICKET TRUTH — what the trade ticket may SAY about its quote, its prefilled price and the book
 * (Garden 19 Sheriff, 2026-10-08). PURE.
 *
 *   · "LIVE" only with a live quote: the stream open AND this contract's bid and ask heard within
 *     TAPE_QUOTE_FRESH_MS. A stream with no quote for this contract, or an old quote, says so.
 *   · A prefilled limit names where it came from and how old it is — and is marked STALE once the
 *     touch it came from has moved away by a tick or more. A chart close is NOT a quote and is never
 *     prefilled.
 *   · The book line: FLAT is a READ, not a default — "FLAT · 0 working · read <time> from …1234".
 *     Never read → said; stale → said.
 *   · Open / close is a separate line from the checkbox, so the label never contradicts itself.
 */

import { traderClock } from "@/components/time/traderClock";
import { formatQuoteAge, selectTapeQuoteFreshness, TAPE_QUOTE_FRESH_MS } from "@/lib/marketData/tapeQuoteFreshness";

export interface QuoteLabel { readonly live: boolean; readonly text: string }

export function quoteStreamLabel(x: {
  readonly stream: string;
  readonly bid: number | null | undefined;
  readonly ask: number | null | undefined;
  readonly quoteAtMs: number | null | undefined;
  readonly nowMs: number;
  readonly contract: string | null;
  readonly streamWords: Readonly<Record<string, string>>;
}): QuoteLabel {
  if (x.stream !== "LIVE") return { live: false, text: x.streamWords[x.stream] ?? x.stream.replace(/_/g, " ").toLowerCase() };
  const both = typeof x.bid === "number" && Number.isFinite(x.bid) && typeof x.ask === "number" && Number.isFinite(x.ask);
  if (!both) return { live: false, text: `stream open · no quote for ${x.contract ?? "this contract"} yet` };
  const f = selectTapeQuoteFreshness(x.quoteAtMs ?? null, x.nowMs, TAPE_QUOTE_FRESH_MS);
  if (f.kind === "UNOBSERVED") return { live: false, text: "quote time not reported · not live" };
  if (f.kind === "STALE") return { live: false, text: `quote ${formatQuoteAge(f.ageMs)} old · not live` };
  return { live: true, text: "LIVE · tastytrade" };
}

export interface Prefill {
  readonly px: number;
  readonly touch: "BID" | "ASK";
  readonly atMs: number;
  readonly source: string;
}

/** The note beside a prefilled limit; null when the limit was not prefilled (or the trader changed it). */
export function prefillNote(x: {
  readonly prefill: Prefill | null;
  readonly limitPx: number | null;
  readonly currentTouch: number | null | undefined;
  readonly tick: number | null;
  readonly nowMs: number;
}): { readonly stale: boolean; readonly text: string } | null {
  const p = x.prefill;
  if (!p || x.limitPx == null || Math.abs(x.limitPx - p.px) > 1e-9) return null;
  const age = formatQuoteAge(Math.max(0, x.nowMs - p.atMs));
  const base = `Prefilled from the ${p.source} ${p.touch.toLowerCase()} ${p.px} at ${traderClock(p.atMs, { seconds: true })} (${age} ago).`;
  const step = x.tick && x.tick > 0 ? x.tick : Math.abs(p.px) * 0.0001;
  const cur = x.currentTouch;
  if (typeof cur === "number" && Number.isFinite(cur) && Math.abs(cur - p.px) >= step - 1e-12) {
    return { stale: true, text: `STALE · ${base} The ${p.touch.toLowerCase()} is now ${cur} — re-check the limit.` };
  }
  return { stale: false, text: base };
}

/**
 * A DRAFT PRICE THAT CAME FROM THE CHART (Founder P0 2026-10-09). How it got there is said beside the
 * field, for as long as the field still holds that price: an armed pick, a drag of the staged line, or the
 * chart's "Trade at <price>". It is a draft — never an order, never sent by arriving.
 */
export type ChartDraftSource = "PICK" | "DRAG" | "MENU";
export interface ChartDraft { readonly role: "ENTRY" | "STOP" | "TARGET"; readonly px: number; readonly source: ChartDraftSource }

/**
 * What an ENTRY price from the chart does to the entry order type. PURE.
 *   "Trade at <price>" (MENU)  → always a LIMIT at that price — never Market;
 *   a pick or a drag            → Market becomes Limit; a Stop / Stop Limit entry moves its TRIGGER
 *                                 (that is the line the trader is holding); a Limit stays a Limit.
 */
export function chartEntryEffect(source: ChartDraftSource, entryType: string): { readonly entryType: "Limit" | "Stop" | "Stop Limit"; readonly field: "LIMIT" | "TRIGGER" } {
  if (source !== "MENU" && (entryType === "Stop" || entryType === "Stop Limit")) return { entryType, field: "TRIGGER" };
  return { entryType: "Limit", field: "LIMIT" };
}

/** The note beside a field whose price came from the chart; null once the trader types something else. */
export function chartDraftNote(d: ChartDraft | null, currentPx: number | null, role: ChartDraft["role"]): string | null {
  if (!d || d.role !== role || currentPx == null || Math.abs(currentPx - d.px) > 1e-9) return null;
  const how = d.source === "DRAG" ? "dragged on the chart" : "picked from the chart";
  const what = role === "ENTRY" ? "Entry" : role === "STOP" ? "Stop" : "Target";
  return `${what} ${how} at ${d.px} — a draft; nothing is sent until you preview and confirm.`;
}

/** The book line for this contract. */
export function bookLine(x: {
  readonly readback: "FRESH" | "STALE" | "NEVER_READ" | null;
  readonly holding: boolean;
  readonly working: number;
  readonly asOfMs: number | null;
  readonly tails: readonly string[];
}): string | null {
  if (x.readback == null) return null;
  if (x.readback === "NEVER_READ") return "Position and working orders: not read from tastytrade yet — nothing is assumed flat.";
  if (x.readback === "STALE") return null;   // the RECONCILING line says it
  const from = x.tails.length ? ` from ${x.tails.map(t => `…${t}`).join(", ")}` : "";
  const at = x.asOfMs != null ? ` · read ${traderClock(x.asOfMs, { seconds: false })}${from}` : "";
  return x.holding ? `${x.working} working${at}` : `FLAT · ${x.working} working${at}`;
}

/** The order the ticket would build, said on its own line (never inside the checkbox label). */
export function orderActionLine(side: "BUY" | "SELL" | null, closing: boolean): string {
  if (!side) return "Pick BUY or SELL — nothing is staged until you do.";
  return `Order: ${side === "BUY" ? (closing ? "Buy to Close" : "Buy to Open") : (closing ? "Sell to Close" : "Sell to Open")}`;
}

/**
 * §24 — the boundary a SpaidBot proposal sits behind, said on the ticket where the proposal lands:
 * it observes, it proposes, and only the trader authorises. The kill switch and the server limits
 * still stand between a loaded proposal and a send.
 */
export const SPAIDBOT_BOUNDARY =
  "SpaidBot observes the chart and proposes. It cannot preview, confirm or send. Loading this only fills the ticket — you preview, you confirm, you send, and the kill switch and your server limits still apply.";

/**
 * The same boundary, said on the SpaidBot panel itself (Sheriff P2-7, 2026-10-08):
 * observe → propose → you authorise, and the kill switch. Same owner, same facts
 * as SPAIDBOT_BOUNDARY — no ticket is in front of the reader here.
 */
export const SPAIDBOT_PANEL_BOUNDARY =
  "SpaidBot observes the chart and proposes — it cannot see your accounts and cannot preview, confirm or send an order. You authorise: you preview, you confirm, you send. The kill switch and your server limits (Settings › Execution) still apply.";

/**
 * What the "protect the position" orders would close — said from the broker's READ position when
 * there is one, and otherwise named as the STAGED entry (never as a position the ticket has not read).
 */
export function protectBasisLine(x: {
  readonly positionState: "FLAT" | "HOLDING" | "RECONCILING" | "NOT READ";
  readonly held: { readonly direction: "Long" | "Short"; readonly quantity: number } | null;
  readonly stagedSide: "BUY" | "SELL" | null;
  readonly stagedQty: number;
  readonly contract: string;
}): string {
  const staged = x.stagedSide ? `the staged ${x.stagedSide} ${x.stagedQty} ${x.contract}` : "the staged entry";
  if (x.positionState === "HOLDING" && x.held) {
    return `tastytrade reads ${x.held.direction.toUpperCase()} ${x.held.quantity} ${x.contract}. These orders close ${x.stagedQty} of it (${x.stagedSide === "BUY" ? "sells" : "buys"}) — check the quantity against what you hold.`;
  }
  if (x.positionState === "RECONCILING") return `Your position is RECONCILING — these would close ${staged}, but what you hold is not confirmed right now.`;
  if (x.positionState === "NOT READ") return `Your position has not been read from tastytrade yet. These would close ${staged} once it fills.`;
  return `tastytrade reads FLAT on ${x.contract}. These would close ${staged} — send them only after that entry fills.`;
}
