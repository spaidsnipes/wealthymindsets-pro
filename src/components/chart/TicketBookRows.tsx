"use client";

/**
 * §23 BOOK ROWS on the trade ticket — POSITION STATE · WORKING ORDERS (cancel) · MODIFY · FLATTEN.
 * A pure view of `ticketBook()`: every word comes from the broker readback; every control that
 * cannot act is disabled with its reason AT the control. Cancel and FLATTEN are callbacks the
 * ticket owns — this view sends nothing.
 */

import React from "react";

import type { TicketBook, WorkingOrderRow } from "@/lib/execution/ticketBook";

const GOLD = "#C9A55C", INK = "#ede6d3", MUTED = "#8a8271", RED = "#e0786a", GREEN = "#7fd1a8", LINE = "rgba(139,106,41,0.35)";
const MONO: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };
const small = (color = MUTED): React.CSSProperties => ({ fontSize: 10, letterSpacing: 1, color });
const ctl = (color: string, on: boolean): React.CSSProperties => ({ minHeight: 30, padding: "0 10px", borderRadius: 6, border: `1px solid ${on ? color : LINE}`, background: "transparent", color: on ? color : MUTED, fontSize: 12, fontWeight: 600, cursor: on ? "pointer" : "not-allowed", opacity: on ? 1 : 0.6 });

export interface CancelAck { readonly state: string; readonly words: string }

export function TicketBookRows({ book, acks, busyId, onCancel, onFlatten }: {
  readonly book: TicketBook;
  /** Broker-ack words per order id after a cancel request (readback only). */
  readonly acks: Readonly<Record<string, CancelAck>>;
  readonly busyId: string | null;
  readonly onCancel: (o: WorkingOrderRow) => void;
  readonly onFlatten: () => void;
}) {
  const p = book.position;
  return (
    <div data-testid="trade-book" style={{ display: "grid", gap: 6, border: `1px solid ${LINE}`, borderRadius: 8, padding: "6px 8px" }}>
      <div data-testid="trade-broker-position" data-state={p.state} data-protection={p.protection ?? undefined} style={{ display: "grid", gap: 2, ...MONO }}>
        <span style={small()}>POSITION STATE · tastytrade readback</span>
        <span style={{ color: p.state === "HOLDING" ? INK : p.state === "RECONCILING" ? GOLD : MUTED, overflowWrap: "anywhere" }}>
          {/* The protection word is in the row's words once; the dot only colours it (no second copy of the word). */}
          {p.protection ? <b aria-hidden="true" style={{ color: p.protection === "PROTECTED" ? GREEN : RED }}>● </b> : null}{p.words}
        </span>
      </div>

      {book.rejected ? (
        <div role="status" data-testid="trade-rejected-order" data-order-id={book.rejected.id} style={{ display: "grid", gap: 2 }}>
          <span style={{ color: RED, fontSize: 11, fontWeight: 700, overflowWrap: "anywhere" }}>{book.rejected.words}</span>
          <span style={{ color: INK, fontSize: 11, overflowWrap: "anywhere" }}>tastytrade says: {book.rejected.brokerReason != null ? <q data-testid="trade-reject-reason">{book.rejected.brokerReason}</q> : "no reason was given"}</span>
        </div>
      ) : null}
      <div data-testid="trade-working-orders" data-count={book.working.length} style={{ display: "grid", gap: 4, ...MONO }}>
        <span style={small()}>WORKING ORDERS · {book.working.length === 0 ? (p.state === "NOT READ" ? "not read" : "none on this contract") : `${book.working.length} · cancel stays open`}</span>
        {book.working.map(o => {
          const ack = acks[o.id];
          const busy = busyId === o.id;
          const can = o.cancel.allowed && !busy && !ack;
          return (
            <div key={o.id} data-testid="trade-working-order" data-state={o.state} data-order-id={o.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2px 8px" }}>
              <span style={{ color: GOLD, overflowWrap: "anywhere" }}>{o.words}{o.tail ? ` · …${o.tail}` : ""}</span>
              <button type="button" data-testid="trade-cancel-working" disabled={!can} aria-describedby={!o.cancel.allowed ? `trade-cancel-refusal-${o.id}` : undefined}
                onClick={() => { if (can) onCancel(o); }} style={ctl(GOLD, can)}>
                {busy ? "Cancel requested…" : "Cancel order"}
              </button>
              {!o.cancel.allowed ? <span id={`trade-cancel-refusal-${o.id}`} role="status" data-testid="trade-cancel-refusal" style={{ color: MUTED, fontSize: 11 }}>{o.cancel.reason}</span> : null}
              {ack ? <span role="status" data-testid="trade-cancel-ack" data-state={ack.state} style={{ color: ack.state === "CANCELED" ? GREEN : GOLD, fontSize: 11 }}>tastytrade: {ack.words}</span> : null}
            </div>
          );
        })}
      </div>

      {/* MODIFY behind its own disclosure (ruling 2026-10-10: the wide ticket's book column must fit). Its refusal — a
          modify is NOT atomic — is never folded away: it stays inline under the summary. */}
      <div data-testid="trade-modify" data-state={book.modify.state} style={{ display: "grid", gap: 2 }}>
        <details data-testid="trade-modify-details">
          <summary style={{ ...small(), cursor: "pointer", minHeight: 24 }}>MODIFY · {book.modify.state}</summary>
          <span style={{ color: MUTED, fontSize: 11 }}>{book.modify.words}</span>
        </details>
        {book.modify.refusal ? <span role="status" data-testid="trade-modify-refusal" style={{ color: GOLD, fontSize: 11 }}>{book.modify.refusal}</span> : null}
      </div>

      <div data-testid="trade-flatten-row" data-state={book.flatten.state} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2px 8px" }}>
        <span style={small()}>FLATTEN · {book.flatten.state}</span>
        <span style={{ color: book.flatten.state === "LOADABLE" ? INK : MUTED, fontSize: 11, overflowWrap: "anywhere" }}>{book.flatten.words}</span>
        {book.flatten.plan ? (
          <button type="button" data-testid="trade-flatten" disabled={book.flatten.state !== "LOADABLE"} aria-describedby={book.flatten.refusal ? "trade-flatten-refusal" : undefined}
            onClick={() => { if (book.flatten.state === "LOADABLE") onFlatten(); }} style={ctl(RED, book.flatten.state === "LOADABLE")}>Load FLATTEN</button>
        ) : null}
        {book.flatten.refusal ? <span id="trade-flatten-refusal" role="status" data-testid="trade-flatten-refusal" style={{ color: GOLD, fontSize: 11 }}>{book.flatten.refusal}</span> : null}
      </div>
    </div>
  );
}
