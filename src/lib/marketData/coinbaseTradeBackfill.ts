/**
 * COINBASE TRADE BACKFILL — the tape the room did not hear live (Garden 16
 * master order §26–§28; F06A "order flow lives on price").
 *
 * Measured on serving 2026-09-28: every order-flow reading refused the bars
 * before the tab opened (imbalanceStack NO_STACK, effortMark UNREAD) because
 * the one tape ladder only held prints heard since load. Coinbase's PUBLIC
 * trades endpoint (no credential, CORS open) returns executed prints with the
 * MAKER's side — the aggressor is the opposite side, exactly the rule the live
 * ticker adapter already applies (aggressorMethod MAKER_SIDE_INVERTED) — and
 * the same trade_id, so a print heard both ways is one print (same eventId).
 *
 * PURE normalizer + a bounded pager. Nothing here decides a reading.
 */
import type { Tick } from "@/hooks/useWebSocket";
import type { CanonicalMarketEvent } from "./marketEvent";

export const COINBASE_TRADES_BASE = "https://api.exchange.coinbase.com";

interface RestTrade { readonly trade_id?: unknown; readonly side?: unknown; readonly size?: unknown; readonly price?: unknown; readonly time?: unknown }

/** BTC-USD / BTCUSD / BTC → "BTC-USD"; anything that is not a USD crypto pair → null. */
export function coinbaseProductFor(symbol: string): string | null {
  const s = (symbol ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  const base = s.endsWith("USDT") ? s.slice(0, -4) : s.endsWith("USD") ? s.slice(0, -3) : s;
  return /^[A-Z]{2,6}$/.test(base) ? `${base}-USD` : null;
}

export function normalizeCoinbaseRestTrades(rows: unknown, productId: string, appSymbol: string): Tick[] {
  const out: Tick[] = [];
  if (!Array.isArray(rows)) return out;
  for (const r of rows as RestTrade[]) {
    const price = Number(r?.price), size = Number(r?.size);
    const time = typeof r?.time === "string" ? Date.parse(r.time) : NaN;
    const id = r?.trade_id != null ? String(r.trade_id) : "";
    if (!(price > 0) || !(size > 0) || !Number.isFinite(time) || !id) continue;
    if (r.side !== "buy" && r.side !== "sell") continue;
    // Maker side → the aggressor is the opposite side.
    const aggressor: "buy" | "sell" = r.side === "sell" ? "buy" : "sell";
    const event = {
      eventId: `coinbase:${productId}:${id}`,
      sourceEventId: id,
      symbol: appSymbol,
      exchange: "COINBASE",
      eventType: "TRADE",
      timestampExchange: time,
      price,
      size,
      aggressorSide: aggressor === "buy" ? "BUY" : "SELL",
      aggressorMethod: "MAKER_SIDE_INVERTED",
    } as unknown as CanonicalMarketEvent;
    out.push({ price, size, side: aggressor, time, trade: true, marketEvent: event });
  }
  return out;
}

/**
 * Newest → older pages until `sinceMs` is reached or `maxPages` spent. Paced
 * (Coinbase public limit ~10 req/s). Returns oldest-first.
 */
export async function fetchCoinbaseTradeHistory(
  productId: string,
  appSymbol: string,
  opts: { readonly sinceMs: number; readonly maxPages?: number; readonly paceMs?: number; readonly fetchImpl?: typeof fetch; readonly signal?: AbortSignal },
): Promise<{ ticks: Tick[]; pages: number; reachedMs: number | null; complete: boolean }> {
  const f = opts.fetchImpl ?? fetch;
  const maxPages = opts.maxPages ?? 40;
  const pace = opts.paceMs ?? 130;
  let after: string | null = null;
  let pages = 0;
  let reached: number | null = null;
  const all: Tick[] = [];
  while (pages < maxPages) {
    if (opts.signal?.aborted) break;
    const url: string = `${COINBASE_TRADES_BASE}/products/${encodeURIComponent(productId)}/trades?limit=1000${after ? `&after=${encodeURIComponent(after)}` : ""}`;
    const res: Response = await f(url, { cache: "no-store", signal: opts.signal });
    if (!res.ok) break;
    const rows = await res.json().catch(() => null);
    const ticks = normalizeCoinbaseRestTrades(rows, productId, appSymbol);
    pages++;
    if (ticks.length === 0) break;
    for (const t of ticks) all.push(t);
    reached = Math.min(...ticks.map(t => t.time));
    if (reached <= opts.sinceMs) break;
    after = res.headers.get("cb-after");
    if (!after) break;
    await new Promise(r => setTimeout(r, pace));
  }
  const kept = all.filter(t => t.time >= opts.sinceMs).sort((a, b) => a.time - b.time);
  return { ticks: kept, pages, reachedMs: reached, complete: reached != null && reached <= opts.sinceMs };
}
