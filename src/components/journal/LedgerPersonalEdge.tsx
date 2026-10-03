"use client";

/**
 * PERSONAL EDGE · PROCESS × OUTCOME — the ledger's second half (Garden 18 v2
 * §38/§39/§53/§54/§59/§78). What the fills show, grouped by conditions the
 * broker record establishes, every group with its sample size; the trader's
 * own review grades set beside the money; the profile's daily-attempt rule
 * applied as CURRENT STRATEGY REPLAY, labelled as such. No motive, emotion or
 * cause is named — fills cannot establish them.
 */

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

import { computeLedgerEdge, MIN_SAMPLE } from "@/lib/broker/ledgerEdge";
import { processOutcome } from "@/lib/broker/processOutcome";
import { PROFILE_RULES, replayDailyRules } from "@/lib/broker/dailyRules";
import { ledgerTimeline, MIN_WINDOW, whatChanged } from "@/lib/broker/ledgerTimeline";
import { lessonHref, studyNext } from "@/lib/journal/studyRoute";
import { ProcessDays } from "@/components/journal/ProcessDays";
import { ExcursionStudy } from "@/components/journal/ExcursionStudy";
import { developmentTimeline } from "@/lib/journal/developmentTimeline";
import { behaviourTags, PATTERN_MIN, patternEvidence } from "@/lib/journal/behaviorTags";
import { EPISODE_MODELS_KEY, MODEL_LABEL, parseModels, resultsByModel, type ModelMark } from "@/lib/journal/episodeModel";
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
  const [models, setModels] = useState<Record<string, ModelMark>>({});
  useEffect(() => {
    const read = () => { setReviews(readStoryReviews()); try { setModels(parseModels(localStorage.getItem(EPISODE_MODELS_KEY))); } catch { /* none */ } };
    read();
    window.addEventListener("focus", read);
    const t = window.setInterval(read, 5_000);
    return () => { window.removeEventListener("focus", read); window.clearInterval(t); };
  }, []);
  const po = useMemo(() => processOutcome(episodes, reviews), [episodes, reviews]);
  const byModel = useMemo(() => resultsByModel(episodes, models), [episodes, models]);
  // 1R is the trader's own statement (no broker record holds it); kept on this device.
  const [oneR, setOneR] = useState<number>(0);
  useEffect(() => { try { setOneR(Number(localStorage.getItem("wm_ledger_one_r") ?? 0) || 0); } catch { /* none */ } }, []);
  const saveR = (v: number) => { setOneR(v); try { localStorage.setItem("wm_ledger_one_r", String(v)); } catch { /* this visit only */ } };
  const rules = useMemo(() => replayDailyRules(episodes, oneR), [episodes, oneR]);
  const timeline = useMemo(() => ledgerTimeline(episodes), [episodes]);
  const patterns = useMemo(() => patternEvidence(episodes, behaviourTags(episodes)), [episodes]);
  const study = useMemo(() => studyNext(edge, 3, patterns), [edge, patterns]);
  const story = useMemo(() => developmentTimeline({ months: timeline.months, windows: timeline.windows, changes, patterns, edge }), [timeline, changes, patterns, edge]);
  const changes = useMemo(() => whatChanged(timeline.months), [timeline]);
  const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toFixed(0)}%`);
  const money = (v: number | null) => (v == null ? "—" : usd(v));
  if (edge.universe === 0) return null;

  const Cell = ({ title, c, note }: { title: string; c: { n: number; net: number }; note: string }) => (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 6, padding: "8px 10px" }}>
      <div style={{ fontSize: 10, letterSpacing: 1, color: MUTED }}>{title}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: INK, fontVariantNumeric: "tabular-nums" }}>{c.n} <span style={{ fontSize: 12, color: tone(c.net) }}>{c.n ? usd(c.net) : ""}</span></div>
      <div style={{ fontSize: 10, color: MUTED }}>{note}</div>
    </div>
  );

  return (
    <section data-testid="ledger-personal-edge" aria-label="Personal edge from the broker ledger" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 10 }}>
      <div data-testid="edge-development-timeline" style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 10 }}>
        <div style={{ fontSize: 11, letterSpacing: 1, color: GOLD }}>DEVELOPMENT TIMELINE · FROM YOUR OWN RECORD</div>
        <p style={{ fontSize: 11, color: MUTED, margin: "4px 0 8px" }}>Every line is a number from the sections below — not motivation, not a verdict. Your history informs; it does not define you.</p>
        <div style={{ display: "grid", gap: 8 }}>
          {story.map(c => (
            <div key={c.id}>
              <div style={{ fontSize: 12, color: INK, fontWeight: 600 }}>{c.title}</div>
              <ul style={{ margin: "2px 0 0", paddingLeft: 18, fontSize: 11, color: MUTED, display: "grid", gap: 1 }}>{c.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>

      <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 10 }}>
        <div style={{ fontSize: 11, letterSpacing: 1, color: GOLD }}>PERSONAL EDGE · WHAT YOUR FILLS SHOW</div>
        <p style={{ fontSize: 11, color: MUTED, margin: "4px 0 8px" }}>
          {edge.universe} closed trades, overall expectancy <span style={{ color: tone(edge.overallExpectancy) }}>{usd(edge.overallExpectancy)}</span> per trade.
          Each group is compared with that. Groups under {MIN_SAMPLE} trades are marked INSUFFICIENT EVIDENCE and are not a pattern.
          A difference here is a correlation across your trades — it does not say why.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(330px,100%),1fr))", gap: 10 }}>
          {edge.dimensions.map(d => (
            <div key={d.id} data-testid={`edge-${d.id}`} style={{ border: `1px solid ${LINE}`, borderRadius: 6, padding: 8, overflowX: "auto" }}>
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

      <div data-testid="edge-patterns" style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 10, overflowX: "auto" }}>
        <div style={{ fontSize: 11, letterSpacing: 1, color: GOLD }}>PATTERNS FROM YOUR FILLS · WITH THE EVIDENCE FOR AND AGAINST</div>
        <p style={{ fontSize: 11, color: MUTED, margin: "4px 0 8px" }}>
          Behaviours the broker record shows, each with how often, the result per trade beside trades without it, the losing cases that support it and the winning cases that contradict it, and whether it is rarer lately. Under {PATTERN_MIN} cases it is not yet a pattern.
        </p>
        <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", fontVariantNumeric: "tabular-nums", minWidth: 640 }}>
          <thead><tr style={{ color: MUTED, textAlign: "right" }}><th style={{ textAlign: "left", fontWeight: 500 }}>Behaviour</th><th style={{ fontWeight: 500 }}>Trades</th><th style={{ fontWeight: 500 }}>Per trade</th><th style={{ fontWeight: 500 }}>Without it</th><th style={{ fontWeight: 500 }}>Losers / winners</th><th style={{ fontWeight: 500 }}>Last 100 vs before</th><th style={{ fontWeight: 500 }}>Seen</th></tr></thead>
          <tbody>{patterns.map(p => (
            <tr key={p.id} data-evidence={p.evidence} style={{ borderTop: `1px solid ${LINE}`, textAlign: "right", color: p.evidence === "SUPPORTED" ? INK : MUTED }}>
              <td style={{ textAlign: "left", padding: "3px 0" }}>{p.label}{p.evidence === "SUPPORTED" ? "" : " · INSUFFICIENT EVIDENCE"}</td>
              <td>{p.n}</td>
              <td style={{ color: tone(p.expectancy) }}>{usd(p.expectancy)}</td>
              <td>{p.withoutExpectancy == null ? "—" : usd(p.withoutExpectancy)}</td>
              <td>{p.supporting} / {p.contradicting}</td>
              <td>{p.recentShare == null ? "—" : `${Math.round(p.recentShare * 100)}%`} vs {p.earlierShare == null ? "—" : `${Math.round(p.earlierShare * 100)}%`}</td>
              <td style={{ whiteSpace: "nowrap" }}>{p.firstSeen.slice(0, 10)} → {p.lastSeen.slice(0, 10)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <div data-testid="edge-study-next" style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 10 }}>
        <div style={{ fontSize: 11, letterSpacing: 1, color: GOLD }}>STUDY NEXT · WHERE YOUR OWN EVIDENCE IS HEAVIEST</div>
        <p style={{ fontSize: 11, color: MUTED, margin: "4px 0 8px" }}>
          Only groups with at least {MIN_SAMPLE} trades that cost you more than your average, heaviest first. Each points to the Academy lesson nearest the capability involved — a pointer from evidence, not a diagnosis of why.
        </p>
        {study.length === 0 ? <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>No supported group costs more than your average yet.</p> : (
          <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 12, color: INK }}>
            {study.map(x => (
              <li key={`${x.dimension}-${x.bucket.key}`}>
                <b>{x.dimension}: {x.bucket.key}</b> — {x.bucket.n} trades, {usd(x.bucket.expectancy)} per trade (<span style={{ color: tone(x.bucket.vsOverall) }}>{usd(x.bucket.vsOverall)}</span> {x.dimension === "Pattern from your fills" ? "vs trades without it" : "vs your average"}), {usd(x.bucket.net)} in all.
                <div style={{ fontSize: 11, color: MUTED }}>
                  Capability: {x.capability}.{" "}
                  {x.lesson ? <Link href={lessonHref(x.lesson.id)} style={{ color: GOLD }}>Study “{x.lesson.title}” →</Link> : <span>The Academy has no lesson for this yet.</span>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <ExcursionStudy episodes={episodes} />

      <div data-testid="edge-timeline" style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 10, overflowX: "auto" }}>
        <div style={{ fontSize: 11, letterSpacing: 1, color: GOLD }}>OVER TIME · RECENT WINDOWS BESIDE THE WHOLE RECORD</div>
        <p style={{ fontSize: 11, color: MUTED, margin: "4px 0 8px" }}>
          Your latest trades next to your lifetime, so old months inform without defining you. A window smaller than its size is marked — it is not yet proof of change.
        </p>
        <table style={{ width: "100%", maxWidth: 760, fontSize: 12, borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
          <thead><tr style={{ color: MUTED, textAlign: "right" }}><th style={{ textAlign: "left", fontWeight: 500 }}>Window</th><th style={{ fontWeight: 500 }}>Trades</th><th style={{ fontWeight: 500 }}>Win</th><th style={{ fontWeight: 500 }}>Per trade</th><th style={{ fontWeight: 500 }}>Avg win</th><th style={{ fontWeight: 500 }}>Avg loss</th><th style={{ fontWeight: 500 }}>Net</th></tr></thead>
          <tbody>{timeline.windows.map(w => (
            <tr key={w.label} style={{ borderTop: `1px solid ${LINE}`, textAlign: "right", color: w.enough ? INK : MUTED }}>
              <td style={{ textAlign: "left", padding: "2px 0" }}>{w.label}{w.enough ? "" : ` · only ${w.n}`}</td>
              <td>{w.n}</td><td>{pct(w.winRate)}</td>
              <td style={{ color: w.enough && w.expectancy != null ? tone(w.expectancy) : undefined }}>{money(w.expectancy)}</td>
              <td>{money(w.avgWin)}</td><td>{money(w.avgLoss)}</td>
              <td style={{ color: w.enough ? tone(w.net) : undefined }}>{usd(w.net)}</td>
            </tr>
          ))}</tbody>
        </table>
        <div data-testid="edge-what-changed" style={{ margin: "12px 0 0" }}>
          <div style={{ fontSize: 11, color: GOLD, letterSpacing: 1, marginBottom: 4 }}>WHAT CHANGED · BETWEEN MONTHS WITH {MIN_WINDOW}+ TRADES</div>
          {changes.length === 0 ? <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>No large month-to-month shift in how you traded yet.</p> : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: INK, display: "grid", gap: 2 }}>
              {changes.map(c => <li key={`${c.month}-${c.measure}`}>{c.measure}: <b>{c.before}</b> in {c.from} → <b>{c.after}</b> in {c.month}</li>)}
            </ul>
          )}
          <p style={{ fontSize: 10, color: MUTED, margin: "4px 0 0" }}>A change in how you traded, not a verdict on it — the month rows below are the evidence.</p>
        </div>
        <div style={{ fontSize: 11, color: GOLD, letterSpacing: 1, margin: "12px 0 4px" }}>MONTH BY MONTH · HOW YOU TRADED</div>
        <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
          <thead><tr style={{ color: MUTED, textAlign: "right" }}><th style={{ textAlign: "left", fontWeight: 500 }}>Month</th><th style={{ fontWeight: 500 }}>Trades</th><th style={{ fontWeight: 500 }}>Days</th><th style={{ fontWeight: 500 }}>Per day</th><th style={{ fontWeight: 500 }}>Days past 2nd trade</th><th style={{ fontWeight: 500 }}>Bracket at entry</th><th style={{ fontWeight: 500 }}>Win</th><th style={{ fontWeight: 500 }}>Avg win</th><th style={{ fontWeight: 500 }}>Avg loss</th><th style={{ fontWeight: 500 }}>Per trade</th></tr></thead>
          <tbody>{timeline.months.map(m => (
            <tr key={m.month} style={{ borderTop: `1px solid ${LINE}`, textAlign: "right", color: m.trades >= MIN_WINDOW ? INK : MUTED }}>
              <td style={{ textAlign: "left", padding: "2px 0" }}>{m.month}</td>
              <td>{m.trades}</td><td>{m.days}</td><td>{m.tradesPerDay}</td><td>{pct(m.pastSecondShare)}</td><td>{pct(m.bracketShare)}</td>
              <td>{pct(m.winRate)}</td><td>{money(m.avgWin)}</td><td>{money(m.avgLoss)}</td>
              <td style={{ color: tone(m.expectancy) }}>{usd(m.expectancy)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <div data-testid="edge-daily-attempts" style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 10 }}>
        <div style={{ fontSize: 11, letterSpacing: 1, color: GOLD }}>DAILY ATTEMPTS · YOUR PROFILE RULE: “SECOND ATTEMPT ONLY AFTER FRESH AUTHORIZATION — NO THIRD”</div>
        <p style={{ fontSize: 11, color: MUTED, margin: "4px 0 8px" }}>
          CURRENT STRATEGY REPLAY — today's profile rules (v1, recorded 2026-10-02) applied to past days. When this rule took effect is not recorded, so this is not a judgement of how you traded then.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 12, color: INK, fontVariantNumeric: "tabular-nums" }}>
          {edge.daily.byCount.map(r => <span key={r.key}>{r.key}: <b>{r.days}</b> days · <span style={{ color: tone(r.net) }}>{usd(r.net)}</span></span>)}
        </div>
        <div style={{ marginTop: 10, borderTop: `1px dashed ${LINE}`, paddingTop: 8 }}>
          <label style={{ fontSize: 11, color: MUTED }}>
            Your 1R in dollars (it is not in any broker record) ·{" "}
            <input type="number" min={1} step={1} value={oneR || ""} placeholder="e.g. 50" onChange={ev => saveR(Number(ev.target.value) || 0)}
              data-testid="edge-one-r" aria-label="One R in dollars"
              style={{ width: 80, background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, fontSize: 12, padding: "2px 6px", borderRadius: 4 }} />
          </label>
          {rules ? (
            <p data-testid="edge-daily-rules" style={{ fontSize: 12, color: INK, margin: "6px 0 0" }}>
              Daily stop {PROFILE_RULES.dailyStopR}R ({usd(PROFILE_RULES.dailyStopR * rules.oneR)}): reached on {rules.stopDays} of {rules.days} days; {rules.afterStopTrades} trades were opened after it, netting <span style={{ color: tone(rules.afterStopNet) }}>{usd(rules.afterStopNet)}</span>.
              {" "}Shutdown +{PROFILE_RULES.shutdownR}R ({usd(PROFILE_RULES.shutdownR * rules.oneR)}): reached on {rules.shutdownDays} days; {rules.afterShutdownTrades} trades opened after it, netting <span style={{ color: tone(rules.afterShutdownNet) }}>{usd(rules.afterShutdownNet)}</span>.
            </p>
          ) : (
            <p style={{ fontSize: 11, color: MUTED, margin: "6px 0 0" }}>State your 1R to replay the {PROFILE_RULES.dailyStopR}R daily stop and +{PROFILE_RULES.shutdownR}R shutdown over these days.</p>
          )}
        </div>
        <p style={{ fontSize: 12, color: INK, margin: "8px 0 0" }}>
          {edge.daily.thirdPlusDays} of {edge.daily.days} trading days had a third or later trade — {edge.daily.thirdPlusTrades} trades beyond the second, netting <span style={{ color: tone(edge.daily.thirdPlusNet) }}>{usd(edge.daily.thirdPlusNet)}</span>.
        </p>
      </div>

      <div data-testid="edge-by-model" style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 10 }}>
        <div style={{ fontSize: 11, letterSpacing: 1, color: GOLD }}>BY MODEL · FROM YOUR OWN MARKS</div>
        <p style={{ fontSize: 11, color: MUTED, margin: "4px 0 8px" }}>Mark a trade&apos;s model in its detail below; only marked trades count here ({byModel.marked} marked). An M0 mark on a filled trade means a trade where the model said wait.</p>
        {byModel.rows.length === 0 ? <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>No trade marked yet.</p> : (
          <table style={{ fontSize: 12, borderCollapse: "collapse", fontVariantNumeric: "tabular-nums", minWidth: 360 }}>
            <tbody>{byModel.rows.map(r => (
              <tr key={r.model} style={{ borderTop: `1px solid ${LINE}`, color: r.n >= MIN_SAMPLE ? INK : MUTED }}>
                <td style={{ padding: "2px 12px 2px 0" }}>{MODEL_LABEL[r.model]}</td><td style={{ textAlign: "right", paddingRight: 12 }}>{r.n}</td>
                <td style={{ textAlign: "right", paddingRight: 12 }}>{Math.round((r.wins / r.n) * 100)}%</td>
                <td style={{ textAlign: "right", color: tone(r.expectancy) }}>{usd(r.expectancy)}/trade</td>
                <td style={{ paddingLeft: 12 }}>{r.n < MIN_SAMPLE ? "INSUFFICIENT EVIDENCE" : ""}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      <ProcessDays episodes={episodes} />

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
