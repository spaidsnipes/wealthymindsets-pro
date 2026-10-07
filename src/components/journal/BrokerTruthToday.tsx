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

import { REVIEW_DIMENSIONS, REVIEW_QUESTION, cycleMark, readStoryReviews, reviewSummary, writeStoryReview, type ReviewDimension, type StoryReview } from "@/lib/journal/storyReview";
import type { ReviewEvidenceLine } from "@/lib/journal/captureReviewEvidence";
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

/**
 * §XCI + §J — the trader's half of one story: ten separate marks, a note per
 * dimension, and their own words. `evidence` (from a captured fill) sets the
 * machine facts beside the dimension they inform; they are never edited here.
 */
export function StoryReviewRow({ storyKey, evidence, defaultOpen = false }: {
  storyKey: string;
  evidence?: Readonly<Record<ReviewDimension, readonly ReviewEvidenceLine[]>>;
  defaultOpen?: boolean;
}) {
  const [all, setAll] = useState<Readonly<Record<string, StoryReview>>>({});
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => { setAll(readStoryReviews()); }, []);
  const r: StoryReview = all[storyKey] ?? { marks: {}, lesson: "", repeat: "", updatedAt: 0 };
  const save = (next: StoryReview) => setAll(writeStoryReview(storyKey, { ...next, updatedAt: Date.now() }));
  return (
    <div data-testid="story-review" style={{ marginTop: 8, borderTop: `1px dashed ${LINE}`, paddingTop: 6 }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ background: "none", border: "none", color: GOLD, fontSize: 11, cursor: "pointer", padding: 0 }}>
        {open ? "▾" : "▸"} Review · {reviewSummary(all[storyKey])}
      </button>
      {open ? (
        <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
          <div data-testid="review-dimensions" style={{ display: "grid", gap: 6 }}>
            {REVIEW_DIMENSIONS.map(d => {
              const m = r.marks[d];
              const facts = evidence?.[d] ?? [];
              return (
                <div key={d} data-testid={`review-dimension-${d}`} style={{ display: "grid", gap: 3, borderLeft: `2px solid ${m === "HELD" ? "#7fd1a8" : m === "BROKE" ? "#e0786b" : LINE}`, paddingLeft: 6 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <button type="button" data-testid={`review-${d}`} data-mark={m ?? "OPEN"} title={REVIEW_QUESTION[d]} aria-label={`${d}: ${m ?? "not judged"}. ${REVIEW_QUESTION[d]}`}
                      onClick={() => save({ ...r, marks: { ...r.marks, [d]: cycleMark(m) } })}
                      style={{ fontSize: 10, letterSpacing: 0.8, padding: "3px 7px", minHeight: 24, borderRadius: 999, cursor: "pointer", background: "transparent",
                        border: `1px solid ${m === "HELD" ? "#7fd1a8" : m === "BROKE" ? "#e0786b" : LINE}`, color: m === "HELD" ? "#7fd1a8" : m === "BROKE" ? "#e0786b" : MUTED }}>
                      {m === "HELD" ? "✓ " : m === "BROKE" ? "✗ " : ""}{d}
                    </button>
                    <span style={{ fontSize: 11, color: MUTED }}>{REVIEW_QUESTION[d]}</span>
                  </div>
                  {facts.length ? (
                    <div data-testid={`review-evidence-${d}`} style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", fontSize: 10.5, fontVariantNumeric: "tabular-nums" }}>
                      {facts.map(f => (
                        <span key={f.label} data-provenance={f.provenance} style={{ color: f.provenance === "UNREPORTED" ? MUTED : INK }}>
                          {f.label} {f.text} <span style={{ color: MUTED, fontSize: 9, letterSpacing: ".06em" }}>{f.provenance}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <input aria-label={`${d} note`} data-testid={`review-note-${d}`} value={r.notes?.[d] ?? ""} placeholder="note (optional)"
                    onChange={e => save({ ...r, notes: { ...(r.notes ?? {}), [d]: e.target.value } })}
                    style={{ background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, fontSize: 12, padding: "3px 6px", borderRadius: 4, minHeight: 26 }} />
                </div>
              );
            })}
          </div>
          <label style={{ fontSize: 11, color: MUTED }}>The lesson, in my words
            <textarea value={r.lesson} onChange={e => save({ ...r, lesson: e.target.value })} rows={2}
              style={{ width: "100%", background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, fontSize: 12, padding: 6, borderRadius: 4 }} />
          </label>
          <label style={{ fontSize: 11, color: MUTED }}>What I would repeat
            <textarea value={r.repeat} onChange={e => save({ ...r, repeat: e.target.value })} rows={2}
              style={{ width: "100%", background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, fontSize: 12, padding: 6, borderRadius: 4 }} />
          </label>
          <p style={{ fontSize: 10.5, color: MUTED, margin: 0 }}>Kept on this device. The broker&apos;s facts above are never edited by a review.</p>
        </div>
      ) : null}
    </div>
  );
}

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

  // Not the broker owner (403) or not signed in (401): this section has nothing
  // that belongs to them, so it is not drawn at all — and it stays undrawn until
  // the first answer says who is asking, so a guest never sees "Asking your
  // brokers…" flash up over brokers that are not theirs.
  if (status === 401 || status === 403) return null;
  if (!feed) return null;

  return (
    <section data-testid="broker-truth-today" aria-label="Broker truth today" style={{ padding: "12px 16px", borderBottom: `1px solid ${LINE}`, color: INK }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 14, fontWeight: 400 }}>Broker truth · last 7 days</h2>
        <span style={{ color: MUTED, fontSize: 11 }}>
          Read from your brokers{feed?.asOf ? ` · as of ${time(feed.asOf)}` : ""} — orders and fills as the broker states them, never this browser&apos;s memory.
        </span>
      </div>
      {feed.state === "NOT_CONFIGURED" ? (
        <p style={{ color: GOLD, fontSize: 12, marginTop: 8 }}>tastytrade is not connected on this deployment, so there are no broker facts to show.</p>
      ) : feed.state !== "OK" ? (
        <p title={feed.reason ?? feed.state} style={{ color: GOLD, fontSize: 12, marginTop: 8 }}>The brokers did not answer just now. Your journal entries below are unaffected; this section retries every 30 seconds.</p>
      ) : stories.length === 0 ? (
        <p style={{ color: MUTED, fontSize: 12, marginTop: 8 }}>No orders or fills at tastytrade or Webull in the last 7 days. Completed decision stories will appear here as the broker records them.</p>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {stories.map(st => {
            const fees = st.fills.reduce((n, f) => n + f.fees, 0);
            const cash = st.fills.reduce((n, f) => n + (f.value ?? 0), 0);
            // A partial sum is not the broker's figure (super order §7: missing
            // fees remain unknown, never zero by convenience).
            const feesKnown = st.fills.every(f => f.feesReported !== false);
            const cashKnown = st.fills.every(f => f.value != null);
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
                      <li style={{ color: MUTED }}>Net cash {cashKnown ? money(cash) : "not stated for every fill"} · fees {feesKnown ? money(fees) : "not reported for every fill"} — as tastytrade states it; P/L on open positions is not claimed here.</li>
                    )}
                  </ul>
                ) : st.orders.length ? <p style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>No fill yet.</p> : null}
                <StoryReviewRow storyKey={st.decisionId ?? st.key} />
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
