"use client";

/**
 * TRIGGER JOURNAL (Founder brief 2026-10-20: "Journal — personal trigger playbook"). Read-only here: the entries the
 * trader logged in the Morning Command Center (one log, per account — /api/morning-prep/protocol), newest first, and
 * the counts from that log. It never guesses at the trader's mind; with no entries it says so and where to log one.
 */
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

import { triggerPattern, type TriggerEntry } from "@/lib/morningProtocol/protocol";

const GOLD = "#d4af37", INK = "#ede6d3", MUTED = "#a69d89", LINE = "rgba(212,175,55,0.28)";

export function TriggerJournalPanel() {
  const [entries, setEntries] = useState<TriggerEntry[] | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/morning-prep/protocol", { credentials: "include", cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(b => { if (alive) setEntries(Array.isArray(b?.triggers) ? b.triggers : []); })
      .catch(() => alive && setEntries([]));
    return () => { alive = false; };
  }, []);
  const p = useMemo(() => triggerPattern(entries ?? []), [entries]);
  if (entries == null) return null;
  return (
    <section data-testid="trigger-journal" aria-label="Trigger journal" style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: "10px 14px", margin: "8px 0", color: INK, background: "rgba(14,12,9,0.6)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 12px" }}>
        <span style={{ fontSize: 13, letterSpacing: "0.12em", color: GOLD, fontWeight: 800 }}>TRIGGER JOURNAL</span>
        <span style={{ fontSize: 13, color: MUTED }}>
          {p.n === 0 ? "No triggers logged yet." : `${p.n} logged · most often “${p.topTrigger}” (${p.topCount}×) · paused ${p.interruptedPct}% · followed rules ${p.followedPct}%`}
        </span>
        <Link href="/morning-prep" style={{ fontSize: 13, color: GOLD, minHeight: 44, display: "inline-flex", alignItems: "center" }}>Log one in Morning Prep →</Link>
        {p.n > 0 ? <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ minHeight: 44, padding: "0 12px", borderRadius: 8, border: `1px solid ${LINE}`, background: "transparent", color: INK, fontSize: 13, cursor: "pointer" }}>{open ? "Hide entries" : "Show entries"}</button> : null}
      </div>
      {open ? (
        <ol style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "grid", gap: 6 }}>
          {[...(entries ?? [])].reverse().slice(0, 20).map(e => (
            <li key={e.at} style={{ fontSize: 14, lineHeight: 1.45, borderTop: `1px solid ${LINE}`, paddingTop: 6 }}>
              <span style={{ color: MUTED }}>{new Date(e.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {e.intensity}/10 · </span>
              “{e.trigger}”{e.action ? ` → ${e.action}` : ""}
              <span style={{ color: MUTED }}> · {e.interrupted ? "paused" : "did not pause"} · {e.followedRules ? "followed rules" : "broke a rule"}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
