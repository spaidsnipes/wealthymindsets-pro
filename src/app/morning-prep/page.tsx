"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DREAMBOARD_URL } from "@/lib/canonicalUrl";
import {
  Sun, Plus, X, Check, Trash2, Image as ImageIcon,
  CheckCircle2, Circle, Coffee, Target,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { FabioInsights } from "@/components/fabio/FabioInsights";
import WmWordmark from "@/components/brand/WmWordmark";
import RealmGateway from "@/components/brand/RealmGateway";
import OpeningBellPanel from "@/components/opening-bell/OpeningBellPanel";
import {
  selectOpeningBell,
  DEFAULT_PREPARATION_TEMPLATE,
  type PreparationItem,
} from "@/lib/traderMemory/viewModels/selectOpeningBell";
import MirrorPanel from "@/components/mirror/MirrorPanel";
import { selectMirror } from "@/lib/traderMemory/viewModels/selectMirror";
import { useJournalSnapshots } from "@/lib/traderMemory/adapters/useJournalSnapshots";
import { readJournalStorage } from "@/lib/traderMemory/adapters/journalStorage";
import type { AdaptableJournalEntry } from "@/lib/traderMemory/adapters/journalEntryToSnapshot";
import { journalEntriesToEdgeEntries } from "@/lib/traderMemory/adapters/journalEntryToEdgeEntry";
import { selectFocusStreak } from "@/lib/learningGenome/selectFocusStreak";
import { selectRuleAdherenceStreak } from "@/lib/learningGenome/selectRuleAdherenceStreak";
import type { EdgeEntry } from "@/lib/proofLane/selectSessionEdge";
import {
  readMorningPrepEntries,
  writeMorningPrepEntries,
  type MorningPrepChecklistItem as ChecklistItem,
  type MorningPrepEntry as PrepEntry,
  type MorningPrepReadState,
} from "@/lib/traderMemory/morningPrepStorage";

/* ══════════════════════════════════════════════════════════════
   Morning Prep — a focused space for building discipline through
   morning routines and personal development.

   Entries persist per-user in localStorage so a member's prep log
   survives reloads without depending on a backend table.
══════════════════════════════════════════════════════════════ */

const MOODS = ["😴", "🙂", "😃", "🔥", "🧠", "💪", "🎯", "☕"];

/**
 * MorningPrepOpeningBell — thin adapter between /morning-prep local state
 * and the shared selectOpeningBell selector. Renders the OpeningBellPanel
 * with the default preparation template. Personal items stay optional
 * per Founder §D09 — never imposed.
 *
 * Today the completion state is inferred conservatively (today's entry
 * counts as "personal reflection" done + "body ready" done; everything
 * else remains not-done until the founder threads richer state through).
 * When the DecisionMemoryStore + real prep-item persistence land, this
 * will bind to actual completion data — no code change here.
 */
/**
 * MorningPrepMirror — journal-backed Mirror surface for the morning.
 * Renders nothing when no patterns detected (silence-is-a-feature §14).
 * When present, gives the trader a 'here's what yesterday's decisions
 * teach me' reflection surface before the market opens.
 */
/**
 * MorningPrepStreakBadge — canon §Public Blessing.
 *
 * A trader opening morning-prep before the bell benefits from a
 * calm, honest signal of what they've already earned — consecutive
 * plan-followed trades + consecutive clean days — so the morning
 * frame is CONTINUITY, not zero-state anxiety.
 *
 * Silent when both streaks measure zero (canon: no fake
 * encouragement; a fresh trader should not see fabricated pride).
 * Reads the same wm_journal_entries store /journal uses so the
 * numbers are consistent surface-to-surface.
 */
function MorningPrepStreakBadge({ userId }: { userId: string }) {
  const [edge, setEdge] = React.useState<readonly EdgeEntry[]>([]);
  React.useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    const read = readJournalStorage(window.localStorage);
    if (read.status === "UNAVAILABLE" || read.status === "INVALID" || read.status === "ABSENT") {
      setEdge([]);
      return;
    }
    // Journal entries are stored newest-first; selectFocusStreak
    // depends on that order for `current`, so pass through as-is.
    // Map the AdaptableJournalEntry shape into EdgeEntry — only
    // fields the streak selectors read (date + result + processQuality).
    const records = read.records as readonly AdaptableJournalEntry[];
    setEdge(journalEntriesToEdgeEntries(records));
  }, [userId]);
  const focusStreak = React.useMemo(() => selectFocusStreak(edge), [edge]);
  const dayStreak = React.useMemo(() => selectRuleAdherenceStreak(edge), [edge]);
  if (focusStreak.current === 0 && dayStreak.current === 0) return null;
  return (
    <section
      aria-label="Morning discipline continuity"
      className="rounded-2xl px-4 py-3 mb-3"
      style={{
        background: "linear-gradient(135deg, rgba(240,180,41,0.10), rgba(0,212,170,0.06))",
        border: "1px solid rgba(240,180,41,0.30)",
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-[10px] font-black uppercase tracking-[0.18em]"
          style={{ color: "#F0B429" }}
        >
          Continuity
        </span>
        {focusStreak.current > 0 && (
          <span
            className="text-[11px] px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(240,180,41,0.15)",
              color: "#F8D477",
              border: "1px solid rgba(240,180,41,0.35)",
            }}
            title="Consecutive plan-followed trades (§Public Blessing focus streak)"
          >
            Focus streak {focusStreak.current} · best {focusStreak.best}
          </span>
        )}
        {dayStreak.current > 0 && (
          <span
            className="text-[11px] px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(0,212,170,0.13)",
              color: "#88F5D3",
              border: "1px solid rgba(0,212,170,0.35)",
            }}
            title="Consecutive days with zero BROKE_RULES entries"
          >
            Clean days {dayStreak.current} · best {dayStreak.best}
          </span>
        )}
      </div>
    </section>
  );
}

