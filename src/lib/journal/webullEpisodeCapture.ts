/**
 * "JOURNAL THIS TRADE" FOR A WEBULL ROUND TRIP (Supermax §8, 2026-10-10). PURE.
 *
 * The owner's Webull lifetime ledger already rebuilds Webull's own order
 * history into closed round trips (`reconstructEpisodes` → Episode: entries,
 * exits, Webull's prices and stated fees, the multiplier). That IS the round
 * trip, so this reads the Episode directly rather than re-pairing fills
 * through the file importer (`importedRoundTrip` is built for a futures fills
 * FILE — IMPORTED-FILE provenance and a futures point value — neither fits a
 * broker's own stock / option history).
 *
 * The draft goes through the SAME hand-off the live ticket and the file
 * importer use (journalCaptureHandoff); the Journal's own save gate applies
 * and nothing is saved until the trader presses Save.
 *
 * Provenance: what Webull stated wears BROKER-REPORTED with the source
 * "Webull history · as of <time>"; what is computed (average prices, P&L)
 * wears DERIVED; what a history cannot know — the plan, the decision, the
 * quote at send — is UNREPORTED. An episode still open is not offered.
 */
import type { Episode } from "@/lib/broker/webullLedger";

import type { CapturedField, JournalCaptureDraft } from "./journalCaptureFromFill";

const when = (iso: string) => {
  try { return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(iso)); }
  catch { return iso; }
};

/** "BROKER-REPORTED · Webull history · as of <time>" — the source every broker-stated field carries. */
export function webullHistorySource(asOfIso: string): string {
  return `Webull history · as of ${when(asOfIso)}`;
}

/** Can this episode be journaled? Only a closed round trip with an exit price. */
export function webullEpisodeJournalable(e: Episode): boolean {
  return e.closedAt !== null && e.avgExit !== null && e.entries.length > 0 && e.exits.length > 0;
}

const masked = (accountId: string) => `…${accountId.slice(-4)}`;
const ACTION: Readonly<Record<"LONG" | "SHORT", string>> = { LONG: "Buy to Open", SHORT: "Sell to Open" };

export function journalCaptureFromWebullEpisode(e: Episode, asOfIso: string, nowMs: number): JournalCaptureDraft | null {
  if (!webullEpisodeJournalable(e)) return null;
  const src = webullHistorySource(asOfIso);
  const broker = (value: string | number | null, missing: string): CapturedField<never> =>
    (value === null || value === "" ? { value: null, provenance: "UNREPORTED", source: missing } : { value, provenance: "BROKER-REPORTED", source: src }) as CapturedField<never>;
  const derived = (value: number | null, how: string, missing: string): CapturedField<never> =>
    (value === null ? { value: null, provenance: "UNREPORTED", source: missing } : { value, provenance: "DERIVED", source: `${how} · from ${src}` }) as CapturedField<never>;
  const none = (why: string): CapturedField<never> => ({ value: null, provenance: "UNREPORTED", source: why }) as CapturedField<never>;
  const NOT_IN_HISTORY = "Webull's order history does not carry this";
  const feesKnown = !e.feesUnreportedFills;
  const first = [...e.entries].sort((a, b) => a.at.localeCompare(b.at))[0]!;
  return {
    kind: "WM_FILL_CAPTURE", version: 1, capturedAtMs: nowMs,
    decisionId: none("no WM decision was recorded with this Webull trade"), orderIntentId: none(NOT_IN_HISTORY), clientOrderId: none(NOT_IN_HISTORY),
    view: none("no View recorded — write it in the review"), broker: broker("Webull", ""), environment: broker("production", ""),
    account: broker(masked(e.accountId), "no account"), instrumentType: broker(e.instrumentType, "no instrument type"), chartSymbol: broker(e.symbol, "no symbol"),
    contract: broker(e.instrumentKey, "no contract"), datedContract: none(NOT_IN_HISTORY),
    orderId: broker(first.orderId, "no order id"), orderStatus: broker("CLOSED ROUND TRIP", ""),
    action: broker(ACTION[e.direction], ""), orderType: broker(first.orderType, "Webull stated no order type"),
    orderedQty: broker(e.maxQuantity, "no quantity"), filledQty: broker(e.maxQuantity, "no quantity"), limitPx: none(NOT_IN_HISTORY),
    fillPx: derived(e.avgEntry, "quantity-weighted average of Webull's entry fills", "no entry price"),
    exitPx: derived(e.avgExit, "quantity-weighted average of Webull's exit fills", "no exit price"),
    filledAt: broker(first.at, "no time"),
    fees: feesKnown ? broker(e.fees, "no fee") : none(`Webull stated no fees on ${e.feesUnreportedFills} of this trade's fills — UNREPORTED, never $0`),
    quoteBid: none(NOT_IN_HISTORY), quoteAsk: none(NOT_IN_HISTORY), spread: none(NOT_IN_HISTORY), quoteAgeAtSendMs: none(NOT_IN_HISTORY),
    slippage: none(NOT_IN_HISTORY), slippageUsd: none(NOT_IN_HISTORY),
    stopPx: none("no planned stop — Webull's history has no plan"), targetPx: none("no planned target — Webull's history has no plan"),
    plannedRiskUsd: none("no plan, so no 1R"),
    pnlUsd: e.net !== null && feesKnown ? derived(e.net, "round trip × multiplier − Webull's stated fees", "")
      : e.gross !== null ? derived(e.gross, "round trip × multiplier, BEFORE fees (some fees UNREPORTED)", "") : none("no result could be computed"),
    realizedR: none("no plan, so no R"),
  } as JournalCaptureDraft;
}
