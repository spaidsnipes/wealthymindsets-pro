"use client";

/**
 * BROKER TRUTH · TODAY — Garden 18 §XC/§XCI in the Journal room.
 *
 * The machine facts of today's trading, read from the broker (never browser
 * memory): orders in their WM order states and fills with price, quantity and
 * fees. Grouped into ONE story per Decision_ID for orders WM sent; orders placed
 * elsewhere are grouped as "placed outside WM". Fills carry tastytrade's own
 * transaction id, so a reload never tells a story twice. The human's lesson is
 * written in the journal below — this section never writes on the trader's
 * behalf.
 */

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

const GOLD = "#C9A55C";
const MUTED = "#8a8271";
const INK = "#ede6d3";
const LINE = "rgba(139,106,41,0.25)";

interface FeedOrder { id: string; state: string; status: string; symbol: string | null; action: string | null; quantity: number | null; filled: number | null; price: string | null; externalId: string | null; decisionId: string | null; sentFromWm: boolean }
interface FeedFill { id: string; orderId: string | null; symbol: string | null; action: string | null; quantity: number | null; price: number | null; value: number | null; fees: number; executedAt: string | null; feesReported?: boolean; decisionId?: string | null }
interface FeedAccount { tail: string; broker: string; state: string; reason?: string; orders: FeedOrder[]; fills: FeedFill[] }

interface Story { key: string; broker: string; decisionId: string | null; accountTail: string; orders: FeedOrder[]; fills: FeedFill[] }

const money = (v: number) => `${v < 0 ? "−" : ""}$${Math.abs(v).toFixed(2)}`;
const time = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—");

