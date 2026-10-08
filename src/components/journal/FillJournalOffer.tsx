"use client";

/**
 * "ADD TO JOURNAL" ON A FILLED LIVE ORDER — §J 2026-10-07.
 *
 * Shown by the live-order ticket only once tastytrade has read the order back
 * as FILLED. One press reads tastytrade's own trade transactions (the
 * read-only journal feed) for this order id and builds a provenance-labelled
 * draft (journalCaptureFromFill). A second press opens it in the Journal's
 * new-entry form, where the trader reviews it and presses Save himself.
 * Nothing is written to the journal from here — ever.
 *
 * This component has no order path: it never sends, cancels or modifies.
 */

import React, { useEffect, useState } from "react";

import { CapturedFacts } from "@/components/journal/CapturedFacts";
import type { TtFill } from "@/lib/broker/tastytradeFills";
import { closingResultForOrder } from "@/lib/journal/closingFillResult";
import { journalCaptureFromFill, type FillCaptureIntent, type FillCaptureOrder, type JournalCaptureDraft } from "@/lib/journal/journalCaptureFromFill";
import { JOURNAL_CAPTURE_URL, offerJournalCapture } from "@/lib/journal/journalCaptureHandoff";
import { forgetTicketAtSend, ticketsAtSend } from "@/lib/journal/ticketAtSendStore";

const GOLD = "#C9A55C";
const MUTED = "#8a8271";

interface FeedOrder extends FillCaptureOrder { readonly decisionId?: string | null }
interface FeedAccount { tail: string; broker: string; orders?: FeedOrder[]; fills?: TtFill[] }

/** Days of fills read: enough for a closing order's round trip to include its opening fills. */
const FEED_DAYS = 7;
const feedSince = () => new Date(Date.now() - FEED_DAYS * 86_400_000).toISOString().slice(0, 10);

/**
 * Find this order's fills, its account's fills (for the round trip) and the
 * account it lives in, in the journal feed's answer. PURE.
 */
export function fillsForOrder(feed: unknown, orderId: string): { fills: TtFill[]; accountFills: TtFill[]; accountTail: string | null } {
  const accounts = (feed as { accounts?: FeedAccount[] } | null)?.accounts;
  if (!Array.isArray(accounts)) return { fills: [], accountFills: [], accountTail: null };
  for (const a of accounts) {
    if (a?.broker !== "tastytrade") continue;
    const all = Array.isArray(a.fills) ? a.fills : [];
    const fills = all.filter(f => f?.orderId === orderId);
    if (fills.length || (a.orders ?? []).some(o => o?.id === orderId)) return { fills, accountFills: all, accountTail: typeof a.tail === "string" ? a.tail : null };
  }
  return { fills: [], accountFills: [], accountTail: null };
}

/**
 * Orders tastytrade reads back as FILLED whose client order id matches a
 * ticket this tab recorded at send — the offers a reload must not lose. PURE.
 */
export function filledOrdersWithTickets(feed: unknown, clientOrderIds: ReadonlySet<string>): FillCaptureOrder[] {
  const accounts = (feed as { accounts?: FeedAccount[] } | null)?.accounts;
  if (!Array.isArray(accounts)) return [];
  const out: FillCaptureOrder[] = [];
  for (const a of accounts) {
    if (a?.broker !== "tastytrade") continue;
    for (const o of a.orders ?? []) {
      // FILLED, or a partial fill that was then cancelled / expired (still a real fill — capture says so).
      const filled = o?.state === "FILLED" || ((o?.state === "CANCELED" || o?.state === "CLOSED") && (o?.filled ?? 0) > 0);
      if (filled && typeof o.externalId === "string" && clientOrderIds.has(o.externalId)) out.push(o);
    }
  }
  return out;
}