function MorningPrepMirror({ userId }: { userId: string }) {
  const snapshots = useJournalSnapshots(userId || null);
  const nowMs = React.useMemo(() => Date.now(), [snapshots.length]);
  const vm = React.useMemo(
    () => selectMirror({ ownerId: userId, decisions: snapshots, nowMs }),
    [userId, snapshots, nowMs],
  );
  if (vm.patterns.length === 0) return null;
  return <MirrorPanel vm={vm} />;
}

function MorningPrepOpeningBell({ entriesCount, userId }: { entriesCount: number; userId: string }) {
  // Deterministic derivation — no wall clock reads inside the selector.
  const nowMs = React.useMemo(() => Date.now(), []);
  const hasTodayEntry = entriesCount > 0;
  const items: PreparationItem[] = DEFAULT_PREPARATION_TEMPLATE.map((t) => ({
    ...t,
    // A morning entry existing today counts as personal reflection + body
    // ready done. All other items stay not-done until the founder wires
    // richer state through.
    completed: t.category === "personal" ? hasTodayEntry : false,
    completedAt: t.category === "personal" && hasTodayEntry ? nowMs : undefined,
  }));
  const vm = selectOpeningBell({
    ownerId: userId,
    sessionIdentity: `session-${new Date(nowMs).toISOString().slice(0, 10)}`,
    items,
    minutesUntilOpen: null,
    nowMs,
  });
  return <OpeningBellPanel vm={vm} />;
}

// Trader-canon prep checklist — founder Aug-16 §OPENING BELL PROTOCOL.
// The old wellness-only list was general lifestyle; a trading Operating
// System needs the actual pre-market ritual dimensions. Items map 1:1
// to the canon list (mental state, economic calendar, key levels,
// session, risk per trade, max daily loss, market scenario, intention,
// news/catalysts, execution focus) with light wellness items preserved
// because they measurably affect trader state.
const STARTER_CHECKLIST = [
  "Mental state honest — logged mood",
  "Economic calendar reviewed",
  "Key levels prepared (support / resistance / VWAP / POC)",
  "Session and hours selected",
  "Risk per trade set",
  "Maximum daily loss set",
  "Market scenario written (best / base / worst)",
  "Primary intention written",
  "News / catalysts reviewed",
  "Execution focus chosen (setup type / entry rules)",
  "Hydration + focus reset (5 min breathwork)",
];

