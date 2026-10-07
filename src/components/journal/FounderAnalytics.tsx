"use client";
/**
 * JOURNAL › BROKER LEDGER › PERSONAL ANALYTICS — Drive Garden 18 snapshot
 * 2026-10-02 §I. Owner-only by construction: it renders only from round trips
 * the owner-gated ledger routes returned (a guest gets refusals there, so this
 * shows nothing). Read-only; nothing is sent to a broker.
 *
 * Model 1 / Model 2 tags are PROPOSED (founderAnalytics) — from models the
 * trader recorded, never from results — until the Founder confirms the
 * definitions. Patterns are counted from held facts with their sample size;
 * under 20 they say INSUFFICIENT EVIDENCE. No shame language: this is for
 * learning, discipline and measurable improvement.
 */
import React, { useEffect, useMemo, useState } from "react";

import type { TtRoundTrip } from "@/lib/broker/tastytradeLedger";
import type { Episode } from "@/lib/broker/webullLedger";
import { behaviourTags } from "@/lib/journal/behaviorTags";
import { EPISODE_MODELS_KEY, parseModels, type ModelMark } from "@/lib/journal/episodeModel";
import {
  mistakePatterns, proposeModel, provenanceCensus, tripFromTastytrade, tripFromWebull,
  type AnalyticsTrip, type JournalFact, type ProposedModel,
} from "@/lib/journal/founderAnalytics";
import { hydrateJournalEntries } from "@/lib/journal/hydrateJournalEntries";
import { readJournalStorage } from "@/lib/traderMemory/adapters/journalStorage";

const GOLD = "#C9A55C", MUTED = "#8a8271", INK = "#ede6d3", LINE = "rgba(139,106,41,0.25)";

export interface TtTripsByAccount { readonly tail: string; readonly fills: number; readonly trips: readonly TtRoundTrip[] }

function readJournalFacts(): JournalFact[] {
  try {
    const read = readJournalStorage(window.localStorage);
    return hydrateJournalEntries(read.records).entries.map(e => ({
      id: e.id, date: e.date, symbol: e.symbol, dayModel: e.dayModel as ModelMark | undefined,
      plannedRDollars: e.plannedRDollars, realizedR: e.realizedR, mfeR: e.mfeR,
    }));
  } catch { return []; }
}

const MODEL_WORD: Readonly<Record<ProposedModel, string>> = { MODEL_1: "Model 1", MODEL_2: "Model 2", UNCLASSIFIED: "Unclassified" };

