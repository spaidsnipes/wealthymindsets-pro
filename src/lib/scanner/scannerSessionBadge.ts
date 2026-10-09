/**
 * scannerSessionBadge — a scanner row's quote word WITH the session it is in.
 *
 * Sheriff batch 5 (serving 2026-10-09 00:15 CDT, a Friday): every equity row
 * read "LIVE" — true about the QUOTE (a streaming quote under 15 s old), and
 * silent about the SESSION. /charts said "OVERNIGHT · THIN TAPE" for the same
 * instrument at the same minute. The freshness gate stays where it is
 * (scannerLiveQuote); this adds the session word from the ONE session owner
 * (marketSessionClock.readMarketSession) so "LIVE" is never read as "the
 * regular session is open".
 *
 *   regular session open (or a continuous market)  → "LIVE"
 *   pre / post / overnight / closed                → "LIVE · PRE" …
 *   the clock cannot be read                       → "LIVE" (no session is claimed)
 * PURE — the caller supplies `nowMs`.
 */
import { canonicalAssetClass, isUsCashIndexSymbol, marketClockET } from "@/lib/marketData/canonicalIdentity";
import { readMarketSession, type MarketSessionVerdict } from "@/lib/marketData/marketSessionClock";

export interface ScannerSessionBadge {
  /** The badge text. */
  readonly text: string;
  /** The session verdict behind it, or null when unread. */
  readonly verdict: MarketSessionVerdict | null;
  /** The published hours the verdict was read from, for the title. */
  readonly basis: string | null;
}

export function scannerSessionBadge(symbol: string, nowMs: number): ScannerSessionBadge {
  const s = readMarketSession({
    symbol,
    assetClass: canonicalAssetClass(symbol),
    clock: marketClockET(new Date(nowMs)),
    isUsCashIndex: isUsCashIndexSymbol(symbol),
  });
  if (!s) return { text: "LIVE", verdict: null, basis: null };
  return { text: s.verdict === "OPEN" ? "LIVE" : `LIVE · ${s.token}`, verdict: s.verdict, basis: s.basis };
}

/** How many of these live rows sit outside the regular session — for the footer's one line. */
export function scannerLiveSessionWords(symbols: readonly string[], nowMs: number): string {
  const by = new Map<string, number>();
  for (const sym of symbols) {
    const b = scannerSessionBadge(sym, nowMs);
    if (b.verdict && b.verdict !== "OPEN") by.set(b.verdict, (by.get(b.verdict) ?? 0) + 1);
  }
  return [...by.entries()].map(([v, n]) => `${n} ${v}`).join(" · ");
}