export function BrokerTruthToday() {
  const [feed, setFeed] = useState<{ state: string; reason?: string; accounts: FeedAccount[]; asOf?: string; decisionLinks?: string } | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    // Seven days of fills (a story from yesterday is still today's lesson);
    // working orders are tastytrade's current-day list.
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    const pull = () => fetch(`/api/broker/journal-feed?since=${since}`, { cache: "no-store" })
      .then(async r => { const j = await r.json().catch(() => null); if (live) { setStatus(r.status); setFeed(j); } })
      .catch(() => { if (live) setFeed({ state: "NO_ANSWER", accounts: [] }); });
    void pull();
    const t = setInterval(pull, 30_000);
    return () => { live = false; clearInterval(t); };
  }, []);

  const stories = useMemo<Story[]>(() => {
    const out: Story[] = [];
    for (const a of feed?.accounts ?? []) {
      const byDecision = new Map<string, Story>();
      const orderToStory = new Map<string, Story>();
      for (const o of a.orders) {
        const key = `${a.broker}|${a.tail}|${o.decisionId ?? "outside"}`;
        const st = byDecision.get(key) ?? { key, broker: a.broker, decisionId: o.decisionId, accountTail: a.tail, orders: [], fills: [] };
        st.orders.push(o);
        byDecision.set(key, st);
        orderToStory.set(o.id, st);
      }
      for (const f of a.fills) {
        // A Webull fill carries its own decision (looked up by its client order id).
        const st = (f.orderId && orderToStory.get(f.orderId)) || (() => {
          const d = f.decisionId ?? null;
          const key = `${a.broker}|${a.tail}|${d ?? "outside"}`;
          const s = byDecision.get(key) ?? { key, broker: a.broker, decisionId: d, accountTail: a.tail, orders: [], fills: [] };
          byDecision.set(key, s);
          return s;
        })();
        st.fills.push(f);
      }
      out.push(...byDecision.values());
    }
    // WM decisions first, then outside orders.
    return out.sort((x, y) => Number(!!y.decisionId) - Number(!!x.decisionId));
  }, [feed]);

  if (status === 403) return null; // not the broker owner: this section has nothing that belongs to them

  return (
    <section data-testid="broker-truth-today" aria-label="Broker truth today" style={{ padding: "12px 16px", borderBottom: `1px solid ${LINE}`, color: INK }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 14, fontWeight: 400 }}>Broker truth · last 7 days</h2>
        <span style={{ color: MUTED, fontSize: 11 }}>
          Read from your brokers{feed?.asOf ? ` · as of ${time(feed.asOf)}` : ""} — orders and fills as the broker states them, never this browser&apos;s memory.
        </span>
      </div>
      {!feed ? (
        <p style={{ color: MUTED, fontSize: 12, marginTop: 8 }}>Asking your brokers for this week&apos;s orders and fills…</p>
      ) : feed.state === "NOT_CONFIGURED" ? (
        <p style={{ color: GOLD, fontSize: 12, marginTop: 8 }}>tastytrade is not connected on this deployment, so there are no broker facts to show.</p>
      ) : feed.state !== "OK" ? (
        <p style={{ color: GOLD, fontSize: 12, marginTop: 8 }}>The brokers did not answer ({feed.reason ?? feed.state}). Your journal entries below are unaffected; this section retries every 30 seconds.</p>
      ) : stories.length === 0 ? (
        <p style={{ color: MUTED, fontSize: 12, marginTop: 8 }}>No orders or fills at tastytrade or Webull in the last 7 days. Completed decision stories will appear here as the broker records them.</p>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {stories.map(st => {
            const fees = st.fills.reduce((n, f) => n + f.fees, 0);
            const cash = st.fills.reduce((n, f) => n + (f.value ?? 0), 0);
            return (
              <article key={st.key} data-decision={st.decisionId ?? "outside"} style={{ border: `1px solid ${LINE}`, borderRadius: 4, padding: 10 }}>
                <header style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                  <strong style={{ color: st.decisionId ? GOLD : MUTED, fontSize: 12 }}>
                    {st.decisionId ? `Decision ${st.decisionId}` : "Placed outside WM"}
                  </strong>
                  <span style={{ color: MUTED, fontSize: 11 }}>{st.broker === "webull" ? "Webull" : "tastytrade"} · …{st.accountTail}</span>
                  {st.decisionId ? (
                    <Link href={`/journal?decisions=${encodeURIComponent(st.decisionId)}`} style={{ color: GOLD, fontSize: 11, marginLeft: "auto" }}>Open this decision&apos;s journal →</Link>
                  ) : null}
                </header>
                {st.orders.length ? (
                  <ul style={{ marginTop: 6, display: "grid", gap: 2, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                    {st.orders.map(o => (
                      <li key={o.id}>
                        <span style={{ color: o.state === "FILLED" ? "#7fd1a8" : o.state === "REJECTED" ? "#e0786b" : GOLD }}>{o.state.replace(/_/g, " ")}</span>
                        {" · "}{o.action} {o.filled != null && o.quantity != null ? `${o.filled}/${o.quantity}` : o.quantity ?? ""} {o.symbol} {o.price ? `@ ${o.price}` : ""}
                        <span style={{ color: MUTED }}> · order #{o.id}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {st.fills.length ? (
                  <ul style={{ marginTop: 6, display: "grid", gap: 2, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                    {st.fills.map(f => (
                      <li key={f.id}>
                        <span style={{ color: "#7fd1a8" }}>FILL</span> · {time(f.executedAt)} · {f.action} {f.quantity} {f.symbol} @ {f.price}
                        <span style={{ color: MUTED }}> · {f.feesReported === false ? "fees not reported" : `fees ${money(f.fees)}`}</span>
                      </li>
                    ))}
                    {st.broker === "webull" ? (
                      <li style={{ color: MUTED }}>Prices and quantities as Webull states them; Webull&apos;s executions carry no fees or cash, so none are claimed here.</li>
                    ) : (
                      <li style={{ color: MUTED }}>Net cash {money(cash)} · fees {money(fees)} — as tastytrade states it; P/L on open positions is not claimed here.</li>
                    )}
                  </ul>
                ) : st.orders.length ? <p style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>No fill yet.</p> : null}
              </article>
            );
          })}
        </div>
      )}
      {feed?.state === "OK" && feed.decisionLinks !== "KV" ? (
        <p style={{ color: GOLD, fontSize: 11, marginTop: 6 }}>Decision links are unavailable on this host, so WM orders show as placed outside WM.</p>
      ) : null}
    </section>
  );
}