export function FounderAnalytics({ episodes, ttAccounts }: { episodes: readonly Episode[]; ttAccounts: readonly TtTripsByAccount[] }) {
  const [journal, setJournal] = useState<JournalFact[]>([]);
  const [marks, setMarks] = useState<Record<string, ModelMark>>({});
  useEffect(() => {
    setJournal(readJournalFacts());
    try { setMarks(parseModels(window.localStorage.getItem(EPISODE_MODELS_KEY))); } catch { setMarks({}); }
  }, []);

  const trips = useMemo<AnalyticsTrip[]>(() => [
    ...episodes.map(tripFromWebull),
    ...ttAccounts.flatMap(a => a.trips.map(t => tripFromTastytrade(t, a.tail)).filter((t): t is AnalyticsTrip => t != null)),
  ], [episodes, ttAccounts]);
  const proposals = useMemo(() => trips.filter(t => t.closedAt).map(t => proposeModel(t, marks[t.id], journal)), [trips, marks, journal]);
  const patterns = useMemo(() => mistakePatterns({ trips, webullTags: behaviourTags(episodes), marks, journal }), [trips, episodes, marks, journal]);
  const fills = useMemo(() => episodes.reduce((s, e) => s + e.entries.length + e.exits.length, 0) + ttAccounts.reduce((s, a) => s + a.fills, 0), [episodes, ttAccounts]);
  const census = useMemo(() => provenanceCensus(trips, fills, journal.length), [trips, fills, journal.length]);

  if (!trips.length) return null;
  const counts = proposals.reduce((m, p) => ({ ...m, [p.model]: (m[p.model] ?? 0) + 1 }), {} as Partial<Record<ProposedModel, number>>);
  const recentClassified = proposals.filter(p => p.model !== "UNCLASSIFIED").slice(0, 8);

  return (
    <section data-testid="founder-analytics" aria-label="Personal analytics" style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 10, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "baseline" }}>
        <span style={{ fontSize: 11, letterSpacing: 1, color: GOLD }}>PERSONAL ANALYTICS · OWNER ONLY</span>
        <span style={{ fontSize: 11, color: MUTED }}>For learning and discipline — facts first, your own records second, no verdicts.</span>
      </div>

      <div data-testid="founder-provenance" style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 11.5, fontVariantNumeric: "tabular-nums", color: INK }}>
        {(Object.keys(census) as (keyof typeof census)[]).map(k => <span key={k} data-provenance={k}>{k} <b>{census[k]}</b></span>)}
      </div>

      <div data-testid="founder-models" style={{ display: "grid", gap: 4 }}>
        <div style={{ fontSize: 11, letterSpacing: 1, color: GOLD }}>MODEL 1 / MODEL 2 · PROPOSED</div>
        <div style={{ fontSize: 12, color: INK, fontVariantNumeric: "tabular-nums" }}>
          Model 1 <b>{counts.MODEL_1 ?? 0}</b> · Model 2 <b>{counts.MODEL_2 ?? 0}</b> · Unclassified <b>{counts.UNCLASSIFIED ?? 0}</b> of {proposals.length} closed trades
        </div>
        <p style={{ margin: 0, fontSize: 11, color: MUTED }}>
          Tagged only from a model you recorded (a ledger mark, or a journal day model for the same day and symbol). Fills cannot show regime, structure or location, so a trade with no record stays Unclassified — WM never infers a model from the result. Definitions from your strategy document (Model 1: trend / expansion, 3R+ runway; Model 2: rotation at a qualified edge, 1R baseline) await your confirmation.
        </p>
        {recentClassified.length ? (
          <details style={{ fontSize: 11.5, color: INK }}>
            <summary style={{ cursor: "pointer", color: GOLD, minHeight: 24 }}>Evidence for the latest {recentClassified.length}</summary>
            <ul style={{ margin: "4px 0 0", paddingLeft: 14, display: "grid", gap: 4 }}>
              {recentClassified.map(p => {
                const t = trips.find(x => x.id === p.tripId)!;
                return (
                  <li key={p.tripId} data-model={p.model}>
                    <b>{MODEL_WORD[p.model]}</b> · {t.symbol} · {t.broker} · {new Date(t.openedAt).toLocaleDateString()} <span style={{ color: MUTED }}>({t.provenance})</span>
                    {p.evidence.map((e, i) => <div key={i} style={{ color: MUTED }}><span style={{ fontSize: 9.5, letterSpacing: ".06em" }}>{e.kind}</span> · {e.text}</div>)}
                  </li>
                );
              })}
            </ul>
          </details>
        ) : null}
      </div>

      <div data-testid="founder-patterns" style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 11, letterSpacing: 1, color: GOLD }}>PATTERNS WORTH REVIEWING</div>
        {patterns.map(p => (
          <div key={p.id} data-pattern={p.id} data-state={p.state} style={{ display: "grid", gap: 2, borderLeft: `2px solid ${LINE}`, paddingLeft: 8 }}>
            <div style={{ fontSize: 12, color: INK, fontVariantNumeric: "tabular-nums" }}>
              {p.label} · <b>{p.occurrences}</b> of {p.sample}{p.share != null ? ` (${Math.round(p.share * 100)}%)` : ""}{" "}
              <span style={{ fontSize: 10, letterSpacing: ".06em", color: p.state === "MEASURED" ? GOLD : MUTED }}>{p.state === "MEASURED" ? "MEASURED" : `INSUFFICIENT EVIDENCE · fewer than 20`}</span>
            </div>
            <div style={{ fontSize: 10.5, color: MUTED }}><span style={{ letterSpacing: ".06em" }}>{p.evidenceKind}</span> · {p.basis}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