export function FillJournalOffer({ intent, order }: { intent: FillCaptureIntent; order: FillCaptureOrder }) {
  const [draft, setDraft] = useState<JournalCaptureDraft | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function capture() {
    setBusy(true); setNote(null);
    let fills: TtFill[] = [];
    let accountFills: TtFill[] = [];
    let accountTail: string | null = null;
    try {
      const r = await fetch(`/api/broker/journal-feed?since=${feedSince()}`, { cache: "no-store" });
      const j = await r.json().catch(() => null);
      ({ fills, accountFills, accountTail } = fillsForOrder(j, order.id));
      if (!fills.length) setNote("tastytrade has not listed this order's fill transaction yet — fill price and fees stay unreported. Press again in a moment to re-read.");
    } catch {
      setNote("The broker's fill list did not answer — fill price and fees stay unreported.");
    }
    // A closing fill: tastytrade's own round trip (paired by the ledger owner) carries the result.
    const brokerResult = /to close/i.test(order.action ?? intent.action) ? closingResultForOrder(accountFills, order.id) : null;
    const res = journalCaptureFromFill({ intent, order, fills, brokerAccountTail: accountTail, brokerResult, nowMs: Date.now() });
    if (res.ok) setDraft(res.draft); else setNote(res.reason);
    setBusy(false);
  }

  function openInJournal() {
    if (!draft) return;
    let ok = false;
    try { ok = offerJournalCapture(window.localStorage, draft, Date.now()); } catch { ok = false; }
    if (!ok) { setNote("This browser would not hold the draft for the Journal. Nothing was written."); return; }
    if (order.externalId) { try { forgetTicketAtSend(window.sessionStorage, order.externalId, Date.now()); } catch { /* nothing kept */ } }
    window.location.assign(JOURNAL_CAPTURE_URL);
  }

  return (
    <div data-testid="tt-journal-offer" style={{ marginTop: 6, display: "grid", gap: 6 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" data-testid="tt-add-to-journal" disabled={busy} onClick={() => void capture()}
          style={{ padding: "6px 12px", minHeight: 32, borderRadius: 3, border: `1px solid ${GOLD}`, color: GOLD, background: "transparent", opacity: busy ? 0.5 : 1 }}>
          {busy ? "Reading tastytrade's fill…" : draft ? "Re-read the fill" : "Add to Journal"}
        </button>
        {draft ? (
          <button type="button" data-testid="tt-open-journal-draft" onClick={openInJournal}
            style={{ padding: "6px 12px", minHeight: 32, borderRadius: 3, border: `1px solid ${GOLD}`, color: "#0b0a08", background: GOLD }}>
            Open draft in Journal
          </button>
        ) : null}
        <span style={{ color: MUTED, fontSize: 11 }}>A draft only — you review it and press Save in the Journal.</span>
      </div>
      {note ? <p role="status" style={{ color: GOLD, fontSize: 11, margin: 0 }}>{note}</p> : null}
      {draft ? <CapturedFacts capture={draft} title="Journal draft from this fill" /> : null}
    </div>
  );
}

/**
 * After a reload the ticket no longer holds its order — tastytrade still does.
 * Tickets this tab recorded at send (ticketAtSendStore) are matched to the
 * broker's FILLED orders by client order id, once on mount, and each gets the
 * same offer. Nothing is shown when no ticket was recorded.
 */
export function PendingFillJournalOffers() {
  const [pending, setPending] = useState<{ intent: FillCaptureIntent; order: FillCaptureOrder }[]>([]);
  useEffect(() => {
    let live = true;
    let records: ReturnType<typeof ticketsAtSend> = [];
    try { records = ticketsAtSend(window.sessionStorage, Date.now()); } catch { records = []; }
    if (!records.length) return;
    const byId = new Map(records.map(r => [r.clientOrderId, r.ticket]));
    fetch(`/api/broker/journal-feed?since=${feedSince()}`, { cache: "no-store" })
      .then(r => r.json().catch(() => null))
      .then(j => {
        if (!live) return;
        setPending(filledOrdersWithTickets(j, new Set(byId.keys())).map(order => ({ order, intent: byId.get(order.externalId as string)! })));
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  if (!pending.length) return null;
  return (
    <section data-testid="tt-pending-journal" aria-label="Filled orders not yet journaled" style={{ border: "1px solid rgba(139,106,41,0.25)", borderRadius: 8, padding: 8, display: "grid", gap: 6 }}>
      <strong style={{ color: GOLD, fontSize: 11, letterSpacing: ".08em" }}>FILLED · NOT YET IN YOUR JOURNAL</strong>
      {pending.map(p => (
        <div key={p.order.id}>
          <span style={{ color: MUTED, fontSize: 11 }}>tastytrade #{p.order.id} · {p.order.action ?? p.intent.action} {p.order.quantity ?? p.intent.qty} {p.order.symbol ?? ""} · FILLED</span>
          <FillJournalOffer intent={p.intent} order={p.order} />
        </div>
      ))}
    </section>
  );
}
