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
