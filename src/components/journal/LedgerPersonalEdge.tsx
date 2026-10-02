"use client";

/**
 * PERSONAL EDGE · PROCESS × OUTCOME — the ledger's second half (Garden 18 v2
 * §38/§39/§53/§54/§59/§78). What the fills show, grouped by conditions the
 * broker record establishes, every group with its sample size; the trader's
 * own review grades set beside the money; the profile's daily-attempt rule
 * applied as CURRENT STRATEGY REPLAY, labelled as such. No motive, emotion or
 * cause is named — fills cannot establish them.
 */

import React, { useEffect, useMemo, useState } from "react";

import { computeLedgerEdge, MIN_SAMPLE } from "@/lib/broker/ledgerEdge";
import { processOutcome } from "@/lib/broker/processOutcome";
import type { Episode } from "@/lib/broker/webullLedger";
import { readStoryReviews, type StoryReview } from "@/lib/journal/storyReview";

const GOLD = "#C9A55C";
const MUTED = "#8a8271";
const INK = "#ede6d3";
const LINE = "rgba(139,106,41,0.25)";
const UP = "#7fd1a8";
const DOWN = "#e0786b";
const usd = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const tone = (v: number) => (v > 0 ? UP : v < 0 ? DOWN : INK);

export function LedgerPersonalEdge({ episodes }: { readonly episodes: readonly Episode[] }) {
  const edge = useMemo(() => computeLedgerEdge(episodes), [episodes]);
  const [reviews, setReviews] = useState<Readonly<Record<string, StoryReview>>>({});
  useEffect(() => {
    const read = () => setReviews(readStoryReviews());
    read();
    window.addEventListener("focus", read);
    const t = window.setInterval(read, 5_000);
    return () => { window.removeEventListener("focus", read); window.clearInterval(t); };
  }, []);
  const po = useMemo(() => processOutcome(episodes, reviews), [episodes, reviews]);
  if (edge.universe === 0) return null;

  const Cell = ({ title, c, note }: { title: string; c: { n: number; net: number }; note: string }) => (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 6, padding: "8px 10px" }}>
      <div style={{ fontSize: 10, letterSpacing: 1, color: MUTED }}>{title}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: INK, fontVariantNumeric: "tabular-nums" }}>{c.n} <span style={{ fontSize: 12, color: tone(c.net) }}>{c.n ? usd(c.net) : ""}</span></div>
      <div style={{ fontSize: 10, color: MUTED }}>{note}</div>
    </div>
  );

  return (
    <section data-testid="ledger-personal-edge" aria-label="Personal edge from the broker ledger" style={{ display: "grid", gap: 10 }}>
      <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 10 }}>
        <div style={{ fontSize: 11, letterSpacing: 1, color: GOLD }}>PERSONAL EDGE · WHAT YOUR FILLS SHOW</div>
        <p style={{ fontSize: 11, color: MUTED, margin: "4px 0 8px" }}>
          {edge.universe} closed trades, overall expectancy <span style={{ color: tone(edge.overallExpectancy) }}>{usd(edge.overallExpectancy)}</span> per trade.
          Each group is compared with that. Groups under {MIN_SAMPLE} trades are marked INSUFFICIENT EVIDENCE and are not a pattern.
          A difference here is a correlation across your trades — it does not say why.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", gap: 10 }}>
          {edge.dimensions.map(d => (
            <div key={d.id} data-testid={`edge-${d.id}`} style={{ border: `1px solid ${LINE}`, borderRadius: 6, padding: 8 }}>
              <div style={{ fontSize: 12, color: INK, fontWeight: 600 }}>{d.title}</div>
              <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>{d.question}</div>
              <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
                <thead><tr style={{ color: MUTED, textAlign: "right" }}><th style={{ textAlign: "left", fontWeight: 500 }}>Group</th><th style={{ fontWeight: 500 }}>n</th><th style={{ fontWeight: 500 }}>Win</th><th style={{ fontWeight: 500 }}>Per trade</th><th style={{ fontWeight: 500 }}>vs you</th></tr></thead>
                <tbody>{d.buckets.map(b => {
                  const thin = b.evidence !== "SUPPORTED";
                  return (
                    <tr key={b.key} data-evidence={b.evidence} style={{ borderTop: `1px solid ${LINE}`, textAlign: "right", color: thin ? MUTED : INK }}>
                      <td style={{ textAlign: "left", padding: "2px 0" }}>{b.key}</td>
                      <td>{b.n}</td>
                      <td>{(b.winRate * 100).toFixed(0)}%</td>
                      <td style={{ color: thin ? MUTED : tone(b.expectancy) }}>{usd(b.expectancy)}</td>
                      <td style={{ color: thin ? MUTED : tone(b.vsOverall) }}>{thin ? <span title={`Fewer than ${MIN_SAMPLE} trades`}>INSUFFICIENT EVIDENCE</span> : usd(b.vsOverall)}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      <div data-testid="edge-daily-attempts" style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 10 }}>
        <div style={{ fontSize: 11, letterSpacing: 1, color: GOLD }}>DAILY ATTEMPTS · YOUR PROFILE RULE: “SECOND ATTEMPT ONLY AFTER FRESH AUTHORIZATION — NO THIRD”</div>
        <p style={{ fontSize: 11, color: MUTED, margin: "4px 0 8px" }}>
          CURRENT STRATEGY REPLAY — today's profile rule applied to past days. When this rule took effect is not recorded, so this is not a judgement of how you traded then.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 12, color: INK, fontVariantNumeric: "tabular-nums" }}>
          {edge.daily.byCount.map(r => <span key={r.key}>{r.key}: <b>{r.days}</b> days · <span style={{ color: tone(r.net) }}>{usd(r.net)}</span></span>)}
        </div>
        <p style={{ fontSize: 12, color: INK, margin: "8px 0 0" }}>
          {edge.daily.thirdPlusDays} of {edge.daily.days} trading days had a third or later trade — {edge.daily.thirdPlusTrades} trades beyond the second, netting <span style={{ color: tone(edge.daily.thirdPlusNet) }}>{usd(edge.daily.thirdPlusNet)}</span>.
        </p>
      </div>

      <div data-testid="edge-process-outcome" style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 10 }}>
        <div style={{ fontSize: 11, letterSpacing: 1, color: GOLD }}>PROCESS × OUTCOME · FROM YOUR OWN REVIEWS</div>
        <p style={{ fontSize: 11, color: MUTED, margin: "4px 0 8px" }}>
          Grades come only from the review on each trade below (any BROKE mark = process broke). {po.reviewed} reviewed, {po.unreviewed} not yet reviewed.
          A green trade with a broken process is still a broken process; a disciplined loss is still discipline.
        </p>
        {po.reviewed === 0 ? (
          <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>No trade has been reviewed yet — open any episode below and mark it. Nothing is inferred in its place.</p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(150px,1fr))", gap: 8, maxWidth: 520 }}>
              <Cell title="PROCESS HELD · WIN" c={po.goodWin} note="earned" />
              <Cell title="PROCESS HELD · LOSS" c={po.goodLoss} note="disciplined loss — loss as data" />
              <Cell title="PROCESS BROKE · WIN" c={po.badWin} note="profitable mistake" />
              <Cell title="PROCESS BROKE · LOSS" c={po.badLoss} note="the costliest kind" />
            </div>
            <p style={{ fontSize: 12, color: INK, margin: "8px 0 0" }}>
              Trades with a broken process netted <span style={{ color: tone(po.brokeNet) }}>{usd(po.brokeNet)}</span>.
              {po.brokeBy.length ? ` Most often broken: ${po.brokeBy.slice(0, 3).map(b => `${b.dimension} (${b.broke})`).join(", ")}.` : ""}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