const GROWTH_PRACTICES = {
  spiritual: ["Prayer", "Bible", "Worship", "Reflection", "Gratitude"],
  physical: ["Sleep", "Workout", "Steps", "Nutrition", "Water", "Recovery"],
  mental: ["Reading", "Learning", "Journaling", "Thinking", "Meditation"],
  financial: ["Budget", "Investments", "Trading", "Business", "Saving"],
  creative: ["Dreamboard", "Writing", "Music", "Studios", "Projects"],
  relationships: ["Family", "Friends", "Mentorship", "Serving"],
  work: ["Job", "Business", "Clients", "Sales", "Meetings", "Deep Work"],
} as const;

type GrowthCategory = keyof typeof GROWTH_PRACTICES;

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export default function MorningPrepPage() {
  const { user } = useAuth();
  const ownerId = user?.id ?? null;

  const [ownedEntries, setOwnedEntries] = useState<{
    ownerId: string | null;
    entries: PrepEntry[];
    readState: MorningPrepReadState;
  }>({ ownerId: null, entries: [], readState: "UNAVAILABLE" });
  const entries = ownedEntries.ownerId === ownerId ? ownedEntries.entries : [];
  const prepReadState = ownedEntries.ownerId === ownerId ? ownedEntries.readState : "UNAVAILABLE";
  const [showCompose, setShowCompose] = useState(false);
  const [growthState, setGrowthState] = useState<"loading" | "connected" | "unavailable">("loading");
  const [growthRecords, setGrowthRecords] = useState(0);
  const [growthCategory, setGrowthCategory] = useState<GrowthCategory>("creative");
  const [growthPractice, setGrowthPractice] = useState("Dreamboard");
  const [growthReflection, setGrowthReflection] = useState("");
  const [growthSaving, setGrowthSaving] = useState(false);
  const [growthMessage, setGrowthMessage] = useState("");

  useEffect(() => {
    if (!ownerId) {
      setOwnedEntries({ ownerId: null, entries: [], readState: "UNAVAILABLE" });
      return;
    }
    const result = readMorningPrepEntries(ownerId);
    setOwnedEntries({ ownerId, entries: [...result.entries], readState: result.state });
  }, [ownerId]);
  useEffect(() => {
    if (!user) { setGrowthState("unavailable"); return; }
    let live = true;
    fetch("/api/morning-prep/growth-rings", { credentials: "include" })
      .then(async response => ({ response, body: await response.json().catch(() => ({})) }))
      .then(({ response, body }) => {
        if (!live) return;
        if (!response.ok || !Array.isArray(body.entries)) { setGrowthState("unavailable"); return; }
        const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
        setGrowthRecords(body.entries.filter((entry: { occurred_on?: string }) => entry.occurred_on && new Date(`${entry.occurred_on}T00:00:00`).getTime() >= cutoff).length);
        setGrowthState("connected");
      }).catch(() => { if (live) setGrowthState("unavailable"); });
    return () => { live = false; };
  }, [user]);

  const persist = useCallback((next: PrepEntry[]) => {
    if (!ownerId) return false;
    const written = writeMorningPrepEntries(ownerId, next);
    setOwnedEntries({
      ownerId,
      entries: written ? next : [],
      readState: written ? (next.length > 0 ? "PRESENT" : "ABSENT") : "UNAVAILABLE",
    });
    return written;
  }, [ownerId]);

  const toggleItem = (entryId: string, itemId: string) => {
    persist(entries.map(e => e.id !== entryId ? e : {
      ...e, checklist: e.checklist.map(i => i.id === itemId ? { ...i, done: !i.done } : i),
    }));
  };
  const deleteEntry = (id: string) => {
    // Morning-prep entries are the durable record of a morning's practice —
    // browser-local, no server tier, no undo. Require explicit confirmation
    // naming the specific morning about to be lost.
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const done = entry.checklist.filter(i => i.done).length;
    const summary = `${fmtDate(entry.date)} — ${done} practice${done === 1 ? "" : "s"} marked`;
    if (!window.confirm(`Delete this morning's prep?\n\n${summary}\n\nThis cannot be undone.`)) return;
    persist(entries.filter(e => e.id !== id));
  };

  const saveGrowthRing = async () => {
    if (!user) { setGrowthMessage("Sign in to save a private Growth Ring."); return; }
    setGrowthSaving(true);
    setGrowthMessage("");
    try {
      const response = await fetch("/api/morning-prep/growth-rings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: growthCategory, practices: [growthPractice], reflection: growthReflection }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Growth Rings could not be saved.");
      setGrowthRecords(typeof body.totalRecords === "number" ? body.totalRecords : growthRecords + 1);
      setGrowthState("connected");
      setGrowthReflection("");
      setGrowthMessage("Saved privately to your Growth Rings. A missed day never erases this record.");
    } catch (error) {
      setGrowthMessage(error instanceof Error ? error.message : "Growth Rings could not be saved.");
    } finally { setGrowthSaving(false); }
  };

  const recentEntries = entries.filter(entry => Date.now() - new Date(entry.date).getTime() < 90 * 24 * 60 * 60 * 1000).length;

  return (
    <div
      className="w-full h-full overflow-y-auto"
      style={{
        background: "radial-gradient(1200px 700px at 50% -10%, rgba(212,175,55,0.06), transparent 60%), #050506",
      }}
    >
      {/* ── Header ── deep obsidian + warm gold, wmTokens-aligned so the
           morning-prep entry point belongs to the same OS as Command
           Deck and /nectar Vault. Serif hero + tabular metrics. */}
      <div
        style={{
          borderBottom: "1px solid rgba(139,106,41,0.15)",
          background: "linear-gradient(180deg, #0b0b0d 0%, rgba(11,11,13,0.6) 100%)",
        }}
      >
        <div className="max-w-3xl mx-auto" style={{ padding: "18px clamp(16px, 4vw, 32px) 22px" }}>
          <div style={{ marginBottom: 12 }}>
            <WmWordmark size="compact" subtitle="OPENING BELL PROTOCOL" />
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="rounded-full flex items-center justify-center shrink-0"
              style={{
                width: 44, height: 44,
                background: "linear-gradient(160deg, rgba(212,175,55,0.22), rgba(201,165,92,0.08))",
                border: "1px solid rgba(212,175,55,0.35)",
                boxShadow: "inset 0 0 20px -8px rgba(212,175,55,0.4)",
              }}
            >
              <Sun size={20} style={{ color: "#d4af37" }} />
            </div>
            <div>
              <h1
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "clamp(22px, 4vw, 28px)",
                  fontWeight: 400,
                  color: "#ede6d3",
                  letterSpacing: -0.4,
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                Morning Prep
              </h1>
              <p
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 12,
                  fontStyle: "italic",
                  color: "#8a8271",
                  marginTop: 4,
                }}
              >
                Prepare · Align · Act. A gentle record of how you are growing.
              </p>
            </div>
          </div>
          {/* Metric strip — auto-wraps at narrow widths (390 phone → single column), full-width buttons wrap under */}
          <div
            className="mt-4"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 10px", borderRadius: 999,
                background: "rgba(212,175,55,0.08)",
                border: "1px solid rgba(212,175,55,0.30)",
                color: "#d4af37",
                fontSize: 11, fontWeight: 700, letterSpacing: 0.16,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <Sun size={13} />
              {recentEntries} morning record{recentEntries === 1 ? "" : "s"} · 90d
            </div>
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 10px", borderRadius: 999,
                background: "rgba(139,106,41,0.10)",
                border: "1px solid rgba(139,106,41,0.35)",
                color: "#c9a55c",
                fontSize: 11, fontWeight: 700, letterSpacing: 0.16,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <Target size={13} />
              {growthState === "connected"
                ? `${growthRecords} Growth Ring${growthRecords === 1 ? "" : "s"}`
                : growthState === "loading"
                  ? "Opening Growth Rings…"
                  : `${entries.length} local record${entries.length === 1 ? "" : "s"}`}
            </div>
            <div style={{ flex: 1, minWidth: 8 }} />
            <button
              type="button"
              onClick={() => { if (ownerId) setShowCompose(true); }}
              disabled={!ownerId}
              aria-label={ownerId ? "Create a new morning prep entry" : "Sign in to save morning prep"}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                minHeight: 44,
                padding: "7px 14px", borderRadius: 8,
                background: "linear-gradient(180deg, rgba(212,175,55,0.18), rgba(212,175,55,0.08))",
                border: "1px solid rgba(212,175,55,0.45)",
                color: "#ede6d3",
                fontSize: 10, letterSpacing: 0.32, textTransform: "uppercase", fontWeight: 800,
                cursor: ownerId ? "pointer" : "not-allowed",
                opacity: ownerId ? 1 : 0.55,
              }}
            >
              <Plus size={13} /> New Prep
            </button>
            <a
              href={`${DREAMBOARD_URL}/?view=growth-rings`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold"
              style={{
                gap: 6,
                padding: "7px 12px", borderRadius: 8,
                background: "transparent",
                border: "1px solid rgba(139,106,41,0.35)",
                color: "#c9a55c",
                fontSize: 10, letterSpacing: 0.32, textTransform: "uppercase", fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Growth Rings ↗
            </a>
          </div>
        </div>
      </div>

      {/* ── Feed ── */}
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
        {!ownerId && (
          <div role="status" className="rounded-xl border border-wm-border px-4 py-3 text-sm text-wm-text-muted">
            Sign in to save Morning Prep privately. Signed-out prep is not written to shared browser storage.
          </div>
        )}
        {ownerId && prepReadState === "UNAVAILABLE" && (
          <div role="status" className="rounded-xl border border-wm-gold/30 px-4 py-3 text-sm text-wm-gold">
            Morning Prep storage is unavailable on this device. No prior intention is being inferred.
          </div>
        )}
        {/* Opening Bell readiness panel. Uses the default preparation
            template with today's local checklist auto-completed items
            reflected. Truthful UNKNOWN when the trader hasn't completed
            required prep — advisory framing (never gates). */}
        {/* Continuity — silent unless the trader has an active
            focus streak or a clean-day streak. Morning frame is
            CONTINUITY, not zero-state anxiety. */}
        <MorningPrepStreakBadge userId={user?.id ?? ""} />

        <MorningPrepOpeningBell entriesCount={entries.length} userId={user?.id ?? ""} />

        {/* Yesterday's Mirror — retrospective patterns from journal.
            Renders NOTHING when 0 patterns detected (silence-is-a-feature).
            When present, this is 'what yesterday teaches me' before I
            open the market — a natural morning reflection surface. */}
        <MorningPrepMirror userId={user?.id ?? ""} />

        <FabioInsights variant="inline" surface="morning" title="WM Playbook — Today's Focus" limit={3} />
        <section className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg,rgba(0,212,170,0.11),rgba(240,180,41,0.08))", border: "1px solid rgba(240,180,41,0.26)" }}>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: "#F0B429" }}>WOW World · Growth Rings</p>
              <h2 className="text-lg font-black text-white mt-1">How are you growing?</h2>
              <p className="text-sm mt-1" style={{ color: "#AAB2C5" }}>Keep a private record of one faithful practice. This is a long view, never a streak score.</p>
            </div>
            <a href={`${DREAMBOARD_URL}/?view=growth-rings`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold" style={{ color: "#F0B429" }}>Open the wall ↗</a>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {(Object.keys(GROWTH_PRACTICES) as GrowthCategory[]).map(category => <button key={category} onClick={() => { setGrowthCategory(category); setGrowthPractice(GROWTH_PRACTICES[category][0]); }} className="inline-flex min-h-11 items-center justify-center rounded-full px-3 py-1.5 text-xs font-bold capitalize focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold" style={{ background: growthCategory === category ? "#00D4AA" : "rgba(255,255,255,0.06)", color: growthCategory === category ? "#06110F" : "#D8DDEA", border: "1px solid rgba(255,255,255,0.11)" }}>{category}</button>)}
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {GROWTH_PRACTICES[growthCategory].map(practice => <button key={practice} onClick={() => setGrowthPractice(practice)} className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold" style={{ background: growthPractice === practice ? "rgba(240,180,41,0.20)" : "rgba(7,10,15,0.42)", color: growthPractice === practice ? "#F8D477" : "#C9D1DF", border: `1px solid ${growthPractice === practice ? "rgba(240,180,41,0.55)" : "rgba(255,255,255,0.09)"}` }}>{practice}</button>)}
          </div>
          <textarea value={growthReflection} onChange={event => setGrowthReflection(event.target.value)} maxLength={800} placeholder="Optional reflection — simply record what happened in your own words." className="w-full min-h-20 rounded-xl p-3 text-sm text-white outline-none" style={{ background: "rgba(7,10,15,0.55)", border: "1px solid rgba(255,255,255,0.12)" }} />
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <button onClick={saveGrowthRing} disabled={growthSaving || !user} className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold disabled:opacity-50" style={{ background: "#F0B429", color: "#101318" }}>{growthSaving ? "Saving…" : "Place on my Growth Ring"}</button>
            {growthMessage && <p className="text-xs" style={{ color: growthMessage.startsWith("Saved") ? "#6EE7C5" : "#FBBF24" }}>{growthMessage}</p>}
          </div>
        </section>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Coffee size={40} style={{ color: "#4A5070" }} className="mb-4" />
            <p className="text-base font-semibold text-white mb-1">Start your first morning routine</p>
            <p className="text-sm mb-5" style={{ color: "#8B8FA8" }}>
              Record one honest morning. Dreamboard will help you see the distance you have travelled—not punish a missed day.
            </p>
            <button type="button" onClick={() => { if (ownerId) setShowCompose(true); }} disabled={!ownerId}
              className="flex min-h-11 items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "rgba(0,212,170,0.15)", border: "1px solid rgba(0,212,170,0.35)", color: "#00D4AA" }}>
              <Plus size={14} /> {ownerId ? "Create first entry" : "Sign in to save"}
            </button>
          </div>
        ) : (
          entries.map(e => {
            const done = e.checklist.filter(i => i.done).length;
            const pct = e.checklist.length ? Math.round((done / e.checklist.length) * 100) : 0;
            return (
              <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-5" style={{ background: "#0D1117", border: "1px solid #1E2030" }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{e.mood || "☀️"}</span>
                    <div>
                      <div className="text-sm font-bold text-white">{fmtDate(e.date)}</div>
                      <div className="text-[11px]" style={{ color: "#8B8FA8" }}>{done} practice{done === 1 ? "" : "s"} marked · a record of this morning</div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEntry(e.id)}
                    aria-label={`Delete ${fmtDate(e.date)} morning prep (requires confirmation)`}
                    style={{ color: "#6B7280", minWidth: 44, minHeight: 44 }}
                    className="inline-flex items-center justify-center rounded hover:text-red-400 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
                  ><Trash2 size={16} aria-hidden="true" /></button>
                </div>

                {/* progress bar */}
                <div className="h-1.5 rounded-full mb-3" style={{ background: "#1E2030" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: pct === 100 ? "#00D4AA" : "#F0B429" }} />
                </div>

                {e.routine && (
                  <p className="text-sm text-white leading-relaxed whitespace-pre-line mb-3">{e.routine}</p>
                )}

                {e.photo && (
                  <img src={e.photo} alt="Prep" className="w-full max-h-64 object-cover rounded-xl mb-3"
                    style={{ border: "1px solid #1E2030" }} />
                )}

                <div className="space-y-1.5">
                  {e.checklist.map(i => (
                    <button key={i.id} onClick={() => toggleItem(e.id, i.id)}
                      className="flex items-center gap-2.5 w-full text-left group">
                      {i.done
                        ? <CheckCircle2 size={17} style={{ color: "#00D4AA" }} className="shrink-0" />
                        : <Circle size={17} style={{ color: "#4A5070" }} className="shrink-0" />}
                      <span className="text-sm transition-colors"
                        style={{ color: i.done ? "#5B6270" : "#C0C8D8", textDecoration: i.done ? "line-through" : "none" }}>
                        {i.text}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Realm Gateway — same 5-tile band as /command-deck, keeps
          cross-realm navigation available from the morning prep surface. */}
      <div className="max-w-3xl mx-auto px-6 pb-8">
        <RealmGateway currentKey="wm-pro" />
      </div>

      <AnimatePresence>
        {showCompose && ownerId && (
          <ComposeModal
            onClose={() => setShowCompose(false)}
            onSave={(entry) => { persist([entry, ...entries]); setShowCompose(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Compose modal
══════════════════════════════════════════════════════════════ */
function ComposeModal({ onClose, onSave }: { onClose: () => void; onSave: (e: PrepEntry) => void }) {
  const [routine, setRoutine] = useState("");
  const [mood, setMood] = useState("🔥");
  const [items, setItems] = useState<ChecklistItem[]>(
    STARTER_CHECKLIST.map((t, i) => ({ id: `s${i}`, text: t, done: false }))
  );
  const [newItem, setNewItem] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const addItem = () => {
    if (!newItem.trim()) return;
    setItems(list => [...list, { id: `n${Date.now()}`, text: newItem.trim(), done: false }]);
    setNewItem("");
  };
  const removeItem = (id: string) => setItems(list => list.filter(i => i.id !== id));

  const save = () => {
    const entry: PrepEntry = {
      id: `e${Date.now()}`,
      date: new Date().toISOString(),
      routine: routine.trim(),
      mood,
      checklist: items,
      photo,
      createdAt: Date.now(),
    };
    onSave(entry);
  };

  return (
    <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(7,10,15,0.82)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
        className="w-[540px] max-w-full rounded-2xl p-5 shadow-2xl max-h-[88vh] overflow-y-auto"
        style={{ background: "#0D1117", border: "1px solid #1E2030" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Sun size={17} style={{ color: "#F0B429" }} /> New Morning Prep
          </h3>
          <button onClick={onClose} style={{ color: "#8B8FA8" }}><X size={18} /></button>
        </div>

        {/* Mood */}
        <div className="mb-4">
          <label className="text-[10px] uppercase tracking-widest font-bold block mb-2" style={{ color: "#6B7280" }}>How do you feel?</label>
          <div className="flex gap-1.5 flex-wrap">
            {MOODS.map(m => (
              <button key={m} onClick={() => setMood(m)}
                className="w-9 h-9 rounded-xl text-lg transition-all"
                style={{ background: mood === m ? "rgba(240,180,41,0.18)" : "#161A24",
                  border: `1px solid ${mood === m ? "rgba(240,180,41,0.5)" : "#1E2030"}` }}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Routine */}
        <div className="mb-4">
          <label className="text-[10px] uppercase tracking-widest font-bold block mb-2" style={{ color: "#6B7280" }}>Routine & intentions</label>
          <textarea value={routine} onChange={e => setRoutine(e.target.value)} rows={4}
            placeholder="My primary intention today is…  Key levels I'm watching…  How I want to show up…"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none resize-none"
            style={{ background: "#161A24", border: "1px solid #1E2030" }} />
        </div>

        {/* Checklist */}
        <div className="mb-4">
          <label className="text-[10px] uppercase tracking-widest font-bold block mb-2" style={{ color: "#6B7280" }}>Prep checklist</label>
          <div className="space-y-1.5 mb-2">
            {items.map(i => (
              <div key={i.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: "#161A24" }}>
                <Check size={13} style={{ color: "#4A5070" }} />
                <span className="flex-1 text-sm" style={{ color: "#C0C8D8" }}>{i.text}</span>
                <button onClick={() => removeItem(i.id)} style={{ color: "#6B7280" }}><X size={13} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newItem} onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addItem(); }}
              placeholder="Add a checklist item…"
              className="flex-1 rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={{ background: "#161A24", border: "1px solid #1E2030" }} />
            <button onClick={addItem} className="px-3 rounded-lg text-sm font-bold"
              style={{ background: "rgba(0,212,170,0.15)", border: "1px solid rgba(0,212,170,0.35)", color: "#00D4AA" }}>
              <Plus size={15} />
            </button>
          </div>
        </div>

        {/* Photo */}
        <div className="mb-4">
          {photo ? (
            <div className="relative rounded-xl overflow-hidden" style={{ border: "1px solid #1E2030" }}>
              <img src={photo} alt="Prep" className="w-full max-h-48 object-cover" />
              <button onClick={() => setPhoto(null)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.6)" }}><X size={13} className="text-white" /></button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{ background: "#161A24", border: "1px solid #1E2030", color: "#8B8FA8" }}>
              <ImageIcon size={15} /> Add a photo
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = ev => setPhoto(ev.target?.result as string); r.readAsDataURL(f); } }} />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: "#1E2030" }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ color: "#8B8FA8" }}>Cancel</button>
          <button onClick={save} className="px-5 py-2 rounded-xl text-sm font-bold"
            style={{ background: "rgba(0,212,170,0.15)", border: "1px solid rgba(0,212,170,0.35)", color: "#00D4AA" }}>
            Save Prep
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
